import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { IdSchema } from '@orai/contracts';
import { AdminUploadPrepareSchema, AdminDeliveryActionSchema, AdminFileSchema } from '@orai/contracts/admin';
import { DatabaseService } from '../database/database.service';
import { type CatalogAdminAccess } from '../catalog/admin-access.service';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { Prisma, type AssetFile } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AdminMutationService } from './admin-mutation.service';
import { AssetStorage } from './asset-storage';
import { publicCoverPath } from './media-paths';

export function fileDto(row: AssetFile) {
  return AdminFileSchema.parse({ id: row.id, productVersionId: row.productVersionId, scope: row.scope.toLowerCase(),
    kind: row.kind.toLowerCase(), fileName: row.originalName, mimeType: row.mimeType, byteSize: row.byteSize, checksum: row.checksum,
    width: row.width, height: row.height, durationMs: row.durationMs,
    status: row.status.toLowerCase(), expiresAt: row.expiresAt.toISOString(), verifiedAt: row.verifiedAt?.toISOString() ?? null,
    uploadPath: '/api/admin/uploads/' + row.id + '/content', downloadPath: row.status === 'AVAILABLE' ? '/api/admin/files/' + row.id + '/content' : null });
}

@Injectable()
export class FilesService {
  constructor(private readonly database: DatabaseService, private readonly mutations: AdminMutationService,
    private readonly storage: AssetStorage, @Inject(APP_CONFIG) private readonly configuration: AppConfiguration) {}
  async prepare(access: CatalogAdminAccess, input: unknown) {
    const body = parseInput(AdminUploadPrepareSchema, input), settings = this.configuration.assets;
    if (!settings || settings.driver !== 'local' || this.configuration.environment === 'production') throw new ApiException('SERVICE_UNAVAILABLE', '持久化文件存储尚未配置', 503);
    const image = body.kind !== 'video';
    const extensions: Record<string, string[]> = { 'image/png': ['png'], 'image/jpeg': ['jpg','jpeg'], 'image/webp': ['webp'], 'video/mp4': ['mp4'], 'video/webm': ['webm'] };
    if (body.byteSize > (body.kind === 'experience' ? Math.min(settings.maxImageBytes,4194304) : image ? settings.maxImageBytes : settings.maxVideoBytes) || body.mimeType.startsWith('image/') !== image ||
      !extensions[body.mimeType]!.includes(body.fileName.split('.').at(-1)!.toLowerCase())) throw new ApiException('VALIDATION_ERROR', '文件用途、扩展名、类型或大小不符合限制', 400);
    const result = await this.mutations.run(access, access.machineCredentialId ? 'machine.files.prepare' : 'files.prepare', body.requestId, body, async tx => {
      if (!await tx.productVersion.findFirst({ where: { id: body.productVersionId, scope: access.scope } })) throw new ApiException('NOT_FOUND', '商品版本不存在于当前管理范围', 404);
      await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'uploads:' + access.scope + ':' + access.actorUserId},0))`);
      if (await tx.assetFile.count({ where: { ownerUserId: access.actorUserId, scope: access.scope, status: { in: ['PENDING','VERIFYING','UPLOADED'] }, expiresAt: { gt: new Date() } } }) >= 20) throw new ApiException('CONFLICT', '待完成上传过多，请先完成或等待过期', 409);
      const id = randomUUID();
      await tx.assetFile.create({ data: { id, productVersionId: body.productVersionId.toLowerCase(), scope: access.scope,
        ownerUserId: access.actorUserId, kind: body.kind.toUpperCase() as 'COVER'|'VIDEO'|'EXPERIENCE', originalName: body.fileName, mimeType: body.mimeType,
        byteSize: body.byteSize, checksum: body.checksum, storageKey: id + '.blob', expiresAt: new Date(Date.now() + 3_600_000) } });
      return { response: { id }, entityKind: 'asset_file', entityId: id };
    });
    return this.status(access, result.id);
  }
  private async owned(access: CatalogAdminAccess, inputId: unknown, tx?: Prisma.TransactionClient) {
    await this.mutations.administrators.require(access, tx);
    const id = parseInput(IdSchema, inputId).toLowerCase();
    const row = await (tx ?? this.database.client).assetFile.findFirst({ where: { id, scope: access.scope, ownerUserId: access.actorUserId } });
    if (!row) throw new ApiException('NOT_FOUND', '上传记录不存在于当前管理范围', 404);
    return row;
  }
  private usable(row: AssetFile) {
    if (row.status !== 'AVAILABLE' && row.expiresAt <= new Date()) throw new ApiException('ENTITLEMENT_EXPIRED', '上传会话已过期，请重新申请', 410);
    if (['FAILED','EXPIRED','DELETING','DELETED'].includes(row.status)) throw new ApiException('CONFLICT', '上传未完成，请重新申请', 409);
  }
  async status(access: CatalogAdminAccess, inputId: unknown) {
    const row = await this.owned(access, inputId);
    if (row.status !== 'AVAILABLE' && row.expiresAt <= new Date() && !['FAILED','EXPIRED','DELETING','DELETED'].includes(row.status)) {
      await this.database.client.assetFile.updateMany({ where: { id: row.id, status: row.status }, data: { status: 'EXPIRED' } });
      return fileDto(await this.owned(access, row.id));
    }
    return fileDto(row);
  }
  async upload(access: CatalogAdminAccess, inputId: unknown, request: Request) {
    const row = await this.database.client.$transaction(async tx => {
      const record = await this.owned(access, inputId, tx);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.asset_files WHERE id=${record.id}::uuid FOR UPDATE`);
      const fresh = await tx.assetFile.findUniqueOrThrow({ where: { id: record.id } }); this.usable(fresh);
      if (fresh.status !== 'PENDING') throw new ApiException('CONFLICT', '此上传已开始，请查询状态或完成校验', 409);
      return tx.assetFile.update({ where: { id: fresh.id }, data: { status: 'VERIFYING' } });
    });
    const abort = setTimeout(() => request.destroy(new Error('Upload deadline exceeded')), 120_000);
    try {
      await this.storage.receive(row.storageKey, request, { byteSize: row.byteSize, mimeType: row.mimeType, checksum: row.checksum });
      await this.database.client.$transaction(async tx => {
        await this.mutations.administrators.require(access, tx);
        const result = await tx.assetFile.updateMany({ where: { id: row.id, ownerUserId: access.actorUserId, status: 'VERIFYING', expiresAt: { gt: new Date() } }, data: { status: 'UPLOADED' } });
        if (result.count !== 1) throw new ApiException('CONFLICT', '上传会话已变化，请重新申请', 409);
      });
      return this.status(access, row.id);
    } catch (error) {
      await this.storage.remove(row.storageKey).catch(() => undefined);
      await this.database.client.assetFile.updateMany({ where: { id: row.id, status: { in: ['VERIFYING','UPLOADED'] } }, data: { status: 'FAILED' } });
      throw error;
    } finally { clearTimeout(abort); }
  }
  async complete(access: CatalogAdminAccess, inputId: unknown, input: unknown) {
    const body = parseInput(AdminDeliveryActionSchema, input), row = await this.owned(access, inputId); this.usable(row);
    if (row.status === 'AVAILABLE') return fileDto(row);
    if (row.status !== 'UPLOADED') throw new ApiException('CONFLICT', '文件尚未完成上传', 409);
    let inspected: Awaited<ReturnType<AssetStorage['inspect']>>;
    try {
      inspected = await this.storage.inspect(row.storageKey, row.byteSize);
      if (inspected.byteSize !== row.byteSize || inspected.checksum !== row.checksum || inspected.mimeType !== row.mimeType) throw new ApiException('VALIDATION_ERROR', '文件校验未通过，请重新上传', 400);
    } catch (error) {
      if (error instanceof ApiException && error.getStatus() === 400) {
        const rejected = await this.database.client.$transaction(async tx => {
          await this.mutations.administrators.require(access, tx);
          return tx.assetFile.updateMany({ where: { id: row.id, status: 'UPLOADED' }, data: { status: 'FAILED' } });
        });
        // A concurrent successful completion owns an immutable file. Never
        // delete that file when this inspection lost the state transition.
        if (rejected.count) await this.storage.remove(row.storageKey).catch(() => undefined);
      }
      throw error;
    }
    await this.mutations.run(access, 'files.complete:' + row.id, body.requestId, {}, async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.asset_files WHERE id=${row.id}::uuid FOR UPDATE`);
      const fresh = await this.owned(access, row.id, tx); this.usable(fresh);
      if (fresh.status !== 'AVAILABLE') {
        if (fresh.status !== 'UPLOADED') throw new ApiException('CONFLICT', '上传状态不允许完成', 409);
        await tx.assetFile.update({ where: { id: row.id }, data: { status: 'AVAILABLE', verifiedAt: new Date(), width: inspected.width, height: inspected.height, durationMs: inspected.durationMs } });
      }
      return { response: { id: row.id }, entityKind: 'asset_file', entityId: row.id };
    });
    return this.status(access, row.id);
  }
  async content(access: CatalogAdminAccess, inputId: unknown, range?: string) {
    await this.mutations.administrators.require(access);
    const id = parseInput(IdSchema, inputId).toLowerCase();
    const row = await this.database.client.assetFile.findFirst({ where: { id, scope: access.scope, status: 'AVAILABLE' } });
    if (!row) throw new ApiException('NOT_FOUND', '文件尚未就绪或不可访问', 404);
    return this.storedContent(row, range);
  }
  async publicCover(inputAssetId: unknown, inputFileId: unknown, range?: string) {
    const id = parseInput(IdSchema, inputAssetId).toLowerCase(), fileId = parseInput(IdSchema, inputFileId).toLowerCase();
    const scope = this.configuration.environment === 'production' ? 'LIVE' : 'DEMO';
    const asset = await this.database.client.campaignAsset.findFirst({ where: { id, fileId, scope, kind: 'COVER', status: 'READY',
      file: { status: 'AVAILABLE' }, productVersion: { status: 'PUBLISHED', currentFor: { status: 'PUBLISHED', scope, coverUrl: publicCoverPath(id, fileId) } } }, include: { file: true } });
    if (!asset?.file) throw new ApiException('NOT_FOUND', '封面当前不可公开访问', 404);
    return this.storedContent(asset.file, range);
  }
  async storedContent(row: Pick<AssetFile,'byteSize'|'storageKey'|'mimeType'|'originalName'>, range?: string) {
    return storedFileContent(this.storage, row, range);
  }
}
export async function storedFileContent(storage: AssetStorage, row: Pick<AssetFile,'byteSize'|'storageKey'|'mimeType'|'originalName'>, range?: string) {
    let start = 0, end = row.byteSize - 1;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || !match[1] && !match[2]) throw new ApiException('VALIDATION_ERROR', '文件范围不正确', 416);
      if (!match[1]) start = Math.max(0, row.byteSize - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= row.byteSize) throw new ApiException('VALIDATION_ERROR', '文件范围不可用', 416);
    }
    const file = await storage.read(row.storageKey);
    if ((await file.stat()).size !== row.byteSize) { await file.close(); throw new ApiException('SERVICE_UNAVAILABLE', '文件完整性检查失败', 503); }
    return { stream: file.createReadStream({ start, end, autoClose: true }), mimeType: row.mimeType, length: end - start + 1,
      name: row.originalName, range: range ? `bytes ${start}-${end}/${row.byteSize}` : null };
}
