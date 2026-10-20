import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { IdSchema } from '@orai/contracts';
import { AdminAssetCreateSchema, AdminAssetPatchSchema, AdminManagedAssetSchema, AdminPageQuerySchema, AdminRevisionInputSchema } from '@orai/contracts/admin';
import { DatabaseService } from '../database/database.service';
import { type CatalogAdminAccess } from '../catalog/admin-access.service';
import { Prisma, type CampaignAsset } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AdminMutationService } from './admin-mutation.service';

const querySchema = AdminPageQuerySchema.extend({ kind: z.enum(['cover','video','script','copy']).optional(),
  platform: z.enum(['manual','douyin','xiaohongshu']).optional(), productVersionId: IdSchema.optional(),
  status: z.enum(['draft','reviewed','ready','archived']).optional() }).strict();
const dto = (row: CampaignAsset) => AdminManagedAssetSchema.parse({ id: row.id, productVersionId: row.productVersionId,
  scope: row.scope.toLowerCase(), platform: row.platform.toLowerCase(), kind: row.kind.toLowerCase(), variant: row.variant,
  status: row.status.toLowerCase(), revision: row.revision, text: row.text, fileId: row.fileId,
  mimeType: row.fileId ? row.mimeType : null, byteSize: row.fileId ? row.byteSize : null, checksum: row.fileId ? row.checksum : null,
  downloadPath: row.fileId ? '/api/admin/files/' + row.fileId + '/content' : null,
  createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });

