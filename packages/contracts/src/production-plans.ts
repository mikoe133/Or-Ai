import { z } from 'zod';
import { IdSchema, KeySchema, DataScopeSchema, TimestampSchema, PageSchema } from './shared.js';
import { ProductionDomainSchema } from './content-domain.js';
import { SkillPurposeSchema, skillPurposes } from './skills.js';
import { RendererReferenceSchema } from './experience.js';
import { ProjectCanvasLayoutDocumentSchema } from './project-canvas.js';
import { ProductImplementationPlanSchema } from './product-plan.js';

const text = (max: number) => z.string().trim().min(1).max(max);
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const unique = (values: string[]) => new Set(values).size === values.length;
const sourceUrl = z.url({ protocol: /^https?$/ }).max(2048).refine(value => {
  const parsed = new URL(value); return !parsed.username && !parsed.password;
}, '来源链接不得包含登录凭据');

export const TopicEvidenceSchema = z.object({
  evidenceKey: KeySchema, region: z.enum(['domestic', 'international']), language: text(40),
  sourceName: text(160), sourceUrl, publishedAt: TimestampSchema.nullable(), retrievedAt: TimestampSchema,
  title: text(300), summary: text(2000),
}).strict();
export const PlannedFileSchema = z.object({
  fileKey: KeySchema, purpose: z.enum(['original', 'preview']), label: text(160), required: z.boolean(),
  mimeTypes: z.array(z.enum(['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm',
    'application/zip', 'model/gltf-binary', 'text/html', 'application/json', 'text/plain', 'text/markdown'])).min(1).max(8),
  sourceUrl: sourceUrl.nullable(),
}).strict();
export const PlannedOutputSchema = z.object({
  outputKey: KeySchema, label: text(160), required: z.boolean(),
  kind: z.enum(['assessment', 'report', 'copy', 'image', 'video', 'web_bundle', 'scene_bundle']),
  original: z.object({ storage: z.literal('platform'), representation: z.enum(['structured', 'file']) }).strict(),
  files: z.array(PlannedFileSchema).max(16),
}).strict().superRefine((output, context) => {
  const problem = (message: string) => context.addIssue({ code: 'custom', message });
  if (!unique(output.files.map(file => file.fileKey))) problem('交付槽位中的文件标识重复');
  const native = ['assessment', 'report', 'copy'].includes(output.kind);
  if (native !== (output.original.representation === 'structured')) problem('结构化内容与文件原件的表达方式不匹配');
  if (output.original.representation === 'file' && !output.files.some(file => file.purpose === 'original' && file.required))
    problem('文件交付必须声明平台保存的必需原件，预览或外部地址不能替代');
  const allowed = output.kind === 'image' ? (mime: string) => mime.startsWith('image/')
    : output.kind === 'video' ? (mime: string) => mime.startsWith('video/')
    : output.kind === 'web_bundle' ? (mime: string) => ['application/zip', 'text/html'].includes(mime)
    : output.kind === 'scene_bundle' ? (mime: string) => ['application/zip', 'model/gltf-binary'].includes(mime)
    : (mime: string) => ['application/json', 'text/plain', 'text/markdown'].includes(mime);
  if (output.files.some(file => file.purpose === 'original' && file.mimeTypes.some(mime => !allowed(mime))))
    problem('原文件类型与交付种类不匹配');
});
export const ProductionPlanModuleSchema = z.object({
  moduleKey: KeySchema, title: text(160), domain: ProductionDomainSchema, required: z.boolean(),
  purpose: text(1000), dependsOn: z.array(KeySchema).max(39),
  target: z.object({ form: text(80), runtime: z.object({
    renderer: RendererReferenceSchema, reportRenderer: RendererReferenceSchema,
    inputSchema: text(80), engine: text(80), reportSchema: text(80),
  }).strict().nullable() }).strict(),
  methodPurposes: z.array(SkillPurposeSchema).min(1).max(2),
  methodRetention: z.literal('manifest_instructions_and_references'),
  outputs: z.array(PlannedOutputSchema).min(1).max(16),
}).strict().superRefine((module, context) => {
  const problem = (message: string) => context.addIssue({ code: 'custom', message });
  if (!unique(module.dependsOn) || module.dependsOn.includes(module.moduleKey)) problem('模块依赖不能重复或引用自身');
  if (!unique(module.methodPurposes) || module.methodPurposes.some(purpose => !(skillPurposes[module.domain] as readonly string[]).includes(purpose)))
    problem('方法用途必须属于模块对应领域');
  if (!unique(module.outputs.map(output => output.outputKey))) problem('模块的交付槽位标识重复');
  if (module.domain !== 'experience' && module.target.runtime) problem('运行模板配对只能由体验模块声明');
  const kinds: Record<string, string[]> = { assessment: ['assessment', 'report'], cover: ['image'], copy: ['copy'],
    video: ['video'], experience: ['image', 'web_bundle', 'scene_bundle'] };
  if (module.outputs.some(output => !kinds[module.domain]!.includes(output.kind))) problem('交付种类与模块领域不匹配');
});
const planFields = {
  title: text(160),
  selection: z.object({ basis: z.enum(['evidence', 'manual']), rationale: text(4000), evidenceKeys: z.array(KeySchema).max(50) }).strict(),
  freshnessWindowHours: z.number().int().min(1).max(720),
  evidence: z.array(TopicEvidenceSchema).max(50), modules: z.array(ProductionPlanModuleSchema).min(1).max(40),
  retention: z.literal('platform_originals_and_exact_methods'),
};
function validatePlanGraph(plan: z.infer<z.ZodObject<typeof planFields>>, context: z.RefinementCtx) {
  const problem = (message: string) => context.addIssue({ code: 'custom', message });
  const keys = new Set(plan.modules.map(module => module.moduleKey));
  if (keys.size !== plan.modules.length) problem('模块标识重复');
  if (!unique(plan.evidence.map(item => item.evidenceKey)) || !unique(plan.selection.evidenceKeys)) problem('证据标识或选择重复');
  const evidence = new Set(plan.evidence.map(item => item.evidenceKey));
  if (plan.selection.basis === 'evidence' && plan.selection.evidenceKeys.length === 0) problem('证据选题需明确引用至少一项来源');
  if (plan.selection.evidenceKeys.some(key => !evidence.has(key))) problem('选题引用了本计划不存在的证据');
  const graph = new Map(plan.modules.map(module => [module.moduleKey, module.dependsOn]));
  if (plan.modules.some(module => module.dependsOn.some(key => !keys.has(key)))) problem('依赖必须来自同一计划中的明确模块');
  const complete = new Set<string>(), visiting = new Set<string>();
  function cycle(key: string): boolean {
    if (visiting.has(key)) return true;
    if (complete.has(key)) return false;
    visiting.add(key);
    if ((graph.get(key) ?? []).some(cycle)) return true;
    visiting.delete(key); complete.add(key); return false;
  }
  if ([...keys].some(cycle)) problem('模块依赖不能形成循环');
  if (JSON.stringify(plan).length > 300000) problem('商品计划超出大小限制');
}
const { title: planTitle, ...remainingPlanFields } = planFields;
// Preserve V1 normalization order: existing digests and retry payloads use JSON.stringify.
export const ProductionPlanDocumentV1Schema = z.object({ schemaVersion: z.literal(1), title: planTitle,
  creativeProfileRevisionId: IdSchema.toLowerCase(), ...remainingPlanFields }).strict().superRefine(validatePlanGraph);
