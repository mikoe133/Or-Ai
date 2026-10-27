import { BoundSkillSchema, ProductionPlanDocumentSchema, ProductionPlanModuleSchema, SkillProductPlanInputSchema,
  threejsPublicationIssues, threejsSkillPolicyIssues, FixedSkillVersionSchema, ProjectEffectiveMethodSchema } from '@orai/contracts/admin';
import { ExperienceManifestSchema } from '@orai/contracts/experience';
import type { Prisma, ProductVersion } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { contentDigest } from '../operations/content-projections';
import { fixedVersion } from '../operations/skill-bindings.service';
import { expandInstructions } from '../operations/project-method-instructions';

type Authored = { manifest: unknown; methods: unknown; productPlanInput?: unknown; projectPlanModuleId?: string | null };
export async function requireExperienceProductPolicy(tx: Prisma.TransactionClient, version: ProductVersion, authored: Authored) {
  const methods = BoundSkillSchema.array().parse(authored.methods);
  const parsed = SkillProductPlanInputSchema.safeParse(authored.productPlanInput);
  if (!parsed.success) throw new ApiException('INVALID_CONFIGURATION', '体验审核与新发布必须固定实际商品规划及模块，请先保存新的制作稿', 400);
  const input = parsed.data;
  const plan = await tx.productionPlanRevision.findFirst({ where: { id: input.planRevisionId, productId: version.productId, scope: version.scope },
    include: { modules: { include: { identity: true }, orderBy: { position: 'asc' } } } });
  const latest = await tx.productionPlanRevision.findFirst({ where: { productId: version.productId, scope: version.scope }, orderBy: { number: 'desc' }, select: { id: true } });
  if (!plan || plan.id !== latest?.id || plan.digest !== input.planDigest || plan.creativeProfileRevisionId !== version.creativeProfileRevisionId)
    throw new ApiException('INVALID_CONFIGURATION', '固定商品规划已变化或不属于此版本，请重新制作并审核', 400);
  const document = ProductionPlanDocumentSchema.parse(plan.document), module = plan.modules.find(item => item.id === input.planModuleId);
  if (!module || module.digest !== input.moduleDigest || contentDigest({ plan: document, creativeProfileDigest: plan.creativeProfileDigest }) !== plan.digest)
    throw new ApiException('INVALID_CONFIGURATION', '固定商品规划或体验模块摘要不一致', 400);
  const definition = ProductionPlanModuleSchema.parse(module.definition);
  if (contentDigest(definition) !== module.digest || definition.target.form !== input.form ||
    (authored.projectPlanModuleId && authored.projectPlanModuleId !== module.id))
    throw new ApiException('INVALID_CONFIGURATION', '体验方法、形式与固定模块不一致', 400);
  const issues = threejsPublicationIssues(document, definition, ExperienceManifestSchema.parse(authored.manifest));
  if (methods.length && (methods.length !== 2 || new Set(methods.map(method => method.purpose)).size !== 2))
    issues.push('体验方法必须覆盖场景设计与报告呈现');
  for (const method of methods) {
    if (threejsSkillPolicyIssues(method.version.manifest).length || method.domain !== 'experience' ||
      !method.version.manifest.supportedForms.includes(input.form) ||
      !method.version.manifest.purposes.includes(method.purpose) || contentDigest(method.productPlanInput ?? null) !== contentDigest(input))
      issues.push('体验方法缺少 Three.js 政策或未使用同一固定商品规划');
    if (contentDigest(method.version.manifest) !== method.version.digest) issues.push('固定体验方法正文摘要不一致');
    if (method.projectMethod) {
      const captured = await tx.projectMethodSnapshot.findFirst({ where: { id: method.projectMethod.snapshotId, planModuleId: module.id,
        productId: version.productId, scope: version.scope, purpose: method.purpose } });
      if (!captured || captured.digest !== method.projectMethod.digest) issues.push('体验方法没有匹配的固定项目快照');
      else {
        const { customization, ...snapshot } = captured.snapshot as Record<string, unknown>;
        if (contentDigest(FixedSkillVersionSchema.parse(snapshot)) !== contentDigest(method.version)) issues.push('体验方法与固定项目快照不一致');
        if (customization) {
          const fixed = ProjectEffectiveMethodSchema.parse(customization);
          if (fixed.effectiveInstructions !== expandInstructions(method.version.manifest.instructions, fixed)) issues.push('项目定制方法的展开正文不一致');
        }
      }
    } else {
      const source = await tx.styleSkillVersion.findFirst({ where: { id: method.version.id, scope: version.scope },
        include: { skill: true, attachments: { include: { file: true } } } });
      if (authored.projectPlanModuleId || !source || !['ACTIVE', 'ARCHIVED'].includes(source.status) ||
        contentDigest(fixedVersion(source)) !== contentDigest(method.version)) issues.push('体验方法必须保留精确的已绑定版本或项目捕获来源');
    }
  }
  if (issues.length) throw new ApiException('INVALID_CONFIGURATION', [...new Set(issues)].join('；').slice(0, 240), 400);
  return { plan, document, module, input };
}
