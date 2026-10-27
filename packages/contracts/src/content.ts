import { z } from 'zod';
import { DataScopeSchema, IdSchema, KeySchema, PlatformSchema, TimestampSchema } from './shared.js';
import { ContentDomainSchema } from './content-domain.js';
import { BoundSkillSchema } from './skill-bindings.js';
export { ContentDomainSchema } from './content-domain.js';

const text = (max: number) => z.string().trim().min(1).max(max);
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const unique = (ids: string[]) => new Set(ids).size === ids.length;

// Authoring proposals are separate from the strict dimensions_v1 runtime schema.
export const ReportPlanDraftSchema = z.object({
  schemaVersion: z.literal(1), title: text(160), narrative: text(2000),
  presentation: z.enum(['standard', 'letter', 'map', 'journal', 'custom']),
  sections: z.array(z.object({ sectionId: KeySchema, title: text(120), purpose: text(1000) }).strict()).min(1).max(24),
}).strict().refine(value => unique(value.sections.map(section => section.sectionId)), '报告章节 ID 不可重复');
export const CreativeProfileSchema = z.object({
  schemaVersion: z.literal(1), title: text(160), audience: text(1000), situation: text(1000),
  emotionalGoal: text(1000), understandingGoal: text(1000), takeaway: text(1000),
  perspective: z.enum(['self', 'single_person_relationship', 'planned_two_person']),
  experienceForm: z.enum(['web', 'cards', '2.5d', '3d', 'game']), pace: text(1000),
  world: text(2000), language: text(2000), visual: text(2000), sound: text(1000),
  reportPlan: ReportPlanDraftSchema, channels: z.array(PlatformSchema).min(1).max(3),
  deliverables: z.array(ContentDomainSchema).min(1).max(4),
}).strict().refine(value => unique(value.channels) && unique(value.deliverables), '渠道与交付领域不可重复');
export const CreativeProfileSaveSchema = z.object({
  profile: CreativeProfileSchema, expectedRevision: z.number().int().min(0), requestId: IdSchema,
}).strict();
export const CreativeProfileRevisionSchema = z.object({
  id: IdSchema, productId: IdSchema, scope: DataScopeSchema, revision: z.number().int().min(1),
  profile: CreativeProfileSchema, digest, createdAt: TimestampSchema,
  runtimeSupport: z.literal('authoring_only'),
}).strict();

const fileName = text(160).refine(value => !/[\\/\x00-\x1f\x7f]/.test(value) && !['.', '..'].includes(value), '仅接受文件名，不接受路径');
export const LocalArchiveSchema = z.object({
  archiveId: KeySchema, fileName, mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm']),
  byteSize: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER), checksum: digest,
  width: z.number().int().min(1).max(100000).nullable().default(null),
  height: z.number().int().min(1).max(100000).nullable().default(null),
  durationMs: z.number().int().min(1).max(86_400_000).nullable().default(null),
}).strict();
export const ContentMediaSchema = z.object({
  localArchive: LocalArchiveSchema.nullable().default(null), previewFileId: IdSchema.nullable().default(null),
}).strict();
const block = z.object({ blockId: KeySchema, role: z.enum(['title', 'hook', 'body', 'topic', 'subtitle', 'voiceover', 'cta']), text: text(5000) }).strict();
const scene = z.object({ sceneId: KeySchema, startMs: z.number().int().min(0).max(86_400_000),
  endMs: z.number().int().min(1).max(86_400_000), text: text(5000) }).strict().refine(value => value.endMs > value.startMs, '分镜结束时间必须晚于开始');
const scenes = z.array(scene).min(1).max(100).refine(values => unique(values.map(value => value.sceneId)) &&
  values.every((value, index) => index === 0 || value.startMs >= values[index - 1]!.endMs), '分镜 ID 重复或时序重叠');