const v2Fields = { schemaVersion: z.literal(2), ...planFields, productPlan: ProductImplementationPlanSchema };
function validateProductPlanBindings(plan: z.infer<z.ZodObject<typeof v2Fields>>, context: z.RefinementCtx) {
  const productPlan = plan.productPlan;
  for (const [key, domain] of [['experienceModuleKey', 'experience'], ['assessmentModuleKey', 'assessment']] as const) {
    if (productPlan[key] && !plan.modules.some(module => module.moduleKey === productPlan[key] && module.domain === domain))
      context.addIssue({ code: 'custom', path: ['productPlan', key], message: '规划目标必须属于当前计划的对应领域模块' });
  }
  for (const [index, source] of productPlan.sources.entries()) if (!plan.modules.some(module => module.moduleKey === source.moduleKey))
    context.addIssue({ code: 'custom', path: ['productPlan', 'sources', index, 'moduleKey'], message: '来源的目标模块不在当前计划中' });
}
export const ProductionPlanDocumentV2Schema = z.object({ ...v2Fields, creativeProfileRevisionId: IdSchema.toLowerCase() })
  .strict().superRefine(validatePlanGraph).superRefine(validateProductPlanBindings);
export const ProductionPlanDocumentSchema = z.discriminatedUnion('schemaVersion', [ProductionPlanDocumentV1Schema, ProductionPlanDocumentV2Schema]);
// Bootstrap binds the profile on the server; graph and policy validation still use the same contracts.
export const ProductionPlanBootstrapDocumentSchema = z.discriminatedUnion('schemaVersion', [
  z.object({ schemaVersion: z.literal(1), ...planFields }).strict().superRefine(validatePlanGraph),
  z.object(v2Fields).strict().superRefine(validatePlanGraph).superRefine(validateProductPlanBindings),
]);
export type ProductionPlanDocument = z.infer<typeof ProductionPlanDocumentSchema>;
export const ProductionPlanSaveSchema = z.object({ plan: ProductionPlanDocumentSchema,
  expectedRevision: z.number().int().min(0), requestId: IdSchema, layout: ProjectCanvasLayoutDocumentSchema.optional() }).strict();
export const ProductionPlanRevisionSchema = z.object({
  id: IdSchema, productId: IdSchema, scope: DataScopeSchema, revision: z.number().int().positive(),
  creativeProfileRevisionId: IdSchema, creativeProfileDigest: digest, plan: ProductionPlanDocumentSchema, digest,
  status: z.literal('planning_only'), createdAt: TimestampSchema,
  modules: z.array(z.object({ id: IdSchema, moduleId: IdSchema, moduleKey: KeySchema,
    dependencyIds: z.array(IdSchema).max(39), digest, definition: ProductionPlanModuleSchema }).strict()).max(40),
}).strict();
export const ProductionPlanPageSchema = PageSchema(ProductionPlanRevisionSchema);
export const ProductionPlanInspectionSchema = z.object({
  checkedAt: TimestampSchema, valid: z.boolean(), runtimeValidation: z.literal('not_performed'), archiveReady: z.literal(false),
  issues: z.array(z.object({ code: text(80), severity: z.enum(['error', 'warning']), message: text(500),
    moduleKey: KeySchema.nullable(), evidenceKey: KeySchema.nullable() }).strict()).max(200),
  evidence: z.array(z.object({ evidenceKey: KeySchema,
    publicationTime: z.enum(['unknown', 'fresh', 'stale', 'future_dated']), retrievalTime: z.enum(['fresh', 'stale', 'future_dated']) }).strict()).max(50),
  modules: z.array(z.object({ moduleKey: KeySchema, required: z.boolean(),
    template: z.enum(['registered_pair', 'unregistered', 'content_validation_required']),
    originals: z.enum(['declared_not_imported','partially_recorded','recorded_not_revalidated']),
    methods: z.enum(['required_not_captured','partially_captured','captured']),
  }).strict()).max(40),
}).strict();
