import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { IdSchema } from '@orai/contracts';
import {
  AdminPageQuerySchema, BoundSkillSchema, CreativeProfileSchema, ExperienceAuthoringRevisionSchema,
  ExperienceDraftInputSchema, ExperienceSaveSchema, ExperienceReviewSchema, ExperienceWorkspaceSchema,
  ExperienceCheckSchema, ExperiencePreviewInputSchema, ExperiencePreviewSchema, ProductConfigurationSchema,
  ExperienceWorkspaceQuerySchema, productCapabilities,
} from '@orai/contracts/admin';
import { ExperienceManifestSchema, ExperienceReleaseSchema } from '@orai/contracts/experience';
import { DatabaseService } from '../database/database.service';
import type { CatalogAdminAccess } from '../catalog/admin-access.service';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { Prisma, type ExperienceAuthoringRevision, type ProductVersion } from '../generated/prisma/client';
import { configurationDigest, defaultExperience, experienceDigest, experienceDraftIssues, verifyExperienceFiles, verifyExperienceMethodFiles } from '../catalog/experience-authoring';
import { scoreAnswers } from '../runtime/scoring';
import { AdminMutationService } from './admin-mutation.service';
import { AssetStorage } from './asset-storage';
import { fixedVersion } from './skill-bindings.service';
import { bindSkillProductPlan, requireSkillProductPolicy } from './skill-product-policy';
import { requireExperienceProductPolicy } from '../catalog/experience-product-policy';

