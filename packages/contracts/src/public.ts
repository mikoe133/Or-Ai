import { z } from 'zod';
import { ExperienceTypeSchema, IdSchema, KeySchema, MoneyFenSchema, PageSchema, TimestampSchema } from './shared.js';

const queryInteger = (min: number, max: number) => z.preprocess(
  value => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
  z.number().int().min(min).max(max),
);
export const CatalogQuerySchema = z.object({
  q: z.string().trim().max(100).optional(), category: KeySchema.optional(),
  tags: z.preprocess(value => typeof value === 'string' ? value.split(',') : value,
    z.array(KeySchema).max(10).transform(value => [...new Set(value)].sort())).optional(),
  minPriceFen: queryInteger(0, 10_000_000).optional(), maxPriceFen: queryInteger(0, 10_000_000).optional(),
  minDurationMinutes: queryInteger(1, 120).optional(), maxDurationMinutes: queryInteger(1, 120).optional(),
  experienceType: ExperienceTypeSchema.optional(), sort: z.enum(['latest', 'recommended']).default('latest'),
  page: queryInteger(1, 10_000).default(1), pageSize: queryInteger(1, 50).default(20),
}).strict().superRefine((query, context) => {
  for (const [min, max, field] of [[query.minPriceFen, query.maxPriceFen, 'maxPriceFen'],
    [query.minDurationMinutes, query.maxDurationMinutes, 'maxDurationMinutes']] as const) {
    if (min !== undefined && max !== undefined && min > max) context.addIssue({ code: 'custom', path: [field], message: '上限不能小于下限' });
  }
});
export type CatalogQueryDto = z.infer<typeof CatalogQuerySchema>;
export const CatalogMetadataQuerySchema = z.object({}).strict();
export const CategorySchema = z.object({ id: IdSchema, slug: KeySchema, name: z.string().min(1).max(80), order: z.number().int().min(0) }).strict();
export const TagSchema = z.object({ id: IdSchema, slug: KeySchema, name: z.string().min(1).max(40) }).strict();
export const CategoryListSchema = z.array(CategorySchema);
export const TagListSchema = z.array(TagSchema);
const PublicPathSchema = z.string().max(2048).refine(value => /^\/[a-zA-Z0-9/_\-.]+$/.test(value) || /^https:\/\//.test(value), '仅允许公开路径或 HTTPS 地址');
export const ProductCardSchema = z.object({
  id: IdSchema, slug: KeySchema, name: z.string().min(1).max(160), hook: z.string().min(1).max(100),
  summary: z.string().min(1).max(300), category: CategorySchema, tags: z.array(TagSchema).max(10),
  price: z.object({ amountFen: MoneyFenSchema, currency: z.literal('CNY'), isTestPrice: z.boolean() }).strict(),
  durationMinutes: z.number().int().min(1).max(120), durationIsEstimate: z.boolean(),
  questionCount: z.number().int().min(1).max(100), experienceType: ExperienceTypeSchema,
  themeKey: KeySchema, coverUrl: PublicPathSchema.nullable(), isDemo: z.boolean(),
  recommended: z.boolean(), publishedAt: TimestampSchema, versionNumber: z.number().int().min(1),
}).strict();
export const PublicReportSampleSchema = z.object({
  label: z.string().min(1).max(80), summary: z.string().min(1).max(300),
  dimensions: z.array(z.object({ label: z.string().min(1).max(80), score: z.number().min(0).max(100).nullable() }).strict()).min(1).max(12),
  suggestion: z.string().min(1).max(300), isDemo: z.boolean(),
}).strict();
export const ProductDetailSchema = ProductCardSchema.extend({
  versionId: IdSchema,
  description: z.string().min(1).max(3000), publicSample: PublicReportSampleSchema,
  purchaseNotice: z.string().min(1).max(400), purchaseUrl: z.url({ protocol: /^https$/ }).nullable(),
  redemptionNotice: z.string().min(1).max(400),
}).strict();
export const ProductPageSchema = PageSchema(ProductCardSchema);
export type ProductCardDto = z.infer<typeof ProductCardSchema>;
export type ProductDetailDto = z.infer<typeof ProductDetailSchema>;
export type PublicReportSampleDto = z.infer<typeof PublicReportSampleSchema>;
