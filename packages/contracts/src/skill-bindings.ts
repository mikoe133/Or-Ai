import { z } from "zod";
import { DataScopeSchema, IdSchema, TimestampSchema } from "./shared.js";
import { ContentDomainSchema, ProductionDomainSchema } from "./content-domain.js";
import {
  SkillPurposeSchema,
  CoreSkillPurposeSchema,
  SkillFormSchema,
  StyleSkillManifestSchema,
  SkillFileSchema,
} from "./skills.js";

export const purposeDomain = {
  assessment_design: "assessment",
  report_writing: "assessment",
  cover_design: "cover",
  video_production: "video",
  copywriting: "copy",
  scene_design: "experience",
  report_presentation: "experience",
} as const;
export const FixedSkillVersionSchema = z
  .object({
    id: IdSchema,
    skillId: IdSchema,
    number: z.number().int().positive(),
    digest: z.string().regex(/^[0-9a-f]{64}$/),
    manifest: StyleSkillManifestSchema,
    files: z.array(
      z
        .object({
          path: z.string(),
          file: SkillFileSchema.pick({
            id: true,
            fileName: true,
            mimeType: true,
            byteSize: true,
            checksum: true,
            downloadPath: true,
          }),
        })
        .strict(),
    ),
  })
  .strict();
export const BoundSkillSchema = z
  .object({
    purpose: SkillPurposeSchema,
    domain: ProductionDomainSchema,
    version: FixedSkillVersionSchema,
  })
  .strict()
  .refine(
    (value) =>
      purposeDomain[value.purpose] === value.domain &&
      value.version.manifest.domain === value.domain &&
      value.version.manifest.purposes.includes(value.purpose),
    "skill 领域和专业用途不匹配",
  );
export const CreativeSkillSetSchema = z
  .object({
    id: IdSchema,
    productId: IdSchema,
    scope: DataScopeSchema,
    creativeProfileRevisionId: IdSchema,
    revision: z.number().int().positive(),
    digest: z.string().regex(/^[0-9a-f]{64}$/),
    note: z.string().trim().min(1).max(2000),
    createdAt: TimestampSchema,
    bindings: z.array(BoundSkillSchema.safeExtend({ purpose: CoreSkillPurposeSchema, domain: ContentDomainSchema })).length(5),
  })
  .strict()
  .refine(
    (value) => new Set(value.bindings.map((item) => item.purpose)).size === 5,
    "五个专业用途必须分别绑定",
  );
export const CreativeSkillSetSaveSchema = z
  .object({
    expectedRevision: z.number().int().min(0),
    requestId: IdSchema,
    note: z.string().trim().min(1).max(2000),
    bindings: z
      .array(
        z
          .object({ purpose: CoreSkillPurposeSchema, skillVersionId: IdSchema })
          .strict(),
      )
      .length(5),
  })
  .strict()
  .refine(
    (value) => new Set(value.bindings.map((item) => item.purpose)).size === 5,
    "五个专业用途必须分别绑定",
  );
export const SkillCandidateQuerySchema = z
  .object({
    purpose: SkillPurposeSchema,
    form: SkillFormSchema,
    q: z.string().trim().min(1).max(120).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export const SkillSetDomainSchema = z
  .object({
    skillSetId: IdSchema,
    creativeProfileRevisionId: IdSchema,
    domain: ContentDomainSchema,
    skillVersions: z.array(BoundSkillSchema).min(1).max(2),
  })
  .strict();
