import { z } from 'zod';
import { IdSchema, KeySchema } from './shared.js';

const note = z.string().trim().max(4000);
export const productPlanDecisionKeys = ['scene', 'animation', 'camera', 'interaction', 'feedback',
  'confirmation', 'recovery', 'report', 'accessibility', 'fallback', 'resources'] as const;
export const ProductPlanDecisionSchema = z.object({
  requirement: z.enum(['undecided', 'required', 'not_required']),
  status: z.enum(['unplanned', 'planned', 'implemented', 'verified']), details: note,
  // Evidence is a declaration by the author. Parsing never executes or certifies it.
  evidence: z.array(z.object({ kind: z.enum(['implementation', 'verification']),
    reference: z.string().trim().min(1).max(500), summary: z.string().trim().min(1).max(1000) }).strict()).max(12),
}).strict().superRefine((decision, context) => {
  const problem = (message: string) => context.addIssue({ code: 'custom', message });
  if (decision.requirement === 'undecided') {
    if (decision.status !== 'unplanned' || decision.evidence.length) problem('待规划项不能声明已制作、已验证或提交交付证据');
    return;
  }
  if (decision.status === 'unplanned' || !decision.details) problem('已作出的决定必须填写说明和实际阶段');
  if (decision.requirement === 'not_required' && decision.status === 'implemented') problem('明确不需要的功能不能标为已实现');
  if (decision.requirement === 'required' && ['implemented', 'verified'].includes(decision.status) &&
    !decision.evidence.some(item => item.kind === 'implementation')) problem('已实现的声明需要明确实现依据');
  if (decision.status === 'verified' && !decision.evidence.some(item => item.kind === 'verification')) problem('已验证的声明需要明确验证依据');
});
const bytes = z.number().int().min(0).max(200 * 1024 * 1024).nullable();
export const ProductPlanBudgetsSchema = z.object({
  devices: z.array(z.enum(['desktop', 'ios_safari', 'android_chrome', 'wechat', 'platform_webview'])).max(5)
    .refine(values => new Set(values).size === values.length, '设备要求不能重复'),
  maxRendererGzipBytes: bytes, maxTotalResourceBytes: bytes,
  maxFirstFrameMs: z.number().int().positive().max(120000).nullable(),
  maxPixelRatio: z.number().positive().max(4).nullable(), maxCanvasPixels: z.number().int().positive().max(16000000).nullable(),
  maxTriangles: z.number().int().min(0).max(2000000).nullable(), maxDrawCalls: z.number().int().positive().max(2000).nullable(),
  minFps: z.number().int().positive().max(120).nullable(),
}).strict();
export const ProductPlanSourceSchema = z.object({
  sourceKey: KeySchema, moduleKey: KeySchema,
  // These rows already retain exact content, resources, or Skill manifests and attachments.
  // A source is planning input, never an assertion that a new module captured or used it.
  kind: z.enum(['content_revision', 'experience_release', 'method_snapshot']),
  id: IdSchema.toLowerCase(), digest: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
export const ProductImplementationPlanSchema = z.object({
  schemaVersion: z.literal(1), implementation: z.literal('threejs'), basedOnPlanRevisionId: IdSchema.toLowerCase().nullable(),
  visualDimension: z.enum(['undecided', '2d', '2.5d', '3d']),
  // Runtime/assessment schemas and renderer pairs belong to these modules, not a duplicate configuration.
  experienceModuleKey: KeySchema.nullable(), assessmentModuleKey: KeySchema.nullable(),
  decisions: z.object(Object.fromEntries(productPlanDecisionKeys.map(key => [key, ProductPlanDecisionSchema])) as
    Record<typeof productPlanDecisionKeys[number], typeof ProductPlanDecisionSchema>).strict(),
  budgets: ProductPlanBudgetsSchema, sources: z.array(ProductPlanSourceSchema).max(100),
}).strict().refine(plan => new Set(plan.sources.map(item => item.sourceKey)).size === plan.sources.length, '规划来源标识不能重复');
export type ProductImplementationPlan = z.infer<typeof ProductImplementationPlanSchema>;
export type ProductPlanDecision = z.infer<typeof ProductPlanDecisionSchema>;

export function emptyProductImplementationPlan(basedOnPlanRevisionId: string | null = null): ProductImplementationPlan {
  return ProductImplementationPlanSchema.parse({ schemaVersion: 1, implementation: 'threejs', basedOnPlanRevisionId,
    visualDimension: 'undecided', experienceModuleKey: null, assessmentModuleKey: null,
    decisions: Object.fromEntries(productPlanDecisionKeys.map(key => [key, { requirement: 'undecided', status: 'unplanned', details: '', evidence: [] }])),
    budgets: { devices: [], maxRendererGzipBytes: null, maxTotalResourceBytes: null, maxFirstFrameMs: null,
      maxPixelRatio: null, maxCanvasPixels: null, maxTriangles: null, maxDrawCalls: null, minFps: null }, sources: [] });
}

export function productPlanPendingFields(plan: ProductImplementationPlan): string[] {
  return [ ...(plan.visualDimension === 'undecided' ? ['visualDimension'] : []),
    ...(!plan.experienceModuleKey ? ['experienceModuleKey'] : []),
    ...productPlanDecisionKeys.filter(key => plan.decisions[key].requirement === 'undecided').map(key => 'decisions.' + key),
    ...Object.entries(plan.budgets).filter(([, value]) => value === null || Array.isArray(value) && value.length === 0).map(([key]) => 'budgets.' + key) ];
}

export function productPlanDifference(before: ProductImplementationPlan | null, after: ProductImplementationPlan) {
  const fields = ['visualDimension', 'experienceModuleKey', 'assessmentModuleKey', 'basedOnPlanRevisionId',
    ...productPlanDecisionKeys.map(key => 'decisions.' + key), ...Object.keys(after.budgets).map(key => 'budgets.' + key), 'sources'];
  const read = (value: unknown, path: string) => path.split('.').reduce<unknown>((current, key) =>
    current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, value);
  return fields.filter(path => JSON.stringify(read(before, path)) !== JSON.stringify(read(after, path)))
    .map(path => ({ path, before: read(before, path) ?? null, after: read(after, path) }));
}
