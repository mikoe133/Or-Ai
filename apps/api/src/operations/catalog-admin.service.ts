import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { IdSchema } from '@orai/contracts';
import { AdminCategoryCreateSchema, AdminCategoryPatchSchema, AdminTagCreateSchema, AdminTagPatchSchema,
  AdminPageQuerySchema, AdminProductInputSchema, AdminProductCreateSchema, AdminProductPatchSchema, AdminProductCoverSchema, AdminProductSchema } from '@orai/contracts/admin';
import { PublicReportSampleSchema as SampleSchema } from '@orai/contracts';
import { DatabaseService } from '../database/database.service';
import { type CatalogAdminAccess } from '../catalog/admin-access.service';
import { Prisma, type Product } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AdminMutationService } from './admin-mutation.service';
import { publicCoverPath } from './media-paths';

const listQuery = AdminPageQuerySchema.extend({ query: z.string().trim().max(100).default(''),
  status: z.enum(['draft','reviewed','published','archived']).optional(), categoryId: IdSchema.optional() }).strict();
const productInclude = { tags: true } as const;
function dto(row: Product & { tags: { tagId: string }[] }) {
  return AdminProductSchema.parse({ id: row.id, slug: row.slug, name: row.name, hook: row.hook, summary: row.summary,
    description: row.description, categoryId: row.categoryId, tagIds: row.tags.map(value => value.tagId),
    priceFen: row.priceFen, durationMinutes: row.durationMinutes, experienceType: row.experienceType.toLowerCase(),
    themeKey: row.themeKey, coverUrl: row.coverUrl, scope: row.scope.toLowerCase(), recommended: row.recommended,
    publicSample: row.publicSample, purchaseUrl: row.purchaseUrl, purchaseNotice: row.purchaseNotice, redemptionNotice: row.redemptionNotice,
    status: row.status.toLowerCase(), revision: row.revision, recommendationOrder: row.recommendationOrder,
    currentVersionId: row.currentVersionId, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
}

@Injectable()
export class CatalogAdminService {
  constructor(private readonly database: DatabaseService, private readonly mutations: AdminMutationService) {}

  async taxonomy(access: CatalogAdminAccess, kind: 'categories' | 'tags', query: unknown) {
    await this.mutations.administrators.require(access);
    const { page, pageSize } = parseInput(AdminPageQuerySchema, query);
    const [items, total] = kind === 'categories'
      ? await Promise.all([this.database.client.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }), this.database.client.category.count()])
      : await Promise.all([this.database.client.tag.findMany({ orderBy: { id: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }), this.database.client.tag.count()]);
    return { items, total, page, pageSize };
  }

  async createTaxonomy(access: CatalogAdminAccess, kind: 'categories' | 'tags', input: unknown) {
    const body = parseInput(kind === 'categories' ? AdminCategoryCreateSchema : AdminTagCreateSchema, input);
    return this.mutations.run(access, kind + '.create', body.requestId, body, async tx => {
      const row = kind === 'categories' ? await tx.category.create({ data: { slug: body.slug, name: body.name, sortOrder: 'sortOrder' in body ? body.sortOrder as number : 0 } })
        : await tx.tag.create({ data: { slug: body.slug, name: body.name } });
      return { response: row, entityKind: kind, entityId: row.id };
    });
  }
  async patchTaxonomy(access: CatalogAdminAccess, kind: 'categories' | 'tags', inputId: unknown, input: unknown) {
    const id = parseInput(IdSchema, inputId).toLowerCase();
    const body = parseInput(kind === 'categories' ? AdminCategoryPatchSchema : AdminTagPatchSchema, input);
    return this.mutations.run(access, kind + '.update:' + id, body.requestId, body, async tx => {
      if (kind === 'categories') await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.categories WHERE id=${id}::uuid FOR UPDATE`);
      else await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.tags WHERE id=${id}::uuid FOR UPDATE`);
      const old = kind === 'categories' ? await tx.category.findUnique({ where: { id } }) : await tx.tag.findUnique({ where: { id } });
      if (!old) throw new ApiException('NOT_FOUND', '分类或标签不存在', 404);
      if (old.revision !== body.expectedRevision) throw new ApiException('REVISION_CONFLICT', '记录已更新，请刷新后重试', 409);
      const row = kind === 'categories' ? await tx.category.update({ where: { id }, data: { name: body.name,
        ...('sortOrder' in body ? { sortOrder: body.sortOrder as number | undefined } : {}), revision: { increment: 1 } } })
        : await tx.tag.update({ where: { id }, data: { name: body.name!, revision: { increment: 1 } } });
      return { response: row, entityKind: kind, entityId: id };
    });
  }

  async products(access: CatalogAdminAccess, query: unknown) {
    await this.mutations.administrators.require(access);
    const args = parseInput(listQuery, query);
    const where: Prisma.ProductWhereInput = { scope: access.scope,
      ...(args.status ? { status: args.status.toUpperCase() as Product['status'] } : {}),
      ...(args.categoryId ? { categoryId: args.categoryId } : {}),
      ...(args.query ? { OR: [{ name: { contains: args.query, mode: 'insensitive' } }, { slug: { contains: args.query, mode: 'insensitive' } }] } : {}) };
    const [rows, total] = await this.database.client.$transaction([
      this.database.client.product.findMany({ where, include: productInclude, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.database.client.product.count({ where }),
    ]);
    return { items: rows.map(dto), total, page: args.page, pageSize: args.pageSize };
  }
  async product(access: CatalogAdminAccess, inputId: unknown) {
    await this.mutations.administrators.require(access);
    const id = parseInput(IdSchema, inputId).toLowerCase();
    const row = await this.database.client.product.findFirst({ where: { id, scope: access.scope }, include: productInclude });
    if (!row) throw new ApiException('NOT_FOUND', '商品不存在于当前管理范围', 404);
    return dto(row);
  }
  private async metadata(tx: Prisma.TransactionClient, access: CatalogAdminAccess, body: z.infer<typeof AdminProductCreateSchema>) {
    if (body.scope !== access.scope.toLowerCase()) throw new ApiException('FORBIDDEN', '商品范围与管理权限不一致', 403);
    if (!await tx.category.findUnique({ where: { id: body.categoryId } }) ||
      new Set(body.tagIds).size !== body.tagIds.length || await tx.tag.count({ where: { id: { in: body.tagIds } } }) !== body.tagIds.length) {
      throw new ApiException('VALIDATION_ERROR', '分类或标签引用不正确', 400);
    }
    const sample = parseInput(SampleSchema, body.publicSample);
    if (sample.isDemo !== (access.scope === 'DEMO') || access.scope === 'DEMO' && body.purchaseUrl !== null) throw new ApiException('INVALID_CONFIGURATION', '公开样例或购买链接与商品范围不一致', 400);
    if (body.coverUrl && !(body.coverUrl.startsWith('/') && !body.coverUrl.startsWith('//') && !body.coverUrl.includes('..') || /^https:\/\//.test(body.coverUrl))) throw new ApiException('VALIDATION_ERROR', '封面引用不正确', 400);
  }
  async create(access: CatalogAdminAccess, input: unknown) {
    const body = parseInput(AdminProductCreateSchema, input);
    return this.mutations.run(access, 'products.create', body.requestId, body, async tx => {
      await this.metadata(tx, access, body);
      const { requestId: _requestId, tagIds, experienceType, scope: _scope, ...data } = body;
      const row = await tx.product.create({ data: { ...data, scope: access.scope,
        experienceType: experienceType.toUpperCase() as Product['experienceType'], publicSample: body.publicSample as Prisma.InputJsonValue,
        tags: { create: tagIds.map(tagId => ({ tagId })) } }, include: productInclude });
      return { response: dto(row), entityKind: 'product', entityId: row.id };
    });
  }
  async patch(access: CatalogAdminAccess, inputId: unknown, input: unknown) {
    const id = parseInput(IdSchema, inputId).toLowerCase(), body = parseInput(AdminProductPatchSchema, input);
    return this.mutations.run(access, 'products.update:' + id, body.requestId, body, async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${id}::uuid FOR UPDATE`);
      const old = await tx.product.findFirst({ where: { id, scope: access.scope }, include: productInclude });
      if (!old) throw new ApiException('NOT_FOUND', '商品不存在于当前管理范围', 404);
      if (old.revision !== body.expectedRevision) throw new ApiException('REVISION_CONFLICT', '商品已更新，请刷新后重试', 409);
      const { expectedRevision: _expected, requestId: _request, recommendationOrder: _order, ...fields } = body;
      const combined = AdminProductInputSchema.parse({ ...AdminProductInputSchema.strip().parse(dto(old)), ...fields });
      await this.metadata(tx, access, { ...combined, requestId: body.requestId });
      const { requestId: _id, expectedRevision: _revision, tagIds, experienceType, ...data } = body;
      const row = await tx.product.update({ where: { id }, data: { ...data,
        ...(body.publicSample ? { publicSample: body.publicSample as Prisma.InputJsonValue } : {}),
        ...(experienceType ? { experienceType: experienceType.toUpperCase() as Product['experienceType'] } : {}),
        ...(tagIds ? { tags: { deleteMany: {}, create: tagIds.map(tagId => ({ tagId })) } } : {}), revision: { increment: 1 } }, include: productInclude });
      return { response: dto(row), entityKind: 'product', entityId: id };
    });
  }
  async versions(access: CatalogAdminAccess, inputId: unknown, query: unknown) {
    await this.product(access, inputId);
    const { page, pageSize } = parseInput(AdminPageQuerySchema, query), id = parseInput(IdSchema, inputId).toLowerCase();
    const [rows, total] = await this.database.client.$transaction([
      this.database.client.productVersion.findMany({ where: { productId: id, scope: access.scope },
        select: { id: true, productId: true, number: true, status: true, revision: true, createdAt: true, publishedAt: true }, orderBy: { number: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.database.client.productVersion.count({ where: { productId: id, scope: access.scope } }),
    ]);
    return { items: rows.map(row => ({ ...row, scope: access.scope.toLowerCase(), status: row.status.toLowerCase(), createdAt: row.createdAt.toISOString(), publishedAt: row.publishedAt?.toISOString() ?? null })), total, page, pageSize };
  }
  async selectCover(access: CatalogAdminAccess, inputId: unknown, input: unknown) {
    const id = parseInput(IdSchema, inputId).toLowerCase(), body = parseInput(AdminProductCoverSchema, input);
    return this.mutations.run(access, 'products.cover:' + id, body.requestId, body, async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${id}::uuid FOR UPDATE`);
      const product = await tx.product.findFirst({ where: { id, scope: access.scope } });
      if (!product) throw new ApiException('NOT_FOUND', '商品不存在于当前管理范围', 404);
      if (product.revision !== body.expectedRevision) throw new ApiException('REVISION_CONFLICT', '商品已更新，请刷新后重试', 409);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.campaign_assets WHERE id=${body.assetId}::uuid FOR SHARE`);
      const asset = await tx.campaignAsset.findFirst({ where: { id: body.assetId.toLowerCase(), scope: access.scope,
        productVersionId: product.currentVersionId ?? '', kind: 'COVER', status: 'READY', file: { status: 'AVAILABLE' } } });
      if (product.status !== 'PUBLISHED' || !asset?.fileId) throw new ApiException('CONFLICT', '需要当前已发布版本的就绪封面', 409);
      const row = await tx.product.update({ where: { id }, data: { coverUrl: publicCoverPath(asset.id, asset.fileId), revision: { increment: 1 } }, include: productInclude });
      return { response: dto(row), entityKind: 'product', entityId: id };
    });
  }
}
