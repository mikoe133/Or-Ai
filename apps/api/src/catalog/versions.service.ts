import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { IdSchema, PublicReportSampleSchema } from '@orai/contracts';
import {
  AdminConfigurationCheckSchema, AdminProductStateResponseSchema, AdminVersionActionSchema,
  AdminVersionInputSchema, AdminVersionPreviewSchema, AdminVersionSchema, ProductConfigurationSchema,
} from '@orai/contracts/admin';
import { DatabaseService } from '../database/database.service';
import { Prisma, type Product, type ProductVersion } from '../generated/prisma/client';
import { parseInput } from '../common/parse-input';
import { ApiException } from '../common/http-errors';
import { CatalogAdminAccessService, type CatalogAdminAccess } from './admin-access.service';
import { catalogInclude } from './catalog.service';
import { toPublicProduct, type PublicProductRecord } from './projections';
import { experienceRelease } from './experience-release';
import { prepareAuthoredExperience } from './experience-authoring';
import { AssetStorage } from '../operations/asset-storage';

const versionDto = (version: ProductVersion) => AdminVersionSchema.parse({
  id: version.id, productId: version.productId, scope: version.scope.toLowerCase(), number: version.number,
  status: version.status.toLowerCase(), createdAt: version.createdAt.toISOString(), publishedAt: version.publishedAt?.toISOString() ?? null,
  revision: version.revision,
});
const productDto = (product: Product) => AdminProductStateResponseSchema.parse({
  id: product.id, slug: product.slug, scope: product.scope.toLowerCase(), status: product.status.toLowerCase(),
  currentVersionId: product.currentVersionId, publishedAt: product.publishedAt?.toISOString() ?? null,
});

@Injectable()
export class VersionsService {
  constructor(private readonly database: DatabaseService, private readonly administrators: CatalogAdminAccessService, private readonly storage: AssetStorage) {}

  async validate(access: CatalogAdminAccess, configuration: unknown) {
    await this.administrators.require(access);
    const result = ProductConfigurationSchema.safeParse(configuration);
    return AdminConfigurationCheckSchema.parse({ valid: result.success,
      issues: result.success ? [] : result.error.issues.slice(0, 20).map(issue => ({ path: issue.path.join('.').slice(0, 160), message: issue.message.slice(0, 240) })),
    });
  }

  private async product(client: Prisma.TransactionClient, access: CatalogAdminAccess, id: string) {
    const record = await client.product.findUnique({ where: { id }, include: catalogInclude });
    if (!record || record.scope !== access.scope) throw new ApiException('NOT_FOUND', '商品不存在于当前管理范围', 404);
    return record;
  }

  private async version(client: Prisma.TransactionClient, productId: string, id: string) {
    const version = await client.productVersion.findFirst({ where: { id, productId } });
    if (!version) throw new ApiException('NOT_FOUND', '商品版本不存在', 404);
    return version;
  }

  private publicPreview(product: PublicProductRecord, version: ProductVersion) {
    parseInput(ProductConfigurationSchema, version.configuration, 'INVALID_CONFIGURATION');
    const sample = parseInput(PublicReportSampleSchema, product.publicSample, 'INVALID_CONFIGURATION');
    if (sample.isDemo !== (product.scope === 'DEMO') || (product.scope === 'DEMO' && product.purchaseUrl !== null)) {
      throw new ApiException('INVALID_CONFIGURATION', '公开样例标识或演示购买链接不符合商品范围', 400);
    }
    // Publication state is simulated only in this in-memory preview. The real
    // draft keeps its state and cannot be reached through the public catalog.
    try {
      return toPublicProduct({ ...product, publishedAt: product.publishedAt ?? new Date(),
        currentVersion: { ...version, status: 'PUBLISHED' } });
    } catch { throw new ApiException('INVALID_CONFIGURATION', '商品公开字段未通过展示校验', 400); }
  }

