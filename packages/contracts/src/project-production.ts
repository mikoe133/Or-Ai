import { z } from 'zod';
import { IdSchema, KeySchema, DataScopeSchema, TimestampSchema, PageSchema } from './shared.js';
import { SkillPurposeSchema } from './skills.js';
import { FixedSkillVersionSchema } from './skill-bindings.js';

const id = IdSchema.toLowerCase();
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const text = (max: number) => z.string().trim().min(1).max(max);
export const ProjectMethodCustomizationSchema = z.object({
  parameters: z.record(KeySchema, z.union([z.string().max(1000), z.number().finite(), z.boolean()]))
    .refine(value => Object.keys(value).length <= 40, '商品参数最多 40 项'),
  instructions: z.string().trim().max(8000),
}).strict();
export const ProjectEffectiveMethodSchema = ProjectMethodCustomizationSchema.extend({ effectiveInstructions: text(400_000) }).strict();
export const ProjectMethodCaptureSchema = z.object({
  expectedModuleDigest: digest, purpose: SkillPurposeSchema, sourceVersionId: id,
  expectedSourceRevision: z.number().int().nonnegative(), expectedSourceDigest: digest,
  customization: ProjectMethodCustomizationSchema.optional(),
  requestId: id,
}).strict();
export const ProjectMethodSnapshotSchema = z.object({
  id, productId: id, scope: DataScopeSchema, planRevisionId: id, planModuleId: id,
  moduleId: id, moduleDigest: digest, creativeProfileRevisionId: id, creativeProfileDigest: digest,
  purpose: SkillPurposeSchema, sourceRevision: z.number().int().nonnegative(),
  version: FixedSkillVersionSchema, digest, createdAt: TimestampSchema,
  customization: ProjectEffectiveMethodSchema.optional(),
  machineCredentialId: id.optional(), machineRequestId: id.optional(),
  status: z.literal('captured'), activationEffect: z.literal('none'),
}).strict();
export const ProjectMethodPageSchema = PageSchema(ProjectMethodSnapshotSchema);
const selectedMethod = z.object({ snapshotId: id, digest }).strict();
export const ProjectProductionOutputInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('content_revision'), outputKey: KeySchema, revisionId: id, digest }).strict(),
  z.object({ kind: z.literal('experience_revision'), outputKey: KeySchema, revisionId: id, digest }).strict(),
  z.object({ kind: z.literal('original_file'), outputKey: KeySchema, fileKey: KeySchema, originalFileId: id, checksum: digest }).strict(),
  z.object({ kind: z.literal('file'), outputKey: KeySchema, fileKey: KeySchema, fileId: id, checksum: digest }).strict(),
]);
export const ProjectProductionSaveSchema = z.object({
  expectedModuleDigest: digest, expectedRevision: z.number().int().nonnegative(), requestId: id,
  methods: z.array(selectedMethod).min(1).max(12),
  inputs: z.array(z.object({ recordId: id, digest }).strict()).max(40),
  outputs: z.array(ProjectProductionOutputInputSchema).min(1).max(32),
  external: z.object({ client: text(160), runKey: KeySchema, note: text(2000),
    startedAt: TimestampSchema, finishedAt: TimestampSchema }).strict(),
}).strict().superRefine((value, context) => {
  const problem = (message: string) => context.addIssue({ code: 'custom', message });
  for (const ids of [value.methods.map(item => item.snapshotId), value.inputs.map(item => item.recordId),
    value.outputs.map(item => item.outputKey + ':' + (item.kind === 'file' || item.kind === 'original_file' ? item.fileKey : 'structured'))])
    if (new Set(ids).size !== ids.length) problem('方法、输入或交付槽位不能重复');
  if (Date.parse(value.external.finishedAt) < Date.parse(value.external.startedAt)) problem('外部制作结束时间不能早于开始时间');
});
export const ProjectProductionOutputSchema = z.object({
  id, kind: z.enum(['content_revision','experience_revision','file','original_file']), outputKey: KeySchema,
  fileKey: KeySchema.nullable(), purpose: z.enum(['original','preview','authoring']),
  contentRevisionId: id.nullable(), experienceRevisionId: id.nullable(), fileId: id.nullable(), originalFileId: id.optional(),
  digest, file: z.object({ fileName: text(160), mimeType: text(100), byteSize: z.number().int().positive(),
    checksum: digest, downloadPath: text(500) }).strict().nullable(),
}).strict();
export const ProjectProductionRecordSchema = z.object({
  id, productId: id, scope: DataScopeSchema, planRevisionId: id, planModuleId: id,
  moduleId: id, moduleDigest: digest, creativeProfileRevisionId: id, creativeProfileDigest: digest,
  revision: z.number().int().positive(), external: ProjectProductionSaveSchema.shape.external,
  inputs: z.array(z.object({ recordId: id, planModuleId: id, digest }).strict()).max(40),
  methods: z.array(selectedMethod.extend({ purpose: SkillPurposeSchema }).strict()).min(1).max(12),
  outputs: z.array(ProjectProductionOutputSchema).min(1).max(32),
  digest, createdAt: TimestampSchema, source: z.enum(['external_declaration','mcp']),
  machineCredentialId: id.optional(), machineRequestId: id.optional(),
  status: z.literal('saved_outputs'), platformExecuted: z.literal(false), archiveReady: z.literal(false),
}).strict();
export const ProjectProductionPageSchema = PageSchema(ProjectProductionRecordSchema);
