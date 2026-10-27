import { z } from 'zod';
import { IdSchema, KeySchema } from './shared.js';

const text = (max: number) => z.string().trim().min(1).max(max);
export const RendererReferenceSchema = z.object({ key: KeySchema, version: z.number().int().min(1).max(1000) }).strict();
export const ExperienceThemeSchema = z.object({ key: KeySchema, revision: z.number().int().min(1) }).strict();
export const ExperienceResourcePurposeSchema = z.enum(['illustration', 'texture', 'model', 'audio', 'font']);
export const ExperienceResourceSchema = z.object({
  resourceId: KeySchema, fileId: IdSchema, purpose: ExperienceResourcePurposeSchema, label: text(160),
  checksum: z.string().regex(/^[0-9a-f]{64}$/), byteSize: z.number().int().min(1).max(20 * 1024 * 1024),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'model/gltf-binary', 'audio/wav', 'font/woff2']),
}).strict().superRefine((resource, context) => {
  const allowed = resource.purpose === 'model' ? resource.mimeType === 'model/gltf-binary'
    : resource.purpose === 'audio' ? resource.mimeType === 'audio/wav'
    : resource.purpose === 'font' ? resource.mimeType === 'font/woff2'
    : resource.mimeType.startsWith('image/') && resource.byteSize <= 4 * 1024 * 1024;
  if (!allowed) context.addIssue({ code: 'custom', message: '资源用途、类型或大小不兼容' });
});
export const ExperienceSceneSchema = z.object({
  sceneId: KeySchema, questionId: KeySchema, checkpointId: KeySchema,
  choices: z.array(z.object({ objectId: KeySchema, optionId: KeySchema }).strict()).min(2).max(10),
}).strict().refine(scene => new Set(scene.choices.map(c => c.objectId)).size === scene.choices.length &&
  new Set(scene.choices.map(c => c.optionId)).size === scene.choices.length, '场景对象和选项映射不可重复');

// This is an authorized presentation projection, never a scoring configuration or executable package.
export const ExperienceManifestSchema = z.object({
  schemaVersion: z.literal(1),
  content: z.object({ versionId: IdSchema, inputSchema: z.literal('single_choice_v1'), engine: z.literal('dimensions_v1') }).strict(),
  creativeProfileRevisionId: IdSchema.nullable(),
  intent: z.object({ emotionalGoal: text(1000), understandingGoal: text(1000), world: text(2000), language: text(2000) }).strict().nullable(),
  renderer: RendererReferenceSchema, fallback: z.object({ key: z.literal('dom-choice'), version: z.literal(1) }).strict(),
  report: z.object({ contentSchema: z.literal('report_content_v1'), renderer: RendererReferenceSchema }).strict(),
  theme: ExperienceThemeSchema,
  confirmation: z.literal('explicit'), recovery: z.literal('server_confirmed_answers'),
  scenes: z.array(ExperienceSceneSchema).min(1).max(100),
  resources: z.array(ExperienceResourceSchema).max(8),
}).strict().superRefine((manifest, context) => {
  for (const values of [manifest.scenes.map(s => s.sceneId), manifest.scenes.map(s => s.questionId),
    manifest.scenes.map(s => s.checkpointId), manifest.resources.map(r => r.resourceId)]) {
    if (new Set(values).size !== values.length) context.addIssue({ code: 'custom', message: '清单中的场景、题目、检查点和资源标识必须唯一' });
  }
  if (manifest.resources.reduce((sum, r) => sum + r.byteSize, 0) > 16 * 1024 * 1024)
    context.addIssue({ code: 'custom', message: '体验资源总量超出限制' });
});
export const ExperienceReleaseSchema = z.object({
  id: IdSchema, digest: z.string().regex(/^[0-9a-f]{64}$/), manifest: ExperienceManifestSchema,
}).strict();
export const ExperienceCheckpointSchema = z.object({
  schemaVersion: z.literal(1), revision: z.number().int().min(0),
  lastConfirmedQuestionId: KeySchema.nullable(), nextQuestionId: KeySchema.nullable(),
}).strict();
export const ExperienceSessionSchema = z.object({ release: ExperienceReleaseSchema, checkpoint: ExperienceCheckpointSchema }).strict();
export const ReportPresentationSchema = z.object({
  schemaVersion: z.literal(1), releaseId: IdSchema.nullable(), contentSchema: z.literal('report_content_v1'),
  renderer: RendererReferenceSchema, theme: ExperienceThemeSchema,
}).strict();
export type ExperienceManifest = z.infer<typeof ExperienceManifestSchema>;
export type ExperienceRelease = z.infer<typeof ExperienceReleaseSchema>;
export type ExperienceCheckpoint = z.infer<typeof ExperienceCheckpointSchema>;
export type ExperienceResource = z.infer<typeof ExperienceResourceSchema>;
export type ReportPresentation = z.infer<typeof ReportPresentationSchema>;

