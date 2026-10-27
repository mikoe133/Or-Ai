import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ProductionDomainSchema, StyleSkillManifestSchema, FixedSkillVersionSchema, ProjectMethodCustomizationSchema,
  ProductionPlanModuleSchema, threejsSkillPolicyIssues, withThreejsSkillPolicy, skillPurposes,
  type StyleSkillVersionSchema, type ProjectMethodSnapshotSchema } from '@orai/contracts/admin';
import type { CatalogAdminAccess } from '../catalog/admin-access.service';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AdminMutationService } from './admin-mutation.service';
import { SkillsService, skillVersionDto } from './skills.service';
import { ProjectProductionService } from './project-production.service';
import { contentDigest } from './content-projections';
import { fixedVersion } from './skill-bindings.service';
import { stableDiff } from './content-workflow.service';
import { SkillUpgradeSelectionSchema, SkillUpgradeItemSchema, SkillUpgradePreviewSchema,
  type SkillUpgradeChoice, type SkillUpgradePreview } from './skill-upgrade.contracts';

const include = { skill: true, attachments: { include: { file: true } } } as const;
type Receipt = { source: SkillUpgradeChoice['source']; version: z.infer<typeof StyleSkillVersionSchema>;
  projectMethod: z.infer<typeof ProjectMethodSnapshotSchema> | null; previewDigest: string;
  requiresReview: true; activationEffect: 'none'; bindingEffect: 'none'; publicationEffect: 'none' };
type Result = { requestId: string; state: 'saved'; result: Receipt } | { requestId: string; state: 'failed'; error: { code: string; message: string } };

