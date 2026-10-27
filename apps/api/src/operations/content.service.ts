import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { IdSchema, KeySchema } from '@orai/contracts';
import { AdminPageQuerySchema, ContentAssetSaveSchema, ContentDomainSchema, ContentLocatorSchema,
  CreativeProfileSaveSchema, ProductionSourceSchema, type ContentInput } from '@orai/contracts/admin';
import { ProductConfigurationSchema, creativeContentCapabilityIssues } from '@orai/contracts/admin';
import { DatabaseService } from '../database/database.service';
import { type CatalogAdminAccess } from '../catalog/admin-access.service';
import { Prisma, type ContentRevision, type CampaignAsset } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AdminMutationService } from './admin-mutation.service';
import { contentDigest, contentFragment, locatorKey, profileDto, revisionDto } from './content-projections';
import { fileDto } from './files.service';
import { SkillBindingsService, productionDto } from './skill-bindings.service';
import { contentLock } from './content-workflow.service';

const revisionQuery = AdminPageQuerySchema.extend({ productId: IdSchema.optional(), productVersionId: IdSchema.optional(),
  assetId: IdSchema.optional(), domain: ContentDomainSchema.optional(), current: z.enum(['true']).optional(),
  creativeProfileRevisionId: IdSchema.optional(), platform: z.enum(['manual', 'douyin', 'xiaohongshu']).optional(),
  status: z.enum(['draft', 'reviewed', 'ready', 'published', 'archived']).optional(), style: z.string().trim().max(100).optional(),
}).strict().refine(value => !value.current || !!value.productId, '查询当前稿需指定商品');
const referenceQuery = AdminPageQuerySchema.extend({ sourceRevisionId: IdSchema.optional(), targetRevisionId: IdSchema.optional() }).strict();
const productionQuery = AdminPageQuerySchema.extend({ productId: IdSchema.optional(), batchKey: KeySchema.optional() }).strict();
const contextInput = z.object({ creativeProfileRevisionId: IdSchema, domain: ContentDomainSchema,
  skillSetId: IdSchema.optional(),
  inputs: z.array(z.object({ revisionId: IdSchema, digest: z.string().regex(/^[0-9a-f]{64}$/), locator: ContentLocatorSchema }).strict()).max(100),
}).strict();
const productionInput = z.object({ outputRevisionId: IdSchema, creativeProfileRevisionId: IdSchema,
  production: ProductionSourceSchema, requestId: IdSchema }).strict();
const assessmentInput = z.object({
  productId: IdSchema.toLowerCase(), productVersionId: IdSchema.toLowerCase().optional(),
  expectedRevision: z.number().int().min(0).max(2_147_483_646), requestId: IdSchema.toLowerCase(),
  configuration: ProductConfigurationSchema, creativeProfileRevisionId: IdSchema.toLowerCase(),
  production: ProductionSourceSchema.extend({
    source: z.literal('mcp'), skillSetId: IdSchema.toLowerCase(), skillVersionId: z.null().default(null),
  }).strict(),
}).strict().refine(value => !!value.productVersionId || value.expectedRevision === 0, '新题库的预期修订必须为 0');
const candidateAssessmentInput = z.object({ ...assessmentInput.shape, production: ProductionSourceSchema }).strict()
  .refine(value => !!value.productVersionId || value.expectedRevision === 0, '新题库的预期修订必须为 0');
const relations = { file: true, previewFile: true } as const;
const json = (value: unknown) => value as Prisma.InputJsonValue;
const id = (value: unknown) => parseInput(IdSchema, value).toLowerCase();

@Injectable()
export class ContentService {
  constructor(private readonly database: DatabaseService, private readonly mutations: AdminMutationService, private readonly skills: SkillBindingsService) {}