  async preview(access: CatalogAdminAccess, productId: unknown, versionId: unknown) {
    await this.administrators.require(access);
    const id = parseInput(IdSchema, productId).toLowerCase(), versionKey = parseInput(IdSchema, versionId).toLowerCase();
    return this.database.client.$transaction(async tx => {
      await this.administrators.require(access, tx);
      const product = await this.product(tx, access, id), version = await this.version(tx, id, versionKey);
      return AdminVersionPreviewSchema.parse({ isPreview: true, version: versionDto(version),
        configuration: parseInput(ProductConfigurationSchema, version.configuration, 'INVALID_CONFIGURATION'),
        publicView: this.publicPreview(product, version) });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  private async mutate<T extends object>(access: CatalogAdminAccess, productId: unknown, action: string, requestId: string,
    payload: unknown, change: (tx: Prisma.TransactionClient, product: PublicProductRecord) => Promise<{ response: T; entityId: string; entityKind: string }>) {
    await this.administrators.require(access);
    const id = parseInput(IdSchema, productId).toLowerCase();
    const operation = 'catalog:' + action + ':' + id;
    const actorKey = 'admin:' + access.scope + ':' + access.actorUserId;
    const digest = createHash('sha256').update(JSON.stringify({ operation, payload })).digest('hex');
    return this.database.client.$transaction(async tx => {
      await this.administrators.require(access, tx);
      // Lock the product before allocating version numbers or switching its
      // current version. Different requests for one product serialize here.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id = ${id}::uuid FOR UPDATE`);
      const product = await this.product(tx, access, id);
      const existing = await tx.idempotentRequest.findUnique({ where: { actorKey_operation_requestId: { actorKey, operation, requestId } } });
      if (existing) {
        if (existing.requestDigest !== digest || existing.expiresAt <= new Date()) throw new ApiException('IDEMPOTENCY_CONFLICT', '请求编号已使用或重试窗口已结束', 409);
        return existing.response as T;
      }
      const changed = await change(tx, product);
      await tx.adminAuditLog.create({ data: { actorUserId: access.actorUserId, scope: product.scope,
        action: 'catalog.' + action, entityKind: changed.entityKind, entityId: changed.entityId, requestId } });
      await tx.idempotentRequest.create({ data: { actorKey, operation, requestId, requestDigest: digest,
        response: changed.response as Prisma.InputJsonValue, expiresAt: new Date(Date.now() + 86_400_000) } });
      return changed.response;
    }, { maxWait: 5000, timeout: 10_000 });
  }

  async importConfiguration(access: CatalogAdminAccess, productId: unknown, input: unknown) {
    await this.administrators.require(access);
    const request = parseInput(AdminVersionInputSchema, input, 'INVALID_CONFIGURATION');
    return this.mutate(access, productId, 'import', request.requestId, request.configuration, async (tx, product) => {
      const latest = await tx.productVersion.aggregate({ where: { productId: product.id }, _max: { number: true } });
      const number = (latest._max.number ?? 0) + 1;
      if (number > 2_147_483_647) throw new ApiException('CONFLICT', '商品版本数量超出支持范围', 409);
      const version = await tx.productVersion.create({ data: { productId: product.id, scope: product.scope, number,
        configuration: request.configuration as Prisma.InputJsonValue, status: 'DRAFT' } });
      return { response: versionDto(version), entityId: version.id, entityKind: 'product_version' };
    });
  }

  async replaceDraft(access: CatalogAdminAccess, productId: unknown, versionId: unknown, input: unknown) {
    await this.administrators.require(access);
    const id = parseInput(IdSchema, versionId).toLowerCase(), request = parseInput(AdminVersionInputSchema, input, 'INVALID_CONFIGURATION');
    return this.mutate(access, productId, 'replace', request.requestId, { id, configuration: request.configuration, expectedRevision: request.expectedRevision }, async (tx, product) => {
      const version = await this.version(tx, product.id, id);
      if (!['DRAFT', 'REVIEWED'].includes(version.status)) throw new ApiException('VERSION_IMMUTABLE', '已发布版本不可修改，请创建新版本', 409);
      if (request.expectedRevision !== undefined && version.revision !== request.expectedRevision) throw new ApiException('REVISION_CONFLICT', '配置已更新，请刷新后重试', 409);
      const updated = await tx.productVersion.update({ where: { id }, data: { configuration: request.configuration as Prisma.InputJsonValue, status: 'DRAFT', revision: { increment: 1 } } });
      return { response: versionDto(updated), entityId: id, entityKind: 'product_version' };
    });
  }

  async review(access: CatalogAdminAccess, productId: unknown, versionId: unknown, input: unknown) {
    await this.administrators.require(access);
    const id = parseInput(IdSchema, versionId).toLowerCase(), request = parseInput(AdminVersionActionSchema, input);
    return this.mutate(access, productId, 'review', request.requestId, { id, expectedRevision: request.expectedRevision }, async (tx, product) => {
      const version = await this.version(tx, product.id, id);
      if (request.expectedRevision !== undefined && version.revision !== request.expectedRevision) throw new ApiException('REVISION_CONFLICT', '配置已更新，请重新预览后审核', 409);
      if (!['DRAFT', 'REVIEWED'].includes(version.status)) throw new ApiException('VERSION_IMMUTABLE', '已发布版本不可重新审核', 409);
      this.publicPreview(product, version);
      const updated = await tx.productVersion.update({ where: { id }, data: { status: 'REVIEWED', revision: { increment: 1 } } });
      if (product.status === 'DRAFT') await tx.product.update({ where: { id: product.id }, data: { status: 'REVIEWED', revision: { increment: 1 } } });
      return { response: versionDto(updated), entityId: id, entityKind: 'product_version' };
    });
  }

  async publish(access: CatalogAdminAccess, productId: unknown, versionId: unknown, input: unknown) {
    await this.administrators.require(access);
    const id = parseInput(IdSchema, versionId).toLowerCase(), request = parseInput(AdminVersionActionSchema, input);
    return this.mutate(access, productId, 'publish', request.requestId, { id, expectedRevision: request.expectedRevision }, async (tx, product) => {
      const version = await this.version(tx, product.id, id);
      if (request.expectedRevision !== undefined && version.revision !== request.expectedRevision) throw new ApiException('REVISION_CONFLICT', '配置已更新，请重新审核后发布', 409);
      if (version.status === 'PUBLISHED' && product.status === 'PUBLISHED' && product.currentVersionId === id) {
        return { response: versionDto(version), entityId: id, entityKind: 'product_version' };
      }
      if (version.status !== 'REVIEWED') throw new ApiException('CONFLICT', '需要先审核一个未发布的新版本', 409);
      this.publicPreview(product, version);
      const publishedAt = new Date();
      await prepareAuthoredExperience(tx, version, this.storage);
      const published = await tx.productVersion.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt, revision: { increment: 1 } } });
      experienceRelease(await tx.experienceRelease.findUnique({ where: { productVersionId: id } }),
        parseInput(ProductConfigurationSchema, published.configuration, 'INVALID_CONFIGURATION'), published.creativeProfileRevisionId);
      await tx.product.update({ where: { id: product.id }, data: { status: 'PUBLISHED', currentVersionId: id, publishedAt, revision: { increment: 1 } } });
      return { response: versionDto(published), entityId: id, entityKind: 'product_version' };
    });
  }

  async archive(access: CatalogAdminAccess, productId: unknown, input: unknown) {
    await this.administrators.require(access);
    const request = parseInput(AdminVersionActionSchema, input);
    return this.mutate(access, productId, 'archive', request.requestId, {}, async (tx, product) => {
      if (!['PUBLISHED', 'ARCHIVED'].includes(product.status)) throw new ApiException('CONFLICT', '只能下架已发布的商品', 409);
      const archived = await tx.product.update({ where: { id: product.id }, data: { status: 'ARCHIVED', revision: { increment: 1 } } });
      return { response: productDto(archived), entityId: product.id, entityKind: 'product' };
    });
  }
}