// A form in a creative profile is an intention. Only this registry grants runtime support.
const singleChoiceCapability = {
  contentKind: 'assessment', inputSchema: 'single_choice_v1', engine: 'dimensions_v1',
  contentSchema: 'report_content_v1', interaction: 'confirmed_single_choice',
  authoringForms: ['web'], perspectives: ['self', 'single_person_relationship'], reportPlans: ['standard'],
  editors: ['questions', 'scoring', 'scene_mapping', 'resources', 'report_content', 'report_presentation'],
  resourcePurposes: ['illustration', 'texture'],
} as const;
export const reflectionGardenGraphics = {
  backend: 'webgl2', assets: 'bundled_geometry', maxPixelRatio: 1.5, maxCanvasPixels: 1_500_000,
  maxTriangles: 14000, maxDrawCalls: 48, maxRendererGzipBytes: 240 * 1024,
} as const;
export const registeredExperiences = [
  { key: 'dom-choice', version: 1, label: 'DOM 单选 · v1', reportKey: 'legacy-text', reportVersion: 1, reportLabel: '兼容图文报告 · v1',
    ...singleChoiceCapability, presentation: 'dom',
    limits: { maxOptions: 10, maxResources: 8, maxResourceBytes: 4 * 1024 * 1024, maxTotalResourceBytes: 16 * 1024 * 1024 } },
  { key: 'quiet-room', version: 1, label: '安静小屋 · 2.5D v1', reportKey: 'field-notes', reportVersion: 1, reportLabel: '小屋手记 · v1',
    ...singleChoiceCapability, presentation: 'illustrated_2_5d',
    limits: { maxOptions: 4, maxResources: 2, maxResourceBytes: 512 * 1024, maxTotalResourceBytes: 1024 * 1024 } },
  { key: 'reflection-garden', version: 1, label: '静心花园 · 3D v1', reportKey: 'garden-notes', reportVersion: 1, reportLabel: '花园手记 · v1',
    ...singleChoiceCapability, authoringForms: ['web', '3d'], presentation: 'webgl_3d', graphics: reflectionGardenGraphics,
    limits: { maxOptions: 4, maxResources: 2, maxResourceBytes: 512 * 1024, maxTotalResourceBytes: 1024 * 1024 } },
] as const;

export function experienceTemplate(pair: { renderer: { key: string; version: number }; report: { renderer: { key: string; version: number } } }) {
  return registeredExperiences.find(template => template.key === pair.renderer.key && template.version === pair.renderer.version &&
    template.reportKey === pair.report.renderer.key && template.reportVersion === pair.report.renderer.version);
}

// Publication and the browser share pairs and budgets; parsing alone never registers a renderer.
export function supportsExperience(manifest: ExperienceManifest) {
  const template = experienceTemplate(manifest);
  return !!template && manifest.content.inputSchema === template.inputSchema && manifest.content.engine === template.engine &&
    manifest.report.contentSchema === template.contentSchema &&
    manifest.scenes.every(scene => scene.choices.length <= template.limits.maxOptions) &&
    manifest.resources.length <= template.limits.maxResources && manifest.resources.every(resource =>
      template.resourcePurposes.some(purpose => purpose === resource.purpose) && resource.byteSize <= template.limits.maxResourceBytes) &&
    manifest.resources.reduce((sum, resource) => sum + resource.byteSize, 0) <= template.limits.maxTotalResourceBytes;
}
export const legacyReportPresentation: ReportPresentation = {
  schemaVersion: 1, releaseId: null, contentSchema: 'report_content_v1',
  renderer: { key: 'legacy-text', version: 1 }, theme: { key: 'legacy', revision: 1 },
};
