import { z } from "zod";
import { IdSchema, KeySchema, PageSchema } from "./shared.js";
import { ProductConfigurationSchema } from "./product-configuration.js";
import {
  AssetAuthoringSchema, ContentAssetSaveSchema, ContentLocatorSchema,
  ContentRevisionSchema, ProductionRecordSchema, ProductionSourceSchema,
} from "./content.js";
import { ContentContextSchema, ContentImpactSchema } from "./content-workflow.js";
import { CapabilityVersionSchema, ProductCapabilitiesSchema } from './product-capabilities.js';
import { BoundSkillSchema, FixedSkillVersionSchema, purposeDomain } from "./skill-bindings.js";
import {
  SkillCloneSchema, SkillFileSchema, SkillPurposeSchema, SkillReferencePathSchema,
  SkillSaveSchema, StyleSkillSchema, StyleSkillVersionSchema,
} from "./skills.js";

export const MachineContentOperationSchema = z.enum([
  "list", "get", "draft_save", "skill_list", "skill_version_get",
  "skill_draft_save", "skill_draft_clone", "assessment_validate",
  "context_bundle_get", "references_validate", "skill_reference_get",
  "experience_validate",
]);
export type MachineContentOperation = z.infer<typeof MachineContentOperationSchema>;
export const MachineContentListInputSchema = z.object({
  productId: IdSchema,
  page: z.number().int().min(1).max(100000).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
  current: z.boolean().default(true),
}).strict();
export const MachineContentListSchema = PageSchema(ContentRevisionSchema.omit({ snapshot: true }));
export const MachineContentGetInputSchema = z.object({ revisionId: IdSchema }).strict();
export const MachineBoundSkillSchema = z.object({
  ...BoundSkillSchema.shape,
  version: FixedSkillVersionSchema.extend({
    files: z.array(z.object({
      path: SkillReferencePathSchema,
      file: SkillFileSchema.pick({
        id: true, fileName: true, mimeType: true, byteSize: true, checksum: true,
      }),
    }).strict()),
  }).strict(),
}).strict().refine(value =>
  purposeDomain[value.purpose] === value.domain &&
  value.version.manifest.domain === value.domain &&
  value.version.manifest.purposes.includes(value.purpose),
  "skill 领域和专业用途不匹配");
export const MachineContentGetSchema = ContentRevisionSchema.extend({
  production: ProductionRecordSchema.omit({ actorUserId: true }).extend({
    skillVersions: z.array(MachineBoundSkillSchema).optional(),
  }).nullable(),
}).strict();

// Identity and the individual purpose versions are resolved on the server.
export const MachineProductionSourceSchema = ProductionSourceSchema
  .omit({ source: true, skillVersionId: true }).extend({ skillSetId: IdSchema }).strict();
export const MachineAssetDraftSaveSchema = z.object({
  ...ContentAssetSaveSchema.shape,
  authoring: z.object({
    ...AssetAuthoringSchema.shape,
    production: MachineProductionSourceSchema,
  }).strict(),
}).strict().superRefine((value, ctx) => {
  const checked = ContentAssetSaveSchema.safeParse({
    ...value,
    authoring: {
      ...value.authoring,
      production: { ...value.authoring.production, source: "mcp" },
    },
  });
  if (!checked.success)
    for (const issue of checked.error.issues)
      ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
});
export const MachineAssessmentDraftSaveSchema = z.object({
  productId: IdSchema,
  productVersionId: IdSchema.optional(),
  expectedRevision: z.number().int().min(0),
  requestId: IdSchema,
  configuration: ProductConfigurationSchema,
  creativeProfileRevisionId: IdSchema,
  skillSetId: IdSchema,
  batchKey: KeySchema.nullable().optional(),
  externalLabel: z.string().trim().min(1).max(160).nullable().optional(),
}).strict();
export const MachineAssessmentValidateSchema = z.object({
  productId: IdSchema, configuration: z.unknown(),
}).strict();
export const MachineAssessmentCheckSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.object({
    path: z.string().max(160), message: z.string().max(240),
  }).strict()).max(20),
}).strict();

export const MachineSkillFileSchema = SkillFileSchema.omit({ uploadPath: true, downloadPath: true });
export const MachineSkillVersionSchema = StyleSkillVersionSchema.extend({
  files: z.array(z.object({
    path: SkillReferencePathSchema, file: MachineSkillFileSchema,
  }).strict()),
}).strict();
export const MachineSkillSummarySchema = StyleSkillSchema.extend({
  latest: StyleSkillVersionSchema.pick({
    id: true, skillId: true, number: true, revision: true, status: true,
    digest: true, createdAt: true, updatedAt: true,
  }),
}).strict();
export const MachineSkillListInputSchema = z.object({}).strict();
export const MachineSkillListSchema = z.object({
  items: z.array(MachineSkillSummarySchema).max(100),
}).strict();
export const MachineSkillVersionGetSchema = z.object({ skillId: IdSchema, versionId: IdSchema }).strict();
export const MachineSkillDraftSaveSchema = SkillSaveSchema.extend({
  skillId: IdSchema, versionId: IdSchema,
}).strict();
export const MachineSkillDraftCloneSchema = SkillCloneSchema.extend({ skillId: IdSchema }).strict();

export const MachineContextInputSchema = z.object({
  creativeProfileRevisionId: IdSchema,
  skillSetId: IdSchema,
  inputs: z.array(z.object({
    revisionId: IdSchema,
    digest: z.string().regex(/^[0-9a-f]{64}$/),
    locator: ContentLocatorSchema,
  }).strict()).max(100),
  includeCapabilities: z.boolean().default(false),
  capabilityVersion: CapabilityVersionSchema.default(1),
}).strict();
export const MachineContextSchema = ContentContextSchema.extend({
  skillSetId: IdSchema, skillVersions: z.array(MachineBoundSkillSchema),
  capabilities: ProductCapabilitiesSchema.optional(),
}).strict();
export const MachineReferencesValidateSchema = MachineContextInputSchema.extend({
  targetRevisionId: IdSchema.optional(),
}).strict();
export const MachineReferencesResultSchema = z.object({
  valid: z.literal(true),
  context: MachineContextSchema,
  impact: ContentImpactSchema.nullable(),
}).strict();
export const MachineSkillReferenceGetSchema = z.object({
  skillSetId: IdSchema,
  purpose: SkillPurposeSchema,
  fileId: IdSchema,
}).strict();
export const MachineSkillReferenceSchema = z.object({
  fileId: IdSchema,
  path: SkillReferencePathSchema,
  mimeType: z.enum(["text/markdown", "text/plain", "application/json"]),
  checksum: z.string().regex(/^[0-9a-f]{64}$/),
  text: z.string().max(256 * 1024),
}).strict();