@Injectable()
export class AssetsService {
  constructor(private readonly database: DatabaseService, private readonly mutations: AdminMutationService) {}
  async list(access: CatalogAdminAccess, query: unknown) {
    await this.mutations.administrators.require(access);
    const args = parseInput(querySchema, query);
    const where: Prisma.CampaignAssetWhereInput = { scope: access.scope,
      ...(args.kind ? { kind: args.kind.toUpperCase() as CampaignAsset['kind'] } : {}),
      ...(args.platform ? { platform: args.platform.toUpperCase() as CampaignAsset['platform'] } : {}),
      ...(args.status ? { status: args.status.toUpperCase() as CampaignAsset['status'] } : {}),
      ...(args.productVersionId ? { productVersionId: args.productVersionId } : {}) };
    const [rows, total] = await this.database.client.$transaction([
      this.database.client.campaignAsset.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.database.client.campaignAsset.count({ where }),
    ]);
    return { items: rows.map(dto), total, page: args.page, pageSize: args.pageSize };
  }
  async read(access: CatalogAdminAccess, inputId: unknown) {
    await this.mutations.administrators.require(access);
    const id = parseInput(IdSchema, inputId).toLowerCase();
    const row = await this.database.client.campaignAsset.findFirst({ where: { id, scope: access.scope } });
    if (!row) throw new ApiException('NOT_FOUND', '素材不存在于当前管理范围', 404);
    return dto(row);
  }
  private async file(tx: Prisma.TransactionClient, access: CatalogAdminAccess, versionId: string, kind: CampaignAsset['kind'], fileId?: string | null) {
    if (!fileId) return { fileId: null, storageKey: null, mimeType: null, byteSize: null, checksum: null };
    if (!['COVER','VIDEO'].includes(kind)) throw new ApiException('VALIDATION_ERROR', '文本素材不能关联媒体文件', 400);
    const file = await tx.assetFile.findFirst({ where: { id: fileId.toLowerCase(), scope: access.scope, productVersionId: versionId, kind, status: 'AVAILABLE' } });
    if (!file) throw new ApiException('CONFLICT', '文件未就绪或不属于该素材版本/用途', 409);
    return { fileId: file.id, storageKey: file.storageKey, mimeType: file.mimeType, byteSize: file.byteSize, checksum: file.checksum };
  }
  async create(access: CatalogAdminAccess, input: unknown) {
    const body = parseInput(AdminAssetCreateSchema, input);
    return this.mutations.run(access, 'assets.create', body.requestId, body, async tx => {
      const versionId = body.productVersionId.toLowerCase(), kind = body.kind.toUpperCase() as CampaignAsset['kind'];
      if (!await tx.productVersion.findFirst({ where: { id: versionId, scope: access.scope } })) throw new ApiException('NOT_FOUND', '商品版本不存在于当前管理范围', 404);
      if (['COVER','VIDEO'].includes(kind) && body.text) throw new ApiException('VALIDATION_ERROR', '媒体说明与文案/脚本请分别保存', 400);
      const row = await tx.campaignAsset.create({ data: { productVersionId: versionId, scope: access.scope,
        platform: body.platform.toUpperCase() as CampaignAsset['platform'], kind, variant: body.variant,
        text: body.text?.trim() || null, ...await this.file(tx, access, versionId, kind, body.fileId) } });
      return { response: dto(row), entityKind: 'campaign_asset', entityId: row.id };
    });
  }
  async update(access: CatalogAdminAccess, inputId: unknown, input: unknown) {
    const id = parseInput(IdSchema, inputId).toLowerCase(), body = parseInput(AdminAssetPatchSchema, input);
    return this.mutations.run(access, 'assets.update:' + id, body.requestId, body, async tx => {
      const old = await this.lock(tx, access, id, body.expectedRevision);
      if (old.authoring !== null) throw new ApiException('CONFLICT', '此素材已使用结构化内容，请通过内容修订接口编辑', 409);
      if (['COVER','VIDEO'].includes(old.kind) && body.text) throw new ApiException('VALIDATION_ERROR', '媒体与文本请分别保存', 400);
      const row = await tx.campaignAsset.update({ where: { id }, data: {
        ...(body.text !== undefined ? { text: body.text?.trim() || null } : {}), ...(body.variant ? { variant: body.variant } : {}),
        ...(body.fileId !== undefined ? await this.file(tx, access, old.productVersionId, old.kind, body.fileId) : {}),
        status: 'DRAFT', revision: { increment: 1 } } });
      return { response: dto(row), entityKind: 'campaign_asset', entityId: id };
    });
  }
  private async lock(tx: Prisma.TransactionClient, access: CatalogAdminAccess, id: string, revision: number) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.campaign_assets WHERE id=${id}::uuid FOR UPDATE`);
    const row = await tx.campaignAsset.findFirst({ where: { id, scope: access.scope } });
    if (!row) throw new ApiException('NOT_FOUND', '素材不存在于当前管理范围', 404);
    if (row.revision !== revision) throw new ApiException('REVISION_CONFLICT', '素材已更新，请刷新后重试', 409);
    return row;
  }
  async transition(access: CatalogAdminAccess, inputId: unknown, action: 'review' | 'ready' | 'archive', input: unknown) {
    const id = parseInput(IdSchema, inputId).toLowerCase(), body = parseInput(AdminRevisionInputSchema, input);
    return this.mutations.run(access, 'assets.' + action + ':' + id, body.requestId, body, async tx => {
      const old = await this.lock(tx, access, id, body.expectedRevision);
      if (action !== 'archive') {
        if (action === 'review' && old.status !== 'DRAFT' || action === 'ready' && old.status !== 'REVIEWED') throw new ApiException('CONFLICT', '素材需要按草稿、审核、就绪顺序操作', 409);
        if (['COVER','VIDEO'].includes(old.kind)) {
          if (!old.fileId) throw new ApiException('CONFLICT', '媒体文件尚未上传并校验', 409);
          await this.file(tx, access, old.productVersionId, old.kind, old.fileId);
        } else if (!old.text?.trim()) throw new ApiException('CONFLICT', '文案或脚本内容不能为空', 409);
      }
      const row = await tx.campaignAsset.update({ where: { id }, data: { status: action === 'review' ? 'REVIEWED' : action === 'ready' ? 'READY' : 'ARCHIVED', revision: { increment: 1 } } });
      return { response: dto(row), entityKind: 'campaign_asset', entityId: id };
    });
  }
}
