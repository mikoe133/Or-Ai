import { z } from 'zod';
import { IdSchema, PageSchema, DataScopeSchema, TimestampSchema, QuestionSchema, ReportContentSchema } from './shared.js';
import { ExperienceManifestSchema, ExperienceReleaseSchema, ReportPresentationSchema } from './experience.js';
import { ReportPlanDraftSchema, CreativeProfileRevisionSchema } from './content.js';
import { BoundSkillSchema } from './skill-bindings.js';
import { ExperienceSkillPurposeSchema } from './skills.js';
import { CapabilityVersionSchema, ProductCapabilitiesSchema } from './product-capabilities.js';

export const ExperienceMethodChoiceSchema = z.object({ purpose: ExperienceSkillPurposeSchema, skillVersionId: IdSchema }).strict();
const methods = z.array(ExperienceMethodChoiceSchema).max(2).refine(values =>
  (values.length === 0 || values.length === 2) && new Set(values.map(v => v.purpose)).size === values.length,
  '体验方法需分别绑定场景设计和报告呈现，或明确采用人工制作');
export const ExperienceDraftInputSchema = z.object({
  manifest: ExperienceManifestSchema, reportPlan: ReportPlanDraftSchema, methods,
  note: z.string().trim().min(1).max(2000),
}).strict();
export const ExperienceSaveSchema = ExperienceDraftInputSchema.extend({
  expectedRevision: z.number().int().min(0), expectedVersionRevision: z.number().int().min(0), requestId: IdSchema,
  source: z.enum(['manual','external_ai']).default('manual'),
}).strict();
export const MachineExperienceSaveSchema = ExperienceSaveSchema.omit({ source: true }).refine(value => value.methods.length === 2,
  '机器制作必须固定两种专业用途的 skill 版本');
export const ExperienceReviewSchema = z.object({ expectedRevision: z.number().int().positive(), requestId: IdSchema }).strict();
export const ExperienceAuthoringRevisionSchema = z.object({
  id: IdSchema, productId: IdSchema, productVersionId: IdSchema, scope: DataScopeSchema,
  revision: z.number().int().positive(), status: z.enum(['draft','reviewed']),
  versionRevision: z.number().int().min(0), configurationDigest: z.string().regex(/^[0-9a-f]{64}$/),
  manifest: ExperienceManifestSchema, reportPlan: ReportPlanDraftSchema,
  methods: z.array(BoundSkillSchema).max(2), note: z.string(),
  source: z.enum(['manual','external_ai','mcp']), machineCredentialId: IdSchema.nullable(), machineRequestId: IdSchema.nullable(),
  digest: z.string().regex(/^[0-9a-f]{64}$/), createdAt: TimestampSchema,
}).strict();
export const ExperienceHistorySchema = PageSchema(ExperienceAuthoringRevisionSchema);
export const ExperienceMachineListInputSchema = z.object({ productVersionId: IdSchema,
  page: z.number().int().min(1).max(100000).default(1), pageSize: z.number().int().min(1).max(50).default(20) }).strict();
export const ExperienceMachineListSchema = PageSchema(ExperienceAuthoringRevisionSchema.omit({ manifest: true, reportPlan: true, methods: true }));
export const ExperienceReferenceInputSchema = z.object({ revisionId: IdSchema, purpose: ExperienceSkillPurposeSchema, fileId: IdSchema }).strict();
export const ExperienceWorkspaceQuerySchema = z.object({ profileId: IdSchema.optional(),
  includeCapabilities: z.union([z.boolean(), z.enum(['true', 'false']).transform(value => value === 'true')]).default(false),
  capabilityVersion: z.union([CapabilityVersionSchema, z.enum(['1', '2']).transform(value => Number(value) as 1 | 2)]).default(1),
}).strict();
export const ExperienceWorkspaceSchema = z.object({
  productVersionId: IdSchema, versionRevision: z.number().int().min(0), versionStatus: z.enum(['draft','reviewed','published','archived']),
  defaultManifest: ExperienceManifestSchema, reportPlan: ReportPlanDraftSchema.nullable(),
  questions: z.array(QuestionSchema),
  latest: ExperienceAuthoringRevisionSchema.nullable(), release: ExperienceReleaseSchema.nullable(),
  capabilities: ProductCapabilitiesSchema.optional(),
}).strict();
export const ExperienceCheckSchema = z.object({ valid: z.boolean(), issues: z.array(z.string().max(300)).max(20) }).strict();
export const ExperiencePreviewInputSchema = z.object({ answers: z.array(z.object({ questionId: z.string().min(1).max(100), optionId: z.string().min(1).max(100) }).strict()).max(100) }).strict();
export const ExperiencePreviewSchema = z.object({
  isPreview: z.literal(true), revisionId: IdSchema, manifest: ExperienceManifestSchema,
  questions: z.array(QuestionSchema), report: ReportContentSchema, presentation: ReportPresentationSchema,
}).strict();
export const ExperienceContextInputSchema = z.object({ productVersionId: IdSchema, skillVersionIds: z.array(IdSchema).max(2).default([]),
  includeTemplates: z.boolean().default(false), includeCapabilities: z.boolean().default(false),
  capabilityVersion: CapabilityVersionSchema.default(1),
}).strict();
export const ExperienceContextSchema = z.object({
  productVersionId: IdSchema, versionRevision: z.number().int().min(0),
  creativeProfile: CreativeProfileRevisionSchema, defaultManifest: ExperienceManifestSchema,
  reportPlan: ReportPlanDraftSchema, questions: z.array(QuestionSchema),
  methods: z.array(BoundSkillSchema).max(2),
  capabilities: ProductCapabilitiesSchema.optional(),
  supported: z.object({ renderer: z.literal('dom-choice@1'), report: z.literal('legacy-text@1'), resources: z.array(z.enum(['illustration','texture'])),
    templates: z.array(z.object({ renderer: z.string().max(80), report: z.string().max(80), maxOptions: z.number().int().positive(),
      maxResources: z.number().int().min(0), maxResourceBytes: z.number().int().positive(), maxTotalResourceBytes: z.number().int().positive() }).strict()).max(10).optional(),
  }).strict(),
}).strict();
