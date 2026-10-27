import { z } from 'zod';
import { IdSchema, KeySchema, PageSchema, QuestionSchema, ReportContentSchema, TimestampSchema } from './shared.js';
import { ExperienceSessionSchema, ExperienceCheckpointSchema, ReportPresentationSchema } from './experience.js';

export const RedemptionRequestSchema = z.object({ code: z.string().trim().regex(/^[A-Za-z0-9_-]{32,96}$/), requestId: IdSchema }).strict();
export const StartAttemptRequestSchema = z.object({ entitlementId: IdSchema, requestId: IdSchema }).strict();
export const SaveAnswerRequestSchema = z.object({ optionId: KeySchema, expectedRevision: z.number().int().min(0), requestId: IdSchema }).strict();
export const SubmitAttemptRequestSchema = z.object({ expectedRevision: z.number().int().min(0), requestId: IdSchema }).strict();
export const DeleteReportRequestSchema = z.object({ requestId: IdSchema }).strict();
export const FeedbackQuerySchema = z.object({ questionId: KeySchema }).strict();
export const BindEntitlementRequestSchema = RedemptionRequestSchema.extend({ confirmed: z.literal(true) }).strict();
export const SavedAnswerSchema = z.object({ questionId: KeySchema, optionId: KeySchema, revision: z.number().int().min(1), savedAt: TimestampSchema }).strict();
export const QuestionsResponseSchema = z.object({
  attemptId: IdSchema, versionId: IdSchema, versionNumber: z.number().int().min(1),
  revision: z.number().int().min(0), status: z.enum(['started', 'submitted', 'completed', 'invalid']),
  questions: z.array(QuestionSchema).min(1).max(100), answers: z.array(SavedAnswerSchema), isDemo: z.boolean(),
  experience: ExperienceSessionSchema.optional(),
}).strict();
export const DistributionSchema = z.object({
  state: z.enum(['empty', 'insufficient', 'ready']), sampleSize: z.number().int().min(0),
  minimumSampleSize: z.number().int().min(1), denominator: z.enum(['other_valid_answers', 'other_valid_completed_attempts']),
  items: z.array(z.object({ id: KeySchema, label: z.string().min(1).max(160), count: z.number().int().min(0), percentage: z.number().min(0).max(100) }).strict()),
}).strict().superRefine((value, context) => {
  const expected = value.sampleSize === 0 ? 'empty' : value.sampleSize < value.minimumSampleSize ? 'insufficient' : 'ready';
  if (value.state !== expected || (value.state !== 'ready' && value.items.length !== 0) ||
    (value.state === 'ready' && value.items.reduce((sum, item) => sum + item.count, 0) !== value.sampleSize)) {
    context.addIssue({ code: 'custom', message: '统计状态、分母与计数不一致' });
  }
  if (value.items.some(item => Math.abs(item.percentage - item.count / value.sampleSize * 100) > 0.051)) {
    context.addIssue({ code: 'custom', message: '比例必须对应真实计数和分母' });
  }
});
export const FeedbackSchema = z.object({
  versionId: IdSchema, questionId: KeySchema, updatedAt: TimestampSchema, isDemo: z.boolean(),
  answers: DistributionSchema, results: DistributionSchema,
}).strict().superRefine((value, context) => {
  if (value.answers.denominator !== 'other_valid_answers' || value.results.denominator !== 'other_valid_completed_attempts') {
    context.addIssue({ code: 'custom', message: '回答与结论必须各自使用正确分母' });
  }
});
export const SaveAnswerResponseSchema = z.object({
  answer: SavedAnswerSchema, attemptRevision: z.number().int().min(1),
  checkpoint: ExperienceCheckpointSchema.optional(),
  feedback: FeedbackSchema.nullable(), feedbackStatus: z.enum(['ready', 'unavailable']),
}).strict();
export const ReportResponseSchema = z.object({
  id: IdSchema, attemptId: IdSchema, versionId: IdSchema, content: ReportContentSchema,
  createdAt: TimestampSchema, expiresAt: TimestampSchema, presentation: ReportPresentationSchema.optional(),
}).strict();
export const EntitlementSchema = z.object({
  id: IdSchema, productId: IdSchema, productSlug: KeySchema, productName: z.string().min(1).max(160),
  versionId: IdSchema, versionNumber: z.number().int().min(1), ownership: z.enum(['anonymous', 'account_bound']),
  status: z.enum(['active', 'expired', 'revoked']), reportsAllowed: z.number().int().min(1),
  reportsConsumed: z.number().int().min(0), claimedAt: TimestampSchema, accessExpiresAt: TimestampSchema,
  attemptId: IdSchema.nullable(), attemptStatus: z.enum(['started', 'submitted', 'completed', 'invalid']).nullable(),
  reportId: IdSchema.nullable(), reportState: z.enum(['absent', 'available', 'expired', 'deleted']), isDemo: z.boolean(),
}).strict();
export const AccountSchema = z.object({ id: IdSchema, emailVerified: z.boolean(), role: z.enum(['user', 'admin']) }).strict();
export const AccountSessionRequestSchema = z.object({ accessToken: z.string().min(32).max(16384),
  refreshToken: z.string().regex(/^[A-Za-z0-9._-]{8,2048}$/) }).strict();
export const AccountSessionResponseSchema = z.object({ account: AccountSchema, sessionExpiresAt: TimestampSchema }).strict();
export const AccountContextSchema = z.object({ configured: z.boolean(), account: AccountSchema.nullable(),
  csrfToken: z.string().min(80).max(160), sessionExpiresAt: TimestampSchema.nullable() }).strict();
export const AccountLogoutResponseSchema = z.object({ providerRevoked: z.boolean().nullable() }).strict();
const pageInteger = (maximum: number) => z.preprocess(value => typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
  z.number().int().min(1).max(maximum));
export const EntitlementQuerySchema = z.object({ page: pageInteger(10000).default(1), pageSize: pageInteger(50).default(20) }).strict();
export const EntitlementPageSchema = PageSchema(EntitlementSchema);
export const AccountReportListItemSchema = z.object({
  id: IdSchema, entitlementId: IdSchema, productName: z.string().min(1).max(160), versionId: IdSchema,
  versionNumber: z.number().int().min(1), createdAt: TimestampSchema, expiresAt: TimestampSchema,
  reportState: z.enum(['available', 'expired', 'deleted']), entitlementStatus: z.enum(['active', 'expired', 'revoked']), isDemo: z.boolean(),
}).strict();
export const AccountReportPageSchema = PageSchema(AccountReportListItemSchema);
export const RedemptionResponseSchema = z.object({ entitlement: EntitlementSchema, disposition: z.enum(['claimed', 'restored']) }).strict();
export const AnonymousSessionContextSchema = z.object({ authenticated: z.boolean(), csrfToken: z.string().min(80).max(160),
  sessionExpiresAt: TimestampSchema.nullable() }).strict();
export type SaveAnswerRequestDto = z.infer<typeof SaveAnswerRequestSchema>;
export type FeedbackDto = z.infer<typeof FeedbackSchema>;
export type EntitlementDto = z.infer<typeof EntitlementSchema>;
