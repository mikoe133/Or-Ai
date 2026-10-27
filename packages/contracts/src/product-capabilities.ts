import { z } from 'zod';
import { IdSchema } from './shared.js';
import { CreativeProfileSchema } from './content.js';
import { experienceTemplate, registeredExperiences, supportsExperience, type ExperienceManifest } from './experience.js';

export const ExperienceCapabilitySchema = z.object({
  renderer: z.string().max(80), label: z.string().max(160), report: z.string().max(80), reportLabel: z.string().max(160),
  contentKind: z.literal('assessment'), inputSchema: z.literal('single_choice_v1'), engine: z.literal('dimensions_v1'),
  contentSchema: z.literal('report_content_v1'), interaction: z.literal('confirmed_single_choice'),
  presentation: z.enum(['dom', 'illustrated_2_5d']),
  authoringForms: z.array(z.literal('web')).max(5),
  perspectives: z.array(z.enum(['self', 'single_person_relationship'])).max(3),
  reportPlans: z.array(z.literal('standard')).max(5),
  editors: z.array(z.enum(['questions', 'scoring', 'scene_mapping', 'resources', 'report_content', 'report_presentation'])).max(10),
  resourcePurposes: z.array(z.enum(['illustration', 'texture'])).max(5),
  limits: z.object({ maxOptions: z.number().int().positive(), maxResources: z.number().int().min(0),
    maxResourceBytes: z.number().int().positive(), maxTotalResourceBytes: z.number().int().positive() }).strict(),
}).strict();
export const ExperienceGraphicsBudgetSchema = z.object({
  backend: z.literal('webgl2'), assets: z.literal('bundled_geometry'), maxPixelRatio: z.number().positive().max(2),
  maxCanvasPixels: z.number().int().positive(), maxTriangles: z.number().int().positive(),
  maxDrawCalls: z.number().int().positive(), maxRendererGzipBytes: z.number().int().positive(),
}).strict();
export const ExperienceCapabilityV2Schema = ExperienceCapabilitySchema.extend({
  presentation: z.enum(['dom', 'illustrated_2_5d', 'webgl_3d']),
  authoringForms: z.array(z.enum(['web', '3d'])).max(5),
  graphics: ExperienceGraphicsBudgetSchema.optional(),
}).strict();
export const CapabilityVersionSchema = z.union([z.literal(1), z.literal(2)]);
const moduleState = z.enum(['editable', 'read_only', 'planned']);
// Keep the original v1 projection readable by old strict clients. New renderers are opt-in v2.
export const ProductCapabilitiesV1Schema = z.object({
  schemaVersion: z.literal(1), profileRevisionId: IdSchema.nullable(),
  basis: z.enum(['creative_profile', 'content_version']),
  profileBinding: z.enum(['fixed', 'candidate', 'none']),
  intentForm: CreativeProfileSchema.shape.experienceForm.nullable(),
  status: z.enum(['compatible', 'needs_profile', 'blocked']),
  // This describes compatibility, never review, publication, entitlement or execution permission.
  selected: ExperienceCapabilitySchema.nullable(), registered: z.array(ExperienceCapabilitySchema).max(10),
  modules: z.object({ content: moduleState, experience: moduleState, result: moduleState }).strict(),
  issues: z.array(z.string().max(300)).max(20),
  planned: z.array(z.object({ key: z.string().max(80), label: z.string().max(160), reason: z.string().max(300) }).strict()).max(10),
}).strict();
export const ProductCapabilitiesV2Schema = ProductCapabilitiesV1Schema.extend({ schemaVersion: z.literal(2),
  selected: ExperienceCapabilityV2Schema.nullable(), registered: z.array(ExperienceCapabilityV2Schema).max(10),
}).strict();
export const ProductCapabilitiesSchema = z.discriminatedUnion('schemaVersion', [ProductCapabilitiesV1Schema, ProductCapabilitiesV2Schema]);
export type ProductCapabilities = z.infer<typeof ProductCapabilitiesSchema>;

export function registeredExperienceCapabilities(version: 1 | 2 = 1) {
  const schema = version === 2 ? ExperienceCapabilityV2Schema : ExperienceCapabilitySchema;
  return registeredExperiences.filter(template => version === 2 || template.presentation !== 'webgl_3d').map(template => schema.parse({
    renderer: `${template.key}@${template.version}`, label: template.label,
    report: `${template.reportKey}@${template.reportVersion}`, reportLabel: template.reportLabel,
    contentKind: template.contentKind, inputSchema: template.inputSchema, engine: template.engine,
    contentSchema: template.contentSchema, interaction: template.interaction, presentation: template.presentation,
    authoringForms: [...template.authoringForms], perspectives: [...template.perspectives], reportPlans: [...template.reportPlans],
    editors: [...template.editors], resourcePurposes: [...template.resourcePurposes], limits: template.limits,
    ...(version === 2 && 'graphics' in template ? { graphics: template.graphics } : {}),
  }));
}