  private async product(tx: Prisma.TransactionClient, access: CatalogAdminAccess, productId: string) {
    const product = await tx.product.findFirst({ where: { id: productId, scope: access.scope } });
    if (!product) throw new ApiException('NOT_FOUND', '商品不存在于当前管理范围', 404);
    return product;
  }
  private async profile(tx: Prisma.TransactionClient, access: CatalogAdminAccess, profileId: string, productId?: string) {
    const row = await tx.creativeProfileRevision.findFirst({ where: { id: profileId, scope: access.scope, ...(productId ? { productId } : {}) } });
    if (!row) throw new ApiException('NOT_FOUND', '创作设定不存在于当前商品和管理范围', 404);
    return row;
  }
  private async revision(tx: Prisma.TransactionClient, access: CatalogAdminAccess, revisionId: string, productId?: string) {
    const row = await tx.contentRevision.findFirst({ where: { id: revisionId, scope: access.scope, ...(productId ? { productId } : {}) }, include: relations });
    if (!row) throw new ApiException('NOT_FOUND', '内容修订不存在于当前商品和管理范围', 404);
    return row;
  }
  async profiles(access: CatalogAdminAccess, productKey: unknown, query: unknown) {
    await this.mutations.administrators.require(access);
    const productId = id(productKey), args = parseInput(AdminPageQuerySchema, query);
    return this.database.client.$transaction(async tx => {
      await this.product(tx, access, productId);
      const where = { productId, scope: access.scope };
      const rows = await tx.creativeProfileRevision.findMany({ where, orderBy: { number: 'desc' },
        skip: (args.page - 1) * args.pageSize, take: args.pageSize });
      const total = await tx.creativeProfileRevision.count({ where });
      return { items: rows.map(profileDto), total, page: args.page, pageSize: args.pageSize };
    });
  }
  async readProfile(access: CatalogAdminAccess, profileKey: unknown) {
    await this.mutations.administrators.require(access);
    return profileDto(await this.profile(this.database.client, access, id(profileKey)));
  }
  async saveProfile(access: CatalogAdminAccess, productKey: unknown, input: unknown) {
    const productId = id(productKey), body = parseInput(CreativeProfileSaveSchema, input);
    return this.mutations.run(access, 'content.profile:' + productId, body.requestId, body, async tx => {
      return this.saveProfileIn(tx, access, productId, body);
    });
  }
  async saveProfileIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, productId: string, input: unknown, createdId?: string) {
    const body = parseInput(CreativeProfileSaveSchema, input);
    await this.mutations.administrators.requireProjectRow(access, ['projects:write'], { productId }, tx);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${productId}::uuid FOR UPDATE`);
      await this.product(tx, access, productId);
      const last = await tx.creativeProfileRevision.aggregate({ where: { productId }, _max: { number: true } });
      const previous = last._max.number ?? 0;
      if (previous !== body.expectedRevision) throw new ApiException('REVISION_CONFLICT', '创作设定已更新，请读取后重试', 409);
      const row = await tx.creativeProfileRevision.create({ data: { ...(createdId ? { id: createdId } : {}), productId, scope: access.scope, number: previous + 1,
        profile: json(body.profile), digest: contentDigest(body.profile) } });
      return { response: profileDto(row), entityKind: 'creative_profile_revision', entityId: row.id };
  }
  async list(access: CatalogAdminAccess, query: unknown) {
    await this.mutations.administrators.require(access);
    const args = parseInput(revisionQuery, query);
    const where: Prisma.ContentRevisionWhereInput = { scope: access.scope, ...(args.productId ? { productId: args.productId.toLowerCase() } : {}),
      ...(args.productVersionId ? { productVersionId: args.productVersionId.toLowerCase() } : {}),
      ...(args.assetId ? { assetId: args.assetId.toLowerCase() } : {}), ...(args.domain ? { domain: args.domain } : {}),
      ...(args.creativeProfileRevisionId ? { creativeProfileRevisionId: args.creativeProfileRevisionId.toLowerCase() } : {}),
      AND: [
        ...(args.status ? [{ snapshot: { path: ['status'], equals: args.status } }] : []),
        ...(args.platform ? [{ snapshot: { path: ['platform'], equals: args.platform } }] : []),
      ],
      ...(args.style ? { creativeProfile: { profile: { path: ['visual'], string_contains: args.style } } } : {}),
    };
    return this.database.client.$transaction(async tx => {
      if (args.current) {
        // Select the head before filtering; an older matching draft must never
        // masquerade as the current version after a state/profile change.
        const heads = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT DISTINCT ON (coalesce(asset_id,product_version_id)) id FROM orai.content_revisions
          WHERE scope::text=${access.scope} AND product_id=${args.productId!.toLowerCase()}::uuid
          ORDER BY coalesce(asset_id,product_version_id),source_revision DESC,created_at DESC,id DESC`);
        where.id = { in: heads.map(row => row.id) };
      }
      const rows = await tx.contentRevision.findMany({ where, include: relations,
        orderBy: [{ createdAt: 'desc' }, { sourceRevision: 'desc' }, { id: 'asc' }],
        skip: (args.page - 1) * args.pageSize, take: args.pageSize });
      const total = await tx.contentRevision.count({ where });
      return { items: rows.map(revisionDto), total, page: args.page, pageSize: args.pageSize };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async read(access: CatalogAdminAccess, revisionKey: unknown) {
    await this.mutations.administrators.require(access);
    const row = await this.revision(this.database.client, access, id(revisionKey));
    const [inputs, production] = await Promise.all([
      this.database.client.contentReference.findMany({ where: { targetRevisionId: row.id, scope: access.scope }, orderBy: { id: 'asc' } }),
      this.database.client.productionRecord.findUnique({ where: { outputRevisionId: row.id } }),
    ]);
    return { ...revisionDto(row), inputs: inputs.map(value => ({ ...value, scope: value.scope.toLowerCase() })),
      production: production ? productionDto(production) : null,
      deliveryFile: row.file ? fileDto(row.file) : null, previewFile: row.previewFile ? fileDto(row.previewFile) : null };
  }
  private checkSource(row: ContentRevision, profileId: string, expectedDigest: string) {
    if (row.digest !== expectedDigest) throw new ApiException('CONFLICT', '输入摘要与指定修订不一致', 409);
    if (row.creativeProfileRevisionId && row.creativeProfileRevisionId !== profileId)
      throw new ApiException('CONFLICT', '输入与目标使用不同创作设定，请明确复查后制作新稿', 409);
  }
  private async inputs(tx: Prisma.TransactionClient, access: CatalogAdminAccess, productId: string, profileId: string,
    domain: string, target: Record<string, unknown>, inputs: ContentInput[]) {
    const keys = new Set<string>(), resolved = [];
    for (const input of inputs) {
      const row = await this.revision(tx, access, input.sourceRevisionId.toLowerCase(), productId);
      this.checkSource(row, profileId, input.sourceDigest);
      const fragment = contentFragment(row, input.locator, domain);
      const position = row.id + ':' + locatorKey(input.locator) + ':' + locatorKey(input.targetLocator) + ':' + input.role;
      if (keys.has(position)) throw new ApiException('VALIDATION_ERROR', '同一使用位置重复引用', 400);
      keys.add(position);
      const targetFragment = contentFragment({ ...row, domain, snapshot: target as Prisma.JsonObject, fileId: null, previewFileId: null }, input.targetLocator, domain);
      if (typeof targetFragment.text !== 'string' || !targetFragment.text.includes(input.usedText))
        throw new ApiException('CONFLICT', '实际使用文本不在声明的目标位置', 409);
      if (input.mode === 'exact' && fragment.text !== input.usedText)
        throw new ApiException('CONFLICT', '原文引用必须与来源一致，改写请明确标识', 409);
      resolved.push({ input, sourceRevisionId: row.id, fragment });
    }
    return resolved;
  }
  private async mediaFile(tx: Prisma.TransactionClient, access: CatalogAdminAccess, versionId: string, kind: CampaignAsset['kind'], fileId: string | null) {
    if (!fileId) return null;
    const file = await tx.assetFile.findFirst({ where: { id: fileId.toLowerCase(), productVersionId: versionId, scope: access.scope, kind, status: 'AVAILABLE' } });
    if (!file) throw new ApiException('CONFLICT', '文件未校验或不属于当前商品版本与用途', 409);
    return file;
  }
  private machineProduction(access: CatalogAdminAccess, requestId: string, source: string) {
    if (!access.machineCredentialId) return {};
    if (source !== 'mcp') throw new ApiException('VALIDATION_ERROR', '机器保存必须标明 MCP 来源', 400);
    return { machineCredentialId: access.machineCredentialId, machineRequestId: id(requestId) };
  }
  async saveAssessment(access: CatalogAdminAccess, input: unknown) {
    const body = parseInput(assessmentInput, input);
    if (!access.machineCredentialId) throw new ApiException('FORBIDDEN', '此保存入口需要受信任的机器授权', 403);
    return this.mutations.run(access, 'content.assessment:' + (body.productVersionId ?? 'new'), body.requestId, body, async tx => {
      return this.saveAssessmentIn(tx, access, body);
    });
  }
  async saveAssessmentIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, input: unknown, candidateModuleId?: string) {
    const body = parseInput(candidateModuleId ? candidateAssessmentInput : assessmentInput, input);
    if (candidateModuleId) await this.mutations.administrators.requireProjectRow(access, ['content:write'],
      { productId: body.productId, planModuleId: candidateModuleId,
        planRevisionId: (await tx.productionPlanModule.findUniqueOrThrow({ where: { id: candidateModuleId } })).planRevisionId }, tx);

      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${body.productId}::uuid FOR UPDATE`);
      await this.product(tx, access, body.productId);
      await contentLock(tx, access, body.productId);
      const profile = profileDto(await this.profile(tx, access, body.creativeProfileRevisionId, body.productId));
      const capabilityIssues = creativeContentCapabilityIssues(profile.profile);
      if (capabilityIssues.length) throw new ApiException('CONFLICT', capabilityIssues.join('；'), 409);
      const skillSource = candidateModuleId ? null : await this.skills.productionIn(tx, access, profile.id, 'assessment', body.production);
      let version;
      if (body.productVersionId) {
        const previous = await tx.productVersion.findFirst({
          where: { id: body.productVersionId, productId: body.productId, scope: access.scope },
        });
        if (!previous) throw new ApiException('NOT_FOUND', '题库版本不存在于当前商品和管理范围', 404);
        if (previous.status !== 'DRAFT') throw new ApiException('VERSION_IMMUTABLE', '机器只能修改题库草稿，已审核内容请派生新版本', 409);
        if (previous.revision !== body.expectedRevision)
          throw new ApiException('REVISION_CONFLICT', '题库草稿已更新，请读取后重试', 409);
        version = await tx.productVersion.update({
          where: { id: previous.id },
          data: { configuration: json(body.configuration), creativeProfileRevisionId: profile.id, revision: { increment: 1 } },
        });
      } else {
        const latest = await tx.productVersion.aggregate({ where: { productId: body.productId }, _max: { number: true } });
        const number = (latest._max.number ?? 0) + 1;
        if (number > 2_147_483_647) throw new ApiException('CONFLICT', '商品版本数量超出支持范围', 409);
        version = await tx.productVersion.create({
          data: { productId: body.productId, scope: access.scope, number, status: 'DRAFT',
            configuration: json(body.configuration), creativeProfileRevisionId: profile.id },
        });
      }
      const revision = await tx.contentRevision.findFirstOrThrow({
        where: { productVersionId: version.id, assetId: null, sourceRevision: version.revision }, include: relations,
      });
      if (!candidateModuleId) await tx.productionRecord.create({
        data: { productId: body.productId, scope: access.scope, outputRevisionId: revision.id,
          creativeProfileRevisionId: profile.id, actorUserId: access.actorUserId, ...body.production,
          ...skillSource, ...this.machineProduction(access, body.requestId, body.production.source), inputManifest: [] },
      });
      return { response: revisionDto(revision), entityKind: 'content_revision', entityId: revision.id };
  }
  async saveAsset(access: CatalogAdminAccess, input: unknown) {
    const body = parseInput(ContentAssetSaveSchema, input);
    const assetId = body.assetId?.toLowerCase();
    return this.mutations.run(access, 'content.asset:' + (assetId ?? 'new'), body.requestId, body, async tx => {
      return this.saveAssetIn(tx, access, body);
    });
  }
  async saveAssetIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, input: unknown, candidateModuleId?: string) {
    const body = parseInput(ContentAssetSaveSchema, input);
    const assetId = body.assetId?.toLowerCase(), versionId = body.productVersionId.toLowerCase();
    const authoring = { ...body.authoring, creativeProfileRevisionId: body.authoring.creativeProfileRevisionId.toLowerCase(),
      media: { ...body.authoring.media, previewFileId: body.authoring.media.previewFileId?.toLowerCase() ?? null } };

      const version = await tx.productVersion.findFirst({ where: { id: versionId, scope: access.scope } });
      if (!version) throw new ApiException('NOT_FOUND', '商品版本不存在于当前管理范围', 404);
      await contentLock(tx, access, version.productId);
      const profile = profileDto(await this.profile(tx, access, authoring.creativeProfileRevisionId, version.productId));
      const content = authoring.content, kind = content.kind.toUpperCase() as CampaignAsset['kind'], domain = content.kind === 'script' ? 'video' : content.kind;
      if (!profile.profile.deliverables.includes(domain) || !profile.profile.channels.includes(body.platform))
        throw new ApiException('CONFLICT', '内容领域或传播渠道不在当前创作设定中', 409);
      if (candidateModuleId) await this.mutations.administrators.requireProjectRow(access, ['content:write'],
        { productId: version.productId, planModuleId: candidateModuleId, planRevisionId: (await tx.productionPlanModule.findUniqueOrThrow({ where: { id: candidateModuleId } })).planRevisionId }, tx);
      const skillSource = candidateModuleId ? { skillVersionId: null, skillSetId: null } : await this.skills.productionIn(tx, access, authoring.creativeProfileRevisionId, domain, authoring.production);
      authoring.production = { ...authoring.production, skillVersionId: skillSource.skillVersionId,
        ...(skillSource.skillSetId ? { skillSetId: skillSource.skillSetId } : {}) };
      if (assetId) {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.campaign_assets WHERE id=${assetId}::uuid FOR UPDATE`);
        const previous = await tx.campaignAsset.findFirst({ where: { id: assetId, scope: access.scope } });
        if (!previous) throw new ApiException('NOT_FOUND', '素材不存在于当前管理范围', 404);
        if (previous.productVersionId !== versionId || previous.kind !== kind || previous.platform.toLowerCase() !== body.platform)
          throw new ApiException('CONFLICT', '素材的商品版本、领域和平台不可更换', 409);
        if (previous.revision !== body.expectedRevision) throw new ApiException('REVISION_CONFLICT', '素材已更新，请读取后重试', 409);
        if (access.machineCredentialId && previous.status !== 'DRAFT')
          throw new ApiException('VERSION_IMMUTABLE', '机器只能修改内容草稿，已审核内容请创建新稿', 409);
      }
      const text = content.kind === 'copy' ? content.blocks.map(block => block.text).join('\n') :
        content.kind === 'script' ? content.scenes.map(scene => scene.text).join('\n') : null;
      if (text && text.length > 20000) throw new ApiException('VALIDATION_ERROR', '文本素材合计不能超过 20000 字符', 400);
      const target = { kind: content.kind, text, authoring };
      const inputs = await this.inputs(tx, access, version.productId, authoring.creativeProfileRevisionId, domain, target, authoring.inputs);
      const file = await this.mediaFile(tx, access, versionId, kind, body.fileId);
      await this.mediaFile(tx, access, versionId, kind, authoring.media.previewFileId);
      const data = { text, variant: body.variant, fileId: file?.id ?? null, storageKey: file?.storageKey ?? null,
        mimeType: file?.mimeType ?? null, byteSize: file?.byteSize ?? null, checksum: file?.checksum ?? null, authoring: json(authoring) };
      const asset = assetId ? await tx.campaignAsset.update({ where: { id: assetId }, data: { ...data, status: 'DRAFT', revision: { increment: 1 } } }) :
        await tx.campaignAsset.create({ data: { ...data, productVersionId: versionId, scope: access.scope, kind, platform: body.platform.toUpperCase() as CampaignAsset['platform'] } });
      const revision = await tx.contentRevision.findFirstOrThrow({ where: { assetId: asset.id, sourceRevision: asset.revision }, include: relations });
      // Unchanged authoring copied by a legacy status transition keeps provenance.
      if (!await tx.productionRecord.findUnique({ where: { outputRevisionId: revision.id } })) {
        for (const resolved of inputs) {
          const input = resolved.input;
          await tx.contentReference.create({ data: { productId: version.productId, scope: access.scope, targetRevisionId: revision.id,
            sourceRevisionId: resolved.sourceRevisionId, locator: json(input.locator), locatorKey: locatorKey(input.locator),
            targetLocator: json(input.targetLocator), targetLocatorKey: locatorKey(input.targetLocator), role: input.role, mode: input.mode,
            sourceDigest: input.sourceDigest, sourceSnapshot: json(resolved.fragment), usedText: input.usedText } });
        }
        if (!candidateModuleId) await tx.productionRecord.create({ data: { productId: version.productId, scope: access.scope, outputRevisionId: revision.id,
          creativeProfileRevisionId: authoring.creativeProfileRevisionId, actorUserId: access.actorUserId, ...authoring.production,
          ...skillSource,
          ...this.machineProduction(access, body.requestId, authoring.production.source),
          inputManifest: json(inputs.map(item => ({ revisionId: item.sourceRevisionId, digest: item.input.sourceDigest,
            locator: item.input.locator, targetLocator: item.input.targetLocator, mode: item.input.mode, content: item.fragment, usedText: item.input.usedText }))) } });
      }
      return { response: revisionDto(revision), entityKind: 'content_revision', entityId: revision.id };
  }
  async references(access: CatalogAdminAccess, query: unknown) {
    await this.mutations.administrators.require(access); const args = parseInput(referenceQuery, query);
    const where = { scope: access.scope, ...(args.sourceRevisionId ? { sourceRevisionId: args.sourceRevisionId.toLowerCase() } : {}),
      ...(args.targetRevisionId ? { targetRevisionId: args.targetRevisionId.toLowerCase() } : {}) };
    const [items, total] = await this.database.client.$transaction([
      this.database.client.contentReference.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.database.client.contentReference.count({ where }),
    ]); return { items: items.map(value => ({ ...value, scope: value.scope.toLowerCase() })), total, page: args.page, pageSize: args.pageSize };
  }
  async productions(access: CatalogAdminAccess, query: unknown) {
    await this.mutations.administrators.require(access); const args = parseInput(productionQuery, query);
    const where = { scope: access.scope, ...(args.productId ? { productId: args.productId.toLowerCase() } : {}), ...(args.batchKey ? { batchKey: args.batchKey } : {}) };
    const [items, total] = await this.database.client.$transaction([
      this.database.client.productionRecord.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.database.client.productionRecord.count({ where }),
    ]); return { items: items.map(productionDto), total, page: args.page, pageSize: args.pageSize };
  }
  async recordProduction(access: CatalogAdminAccess, input: unknown) {
    const body = parseInput(productionInput, input);
    return this.mutations.run(access, 'content.production', body.requestId, body, async tx => {
      const output = await this.revision(tx, access, body.outputRevisionId.toLowerCase());
      const profile = await this.profile(tx, access, body.creativeProfileRevisionId.toLowerCase(), output.productId);
      await contentLock(tx, access, output.productId);
      if (output.domain !== 'assessment') throw new ApiException('CONFLICT', '素材来源需与内容修订同时保存', 409);
      if (output.creativeProfileRevisionId && output.creativeProfileRevisionId !== profile.id)
        throw new ApiException('CONFLICT', '制作来源与题库固定创作设定不一致', 409);
      const record = await tx.productionRecord.create({ data: { productId: output.productId, scope: access.scope,
        outputRevisionId: output.id, creativeProfileRevisionId: profile.id, actorUserId: access.actorUserId,
        ...body.production, ...await this.skills.productionIn(tx, access, profile.id, output.domain, body.production),
        ...this.machineProduction(access, body.requestId, body.production.source), inputManifest: [] } });
      return { response: productionDto(record), entityKind: 'production_record', entityId: record.id };
    });
  }
  async context(access: CatalogAdminAccess, input: unknown) {
    await this.mutations.administrators.require(access); const body = parseInput(contextInput, input);
    return this.database.client.$transaction(async tx => {
      await this.mutations.administrators.require(access, tx);
      const profile = await this.profile(tx, access, body.creativeProfileRevisionId.toLowerCase()), inputs = [];
      const set = body.skillSetId ? await this.skills.readIn(tx, access, body.skillSetId, profile.id) : null;
      if (set) await this.skills.verifyFiles(set, tx, body.domain);
      for (const input of body.inputs) {
        const row = await this.revision(tx, access, input.revisionId.toLowerCase(), profile.productId);
        this.checkSource(row, profile.id, input.digest);
        inputs.push({ revisionId: row.id, productVersionId: row.productVersionId, digest: row.digest, locator: input.locator,
          content: contentFragment(row, input.locator, body.domain) });
      }
      return { productId: profile.productId, creativeProfileRevisionId: profile.id, domain: body.domain,
        creativeProfile: profileDto(profile), ...(set ? { skillSetId: set.id } : {}),
        skillVersions: set?.bindings.filter(item => item.domain === body.domain) ?? [], inputs };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
