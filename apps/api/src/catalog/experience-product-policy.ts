import { BoundSkillSchema, ProductionPlanDocumentSchema, ProductionPlanModuleSchema, SkillProductPlanInputSchema,
  threejsPublicationIssues, threejsSkillPolicyIssues } from '@orai/contracts/admin';
import { ExperienceManifestSchema } from '@orai/contracts/experience';
import type { Prisma, ProductVersion } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { contentDigest } from '../operations/content-projections';

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
  }
  if (issues.length) throw new ApiException('INVALID_CONFIGURATION', [...new Set(issues)].join('；').slice(0, 240), 400);
  return { plan, document, module, input };
}