/** Local maintenance lane. No HTTP/MCP endpoint and no activation or publication authority is added. */
@Injectable()
export class SkillUpgradeService {
  constructor(private readonly db: DatabaseService, private readonly mutations: AdminMutationService,
    private readonly skills: SkillsService, private readonly production: ProjectProductionService) {}
  private async human(access: CatalogAdminAccess, tx?: Prisma.TransactionClient) {
    await this.mutations.administrators.require(access, tx);
    if (access.machineCredentialId) throw new ApiException('FORBIDDEN', '旧方法升级仅供管理员明确执行', 403);
  }
  async inventory(access: CatalogAdminAccess, input: unknown) {
    await this.human(access); const query = parseInput(z.object({ domain: ProductionDomainSchema.optional() }).strict(), input);
    return this.db.client.$transaction(async tx => {
      await this.human(access, tx);
      const rows = await tx.styleSkillVersion.findMany({ where: { scope: access.scope, ...(query.domain ? { skill: { domain: query.domain } } : {}) },
        include, orderBy: [{ skill: { domain: 'asc' } }, { skillId: 'asc' }, { number: 'asc' }], take: 501 });
      const sets = await tx.creativeSkillSet.findMany({ where: { scope: access.scope }, include: { bindings: true }, take: 501 });
      const methods = await tx.projectMethodSnapshot.findMany({ where: { scope: access.scope }, include: { sourceVersion: { include: { skill: true } } }, take: 501 });
      if (Math.max(rows.length, sets.length, methods.length) > 500) throw new ApiException('CONFLICT', '盘点超过本地批次上限，请缩小领域后分别处理', 409);
      return { scope: access.scope.toLowerCase(), domains: Object.keys(skillPurposes), purposes: Object.values(skillPurposes).flat(),
        versions: rows.map(row => ({ id: row.id, skillId: row.skillId, skillRevision: row.skill.revision, revision: row.revision, digest: row.digest,
          domain: row.skill.domain, name: StyleSkillManifestSchema.parse(row.manifest).name, number: row.number, status: row.status.toLowerCase(),
          purposes: StyleSkillManifestSchema.parse(row.manifest).purposes, attachmentCount: row.attachments.length,
          policyIssues: threejsSkillPolicyIssues(StyleSkillManifestSchema.parse(row.manifest)),
          fixedSetIds: sets.filter(set => set.bindings.some(binding => binding.skillVersionId === row.id)).map(set => ({ id: set.id, digest: set.digest, productId: set.productId })),
          projectMethodIds: methods.filter(method => method.sourceVersionId === row.id).map(method => ({ id: method.id, digest: method.digest })),
        })),
        fixedSets: sets.map(set => ({ id: set.id, productId: set.productId, digest: set.digest,
          disposition: 'preserve_history_new_binding_requires_actual_plan', bindings: set.bindings.map(binding => ({ purpose: binding.purpose,
            skillVersionId: binding.skillVersionId, hasFixedPlan: !!(binding.snapshot as { productPlanInput?: unknown }).productPlanInput })) })),
        projectMethods: methods.map(method => { const { customization: _customization, ...fixed } = method.snapshot as Record<string, unknown>; return ({ id: method.id, productId: method.productId, planModuleId: method.planModuleId, purpose: method.purpose,
          digest: method.digest, skillId: method.skillId, skillRevision: method.sourceVersion.skill.revision,
          hasCustomization: !!(method.snapshot as { customization?: unknown }).customization,
          policyIssues: threejsSkillPolicyIssues(FixedSkillVersionSchema.parse(fixed).manifest) }); }),
        executionStarted: false, consumerDataRead: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  private async itemIn(tx: Prisma.TransactionClient, access: CatalogAdminAccess, selection: SkillUpgradeChoice, lock = false) {
    let source, customization = null as z.infer<typeof ProjectMethodCustomizationSchema> | null, productId: string | null = null;
    if (selection.source.kind === 'skill_version') {
      const row = await tx.styleSkillVersion.findFirst({ where: { id: selection.source.id, scope: access.scope }, include });
      if (!row) throw new ApiException('NOT_FOUND', '源方法不存在于当前范围', 404);
      if (row.revision !== selection.source.revision || row.digest !== selection.source.digest)
        throw new ApiException('REVISION_CONFLICT', '源方法修订或摘要已变化', 409);
      source = fixedVersion(row);
      if (selection.target) throw new ApiException('VALIDATION_ERROR', '全局方法升级不绑定单个商品规划', 400);
    } else {
      const row = await tx.projectMethodSnapshot.findFirst({ where: { id: selection.source.id, scope: access.scope } });
      if (!row) throw new ApiException('NOT_FOUND', '项目方法不存在于当前范围', 404);
      if (row.digest !== selection.source.digest) throw new ApiException('REVISION_CONFLICT', '固定项目方法摘要不符', 409);
      const { customization: custom, ...fixed } = row.snapshot as Record<string, unknown>;
      source = FixedSkillVersionSchema.parse(fixed); productId = row.productId;
      customization = custom ? ProjectMethodCustomizationSchema.parse(ProjectMethodCustomizationSchema.strip().parse(custom)) : null;
      if (!selection.target) throw new ApiException('VALIDATION_ERROR', '项目方法升级必须明确选择实际规划模块', 400);
      const target = await tx.productionPlanModule.findFirst({ where: { id: selection.target.planModuleId, scope: access.scope, productId }, include: { plan: true } });
      if (lock) await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${productId}::uuid FOR SHARE`);
      const current = await tx.productionPlanRevision.findFirst({ where: { productId, scope: access.scope }, orderBy: { number: 'desc' } });
      if (!target || target.digest !== selection.target.digest || target.planRevisionId !== current?.id || (target.plan.document as { schemaVersion?: number }).schemaVersion !== 2)
        throw new ApiException('REVISION_CONFLICT', '目标必须为同一商品当前的 v2 规划模块', 409);
      const definition = ProductionPlanModuleSchema.parse(target.definition);
      if (definition.domain !== source.manifest.domain || !definition.methodPurposes.some(purpose => purpose === row.purpose) ||
        !withThreejsSkillPolicy(source.manifest).supportedForms.some(form => form === definition.target.form))
        throw new ApiException('VALIDATION_ERROR', '目标模块与固定方法的专业用途或形式不符', 400);
    }
    const skill = await tx.styleSkill.findFirst({ where: { id: source.skillId, scope: access.scope } });
    if (!skill || skill.revision !== selection.source.skillRevision) throw new ApiException('REVISION_CONFLICT', '方法库已有变化，请重新预演', 409);
    const proposal = StyleSkillManifestSchema.parse({ ...withThreejsSkillPolicy(source.manifest),
      instructions: withThreejsSkillPolicy(source.manifest).instructions + '\n\n## Three.js 前向适配补充\n\n' + selection.notes });
    return SkillUpgradeItemSchema.parse({ selection, source, basis: { skillRevision: skill.revision,
      sourceRevision: selection.source.kind === 'skill_version' ? selection.source.revision : (await tx.styleSkillVersion.findUniqueOrThrow({ where: { id: source.id } })).revision },
      customization, proposal, diff: stableDiff(source.manifest, proposal), requiresReview: true, activationEffect: 'none', bindingEffect: 'none', publicationEffect: 'none' });
  }
  async preview(access: CatalogAdminAccess, input: unknown): Promise<SkillUpgradePreview> {
    await this.human(access); const body = parseInput(SkillUpgradeSelectionSchema, input);
    return this.db.client.$transaction(async tx => {
      const items = [];
      for (const choice of body.items) items.push(await this.itemIn(tx, access, choice));
      if (new Set(items.map(item => item.source.skillId)).size !== items.length || new Set(body.items.map(item => item.requestId)).size !== items.length)
        throw new ApiException('VALIDATION_ERROR', '每个预演批次的 Skill 和请求编号不能重复；不同固定来源请分批核对', 400);
      const document = { schemaVersion: 1 as const, scope: access.scope.toLowerCase(), items };
      return SkillUpgradePreviewSchema.parse({ ...document, digest: contentDigest(document) });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
  async apply(access: CatalogAdminAccess, input: unknown): Promise<{ items: Result[] }> {
    await this.human(access); const preview = parseInput(SkillUpgradePreviewSchema, input), { digest, ...document } = preview;
    if (preview.scope !== access.scope.toLowerCase() || digest !== contentDigest(document)) throw new ApiException('REVISION_CONFLICT', '预演清单范围或摘要不符', 409);
    const results: Result[] = [];
    for (const item of preview.items) {
      try {
        const result = await this.mutations.run(access, 'skills.upgrade:' + item.source.skillId, item.selection.requestId, { previewDigest: digest, item }, async tx => {
          await this.human(access, tx);
          await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'skill-library:' + item.source.skillId},0))`);
          const fresh = await this.itemIn(tx, access, item.selection, true);
          if (contentDigest(fresh) !== contentDigest(item)) throw new ApiException('REVISION_CONFLICT', '预演内容已变化，请重新核对差异', 409);
          const cloned = await this.skills.cloneIn(tx, access, item.source.manifest.domain, item.source.skillId, { sourceVersionId: item.source.id,
            expectedSkillRevision: item.basis.skillRevision, manifest: item.proposal, requestId: item.selection.requestId });
          const row = await tx.styleSkillVersion.findUniqueOrThrow({ where: { id: cloned.response.id }, include });
          let projectMethod: Receipt['projectMethod'] = null;
          if (item.selection.source.kind === 'project_method') {
            const original = await tx.projectMethodSnapshot.findUniqueOrThrow({ where: { id: item.selection.source.id } });
            projectMethod = (await this.production.captureIn(tx, access, item.selection.target!.planModuleId, {
              expectedModuleDigest: item.selection.target!.digest, purpose: original.purpose, sourceVersionId: row.id,
              expectedSourceRevision: row.revision, expectedSourceDigest: row.digest,
              ...(item.customization ? { customization: item.customization } : {}), requestId: item.selection.requestId })).response;
          }
          const response: Receipt = { source: item.selection.source, version: skillVersionDto(row), projectMethod, previewDigest: digest,
            requiresReview: true, activationEffect: 'none', bindingEffect: 'none', publicationEffect: 'none' };
          return { response, entityKind: 'style_skill_version', entityId: row.id };
        });
        results.push({ requestId: item.selection.requestId, state: 'saved', result });
      } catch (error) {
        results.push({ requestId: item.selection.requestId, state: 'failed', error: { code: error instanceof ApiException ? error.code : 'SERVICE_UNAVAILABLE',
          message: error instanceof ApiException ? error.publicMessage : '升级未完成，原对象保持；请按原请求核对后重试' } });
      }
    }
    return { items: results };
  }
}
