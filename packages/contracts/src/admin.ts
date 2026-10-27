import { z } from 'zod';
export * from './machine.js';
export * from './machine-content.js';
export * from './product-configuration.js';
import { ProductConfigurationSchema } from './product-configuration.js';
import { DataScopeSchema, ExperienceTypeSchema, IdSchema, KeySchema, MoneyFenSchema, PageSchema, PlatformSchema, ProductStatusSchema, TimestampSchema } from './shared.js';
import { ProductDetailSchema, PublicReportSampleSchema } from './public.js';
import { ContentRevisionSchema, ContentReferenceSchema, ProductionRecordSchema } from './content.js';

const text = (max: number) => z.string().trim().min(1).max(max);
export const AdminRetentionPreviewInputSchema = z.object({
  asOf: TimestampSchema.optional(), page: z.number().int().min(1).max(100_000).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
}).strict();
export const AdminRetentionPreviewSchema = z.object({
  dryRun: z.literal(true), scope: DataScopeSchema, asOf: TimestampSchema,
  rawAnswers: PageSchema(z.object({ attemptId: IdSchema, versionId: IdSchema, status: z.enum(['completed', 'invalid']),
    completedAt: TimestampSchema, expiresAt: TimestampSchema, answerCount: z.number().int().min(1),
  }).strict()),
  reports: PageSchema(z.object({ reportId: IdSchema, attemptId: IdSchema, versionId: IdSchema, expiresAt: TimestampSchema }).strict()),
}).strict();
export const AdminProductInputSchema = z.object({
  slug: KeySchema, name: text(160), hook: text(100), summary: text(300), description: text(3000),
  categoryId: IdSchema, tagIds: z.array(IdSchema).max(10), priceFen: MoneyFenSchema, durationMinutes: z.number().int().min(1).max(120),
  experienceType: ExperienceTypeSchema, themeKey: KeySchema, coverUrl: z.string().max(2048).nullable(),
  scope: DataScopeSchema, recommended: z.boolean(), publicSample: PublicReportSampleSchema,
  purchaseUrl: z.url({ protocol: /^https$/ }).nullable(), purchaseNotice: text(400), redemptionNotice: text(400),
}).strict();
export const AdminVersionInputSchema = z.object({ configuration: ProductConfigurationSchema, requestId: IdSchema,
  expectedRevision: z.number().int().min(0).optional() }).strict();
export const AdminVersionActionSchema = z.object({ requestId: IdSchema, expectedRevision: z.number().int().min(0).optional() }).strict();
export const AdminVersionSchema = z.object({
  id: IdSchema, productId: IdSchema, scope: DataScopeSchema, number: z.number().int().min(1),
  status: ProductStatusSchema, createdAt: TimestampSchema, publishedAt: TimestampSchema.nullable(),
  revision: z.number().int().min(0).default(0),
}).strict();
export const AdminVersionPreviewSchema = z.object({
  isPreview: z.literal(true), version: AdminVersionSchema, configuration: ProductConfigurationSchema,
  publicView: ProductDetailSchema,
}).strict();
export const AdminConfigurationCheckSchema = z.object({
  valid: z.boolean(), issues: z.array(z.object({ path: z.string().max(160), message: z.string().max(240) }).strict()).max(20),
}).strict();
export const AdminProductStateResponseSchema = z.object({
  id: IdSchema, slug: KeySchema, status: ProductStatusSchema, scope: DataScopeSchema,
  currentVersionId: IdSchema.nullable(), publishedAt: TimestampSchema.nullable(),
}).strict();
export const AdminProductStateSchema = z.object({ productId: IdSchema, status: ProductStatusSchema, requestId: IdSchema }).strict();
export const AdminOrderInputSchema = z.object({ platform: PlatformSchema, reference: text(120), productVersionId: IdSchema,
  quantity: z.number().int().min(1).max(1000), amountFen: MoneyFenSchema, scope: DataScopeSchema,
}).strict();
export const AdminCreateOrderSchema = AdminOrderInputSchema.extend({ requestId: IdSchema }).strict();
export const AdminDeliveryActionSchema = z.object({ requestId: IdSchema }).strict();
export const AdminOrderSchema = z.object({ id: IdSchema, platform: PlatformSchema, reference: text(120),
  productVersionId: IdSchema, scope: DataScopeSchema, quantity: z.number().int().min(1).max(1000), amountFen: MoneyFenSchema,
  status: z.enum(['pending', 'fulfilled', 'refunded', 'cancelled']), createdAt: TimestampSchema, refundedAt: TimestampSchema.nullable() }).strict();
