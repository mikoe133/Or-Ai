import { z } from 'zod';
import { DataScopeSchema, ExperienceTypeSchema, IdSchema, KeySchema, MoneyFenSchema, PageSchema, PlatformSchema, ProductStatusSchema, TimestampSchema } from './shared.js';
import { ProductDetailSchema, PublicReportSampleSchema } from './public.js';

const text = (max: number) => z.string().trim().min(1).max(max);
export const RetentionPolicySchema = z.object({
  firstRedemptionDays: z.number().int().min(1).max(365), entitlementDays: z.number().int().min(1).max(3650),
  rawAnswerDays: z.number().int().min(1).max(365), reportDays: z.number().int().min(1).max(3650),
}).strict();
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
export const PrivateOptionSchema = z.object({ id: KeySchema, label: text(160), notApplicable: z.boolean(), points: z.number().int().min(0).max(10).nullable() }).strict();
export const ProductConfigurationSchema = z.object({
  schemaVersion: z.literal(1), engine: z.literal('dimensions_v1'), locale: z.literal('zh-CN'),
  dimensions: z.array(z.object({ id: KeySchema, label: text(80), weight: z.number().int().min(1).max(10),
    minApplicableAnswers: z.number().int().min(1).max(100), missingReason: text(200),
  }).strict()).min(1).max(12),
  questions: z.array(z.object({ id: KeySchema, text: text(300), dimensionId: KeySchema,
    required: z.literal(true), weight: z.number().int().min(1).max(10), options: z.array(PrivateOptionSchema).min(2).max(10),
  }).strict()).min(1).max(100),
  bands: z.array(z.object({ resultTypeId: KeySchema, min: z.number().min(0).max(100), max: z.number().min(0).max(100) }).strict()).min(2).max(12),
  resultTypes: z.array(z.object({ id: KeySchema, label: text(80), summary: text(300) }).strict()).min(2).max(12),
  report: z.object({
    disclaimer: text(300), missingDimensionPolicy: z.literal('null'),
    templates: z.array(z.object({ resultTypeId: KeySchema, explanation: text(2000), suggestion: text(1000) }).strict()).min(2).max(12),
    insufficient: z.object({ id: KeySchema, label: text(80), explanation: text(2000), suggestion: text(1000) }).strict(),
  }).strict(), retention: RetentionPolicySchema,
  statisticsMinimum: z.number().int().min(20).max(1000),
}).strict().superRefine((config, context) => {
  const issue = (message: string) => context.addIssue({ code: 'custom', message });
  const unique = (values: string[], label: string) => { if (new Set(values).size !== values.length) issue(label + ' ID 重复'); };
  unique(config.dimensions.map(value => value.id), '维度'); unique(config.questions.map(value => value.id), '题目');
  unique(config.resultTypes.map(value => value.id), '结果'); unique(config.report.templates.map(value => value.resultTypeId), '报告模板');
  unique(config.bands.map(value => value.resultTypeId), '阈值');
  const dimensionIds = new Set(config.dimensions.map(value => value.id));
  const resultIds = new Set(config.resultTypes.map(value => value.id));
  let notApplicableOptions = 0;
  for (const question of config.questions) {
    if (!dimensionIds.has(question.dimensionId)) issue('题目引用未知维度');
    unique(question.options.map(value => value.id), '选项');
    const points: number[] = [];
    for (const option of question.options) {
      if (option.notApplicable !== (option.points === null)) issue('不适用选项必须没有分值，适用选项必须有分值');
      if (option.notApplicable) notApplicableOptions++;
      else if (option.points !== null) points.push(option.points);
    }
    if (points.length < 2 || Math.min(...points) === Math.max(...points)) issue('题目至少需要两个分值不同的有效选项');
  }
  if (notApplicableOptions === 0) issue('至少提供一个不适用选项');
  for (const dimension of config.dimensions) {
    if (config.questions.filter(value => value.dimensionId === dimension.id).length < dimension.minApplicableAnswers) issue('维度最少回答数超过该维度题量');
  }
  if (config.bands[0]?.min !== 0 || config.bands.at(-1)?.max !== 100) issue('阈值必须完整覆盖 0 到 100');
  config.bands.forEach((band, index) => {
    if (!resultIds.has(band.resultTypeId) || band.min >= band.max || (index > 0 && config.bands[index - 1]?.max !== band.min)) issue('阈值类型无效、重叠或存在空隙');
  });
  if (config.bands.length !== resultIds.size || config.report.templates.length !== resultIds.size) issue('每种结果必须恰有一组阈值和报告模板');
  if (resultIds.has(config.report.insufficient.id)) issue('信息不足结果不能使用正常类型 ID');
  for (const template of config.report.templates) if (!resultIds.has(template.resultTypeId)) issue('报告模板引用未知结果');
});
export type ProductConfiguration = z.infer<typeof ProductConfigurationSchema>;
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
export const AdminUploadPrepareSchema = z.object({ productVersionId: IdSchema, kind: z.enum(['cover', 'video']),
  fileName: z.string().min(1).max(160).refine(value => !/[\\/\x00-\x1f\x7f]/.test(value) && value !== '.' && value !== '..'),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm']),
  byteSize: z.number().int().min(1).max(536_870_912), checksum: z.string().regex(/^[0-9a-f]{64}$/), requestId: IdSchema }).strict();
export const AdminFileSchema = z.object({ id: IdSchema, productVersionId: IdSchema, scope: DataScopeSchema,
  kind: z.enum(['cover', 'video']), fileName: z.string(), mimeType: z.string(), byteSize: z.number().int(), checksum: z.string(),
  status: z.enum(['pending', 'verifying', 'uploaded', 'available', 'failed', 'expired']),
  expiresAt: TimestampSchema, verifiedAt: TimestampSchema.nullable(), uploadPath: z.string(), downloadPath: z.string().nullable() }).strict();
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
