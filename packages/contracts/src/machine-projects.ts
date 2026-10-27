import { z } from 'zod';
import { IdSchema, KeySchema, TimestampSchema, DataScopeSchema, ExperienceTypeSchema } from './shared.js';
import { PublicReportSampleSchema } from './public.js';
import { CreativeProfileSchema, CreativeProfileRevisionSchema, ContentLocatorSchema, ContentAssetSaveSchema, AssetAuthoringSchema } from './content.js';
import { ProductConfigurationSchema } from './product-configuration.js';
import { ProductionPlanDocumentSchema, ProductionPlanSaveSchema, ProductionPlanBootstrapDocumentSchema } from './production-plans.js';
import { ProjectMethodCaptureSchema, ProjectMethodSnapshotSchema, ProjectProductionSaveSchema, ProjectProductionRecordSchema, ProjectProductionOutputSchema } from './project-production.js';
import { MachineBoundSkillSchema } from './machine-content.js';
import { ProductionDomainSchema } from './content-domain.js';
import { SkillCreateSchema } from './skills.js';
import { ExperienceSaveSchema } from './experience-authoring.js';

const id = IdSchema.toLowerCase(), digest = z.string().regex(/^[0-9a-f]{64}$/);
export const MachineWorkspaceCreateSchema = z.object({ requestId: id, name: z.string().trim().min(1).max(100),
  categoryIds: z.array(id).min(1).max(30).refine(v => new Set(v).size === v.length),
  maxProjects: z.number().int().min(1).max(100), maxMethodsPerProject: z.number().int().min(1).max(100), maxRunsPerProject: z.number().int().min(1).max(100).default(20),
  expiresAt: TimestampSchema,
}).strict();
export const MachineWorkspaceSchema = MachineWorkspaceCreateSchema.omit({ requestId: true }).extend({
  id, scope: DataScopeSchema, createdAt: TimestampSchema, revokedAt: TimestampSchema.nullable(),
  projectCount: z.number().int().nonnegative(), status: z.enum(['active','expired','revoked']),
}).strict();
export const MachineProjectOperationSchema = z.enum(['project_bootstrap','project_list','project_get','project_profile_save',
  'project_plan_get','project_plan_save','project_plan_validate','project_method_create','project_method_capture',
  'project_method_get','project_method_reference_get','project_context_get','project_production_save','project_production_list','project_production_get','project_draft_save']);
export type MachineProjectOperation = z.infer<typeof MachineProjectOperationSchema>;
const { requestId: _draftRequest, ...assetDraftFields } = ContentAssetSaveSchema.shape;
export const MachineProjectBootstrapSchema = z.object({ requestId: id, projectKey: KeySchema,
  product: z.object({ slug: KeySchema, name: z.string().trim().min(1).max(160), hook: z.string().trim().min(1).max(100),
    summary: z.string().trim().min(1).max(300), description: z.string().trim().min(1).max(3000), categoryId: id,
    priceFen: z.number().int().min(0).max(100_000_000), durationMinutes: z.number().int().min(1).max(120),
    experienceType: ExperienceTypeSchema, themeKey: KeySchema,
    publicSample: PublicReportSampleSchema.omit({ isDemo: true }),
  }).strict(),
  profile: CreativeProfileSchema,
  // Cross-field plan validation runs again after the server binds the real profile ID.
  plan: ProductionPlanBootstrapDocumentSchema,
}).strict();
export const MachineProjectGetSchema = z.object({ productId: id }).strict();
export const MachineProjectListSchema = z.object({}).strict();
export const MachineProjectSummarySchema = z.object({ productId: id, workspaceId: id, projectKey: KeySchema,
  status: z.enum(['draft','reviewed','published','archived']), createdAt: TimestampSchema }).strict();
