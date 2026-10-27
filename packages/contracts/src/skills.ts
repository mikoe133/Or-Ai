import { z } from "zod";
import {
  DataScopeSchema,
  IdSchema,
  KeySchema,
  TimestampSchema,
} from "./shared.js";
import { ProductionDomainSchema } from "./content-domain.js";
const text = (max: number) => z.string().trim().min(1).max(max);
const checksum = z.string().regex(/^[0-9a-f]{64}$/);
export const CoreSkillPurposeSchema = z.enum([
  "assessment_design",
  "report_writing",
  "cover_design",
  "video_production",
  "copywriting",
]);
export const ExperienceSkillPurposeSchema = z.enum(["scene_design", "report_presentation"]);
export const SkillPurposeSchema = z.enum([...CoreSkillPurposeSchema.options, ...ExperienceSkillPurposeSchema.options]);
export const skillPurposes = {
  assessment: ["assessment_design", "report_writing"],
  cover: ["cover_design"],
  video: ["video_production"],
  copy: ["copywriting"],
  experience: ["scene_design", "report_presentation"],
} as const;
export const SkillFormSchema = z.enum(["web", "cards", "2.5d", "3d", "game"]);
export const SkillStatusSchema = z.enum([
  "draft",
  "reviewed",
  "active",
  "archived",
]);
export const SkillReferencePathSchema = text(160).refine(
  (value) =>
    value
      .split("/")
      .every(
        (part) =>
          /^[\p{L}\p{N}][\p{L}\p{N}._ -]*$/u.test(part) &&
          part !== "." &&
          part !== "..",
      ) && !/^skill\.md$/i.test(value),
  "参考路径需为包内相对文件名，不含上级路径或编码",
);
const unique = (values: string[]) =>
  new Set(values.map((value) => value.toLowerCase())).size === values.length;
export function missingSkillReferences(markdown: string, paths: string[]) {
  const codeRemoved = markdown.replace(
    /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g,
    "",
  );
  const targets = [
    ...codeRemoved.matchAll(
      /!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^\n]*?["'])?\s*\)|^\s*\[[^\]]+\]:\s*(\S+)|(?:src|href)\s*=\s*["']([^"']+)["']/gim,
    ),
  ].map((match) => match[1] ?? match[2] ?? match[3] ?? match[4] ?? "");
  return [
    ...new Set(
      targets
        .filter(
          (target) => !target.startsWith("#") && !/^https?:\/\//i.test(target),
        )
        .filter(
          (target) =>
            !SkillReferencePathSchema.safeParse(target.split("#")[0]).success ||
            !paths.includes(target.split("#")[0]!),
        ),
    ),
  ];
}
export const StyleSkillManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    domain: ProductionDomainSchema,
    name: text(120),
    description: text(1200),
    purposes: z.array(SkillPurposeSchema).min(1).max(2),
    styles: z.array(text(40)).min(1).max(12),
    supportedForms: z.array(SkillFormSchema).min(1).max(5),
    inputs: z
      .array(
        z
          .object({
            key: KeySchema,
            description: text(1000),
            required: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(24),
    outputs: z
      .array(z.object({ key: KeySchema, description: text(1000) }).strict())
      .min(1)
      .max(24),
    instructions: text(100000),
    examples: z
      .array(
        z
          .object({ title: text(120), input: text(4000), output: text(4000) })
          .strict(),
      )
      .max(10),
    references: z
      .array(
        z.object({ path: SkillReferencePathSchema, fileId: IdSchema }).strict(),
      )
      .max(20),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.purposes.some(
        (purpose) =>
          !(skillPurposes[value.domain] as readonly string[]).includes(purpose),
      )
    )
      ctx.addIssue({ code: "custom", message: "专业用途与 skill 领域不符" });
    for (const values of [
      value.purposes,
      value.styles,
      value.supportedForms,
      value.inputs.map((row) => row.key),
      value.outputs.map((row) => row.key),
      value.references.map((row) => row.path),
    ])
      if (!unique(values))
        ctx.addIssue({
          code: "custom",
          message: "用途、风格、形式、输入输出或参考路径不可重复",
        });
    if (
      !value.inputs.some(
        (row) => row.key === "creative-profile" && row.required,
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "必须声明共同创作设定 creative-profile 为必填输入",
      });
    if (
      missingSkillReferences(
        value.instructions,
        value.references.map((row) => row.path),
      ).length
    )
      ctx.addIssue({
        code: "custom",
        message: "正文存在未登记或不安全的包内引用",
      });
    if (JSON.stringify(value).length > 200000)
      ctx.addIssue({ code: "custom", message: "skill 内容超出大小限制" });
  });