export const StructuredAssetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('copy'), blocks: z.array(block).min(1).max(100).refine(values => unique(values.map(value => value.blockId)), '文案块 ID 重复') }).strict(),
  z.object({ kind: z.literal('cover'), title: text(160), description: text(2000) }).strict(),
  z.object({ kind: z.literal('video'), scenes }).strict(),
  z.object({ kind: z.literal('script'), scenes }).strict(),
]);
export const ContentLocatorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('whole') }).strict(),
  z.object({ kind: z.literal('question'), questionId: KeySchema }).strict(),
  z.object({ kind: z.literal('block'), blockId: KeySchema }).strict(),
  z.object({ kind: z.literal('scene'), sceneId: KeySchema }).strict(),
]);
export const ContentInputSchema = z.object({
  sourceRevisionId: IdSchema, sourceDigest: digest, locator: ContentLocatorSchema,
  targetLocator: ContentLocatorSchema, role: z.enum(['question', 'hook', 'cta', 'voiceover', 'subtitle', 'visual', 'reference']),
  mode: z.enum(['exact', 'adapted']), usedText: text(20000),
}).strict();
export const ProductionSourceSchema = z.object({ source: z.enum(['manual', 'external_ai', 'mcp']),
  batchKey: KeySchema.nullable().default(null), externalLabel: text(160).nullable().default(null),
  skillVersionId: IdSchema.nullable().default(null), skillSetId: IdSchema.nullable().optional(),
}).strict();
export const AssetAuthoringSchema = z.object({
  schemaVersion: z.literal(1), creativeProfileRevisionId: IdSchema, content: StructuredAssetSchema,
  media: ContentMediaSchema, inputs: z.array(ContentInputSchema).max(100), production: ProductionSourceSchema,
}).strict();
export const ContentAssetSaveSchema = z.object({
  assetId: IdSchema.optional(), productVersionId: IdSchema, platform: PlatformSchema, variant: text(40),
  expectedRevision: z.number().int().min(0), requestId: IdSchema,
  fileId: IdSchema.nullable().default(null), authoring: AssetAuthoringSchema,
}).strict().superRefine((value, context) => {
  const kind = value.authoring.content.kind, media = value.authoring.media;
  if (!['video', 'cover'].includes(kind) && (value.fileId || media.previewFileId || media.localArchive))
    context.addIssue({ code: 'custom', message: '文本内容不关联媒体文件' });
  if (media.localArchive && !media.localArchive.mimeType.startsWith(kind === 'cover' ? 'image/' : 'video/'))
    context.addIssue({ code: 'custom', message: '本地归档类型与内容领域不符' });
  if (!value.assetId && value.expectedRevision !== 0)
    context.addIssue({ code: 'custom', message: '新素材的预期修订必须为 0' });
  const serialized = JSON.stringify(value.authoring);
  if (serialized.length > 300000) context.addIssue({ code: 'custom', message: '结构化内容超出大小限制' });
});
export const ContentRevisionSchema = z.object({
  id: IdSchema, productId: IdSchema, productVersionId: IdSchema, assetId: IdSchema.nullable(), scope: DataScopeSchema,
  domain: ContentDomainSchema, sourceRevision: z.number().int().min(0), creativeProfileRevisionId: IdSchema.nullable(),
  snapshot: z.record(z.string(), z.unknown()), digest, createdAt: TimestampSchema,
  storage: z.object({ localArchiveRegistered: z.boolean(), previewUploaded: z.boolean(), deliveryUploaded: z.boolean() }).strict(),
}).strict();
export type ContentInput = z.infer<typeof ContentInputSchema>;
export type ContentLocator = z.infer<typeof ContentLocatorSchema>;
export type AssetAuthoring = z.infer<typeof AssetAuthoringSchema>;

export const ContentReferenceSchema = z.object({
  id: IdSchema, productId: IdSchema, scope: DataScopeSchema, sourceRevisionId: IdSchema, targetRevisionId: IdSchema,
  locator: ContentLocatorSchema, locatorKey: z.string(), targetLocator: ContentLocatorSchema, targetLocatorKey: z.string(),
  role: ContentInputSchema.shape.role, mode: ContentInputSchema.shape.mode, sourceDigest: digest,
  sourceSnapshot: z.record(z.string(), z.unknown()), usedText: text(20000), createdAt: TimestampSchema,
}).strict();
export const ProductionRecordSchema = z.object({
  id: IdSchema, productId: IdSchema, scope: DataScopeSchema, outputRevisionId: IdSchema,
  creativeProfileRevisionId: IdSchema.nullable(), actorUserId: IdSchema.nullable(),
  source: ProductionSourceSchema.shape.source, batchKey: KeySchema.nullable(), externalLabel: text(160).nullable(),
  skillVersionId: IdSchema.nullable(), skillSetId: IdSchema.optional(), skillVersions: z.array(BoundSkillSchema).optional(),
  machineCredentialId: IdSchema.optional(), machineRequestId: IdSchema.optional(),
  inputManifest: z.array(z.record(z.string(), z.unknown())), createdAt: TimestampSchema,
}).strict();
