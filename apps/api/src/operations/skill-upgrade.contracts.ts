import { z } from 'zod';
import { IdSchema, DataScopeSchema } from '@orai/contracts';
import { StyleSkillManifestSchema, FixedSkillVersionSchema, ProjectMethodCustomizationSchema } from '@orai/contracts/admin';

const id = IdSchema.toLowerCase(), digest = z.string().regex(/^[a-f0-9]{64}$/), revision = z.number().int().nonnegative();
export const SkillUpgradeSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('skill_version'), id, digest, revision, skillRevision: revision }).strict(),
  z.object({ kind: z.literal('project_method'), id, digest, skillRevision: revision }).strict(),
]);
export const SkillUpgradeChoiceSchema = z.object({ source: SkillUpgradeSourceSchema,
  notes: z.string().trim().min(1).max(8000), requestId: id,
  target: z.object({ planModuleId: id, digest }).strict().nullable(),
}).strict();
export const SkillUpgradeSelectionSchema = z.object({ items: z.array(SkillUpgradeChoiceSchema).min(1).max(25) }).strict();
export const SkillUpgradeItemSchema = z.object({ selection: SkillUpgradeChoiceSchema,
  source: FixedSkillVersionSchema, basis: z.object({ skillRevision: revision, sourceRevision: revision }).strict(),
  customization: ProjectMethodCustomizationSchema.nullable(),
  proposal: StyleSkillManifestSchema,
  diff: z.object({ changes: z.array(z.object({ path: z.string(), before: z.unknown(), after: z.unknown() }).strict()).max(500), truncated: z.boolean() }).strict(),
  requiresReview: z.literal(true), activationEffect: z.literal('none'), bindingEffect: z.literal('none'), publicationEffect: z.literal('none'),
}).strict();
export const SkillUpgradePreviewSchema = z.object({ schemaVersion: z.literal(1), scope: DataScopeSchema,
  items: z.array(SkillUpgradeItemSchema).min(1).max(25), digest,
}).strict();
export type SkillUpgradeChoice = z.infer<typeof SkillUpgradeChoiceSchema>;
export type SkillUpgradePreview = z.infer<typeof SkillUpgradePreviewSchema>;