type TemplatePair = Parameters<typeof experienceTemplate>[0];
export function creativeContentCapabilityIssues(profile: z.infer<typeof CreativeProfileSchema>, manifest?: TemplatePair | null) {
  const issues: string[] = [];
  const selected = manifest ? experienceTemplate(manifest) : undefined, candidates = selected ? [selected] : registeredExperiences;
  if (!candidates.some(template => template.authoringForms.some(form => form === profile.experienceForm)))
    issues.push(selected ? '此创作形式与当前模板不兼容，请选择对应的已注册组合' : '此创作形式仅保存方案，尚无对应的已注册运行模板；2.5D 小屋请使用网页形式并选择安静小屋模板');
  if (!candidates.some(template => template.perspectives.some(perspective => perspective === profile.perspective)))
    issues.push('双方参与仍在规划中，当前只支持单人自我或关系观察');
  if (!profile.deliverables.includes('assessment')) issues.push('当前运行协议需要题目、评估规则与报告内容；无评估或可选结果交付尚未实现');
  return issues;
}

export function creativeCapabilityIssues(profile: z.infer<typeof CreativeProfileSchema>, manifest?: TemplatePair | null) {
  const issues = creativeContentCapabilityIssues(profile, manifest);
  const selected = manifest ? experienceTemplate(manifest) : undefined, candidates = selected ? [selected] : registeredExperiences;
  if (!candidates.some(template => template.reportPlans.some(plan => plan === profile.reportPlan.presentation)))
    issues.push('当前结果结构只兼容标准图文报告，其他报告方案尚未启用');
  return issues;
}

export function productCapabilities(input: {
  profile?: z.infer<typeof CreativeProfileSchema> | null;
  profileRevisionId?: string | null;
  profileFixed?: boolean;
  manifest?: ExperienceManifest | null;
  hasContentVersion: boolean;
  capabilityVersion?: 1 | 2;
}): ProductCapabilities {
  const version = input.capabilityVersion ?? 1, registered = registeredExperienceCapabilities(version), profile = input.profile;
  const template = input.manifest ? experienceTemplate(input.manifest) : undefined;
  const selected = template ? registered.find(item => item.renderer === `${template.key}@${template.version}` &&
    item.report === `${template.reportKey}@${template.reportVersion}`) ?? null : null;
  const profileIssues = profile ? creativeCapabilityIssues(profile, input.manifest) : [];
  const issues = [...profileIssues];
  const undiscovered = (!!template && !selected) || (!!profile && !registered.some(item => item.authoringForms.some(form => form === profile.experienceForm)) &&
    registeredExperiences.some(item => item.authoringForms.some(form => form === profile.experienceForm)));
  if (undiscovered) issues.push('此模板或形式需显式请求能力声明 v2；旧声明不会把新模板视为已支持');
  if (!profile) issues.push('尚未固定共同创作设定；已有单选内容可继续维护，体验制作需先选择设定');
  if (input.manifest && !supportsExperience(input.manifest)) issues.push('体验模板、结果模板、资源用途或预算不兼容当前注册能力');
  // Legacy report proposals can remain authoring-only while their actual v1 result is maintained.
  const contentIssues = profile ? creativeContentCapabilityIssues(profile, input.manifest) : [];
  const content = contentIssues.length || undiscovered ? input.hasContentVersion ? 'read_only' : 'planned' : 'editable';
  const presentation = profileIssues.length || undiscovered ? input.hasContentVersion ? 'read_only' : 'planned' : 'editable';
  return ProductCapabilitiesSchema.parse({ schemaVersion: version, profileRevisionId: input.profileRevisionId ?? null,
    basis: input.hasContentVersion ? 'content_version' : 'creative_profile',
    profileBinding: !profile ? 'none' : input.profileFixed ? 'fixed' : 'candidate',
    intentForm: profile?.experienceForm ?? null,
    status: profileIssues.length || undiscovered || (input.manifest && !supportsExperience(input.manifest)) ? 'blocked' : profile ? 'compatible' : 'needs_profile',
    selected, registered,
    modules: { content, experience: !profile ? 'read_only' : presentation, result: content }, issues,
    planned: [
      { key: 'custom_3d', label: '自定义 3D 模型与场景', reason: '静心花园使用内置几何体；任意 GLB、音频、脚本和自定义场景包仍未启用' },
      { key: 'branching_story', label: '分支剧情', reason: '待实现分支路径、可达性、完成与恢复协议及结局交付' },
      { key: 'interactive_game', label: '小游戏 / 自由探索', reason: '待实现玩法事件、状态保存、完成条件与体验回顾；不自动套用单选评分' },
      { key: 'optional_result', label: '无评估 / 可选结果', reason: '待定义独立内容与交付协议；现有 v1 仍要求评估及报告' },
    ],
  });
}
