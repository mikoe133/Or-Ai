import { BoundSkillSchema, ProductionPlanDocumentSchema, ProductionPlanModuleSchema, SkillProductPlanInputSchema,
  threejsPublicationIssues, threejsSkillPolicyIssues, FixedSkillVersionSchema, ProjectEffectiveMethodSchema } from '@orai/contracts/admin';
import { ExperienceManifestSchema } from '@orai/contracts/experience';
import { Prisma, type ProductVersion } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { contentDigest } from '../operations/content-projections';
import { fixedVersion } from '../operations/skill-bindings.service';
import { expandInstructions } from '../operations/project-method-instructions';

type Authored = { manifest: unknown; methods: unknown; productPlanInput?: unknown; projectPlanModuleId?: string | null };
export async function requireExperienceProductPolicy(tx: Prisma.TransactionClient, version: ProductVersion, authored: Authored) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${version.productId}::uuid AND scope=${version.scope}::orai."DataScope" FOR SHARE`);
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
  if (methods.length) issues.push(...await publicationMethodIssues(tx, version, input, 'experience', methods, !!authored.projectPlanModuleId));
  if (issues.length) throw new ApiException('INVALID_CONFIGURATION', [...new Set(issues)].join('；').slice(0, 240), 400);
  return { plan, document, module, input };
}

async function publicationMethodIssues(tx: Prisma.TransactionClient, version: ProductVersion,
  input: ReturnType<typeof SkillProductPlanInputSchema.parse>, domain: 'assessment' | 'experience',
  methods: ReturnType<typeof BoundSkillSchema.parse>[], project: boolean) {
  const issues: string[] = [], label = domain === 'experience' ? '体验' : '题目与报告';
  if (methods.length !== 2 || new Set(methods.map(method => method.purpose)).size !== 2) issues.push(label + '方法必须覆盖两个专业用途');
  for (const method of methods) {
    if (threejsSkillPolicyIssues(method.version.manifest).length || method.domain !== domain ||
      !method.version.manifest.supportedForms.includes(input.form) ||
      !method.version.manifest.purposes.includes(method.purpose) || contentDigest(method.productPlanInput ?? null) !== contentDigest(input))
      issues.push(label + '方法缺少 Three.js 政策或未使用同一固定商品规划');
    if (contentDigest(method.version.manifest) !== method.version.digest) issues.push('固定体验方法正文摘要不一致');
    if (method.projectMethod) {
      const captured = await tx.projectMethodSnapshot.findFirst({ where: { id: method.projectMethod.snapshotId, planModuleId: input.planModuleId,
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
      if (project || !source || !['ACTIVE', 'ARCHIVED'].includes(source.status) ||
        contentDigest(fixedVersion(source)) !== contentDigest(method.version)) issues.push('体验方法必须保留精确的已绑定版本或项目捕获来源');
    }
  }
  return issues;
}

export async function requireAssessmentProductPolicy(tx: Prisma.TransactionClient, version: ProductVersion,
  policy: Awaited<ReturnType<typeof requireExperienceProductPolicy>>) {
  const content = await tx.contentRevision.findFirst({ where: { productVersionId: version.id, assetId: null, scope: version.scope },
    orderBy: { sourceRevision: 'desc' }, include: { production: true } });
  const candidate = await tx.projectCandidateDraft.findFirst({ where: { productId: version.productId, scope: version.scope,
    content: { productVersionId: version.id, domain: 'assessment' } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], include: { content: true } });
  if (!content?.production?.skillSetId && !candidate) return [];
  const definition = policy.document.schemaVersion === 2 ? policy.document.productPlan : null;
  const module = definition ? policy.plan.modules.find(item => (item.definition as { moduleKey?: string }).moduleKey === definition.assessmentModuleKey) : null;
  if (!module) throw new ApiException('INVALID_CONFIGURATION', '商品规划没有固定实际题目与报告模块', 400);
  const input = SkillProductPlanInputSchema.parse({ schemaVersion: 1, planRevisionId: policy.plan.id, planDigest: policy.plan.digest,
    planModuleId: module.id, moduleDigest: module.digest, form: ProductionPlanModuleSchema.parse(module.definition).target.form });
  let methods: ReturnType<typeof BoundSkillSchema.parse>[];
  if (content?.production?.skillSetId) methods = BoundSkillSchema.array().parse(content.production.skillVersions);
  else {
    if (!candidate?.content || candidate.planModuleId !== module.id || candidate.content.creativeProfileRevisionId !== version.creativeProfileRevisionId ||
      contentDigest((candidate.content.snapshot as { configuration?: unknown }).configuration) !==
      contentDigest((content!.snapshot as { configuration?: unknown }).configuration))
      throw new ApiException('INVALID_CONFIGURATION', '项目题目稿与当前固定规划或内容不一致，请重新制作', 400);
    const choices = candidate.methods as { snapshotId: string; digest: string }[];
    methods = [];
    for (const choice of choices) {
      const captured = await tx.projectMethodSnapshot.findFirst({ where: { id: choice.snapshotId, planModuleId: module.id, scope: version.scope } });
      if (!captured || captured.digest !== choice.digest) throw new ApiException('INVALID_CONFIGURATION', '项目题目稿缺少精确方法快照', 400);
      const { customization: _customization, ...snapshot } = captured.snapshot as Record<string, unknown>;
      methods.push(BoundSkillSchema.parse({ purpose: captured.purpose, domain: 'assessment', version: FixedSkillVersionSchema.parse(snapshot),
        productPlanInput: input, projectMethod: choice }));
    }
  }
  const issues = await publicationMethodIssues(tx, version, input, 'assessment', methods, !content?.production?.skillSetId);
  if (issues.length) throw new ApiException('INVALID_CONFIGURATION', [...new Set(issues)].join('；').slice(0, 240), 400);
  return methods;
}
