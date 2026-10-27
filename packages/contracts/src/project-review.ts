import { z } from 'zod';
import { IdSchema, KeySchema, TimestampSchema, DataScopeSchema, PageSchema } from './shared.js';
import { ProductionPlanRevisionSchema } from './production-plans.js';
import { CreativeProfileRevisionSchema, ContentRevisionSchema } from './content.js';
import { ProjectMethodSnapshotSchema, ProjectProductionRecordSchema } from './project-production.js';
import { ExperienceAuthoringRevisionSchema } from './experience-authoring.js';

const id = IdSchema.toLowerCase(), digest = z.string().regex(/^[0-9a-f]{64}$/);
export const ProjectOriginalTargetSchema = z.object({ type: z.literal('project_original'), planModuleId: id,
  outputKey: KeySchema, fileKey: KeySchema }).strict();
export const ProjectOriginalPrepareSchema = z.object({ requestId: id, target: ProjectOriginalTargetSchema,
  fileName: z.string().trim().min(1).max(160).refine(v => !/[\\/\x00-\x1f\x7f]/.test(v)),
  mimeType: z.enum(['application/zip','text/html','model/gltf-binary']),
  byteSize: z.number().int().min(1).max(100*1024*1024), checksum: digest }).strict();
export const ProjectOriginalFileSchema = z.object({ id, productId: id, scope: DataScopeSchema,
  target: ProjectOriginalTargetSchema, fileName: z.string(), mimeType: z.string(), byteSize: z.number().int().positive(), checksum: digest,
  status: z.enum(['pending','verifying','uploaded','available','failed','expired','deleting','deleted']),
  expiresAt: TimestampSchema, verifiedAt: TimestampSchema.nullable(),
  storage: z.literal('platform'), execution: z.literal('not_executed'),
}).strict();
export const ProjectReviewSelectionSchema = z.object({ planRevisionId: id,
  records: z.array(z.object({ recordId: id, digest }).strict()).max(40) }).strict()
  .refine(v => new Set(v.records.map(r=>r.recordId)).size===v.records.length, '制作记录不能重复');
export const ProjectReviewSaveSchema = z.object({ selection: ProjectReviewSelectionSchema,
  expectedRevision: z.number().int().nonnegative(), note: z.string().trim().min(1).max(2000), requestId: id }).strict();
export const ProjectReviewIssueSchema = z.object({ code: z.string().max(80), message: z.string().max(500),
  planModuleId: id.nullable(), outputKey: KeySchema.nullable() }).strict();
export const ProjectReviewManifestSchema = z.object({ schemaVersion: z.literal(1), kind: z.literal('project_retention'),
  plan: ProductionPlanRevisionSchema, creativeProfile: CreativeProfileRevisionSchema,
  records: z.array(ProjectProductionRecordSchema).max(40), methods: z.array(ProjectMethodSnapshotSchema).max(480),
  content: z.array(ContentRevisionSchema).max(1280), experiences: z.array(ExperienceAuthoringRevisionSchema).max(40),
  resources: z.array(z.object({ id, fileName: z.string(), mimeType: z.string(), byteSize: z.number().int().positive(), checksum: digest }).strict()).max(400),
  runtimeValidation: z.literal('not_performed'), publicationEffect: z.literal('none'), activationEffect: z.literal('none'),
}).strict();
export const ProjectReviewRevisionSchema = z.object({ id, productId: id, scope: DataScopeSchema,
  revision: z.number().int().positive(), previousRevisionId: id.nullable(),
  status: z.enum(['draft','submitted','returned','retained']), selection: ProjectReviewSelectionSchema,
  fingerprint: digest, frontierFingerprint: digest, manifest: ProjectReviewManifestSchema,
  issues: z.array(ProjectReviewIssueSchema).max(500),
  returns: z.array(z.object({ planModuleId: id, reason: z.string().trim().min(1).max(2000) }).strict()).max(40),
  note: z.string(), createdAt: TimestampSchema, archiveReady: z.boolean(),
}).strict().refine(v => v.archiveReady===(v.status==='retained') && (v.status!=='retained'||v.issues.length===0));
export const ProjectReviewPreviewSchema = z.object({ fingerprint: digest, frontierFingerprint: digest,
  canSubmit: z.boolean(), issues: z.array(ProjectReviewIssueSchema).max(500), manifest: ProjectReviewManifestSchema,
  latestRevision: z.number().int().nonnegative() }).strict();
export const ProjectReviewActionSchema = z.object({ expectedRevision: z.number().int().positive(), expectedFingerprint: digest,
  expectedFrontierFingerprint: digest, note: z.string().trim().min(1).max(2000), requestId: id }).strict();
export const ProjectReviewReturnSchema = ProjectReviewActionSchema.extend({ returns: ProjectReviewRevisionSchema.shape.returns.min(1)
  .refine(v=>new Set(v.map(r=>r.planModuleId)).size===v.length) }).strict();
export const ProjectReviewPageSchema = PageSchema(ProjectReviewRevisionSchema);