const id = (value: unknown) => parseInput(IdSchema, value).toLowerCase();
export const experienceRevisionDto = (row: ExperienceAuthoringRevision) => {
  const { number, actorUserId: _actor, creativeProfileRevisionId: _profile, projectPlanModuleId, productPlanInput, ...rest } = row;
  return ExperienceAuthoringRevisionSchema.parse({ ...rest, ...(productPlanInput ? { productPlanInput } : {}),
    revision: number, scope: row.scope.toLowerCase(), createdAt: row.createdAt.toISOString() });
};
type DraftInput = z.infer<typeof ExperienceDraftInputSchema>;
@Injectable()
export class ExperienceAuthoringService {
  constructor(private readonly database: DatabaseService, private readonly mutations: AdminMutationService, private readonly storage: AssetStorage) {}
  private async version(tx: Prisma.TransactionClient, access: CatalogAdminAccess, productId: string, versionId: string, lock = false) {
    if (lock) await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${productId}::uuid FOR UPDATE`);
    const row = await tx.productVersion.findFirst({ where: { id: versionId, productId, scope: access.scope }, include: { product: true } });
    if (!row) throw new ApiException('NOT_FOUND', '题库版本不属于当前商品或管理范围', 404);
    return row;
  }
  private async profile(tx: Prisma.TransactionClient, access: CatalogAdminAccess, productId: string, profileId: string) {
    const row = await tx.creativeProfileRevision.findFirst({ where: { id: profileId, productId, scope: access.scope } });
    if (!row) throw new ApiException('NOT_FOUND', '创作设定不属于当前商品或管理范围', 404);
    return row;
  }
  async workspace(access: CatalogAdminAccess, product: unknown, version: unknown, input: unknown) {
    await this.mutations.administrators.require(access);
    const query = parseInput(ExperienceWorkspaceQuerySchema, input);
    return this.database.client.$transaction(async tx => {
      await this.mutations.administrators.require(access, tx);
      const row = await this.version(tx, access, id(product), id(version));
      const profileId = row.creativeProfileRevisionId ?? query.profileId;
      const profile = profileId ? await this.profile(tx, access, row.productId, profileId) : null;
      const latest = await tx.experienceAuthoringRevision.findFirst({ where: { productVersionId: row.id }, orderBy: { number: 'desc' } });
      const release = await tx.experienceRelease.findUnique({ where: { productVersionId: row.id } });
      const config = ProductConfigurationSchema.parse(row.configuration);
      const defaultManifest = defaultExperience(row, row.product.themeKey, profile);
      const capabilities = query.includeCapabilities ? productCapabilities({
        profile: profile ? CreativeProfileSchema.parse(profile.profile) : null, profileRevisionId: profile?.id, profileFixed: !!row.creativeProfileRevisionId,
        manifest: latest ? ExperienceManifestSchema.parse(latest.manifest) : release ? ExperienceManifestSchema.parse(release.manifest) : defaultManifest,
        hasContentVersion: true,
        capabilityVersion: query.capabilityVersion,
      }) : undefined;
      return ExperienceWorkspaceSchema.parse({ productVersionId: row.id, versionRevision: row.revision, versionStatus: row.status.toLowerCase(),
        questions: config.questions.map(({id,text,dimensionId,required,options})=>({id,text,dimensionId,required,options:options.map(({id,label,notApplicable})=>({id,label,notApplicable}))})),
        defaultManifest, reportPlan: profile ? CreativeProfileSchema.parse(profile.profile).reportPlan : null,
        latest: latest ? experienceRevisionDto(latest) : null, release: release ? ExperienceReleaseSchema.parse({ id: release.id, digest: release.digest, manifest: release.manifest }) : null,
        ...(capabilities ? { capabilities } : {}) });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async read(access: CatalogAdminAccess, key: unknown, tx: Prisma.TransactionClient = this.database.client) {
    await this.mutations.administrators.require(access, tx);
    const row = await tx.experienceAuthoringRevision.findFirst({ where: { id: id(key), scope: access.scope } });
    if (!row) throw new ApiException('NOT_FOUND', '体验修订不存在于当前管理范围', 404);
    return experienceRevisionDto(row);
  }
  async history(access: CatalogAdminAccess, product: unknown, version: unknown, input: unknown) {
    await this.mutations.administrators.require(access);
    const args = parseInput(AdminPageQuerySchema, input);
    await this.version(this.database.client, access, id(product), id(version));
    const where = { productVersionId: id(version), scope: access.scope };
    const [rows, total] = await this.database.client.$transaction([
      this.database.client.experienceAuthoringRevision.findMany({ where, orderBy: { number: 'desc' }, skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.database.client.experienceAuthoringRevision.count({ where }),
    ]);
    return { items: rows.map(experienceRevisionDto), total, page: args.page, pageSize: args.pageSize };
  }
  async checkReferences(access: CatalogAdminAccess, key: unknown) {
    const draft = await this.read(access, key);
    return this.database.client.$transaction(async tx => {
      await this.mutations.administrators.require(access, tx);
      const { version, issues } = await this.inspect(tx, access, draft.productId, draft.productVersionId,
        { manifest: draft.manifest, reportPlan: draft.reportPlan, methods: [], note: draft.note });
      for (const binding of draft.methods) for (const ref of binding.version.files) {
        const file = await tx.skillReferenceFile.findFirst({ where: { id: ref.file.id, skillId: binding.version.skillId, scope: access.scope, status: 'AVAILABLE' } });
        if (!file || file.checksum !== ref.file.checksum || file.byteSize !== ref.file.byteSize || file.mimeType !== ref.file.mimeType)
          throw new ApiException('CONFLICT', '固定体验方法参考文件与历史快照不一致', 409);
        const actual = await this.storage.inspectReference(file.storageKey, ref.file.byteSize, ref.file.mimeType);
        if (actual.checksum !== ref.file.checksum || actual.byteSize !== ref.file.byteSize || actual.mimeType !== ref.file.mimeType)
          throw new ApiException('CONFLICT', '固定体验方法参考文件完整性校验失败', 409);
      }
      if (draft.configurationDigest !== configurationDigest(version.configuration)) issues.push('题库已变化，请重新保存并审核');
      const row = await tx.experienceAuthoringRevision.findUniqueOrThrow({ where: { id: draft.id } });
      const publication = await this.publicationCheck(tx, version, row);
      return ExperienceCheckSchema.parse({ valid: !issues.length, issues, publication });
    });
  }
  async methods(tx: Prisma.TransactionClient, access: CatalogAdminAccess, choices: DraftInput['methods'], retained: unknown = [],
    form: z.infer<typeof CreativeProfileSchema>['experienceForm'] = 'web',
    context?: { productId: string; profileId: string; productPlan?: DraftInput['productPlan']; planModuleId?: string }) {
    const previous = z.array(BoundSkillSchema).parse(retained);
    const result: z.infer<typeof BoundSkillSchema>[] = [];
    for (const key of [...new Set(choices.map(v => id(v.skillVersionId)))].sort())
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.style_skill_versions WHERE id=${key}::uuid FOR SHARE`);
    for (const choice of choices) {
      const row = await tx.styleSkillVersion.findFirst({ where: { id: id(choice.skillVersionId), scope: access.scope, skill: { domain: 'experience' } },
        include: { skill: true, attachments: { include: { file: true } } } });
      if (!row) throw new ApiException('NOT_FOUND', '体验方法版本不属于当前领域或范围', 404);
      const version = fixedVersion(row), allowedOld = row.status === 'ARCHIVED' && previous.some(p => p.purpose === choice.purpose && p.version.id === row.id);
      requireSkillProductPolicy(version.manifest);
      if (!context) throw new ApiException('VALIDATION_ERROR', '体验方法必须提供实际的商品规划输入', 400);
      const productPlanInput = await bindSkillProductPlan(tx, access, { productId: context.productId, profileId: context.profileId,
        reference: context.productPlan, moduleId: choice.planModuleId ?? context.planModuleId, purpose: choice.purpose, domain: 'experience', form });
      if ((row.status !== 'ACTIVE' && !allowedOld) || !version.manifest.purposes.includes(choice.purpose) || !version.manifest.supportedForms.includes(form))
        throw new ApiException('CONFLICT', '体验方法需匹配用途和当前创作形式；新绑定必须使用已启用版本', 409);
      for (const ref of row.attachments) {
        if (ref.file.status !== 'AVAILABLE') throw new ApiException('CONFLICT', '体验方法参考文件不可用', 409);
        const actual = await this.storage.inspectReference(ref.file.storageKey, ref.file.byteSize, ref.file.mimeType);
        if (actual.checksum !== ref.file.checksum || actual.byteSize !== ref.file.byteSize || actual.mimeType !== ref.file.mimeType)
          throw new ApiException('CONFLICT', '体验方法参考文件摘要不一致', 409);
      }
      result.push(BoundSkillSchema.parse({ purpose: choice.purpose, domain: 'experience', version, productPlanInput }));
    }
    return result;
  }
  private async inspect(tx: Prisma.TransactionClient, access: CatalogAdminAccess, productId: string, versionId: string, body: DraftInput) {
    const version = await this.version(tx, access, productId, versionId);
    if (!body.manifest.creativeProfileRevisionId) throw new ApiException('CONFLICT', '制作体验需要固定的共同创作设定', 409);
    const profile = await this.profile(tx, access, productId, body.manifest.creativeProfileRevisionId);
    const issues = experienceDraftIssues(body.manifest, body.reportPlan, version, profile);
    await verifyExperienceFiles(tx, body.manifest, access.scope, this.storage);
    return { version, profile, issues };
  }
  private async publicationCheck(tx: Prisma.TransactionClient, version: ProductVersion,
    authored: Parameters<typeof requireExperienceProductPolicy>[2]) {
    try {
      const { input } = await requireExperienceProductPolicy(tx, version, authored);
      return { eligibleForReview: true, issues: [], deviceAcceptance: 'not_performed' as const, productPlanInput: input };
    } catch (error) {
      if (!(error instanceof ApiException)) throw error;
      return { eligibleForReview: false, issues: [error.publicMessage], deviceAcceptance: 'not_performed' as const };
    }
  }
  async check(access: CatalogAdminAccess, product: unknown, version: unknown, input: unknown) {
    await this.mutations.administrators.require(access);
    const parsed = ExperienceDraftInputSchema.safeParse(input);
    if (!parsed.success) return ExperienceCheckSchema.parse({ valid: false, issues: parsed.error.issues.slice(0,20).map(issue => issue.message.slice(0,300)) });
    return this.database.client.$transaction(async tx => {
      await this.mutations.administrators.require(access, tx);
      const { issues, profile, version: contentVersion } = await this.inspect(tx, access, id(product), id(version), parsed.data);
      const latest = await tx.experienceAuthoringRevision.findFirst({ where: { productVersionId: id(version) }, orderBy: { number: 'desc' } });
      const form = CreativeProfileSchema.parse(profile.profile).experienceForm;
      const retained = latest ? BoundSkillSchema.array().parse(latest.methods) : [];
      const retainedProject = !!latest?.projectPlanModuleId && parsed.data.methods.length === retained.length && parsed.data.methods.every(choice =>
        retained.some(binding => binding.purpose === choice.purpose && binding.version.id === choice.skillVersionId && !!binding.projectMethod));
      const methods = retainedProject ? retained : await this.methods(tx, access, parsed.data.methods,
        latest?.creativeProfileRevisionId === profile.id ? latest.methods : [], form,
        { productId: id(product), profileId: profile.id, productPlan: parsed.data.productPlan, planModuleId: parsed.data.planModuleId });
      const productPlanInput = parsed.data.productPlan ? await bindSkillProductPlan(tx, access, { productId: id(product), profileId: profile.id,
        reference: parsed.data.productPlan, moduleId: parsed.data.planModuleId ?? methods[0]?.productPlanInput?.planModuleId,
        purpose: 'scene_design', domain: 'experience', form }) : undefined;
      const publication = await this.publicationCheck(tx, { ...contentVersion, creativeProfileRevisionId: profile.id }, {
        manifest: parsed.data.manifest, methods, productPlanInput, ...(retainedProject ? { projectPlanModuleId: latest!.projectPlanModuleId } : {}) });
      return ExperienceCheckSchema.parse({ valid: !issues.length, issues, publication });
    });
  }
  private async append(tx: Prisma.TransactionClient, data: Omit<Prisma.ExperienceAuthoringRevisionUncheckedCreateInput, 'id'|'digest'|'resources'>) {
    const row = await tx.experienceAuthoringRevision.create({ data: { ...data, digest: experienceDigest(data) } });
    const manifest = ExperienceManifestSchema.parse(row.manifest);
    for (const resource of manifest.resources) await tx.experienceAuthoringResource.create({ data: {
      revisionId: row.id, productVersionId: row.productVersionId, scope: row.scope, resourceId: resource.resourceId, fileId: resource.fileId,
    } });
    return row;
  }
  async save(access: CatalogAdminAccess, product: unknown, versionInput: unknown, input: unknown, fromMachine = false) {
    if (!!access.machineCredentialId !== fromMachine) throw new ApiException('FORBIDDEN', '制作来源与当前授权不一致', 403);
    const body = parseInput(ExperienceSaveSchema, input), productId = id(product), versionId = id(versionInput);
    const result = await this.mutations.run(access, 'experience.save:' + versionId, body.requestId, body, async tx => {
      let version = await this.version(tx, access, productId, versionId, true);
      if (!['DRAFT','REVIEWED'].includes(version.status)) throw new ApiException('VERSION_IMMUTABLE', '已发布体验不可修改，请先派生新的题库版本', 409);
      const latest = await tx.experienceAuthoringRevision.findFirst({ where: { productVersionId: versionId }, orderBy: { number: 'desc' } });
      if ((latest?.number ?? 0) !== body.expectedRevision || version.revision !== body.expectedVersionRevision)
        throw new ApiException('REVISION_CONFLICT', '体验或题库已更新，请读取最新版本再保存', 409);
      const { profile } = await this.inspect(tx, access, productId, versionId, body);
      if (body.manifest.content.versionId !== versionId || (version.creativeProfileRevisionId && version.creativeProfileRevisionId !== profile.id))
        throw new ApiException('CONFLICT', '体验必须使用此题库版本及其固定设定', 409);
      const methods = await this.methods(tx, access, body.methods, latest?.creativeProfileRevisionId === profile.id ? latest.methods : [], CreativeProfileSchema.parse(profile.profile).experienceForm,
        { productId, profileId: profile.id, productPlan: body.productPlan, planModuleId: body.planModuleId });
      const productPlanInput = body.productPlan ? await bindSkillProductPlan(tx, access, { productId, profileId: profile.id,
        reference: body.productPlan, moduleId: body.planModuleId ?? methods[0]?.productPlanInput?.planModuleId,
        purpose: 'scene_design', domain: 'experience', form: CreativeProfileSchema.parse(profile.profile).experienceForm }) : undefined;
      if (!version.creativeProfileRevisionId) {
        const changed = await tx.productVersion.update({ where: { id: versionId }, data: { creativeProfileRevisionId: profile.id, status: 'DRAFT', revision: { increment: 1 } } });
        version = { ...version, ...changed };
      }
      const row = await this.append(tx, { productId, productVersionId: versionId, scope: access.scope, creativeProfileRevisionId: profile.id,
        number: (latest?.number ?? 0) + 1, status: 'draft', versionRevision: version.revision, configurationDigest: configurationDigest(version.configuration),
        manifest: body.manifest, reportPlan: body.reportPlan, methods, ...(productPlanInput ? { productPlanInput } : {}),
        note: body.note, source: fromMachine ? 'mcp' : body.source,
        actorUserId: access.actorUserId, machineCredentialId: access.machineCredentialId ?? null, machineRequestId: fromMachine ? body.requestId : null });
      return { response: { id: row.id }, entityKind: 'experience_revision', entityId: row.id };
    });
    return this.read(access, result.id);
  }
  async review(access: CatalogAdminAccess, key: unknown, input: unknown) {
    if (access.machineCredentialId) throw new ApiException('FORBIDDEN', '体验审核由运营人员执行', 403);
    const body = parseInput(ExperienceReviewSchema, input), revisionId = id(key);
    const result = await this.mutations.run(access, 'experience.review:' + revisionId, body.requestId, body, async tx => {
      const previous = await tx.experienceAuthoringRevision.findFirst({ where: { id: revisionId, scope: access.scope } });
      if (!previous) throw new ApiException('NOT_FOUND', '体验修订不存在', 404);
      const version = await this.version(tx, access, previous.productId, previous.productVersionId, true);
      const latest = await tx.experienceAuthoringRevision.findFirstOrThrow({ where: { productVersionId: version.id }, orderBy: { number: 'desc' } });
      if (latest.id !== revisionId || latest.number !== body.expectedRevision || latest.status !== 'draft')
        throw new ApiException('REVISION_CONFLICT', '请审核最新的体验草稿', 409);
      if (!['DRAFT','REVIEWED'].includes(version.status) || previous.configurationDigest !== configurationDigest(version.configuration))
        throw new ApiException('CONFLICT', '题库已变化或已发布，请先重新保存体验草稿', 409);
      const value = experienceRevisionDto(previous);
      const { issues } = await this.inspect(tx, access, previous.productId, version.id, { ...value,
        methods: value.methods.map(m => ({ purpose: m.purpose as 'scene_design'|'report_presentation', skillVersionId: m.version.id })) });
      if (issues.length) throw new ApiException('INVALID_CONFIGURATION', issues.join('；'), 400);
      await requireExperienceProductPolicy(tx, version, previous);
      await verifyExperienceMethodFiles(tx, previous.methods, access.scope, this.storage);
      const { id: _id, digest: _digest, createdAt: _created, ...data } = previous;
      const row = await this.append(tx, { ...data, productPlanInput: previous.productPlanInput ?? Prisma.DbNull,
        manifest: value.manifest, reportPlan: value.reportPlan, methods: value.methods,
        number: previous.number + 1, status: 'reviewed' });
      return { response: { id: row.id }, entityKind: 'experience_revision', entityId: row.id };
    });
    return this.read(access, result.id);
  }
  async saveCandidateIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, moduleId: string,
    productId: string, versionId: string, input: unknown, methods: z.infer<typeof BoundSkillSchema>[]) {
    const module = await tx.productionPlanModule.findUniqueOrThrow({ where: { id: moduleId }, include: { plan: true } });
    await this.mutations.administrators.requireProjectRow(access, ['content:write'],
      { productId, planRevisionId: module.planRevisionId, planModuleId: moduleId }, tx);
    const body = parseInput(ExperienceSaveSchema, input);
    const version = await this.version(tx, access, productId, versionId, true);
    if (version.status !== 'DRAFT') throw new ApiException('VERSION_IMMUTABLE', '机器只保存私有体验草稿', 409);
    const latest = await tx.experienceAuthoringRevision.findFirst({ where: { productVersionId: versionId }, orderBy: { number: 'desc' } });
    if ((latest?.number ?? 0) !== body.expectedRevision || version.revision !== body.expectedVersionRevision)
      throw new ApiException('REVISION_CONFLICT', '体验或题库已更新', 409);
    const { profile, issues } = await this.inspect(tx, access, productId, versionId, body);
    if (issues.length) throw new ApiException('INVALID_CONFIGURATION', issues.join('；'), 400);
    if ((body.planModuleId && body.planModuleId !== module.id) ||
      (body.productPlan && (body.productPlan.revisionId !== module.planRevisionId || body.productPlan.digest !== module.plan.digest)))
      throw new ApiException('CONFLICT', '体验制作稿的规划输入与授权模块不一致', 409);
    const productPlanInput = await bindSkillProductPlan(tx, access, { productId, profileId: profile.id,
      reference: { revisionId: module.planRevisionId, digest: module.plan.digest }, moduleId: module.id,
      purpose: 'scene_design', domain: 'experience', form: CreativeProfileSchema.parse(profile.profile).experienceForm });
    const row = await this.append(tx, { productId, productVersionId: versionId, scope: access.scope,
      creativeProfileRevisionId: profile.id, projectPlanModuleId: moduleId,
      number: (latest?.number ?? 0) + 1, status: 'draft', versionRevision: version.revision,
      configurationDigest: configurationDigest(version.configuration), manifest: body.manifest, reportPlan: body.reportPlan,
      methods, productPlanInput, note: body.note, source: 'mcp', actorUserId: access.actorUserId,
      machineCredentialId: access.machineCredentialId!, machineRequestId: body.requestId });
    return experienceRevisionDto(row);
  }
  async preview(access: CatalogAdminAccess, key: unknown, input: unknown) {
    if (access.machineCredentialId) throw new ApiException('FORBIDDEN', '机器制作不读取评估结果预览', 403);
    const body = parseInput(ExperiencePreviewInputSchema, input), revisionId = id(key);
    return this.database.client.$transaction(async tx => {
      const draft = await this.read(access, revisionId, tx);
      const { version, issues } = await this.inspect(tx, access, draft.productId, draft.productVersionId, { ...draft,
        methods: draft.methods.map(m => ({ purpose: m.purpose as 'scene_design'|'report_presentation', skillVersionId: m.version.id })) });
      if (draft.configurationDigest !== configurationDigest(version.configuration)) issues.push('题库已更新，请先重新保存体验草稿');
      if (issues.length) throw new ApiException('INVALID_CONFIGURATION', issues.join('；'), 400);
      const config = ProductConfigurationSchema.parse(version.configuration);
      if (new Set(body.answers.map(a => a.questionId)).size !== body.answers.length) throw new ApiException('VALIDATION_ERROR', '预览答案不可重复', 400);
      const report = scoreAnswers(config, body.answers, { productName: version.product.name, versionNumber: version.number, isDemo: true });
      return ExperiencePreviewSchema.parse({ isPreview: true, revisionId, manifest: draft.manifest,
        questions: config.questions.map(({ id,text,dimensionId,required,options }) => ({ id,text,dimensionId,required,options: options.map(({ id,label,notApplicable }) => ({ id,label,notApplicable })) })),
        report, presentation: { schemaVersion: 1, releaseId: null, ...draft.manifest.report, theme: draft.manifest.theme } });
    });
  }
}
