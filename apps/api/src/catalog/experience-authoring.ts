import { createHash, randomUUID } from 'node:crypto';
import { ExperienceManifestSchema, registeredExperiences, supportsExperience, type ExperienceManifest } from '@orai/contracts/experience';
import { BoundSkillSchema, CreativeProfileSchema, ProductConfigurationSchema, ReportPlanDraftSchema, creativeCapabilityIssues, creativeContentCapabilityIssues } from '@orai/contracts/admin';
import { Prisma, type ProductVersion, type CreativeProfileRevision } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import type { AssetStorage } from '../operations/asset-storage';
import { requireExperienceProductPolicy } from './experience-product-policy';

export const experienceDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const configurationDigest = (value: unknown) => experienceDigest(ProductConfigurationSchema.parse(value));
export function experienceIntent(profile: CreativeProfileRevision | null) {
  if (!profile) return null;
  const p = CreativeProfileSchema.parse(profile.profile);
  return { emotionalGoal: p.emotionalGoal, understandingGoal: p.understandingGoal, world: p.world, language: p.language };
}
export function defaultExperience(version: ProductVersion, theme: string, profile: CreativeProfileRevision | null) {
  const configuration = ProductConfigurationSchema.parse(version.configuration);
  const form = profile ? CreativeProfileSchema.parse(profile.profile).experienceForm : 'web';
  const template = registeredExperiences.find(item => item.authoringForms.some(value => value === form)) ?? registeredExperiences[0];
  return ExperienceManifestSchema.parse({ schemaVersion: 1,
    content: { versionId: version.id, inputSchema: 'single_choice_v1', engine: 'dimensions_v1' },
    creativeProfileRevisionId: profile?.id ?? null, intent: experienceIntent(profile),
    renderer: { key: template.key, version: template.version }, fallback: { key: 'dom-choice', version: 1 },
    report: { contentSchema: 'report_content_v1', renderer: { key: template.reportKey, version: template.reportVersion } },
    theme: { key: theme, revision: 1 }, confirmation: 'explicit', recovery: 'server_confirmed_answers',
    scenes: configuration.questions.map(q => ({ sceneId: q.id, questionId: q.id, checkpointId: q.id,
      choices: q.options.map(o => ({ objectId: o.id, optionId: o.id })) })), resources: [] });
}
export function experienceDraftIssues(manifest: ExperienceManifest, plan: unknown, version: ProductVersion, profile: CreativeProfileRevision) {
  const issues: string[] = [], configuration = ProductConfigurationSchema.parse(version.configuration), p = CreativeProfileSchema.parse(profile.profile);
  if (manifest.content.versionId !== version.id || manifest.creativeProfileRevisionId !== profile.id ||
    (version.creativeProfileRevisionId && version.creativeProfileRevisionId !== profile.id)) issues.push('内容版本或创作设定引用不匹配');
  if (experienceDigest(manifest.intent) !== experienceDigest(experienceIntent(profile))) issues.push('情绪目标、理解目标、意象和语言须使用固定创作设定');
  if (!supportsExperience(manifest)) issues.push('体验模板、报告模板或资源用途尚未注册，请选择已支持的组合');
  if (manifest.scenes.length !== configuration.questions.length || manifest.scenes.some((scene, i) => {
    const q = configuration.questions[i];
    return !q || scene.questionId !== q.id || scene.choices.length !== q.options.length || scene.choices.some((c,j) => c.optionId !== q.options[j]?.id);
  })) issues.push('场景必须按顺序完整映射此版本的全部题目和选项');
  const report = ReportPlanDraftSchema.parse(plan);
  if (experienceDigest(report) !== experienceDigest(p.reportPlan)) issues.push('报告方案与固定创作设定不一致，请先建立新设定修订');
  issues.push(...creativeCapabilityIssues(p, manifest));
  if (report.presentation !== p.reportPlan.presentation) issues.push('结果交付方式须与固定创作设定一致');
  return issues;
}
export async function verifyExperienceFiles(tx: Prisma.TransactionClient, manifest: ExperienceManifest, scope: ProductVersion['scope'], storage: AssetStorage, requireDedicated = true) {
  for (const spec of manifest.resources) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.asset_files WHERE id=${spec.fileId}::uuid FOR SHARE`);
    const f = await tx.assetFile.findFirst({ where: { id: spec.fileId, productVersionId: manifest.content.versionId, scope, status: 'AVAILABLE' } });
    if (!f || !f.verifiedAt || (requireDedicated && f.kind !== 'EXPERIENCE') || f.mimeType !== spec.mimeType || f.byteSize !== spec.byteSize || f.checksum !== spec.checksum)
      throw new ApiException('CONFLICT', '体验资源未校验或不属于当前版本/用途', 409);
    const actual = await storage.inspect(f.storageKey, f.byteSize);
    if (actual.checksum !== spec.checksum || actual.byteSize !== spec.byteSize || actual.mimeType !== spec.mimeType)
      throw new ApiException('CONFLICT', '体验资源的实际文件与固定摘要不一致', 409);
  }
}
export async function verifyReviewedExperience(tx: Prisma.TransactionClient, version: ProductVersion, storage: AssetStorage) {
  const draft = await tx.experienceAuthoringRevision.findFirst({ where: { productVersionId: version.id }, orderBy: { number: 'desc' } });
  if (!draft) {
    throw new ApiException('INVALID_CONFIGURATION', '新发布必须先保存并审核使用固定商品规划的 Three.js 体验；旧发布版本继续按原清单读取', 400);
  }
  const manifest = ExperienceManifestSchema.parse(draft.manifest);
  const profile = await tx.creativeProfileRevision.findUniqueOrThrow({ where: { id: draft.creativeProfileRevisionId } });
  if (draft.status !== 'reviewed' || draft.configurationDigest !== configurationDigest(version.configuration) ||
    version.creativeProfileRevisionId !== profile.id || experienceDraftIssues(manifest, draft.reportPlan, version, profile).length)
    throw new ApiException('INVALID_CONFIGURATION', '体验草稿未审核或内容/设定已变化，请重新校验审核', 400);
  const policy = await requireExperienceProductPolicy(tx, version, draft);
  await verifyExperienceFiles(tx, manifest, version.scope, storage);
  await verifyExperienceMethodFiles(tx, draft.methods, version.scope, storage);
  return { draft, manifest, profile, policy };
}
export async function verifyExperienceMethodFiles(tx: Prisma.TransactionClient, input: unknown, scope: ProductVersion['scope'], storage: AssetStorage) {
  const methods = BoundSkillSchema.array().parse(input);
  for (const binding of methods) for (const ref of binding.version.files) {
    const file = await tx.skillReferenceFile.findFirst({ where: { id: ref.file.id, skillId: binding.version.skillId, scope, status: 'AVAILABLE' } });
    if (!file || file.checksum !== ref.file.checksum || file.byteSize !== ref.file.byteSize || file.mimeType !== ref.file.mimeType)
      throw new ApiException('INVALID_CONFIGURATION', '体验方法参考文件已不可用', 400);
    const actual = await storage.inspectReference(file.storageKey, file.byteSize, file.mimeType);
    if (actual.checksum !== ref.file.checksum || actual.byteSize !== ref.file.byteSize || actual.mimeType !== ref.file.mimeType)
      throw new ApiException('INVALID_CONFIGURATION', '体验方法参考文件完整性检查失败', 400);
  }
}
export async function prepareAuthoredExperience(tx: Prisma.TransactionClient, version: ProductVersion, storage: AssetStorage) {
  const { draft, manifest, profile } = await verifyReviewedExperience(tx, version, storage);
  const id = randomUUID(), payload = JSON.stringify(manifest);
  await tx.$executeRaw(Prisma.sql`INSERT INTO orai.experience_releases(id,product_id,product_version_id,scope,creative_profile_revision_id,authoring_revision_id,manifest,digest)
    VALUES(${id}::uuid,${version.productId}::uuid,${version.id}::uuid,${version.scope}::orai."DataScope",${profile.id}::uuid,${draft.id}::uuid,${payload}::jsonb,
      encode(sha256(convert_to((${payload}::jsonb)::text,'UTF8')),'hex'))`);
  for (const spec of manifest.resources) await tx.experienceResource.create({ data: { releaseId: id, productVersionId: version.id, scope: version.scope,
    resourceId: spec.resourceId, fileId: spec.fileId, purpose: spec.purpose, checksum: spec.checksum, byteSize: spec.byteSize, mimeType: spec.mimeType } });
}
