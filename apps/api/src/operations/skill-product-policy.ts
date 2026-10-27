import { ProductionPlanDocumentSchema, ProductionPlanModuleSchema, SkillProductPlanInputSchema,
  threejsSkillPolicyIssues, type StyleSkillManifest } from '@orai/contracts/admin';
import type { CatalogAdminAccess } from '../catalog/admin-access.service';
import { ApiException } from '../common/http-errors';
import { Prisma } from '../generated/prisma/client';
import { contentDigest } from './content-projections';

export function requireSkillProductPolicy(manifest: StyleSkillManifest) {
  const issues = threejsSkillPolicyIssues(manifest);
  if (issues.length) throw new ApiException('VALIDATION_ERROR', ('Skill 商品政策不完整：' + issues.map(issue => issue.message).join('；')).slice(0,240), 400);
}
type PlanReference = { revisionId: string; digest: string };
type Input = { productId: string; profileId: string; purpose: StyleSkillManifest['purposes'][number];
  domain: string; form: string; reference?: PlanReference; moduleId?: string };
export async function bindSkillProductPlan(tx: Prisma.TransactionClient, access: CatalogAdminAccess, input: Input) {
  if (!input.reference) throw new ApiException('VALIDATION_ERROR', '绑定方法必须提供实际的固定商品规划 product-plan 输入', 400);
  await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${input.productId}::uuid AND scope=${access.scope}::orai."DataScope" FOR SHARE`);
  const plan = await tx.productionPlanRevision.findFirst({ where: { id: input.reference.revisionId, productId: input.productId, scope: access.scope },
    include: { modules: true } });
  if (!plan) throw new ApiException('NOT_FOUND', '固定商品规划不属于此商品或管理范围', 404);
  const latest = await tx.productionPlanRevision.findFirst({ where: { productId: input.productId, scope: access.scope }, orderBy: { number: 'desc' }, select: { id: true } });
  if (plan.digest !== input.reference.digest || latest?.id !== plan.id) throw new ApiException('REVISION_CONFLICT', '商品规划修订或摘要已更新，请重新选择固定规划', 409);
  if (plan.creativeProfileRevisionId !== input.profileId) throw new ApiException('CONFLICT', '商品规划与共同创作设定不一致', 409);
  const document = ProductionPlanDocumentSchema.parse(plan.document);
  if (document.schemaVersion !== 2) throw new ApiException('VALIDATION_ERROR', '新方法绑定需要包含 Three.js 商品规划的 v2 计划', 400);
  if (contentDigest({ plan: document, creativeProfileDigest: plan.creativeProfileDigest }) !== plan.digest)
    throw new ApiException('CONFLICT', '固定商品规划完整性校验失败', 409);
  const candidates = plan.modules.filter(module => {
    const definition = ProductionPlanModuleSchema.parse(module.definition);
    return (!input.moduleId || module.id === input.moduleId) && definition.domain === input.domain &&
      definition.methodPurposes.includes(input.purpose) && definition.target.form === input.form;
  });
  if (candidates.length !== 1) throw new ApiException('VALIDATION_ERROR', '请明确选择本商品规划中用途与形式匹配的唯一模块', 400);
  const module = candidates[0]!, definition = ProductionPlanModuleSchema.parse(module.definition);
  if (contentDigest(definition) !== module.digest) throw new ApiException('CONFLICT', '固定模块摘要不一致', 409);
  return SkillProductPlanInputSchema.parse({ schemaVersion: 1, planRevisionId: plan.id, planDigest: plan.digest,
    planModuleId: module.id, moduleDigest: module.digest, form: input.form });
}