export const MachineProjectPageSchema = z.object({ items: z.array(MachineProjectSummarySchema).max(100) }).strict();
export const MachineProjectResultSchema = MachineProjectSummarySchema.extend({
  creativeProfileRevisionId: id, planRevisionId: id, productVersionId: id.nullable(),
}).strict();
export const MachineProjectProfileSaveSchema = z.object({ productId: id, profile: CreativeProfileSchema,
  expectedRevision: z.number().int().nonnegative(), requestId: id }).strict();
export const MachineProjectPlanGetSchema = z.object({ planRevisionId: id }).strict();
export const MachineProjectPlanSaveSchema = ProductionPlanSaveSchema.extend({ productId: id }).strict();
export const MachineProjectPlanValidateSchema = z.object({ productId: id, plan: ProductionPlanDocumentSchema }).strict();
export const MachineProjectMethodCreateSchema = SkillCreateSchema.omit({ slug: true }).extend({ productId: id, methodKey: KeySchema }).strict();
export const MachineProjectMethodCaptureSchema = ProjectMethodCaptureSchema.extend({ planModuleId: id }).strict();
export const MachineProjectMethodGetSchema = z.object({ snapshotId: id }).strict();
export const MachineProjectMethodReferenceGetSchema = MachineProjectMethodGetSchema.extend({ fileId: id }).strict();
export const MachineProjectMethodSnapshotSchema = ProjectMethodSnapshotSchema.extend({ version: MachineBoundSkillSchema.shape.version }).strict();
export const MachineProjectProductionRecordSchema = ProjectProductionRecordSchema.extend({ outputs: z.array(ProjectProductionOutputSchema.extend({
  file: ProjectProductionOutputSchema.shape.file.unwrap().omit({ downloadPath: true }).nullable(),
})).min(1).max(32) }).strict();
export const MachineProjectContextGetSchema = z.object({ planRevisionId: id, inputs: z.array(z.object({
  revisionId: id, digest, locator: ContentLocatorSchema }).strict()).max(100) }).strict();
export const MachineProjectContextSchema = z.object({ planRevisionId: id, productId: id, creativeProfile: CreativeProfileRevisionSchema,
  domain: ProductionDomainSchema, inputs: z.array(z.object({ revisionId: id, productVersionId: id, digest,
    locator: ContentLocatorSchema, content: z.record(z.string(), z.unknown()) }).strict()).max(100) }).strict();
export const MachineProjectProductionSaveSchema = z.object({ ...ProjectProductionSaveSchema.shape, planModuleId: id }).strict()
  .superRefine((value, ctx) => { const check = ProjectProductionSaveSchema.safeParse((({ planModuleId: _, ...rest }) => rest)(value));
    if (!check.success) for (const issue of check.error.issues) ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message }); });
export const MachineProjectProductionListSchema = z.object({ planModuleId: id, page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20) }).strict();
export const MachineProjectProductionGetSchema = z.object({ recordId: id }).strict();
const draftBase = { planModuleId: id, expectedModuleDigest: digest, requestId: id,
  methods: ProjectProductionSaveSchema.shape.methods };
export const MachineProjectDraftSaveSchema = z.object({ ...draftBase, payload: z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('assessment'), productVersionId: id.optional(),
    expectedRevision: z.number().int().nonnegative(), configuration: ProductConfigurationSchema }).strict(),
  z.object({ kind: z.literal('asset'), draft: z.object({ ...assetDraftFields,
    authoring: AssetAuthoringSchema.omit({ production: true }) }).strict() }).strict(),
  z.object({ kind: z.literal('experience'), productVersionId: id,
    draft: ExperienceSaveSchema.omit({ requestId: true, methods: true, source: true }) }).strict(),
]) }).strict();
export const MachineProjectDraftResultSchema = z.object({ kind: z.enum(['assessment','asset','experience']),
  revisionId: id, productVersionId: id, revision: z.number().int().nonnegative(), digest,
  status: z.literal('draft'), platformExecuted: z.literal(false),
}).strict();
