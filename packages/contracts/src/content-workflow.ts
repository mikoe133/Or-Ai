import { z } from "zod";
import { DataScopeSchema, IdSchema, TimestampSchema } from "./shared.js";
import { BoundSkillSchema, CreativeSkillSetSchema } from './skill-bindings.js';
import { ExperienceAuthoringRevisionSchema } from './experience-authoring.js';
import { ProductionPlanRevisionSchema } from './production-plans.js';
import { RendererReferenceSchema } from './experience.js';
import {
  ContentDomainSchema,
  ContentLocatorSchema,
  ContentRevisionSchema,
  CreativeProfileRevisionSchema,
  ProductionRecordSchema,
} from "./content.js";
const digest = z.string().regex(/^[0-9a-f]{64}$/);
const text = (max: number) => z.string().trim().min(1).max(max);
export const ContentAlertSchema = z
  .object({
    code: z.enum([
      "profile_updated",
      "source_updated",
      "source_archived",
      "self_updated",
      "self_archived",
    ]),
    revisionId: IdSchema,
    latestId: IdSchema,
    message: text(240),
    blocking: z.boolean(),
  })
  .strict();
export const ContentImpactSchema = z
  .object({
    revisionId: IdSchema,
    fingerprint: digest,
    alerts: z.array(ContentAlertSchema),
    reviewed: z.boolean(),
    needsReview: z.boolean(),
    blocked: z.boolean(),
    reviewNote: z.string().nullable(),
  })
  .strict();
export const ContentReviewInputSchema = z
  .object({
    expectedFingerprint: digest,
    note: text(2000),
    requestId: IdSchema,
  })
  .strict();
export const ContentDiffSchema = z
  .object({
    fromId: IdSchema,
    toId: IdSchema,
    truncated: z.boolean(),
    changes: z
      .array(
        z
          .object({ path: z.string(), before: z.unknown(), after: z.unknown() })
          .strict(),
      )
      .max(500),
  })
  .strict();
export const ContentFragmentSchema = z
  .object({
    revisionId: IdSchema,
    productVersionId: IdSchema,
    digest,
    locator: ContentLocatorSchema,
    content: z.record(z.string(), z.unknown()),
  })
  .strict();
export const ContentContextSchema = z
  .object({
    productId: IdSchema,
    creativeProfileRevisionId: IdSchema,
    domain: ContentDomainSchema,
    creativeProfile: CreativeProfileRevisionSchema,
    skillSetId: IdSchema.optional(),
    skillVersions: z.array(BoundSkillSchema),
    inputs: z.array(ContentFragmentSchema),
  })
  .strict();
export const ContentPackageSelectionSchema = z
  .object({
    productId: IdSchema,
    creativeProfileRevisionId: IdSchema,
    assessmentRevisionId: IdSchema,
    assetRevisionIds: z.array(IdSchema).min(3).max(40),
    reportMode: z.literal("compatible_standard"),
    label: text(160),
    skillSetId: IdSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.assetRevisionIds.map((id) => id.toLowerCase())).size ===
      value.assetRevisionIds.length,
    "采用修订不可重复",
  );
export const ContentPackageAdoptSchema = z
  .object({
    selection: ContentPackageSelectionSchema,
    expectedFingerprint: digest,
    expectedPackageNumber: z.number().int().min(0),
    note: text(2000),
    consistencyConfirmed: z.literal(true),
    requestId: IdSchema,
  })
  .strict();
export const ContentPackagePreviewSchema = z
  .object({
    fingerprint: digest,
    canAdopt: z.boolean(),
    issues: z.array(z.string()),
    impacts: z.array(ContentImpactSchema),
    revisions: z.array(ContentRevisionSchema),
    latestPackageNumber: z.number().int().min(0),
  })
  .strict();