export const AdminDeliveryReceiptSchema = z.object({ orderId: IdSchema, batchId: IdSchema, productVersionId: IdSchema,
  scope: DataScopeSchema, codeIds: z.array(IdSchema).min(1).max(1000), replacedCodeId: IdSchema.nullable(), createdAt: TimestampSchema }).strict();
export const AdminSecretDeliverySchema = z.object({ receipt: AdminDeliveryReceiptSchema, deliveryAvailable: z.boolean(),
  deliveries: z.array(z.object({ id: IdSchema, code: z.string().regex(/^[A-Za-z0-9_-]{43}$/), claimDeadline: TimestampSchema }).strict()).max(1000) }).strict();
export const AdminAssetInputSchema = z.object({ productVersionId: IdSchema, platform: PlatformSchema,
  kind: z.enum(['cover', 'video', 'script', 'copy']), variant: text(40), status: z.enum(['draft', 'reviewed', 'ready', 'archived']),
  text: z.string().max(20_000).nullable(), storageKey: z.string().max(512).nullable(),
}).strict().superRefine((asset, context) => {
  if (asset.status === 'ready' && ((asset.kind === 'cover' || asset.kind === 'video') ? !asset.storageKey : !asset.text)) context.addIssue({ code: 'custom', message: '就绪素材必须有对应文件或文本' });
  if (asset.storageKey && (asset.storageKey.startsWith('/') || asset.storageKey.includes('..'))) context.addIssue({ code: 'custom', message: '文件引用必须是受控相对路径' });
});

export const AdminPageQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20) }).strict();
export const AdminRevisionInputSchema = z.object({ expectedRevision: z.number().int().min(0).max(2_147_483_646), requestId: IdSchema }).strict();
export const AdminCategoryCreateSchema = z.object({ slug: KeySchema, name: text(80), sortOrder: z.number().int().min(0).max(10_000).default(0), requestId: IdSchema }).strict();
export const AdminCategoryPatchSchema = AdminRevisionInputSchema.extend({ name: text(80).optional(), sortOrder: z.number().int().min(0).max(10_000).optional() }).strict();
export const AdminTagCreateSchema = AdminCategoryCreateSchema.omit({ sortOrder: true }).strict();
export const AdminTagPatchSchema = AdminRevisionInputSchema.extend({ name: text(80) }).strict();
export const AdminProductCreateSchema = AdminProductInputSchema.extend({ requestId: IdSchema }).strict();
export const AdminProductPatchSchema = AdminProductInputSchema.omit({ slug: true, scope: true }).partial().extend({
  expectedRevision: AdminRevisionInputSchema.shape.expectedRevision, requestId: IdSchema,
  recommendationOrder: z.number().int().min(0).max(10_000).optional(),
}).strict();
export const AdminProductSchema = AdminProductInputSchema.extend({ id: IdSchema, revision: z.number().int().min(0),
  status: ProductStatusSchema, recommendationOrder: z.number().int(), currentVersionId: IdSchema.nullable(),
  createdAt: TimestampSchema, updatedAt: TimestampSchema }).strict();
export const AdminReplaceVersionSchema = AdminVersionInputSchema.extend({ expectedRevision: AdminRevisionInputSchema.shape.expectedRevision }).strict();
export const AdminProductCoverSchema = AdminRevisionInputSchema.extend({ assetId: IdSchema }).strict();
export const AdminCsvImportSchema = z.object({ csv: z.string().min(1).max(500_000), requestId: IdSchema, dryRun: z.boolean().default(true) }).strict();
export const AdminAssetCreateSchema = z.object({ productVersionId: IdSchema, platform: PlatformSchema,
  kind: z.enum(['cover', 'video', 'script', 'copy']), variant: text(40), status: z.literal('draft').default('draft'),
  text: z.string().max(20_000).nullable().default(null), fileId: IdSchema.nullable().default(null), requestId: IdSchema }).strict();
export const AdminAssetPatchSchema = AdminRevisionInputSchema.extend({ text: z.string().max(20_000).nullable().optional(),
  fileId: IdSchema.nullable().optional(), variant: text(40).optional() }).strict();
export const AdminManagedAssetSchema = z.object({ id: IdSchema, productVersionId: IdSchema, scope: DataScopeSchema,
  platform: PlatformSchema, kind: z.enum(['cover', 'video', 'script', 'copy']), variant: text(40),
  status: z.enum(['draft', 'reviewed', 'ready', 'archived']), revision: z.number().int().min(0),
  text: z.string().max(20_000).nullable(), fileId: IdSchema.nullable(), mimeType: z.string().nullable(),
  byteSize: z.number().int().nullable(), checksum: z.string().nullable(), downloadPath: z.string().nullable(),
  createdAt: TimestampSchema, updatedAt: TimestampSchema }).strict();
