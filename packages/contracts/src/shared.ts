import { z } from 'zod';

export const IdSchema = z.uuid();
export const KeySchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
export const TimestampSchema = z.iso.datetime({ offset: true });
export const MoneyFenSchema = z.number().int().min(0).max(10_000_000);
export const DataScopeSchema = z.enum(['demo', 'live']);
export const PlatformSchema = z.enum(['douyin', 'xiaohongshu', 'manual']);
export const ExperienceTypeSchema = z.enum(['score', 'tendency']);
export const ProductStatusSchema = z.enum(['draft', 'reviewed', 'published', 'archived']);
export const ApiErrorCodes = [
  'INVALID_INPUT', 'VALIDATION_ERROR', 'AUTH_REQUIRED', 'EMAIL_UNVERIFIED',
  'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'REVISION_CONFLICT', 'RATE_LIMITED',
  'SERVICE_UNAVAILABLE', 'INTERNAL_ERROR', 'CODE_INVALID', 'CODE_EXPIRED',
  'CODE_REVOKED', 'ACCOUNT_REQUIRED', 'ENTITLEMENT_EXPIRED', 'ENTITLEMENT_REVOKED',
  'REPORT_EXPIRED', 'REPORT_DELETED', 'ATTEMPT_COMPLETED', 'ANSWERS_INCOMPLETE',
  'INVALID_CONFIGURATION', 'VERSION_IMMUTABLE', 'IDEMPOTENCY_CONFLICT',
  'CSRF_INVALID', 'ORIGIN_FORBIDDEN',
  'SAMPLE_UNAVAILABLE', 'MAIL_UNAVAILABLE', 'ASSET_UNAVAILABLE',
] as const;
export const ApiErrorCodeSchema = z.enum(ApiErrorCodes);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export const ApiErrorSchema = z.object({ error: z.object({
  code: ApiErrorCodeSchema, message: z.string().max(240), requestId: z.string().min(1).max(80),
}).strict() }).strict();

export function PageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(50), total: z.number().int().min(0),
  }).strict();
}

export const IdempotentRequestSchema = z.object({ requestId: IdSchema }).strict();
export const AnswerChoiceSchema = z.object({ id: KeySchema, label: z.string().min(1).max(160), notApplicable: z.boolean() }).strict();
export const QuestionSchema = z.object({
  id: KeySchema, text: z.string().min(1).max(300), dimensionId: KeySchema,
  required: z.literal(true), options: z.array(AnswerChoiceSchema).min(2).max(10),
}).strict();
export const DimensionResultSchema = z.object({
  id: KeySchema, label: z.string().min(1).max(80), score: z.number().min(0).max(100).nullable(),
  applicableAnswers: z.number().int().min(0), requiredAnswers: z.number().int().min(1),
  missingReason: z.string().max(200).nullable(),
}).strict().superRefine((value, context) => {
  const missing = value.applicableAnswers < value.requiredAnswers;
  if (missing !== (value.score === null) || (missing && !value.missingReason) || (!missing && value.missingReason !== null)) {
    context.addIssue({ code: 'custom', message: '缺失维度必须返回空分数和原因' });
  }
});
export const ReportContentSchema = z.object({
  schemaVersion: z.literal(1), productName: z.string().min(1).max(160),
  versionNumber: z.number().int().min(1), resultTypeId: KeySchema,
  resultLabel: z.string().min(1).max(80), totalScore: z.number().min(0).max(100).nullable(),
  dimensions: z.array(DimensionResultSchema).min(1).max(12), explanation: z.string().min(1).max(2000),
  suggestion: z.string().min(1).max(1000), disclaimer: z.string().min(1).max(300), isDemo: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.dimensions.some(dimension => dimension.score === null) !== (value.totalScore === null)) {
    context.addIssue({ code: 'custom', message: '维度不足时不能返回完整总分' });
  }
});
export type ReportContentDto = z.infer<typeof ReportContentSchema>;