const exportedProduction = ProductionRecordSchema.omit({
  actorUserId: true,
  scope: true,
});
const LegacyContentPackageManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    product: z
      .object({
        id: IdSchema,
        name: text(160),
        slug: z.string(),
        themeKey: z.string(),
        publicSample: z.record(z.string(), z.unknown()),
      })
      .strict(),
    creativeProfile: CreativeProfileRevisionSchema,
    assessment: ContentRevisionSchema,
    runtime: z
      .object({
        experience: z.literal("web"),
        engine: z.literal("dimensions_v1"),
        report: z.literal("compatible_standard"),
        themeKey: z.string(),
      })
      .strict(),
    assets: z.array(
      z
        .object({
          revision: ContentRevisionSchema,
          production: exportedProduction.nullable(),
          inputs: z.array(
            z
              .object({
                sourceRevisionId: IdSchema,
                sourceDigest: digest,
                locator: ContentLocatorSchema,
                targetLocator: ContentLocatorSchema,
                role: z.string(),
                mode: z.enum(["exact", "adapted"]),
                usedText: z.string(),
                sourceSnapshot: z.record(z.string(), z.unknown()),
              })
              .strict(),
          ),
          files: z.array(
            z
              .object({
                id: IdSchema,
                purpose: z.enum(["preview", "delivery"]),
                fileName: z.string(),
                mimeType: z.string(),
                byteSize: z.number().int(),
                checksum: digest,
                width: z.number().int().nullable(),
                height: z.number().int().nullable(),
                durationMs: z.number().int().nullable(),
                downloadPath: z.string(),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
    dependencies: z.array(ContentRevisionSchema),
    assessmentProduction: exportedProduction.nullable(),
    reviews: z.array(
      z
        .object({ revisionId: IdSchema, fingerprint: digest, note: z.string() })
        .strict(),
    ),
  })
  .strict();
export const ContentPackageManifestSchema = z.discriminatedUnion('schemaVersion', [
  LegacyContentPackageManifestSchema,
  LegacyContentPackageManifestSchema.extend({ schemaVersion: z.literal(2), skillSet: CreativeSkillSetSchema }).strict(),
  LegacyContentPackageManifestSchema.extend({ schemaVersion: z.literal(3), skillSet: CreativeSkillSetSchema.optional(),
    productPlan: ProductionPlanRevisionSchema,
    experience: ExperienceAuthoringRevisionSchema.refine(value => value.status === 'reviewed' && !!value.productPlanInput, '采用包须保留已审核且固定规划的体验'),
    runtime: LegacyContentPackageManifestSchema.shape.runtime.extend({ experience: z.literal('threejs'),
      renderer: RendererReferenceSchema, reportRenderer: RendererReferenceSchema,
      compatibility: z.literal('registered_pair'), deviceAcceptance: z.literal('not_recorded'),
    }).strict(),
  }).strict(),
]);
export const ContentPackageSchema = z
  .object({
    id: IdSchema,
    productId: IdSchema,
    scope: DataScopeSchema,
    number: z.number().int().positive(),
    label: text(160),
    digest,
    manifest: ContentPackageManifestSchema,
    note: text(2000),
    createdAt: TimestampSchema,
  })
  .strict();
export const FileCleanupCandidateSchema = z
  .object({
    id: IdSchema,
    fileName: z.string(),
    byteSize: z.number().int(),
    checksum: digest,
    status: z.string(),
    expiresAt: TimestampSchema,
  })
  .strict();
export const FileCleanupPreviewInputSchema = z
  .object({
    productId: IdSchema,
    fileIds: z.array(IdSchema).min(1).max(50),
    requestId: IdSchema,
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.fileIds.map((id) => id.toLowerCase())).size ===
      value.fileIds.length,
    "文件不可重复",
  );
export const FileCleanupPlanSchema = z
  .object({
    id: IdSchema,
    productId: IdSchema,
    scope: DataScopeSchema,
    digest,
    status: z.enum(["prepared", "running", "complete"]),
    expiresAt: TimestampSchema,
    createdAt: TimestampSchema,
    files: z.array(FileCleanupCandidateSchema),
    results: z.array(
      z
        .object({
          fileId: IdSchema,
          status: z.enum(["deleted", "protected", "retry"]),
          message: z.string(),
        })
        .strict(),
    ),
  })
  .strict();
export const FileCleanupExecuteSchema = z
  .object({
    expectedDigest: digest,
    confirmed: z.literal(true),
    requestId: IdSchema,
  })
  .strict();
export * from "./content.js";