export const AdminUploadPrepareSchema = z.object({ productVersionId: IdSchema, kind: z.enum(['cover', 'video', 'experience']),
  fileName: z.string().min(1).max(160).refine(value => !/[\\/\x00-\x1f\x7f]/.test(value) && value !== '.' && value !== '..'),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm']),
  byteSize: z.number().int().min(1).max(536_870_912), checksum: z.string().regex(/^[0-9a-f]{64}$/), requestId: IdSchema }).strict();
export const AdminFileSchema = z.object({ id: IdSchema, productVersionId: IdSchema, scope: DataScopeSchema,
  kind: z.enum(['cover', 'video', 'experience']), fileName: z.string(), mimeType: z.string(), byteSize: z.number().int(), checksum: z.string(),
  width: z.number().int().positive().nullable(), height: z.number().int().positive().nullable(), durationMs: z.number().int().positive().nullable(),
  status: z.enum(['pending', 'verifying', 'uploaded', 'available', 'failed', 'expired', 'deleting', 'deleted']),
  expiresAt: TimestampSchema, verifiedAt: TimestampSchema.nullable(), uploadPath: z.string(), downloadPath: z.string().nullable() }).strict();
export const ContentRevisionDetailSchema = ContentRevisionSchema.extend({
  inputs: z.array(ContentReferenceSchema), production: ProductionRecordSchema.nullable(),
  deliveryFile: AdminFileSchema.nullable(), previewFile: AdminFileSchema.nullable(),
}).strict();
export const ClientViewEventSchema = z.object({ kind: z.literal('view'), productVersionId: IdSchema,
  requestId: IdSchema, campaignCode: KeySchema.optional() }).strict();

export const AdminCategorySchema=z.object({id:IdSchema,slug:KeySchema,name:text(80),sortOrder:z.number().int(),revision:z.number().int().min(0)}).strict();
export const AdminTagSchema=AdminCategorySchema.omit({sortOrder:true}).strict();
export const AdminOrderDetailSchema=AdminOrderSchema.extend({
  codes:z.array(z.object({id:IdSchema,status:z.enum(['issued','claimed','expired','revoked']),claimDeadline:TimestampSchema,
    claimedAt:TimestampSchema.nullable(),revokedAt:TimestampSchema.nullable(),batchId:IdSchema.nullable(),replacesCodeId:IdSchema.nullable(),entitlementId:IdSchema.nullable()}).strict()),
  batches:z.array(z.object({id:IdSchema,createdAt:TimestampSchema}).strict()),
}).strict();
export const AdminCsvResultSchema=z.object({dryRun:z.boolean(),totalRows:z.number().int(),accepted:z.number().int(),rejected:z.number().int(),
  rows:z.array(z.object({row:z.number().int(),status:z.enum(['accepted','rejected']),orderId:IdSchema.optional(),code:z.string().optional(),message:z.string().optional()}).strict()).max(500),
}).strict();
export const AdminOverviewSchema=z.object({scope:DataScopeSchema,generatedAt:TimestampSchema,attribution:z.literal('unconfirmed'),
  events:z.array(z.object({kind:z.enum(['view','redemption','start','complete','report_view','share_export','refund']),source:z.enum(['demo','web','manual']),count:z.number().int(),latestAt:TimestampSchema.nullable()}).strict()),
  orders:z.object({recordedCount:z.number().int(),recordedAmountFen:z.number().int(),paymentVerified:z.literal(false),
    statuses:z.array(z.object({status:z.enum(['pending','fulfilled','refunded','cancelled']),count:z.number().int()}).strict())}).strict(),
  products:z.number().int(),assets:z.number().int(),
}).strict();
export const AdminAuditSchema=z.object({id:IdSchema,actorUserId:IdSchema.nullable(),scope:DataScopeSchema,action:text(160),entityKind:text(80),entityId:IdSchema,requestId:IdSchema.nullable(),createdAt:TimestampSchema}).strict();
export * from './content-workflow.js';

export * from "./skills.js";
export * from './skill-bindings.js';
export { ProductionDomainSchema } from './content-domain.js';
export * from './experience-authoring.js';
export * from './product-capabilities.js';
export * from './product-policy.js';
export * from './production-plans.js';
export * from './project-production.js';

export * from './machine-projects.js';

export * from './project-review.js';

export * from './production-runs.js';
export * from './project-workspace.js';
export * from './project-canvas.js';
export * from './codex-connections.js';
export * from './project-method-operations.js';
export * from './production-run-operations.js';

export * from './external-run-configurations.js';
export * from './product-plan.js';