export type StyleSkillManifest = z.infer<typeof StyleSkillManifestSchema>;
export const SkillCreateSchema = z
  .object({
    slug: KeySchema,
    manifest: StyleSkillManifestSchema,
    requestId: IdSchema,
  })
  .strict();
export const SkillSaveSchema = z
  .object({
    manifest: StyleSkillManifestSchema,
    expectedRevision: z.number().int().min(0),
    requestId: IdSchema,
  })
  .strict();
export const SkillCloneSchema = z
  .object({
    sourceVersionId: IdSchema,
    expectedSkillRevision: z.number().int().min(0),
    requestId: IdSchema,
  })
  .strict();
export const SkillActionSchema = z
  .object({ expectedRevision: z.number().int().min(0), requestId: IdSchema })
  .strict();
export const SkillQuerySchema = z
  .object({
    q: text(120).optional(),
    style: text(40).optional(),
    purpose: SkillPurposeSchema.optional(),
    form: SkillFormSchema.optional(),
    status: SkillStatusSchema.optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export const SkillFilePrepareSchema = z
  .object({
    fileName: text(160).refine((v) => !/[\\/\x00-\x1f\x7f]/.test(v)),
    mimeType: z.enum([
      "text/markdown",
      "text/plain",
      "application/json",
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
    ]),
    byteSize: z
      .number()
      .int()
      .min(1)
      .max(5 * 1024 * 1024),
    checksum,
    requestId: IdSchema,
  })
  .strict();
export const SkillFileSchema = z
  .object({
    id: IdSchema,
    skillId: IdSchema,
    fileName: z.string(),
    mimeType: SkillFilePrepareSchema.shape.mimeType,
    byteSize: z.number().int().min(1),
    checksum,
    status: z.enum([
      "pending",
      "verifying",
      "uploaded",
      "available",
      "failed",
      "expired",
      "deleting",
      "deleted",
    ]),
    expiresAt: TimestampSchema,
    verifiedAt: TimestampSchema.nullable(),
    uploadPath: z.string(),
    downloadPath: z.string().nullable(),
  })
  .strict();
export const StyleSkillVersionSchema = z
  .object({
    id: IdSchema,
    skillId: IdSchema,
    scope: DataScopeSchema,
    number: z.number().int().min(1),
    revision: z.number().int().min(0),
    status: SkillStatusSchema,
    manifest: StyleSkillManifestSchema,
    digest: checksum,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    files: z.array(
      z
        .object({ path: SkillReferencePathSchema, file: SkillFileSchema })
        .strict(),
    ),
  })
  .strict();
export const StyleSkillSchema = z
  .object({
    id: IdSchema,
    scope: DataScopeSchema,
    domain: ProductionDomainSchema,
    slug: KeySchema,
    name: text(120),
    description: text(1200),
    styles: z.array(z.string()),
    purposes: z.array(SkillPurposeSchema),
    supportedForms: z.array(SkillFormSchema),
    revision: z.number().int().min(0),
    latest: StyleSkillVersionSchema,
    activeVersionId: IdSchema.nullable(),
  })
  .strict();
export const StyleSkillExportSchema = z
  .object({
    schemaVersion: z.literal(1),
    slug: KeySchema,
    version: StyleSkillVersionSchema,
  })
  .strict();
