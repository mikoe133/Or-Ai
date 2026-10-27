import {z} from 'zod';
import {IdSchema,TimestampSchema,PageSchema} from './shared.js';
import {ProductionRunSchema,ProductionRunModuleSchema,ProductionAttemptSchema} from './production-runs.js';
import {ProjectRecoveryFixedManifestSchema,ProjectHandoffInputSchema,ProjectHandoffInputChoiceSchema} from './project-method-operations.js';
const id=IdSchema.toLowerCase(),digest=z.string().regex(/^[0-9a-f]{64}$/);
const issue=z.object({code:z.string().max(80),message:z.string().max(500)}).strict();
const count=z.number().int().nonnegative();
export const RunOperationsQuerySchema=z.object({}).strict();
export const RunAttemptHistoryQuerySchema=z.object({planModuleId:id,page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().int().min(1).max(20).default(10)}).strict();
export const RunAttemptHistorySchema=PageSchema(ProductionAttemptSchema);
export const RunSavedRecordSchema=z.object({recordId:id,digest,attemptId:id,generation:count,verifiedAt:TimestampSchema.nullable(),
 reviewId:id.nullable(),reviewState:z.string().nullable()}).strict();
export const RunModuleOperationsSchema=ProductionRunModuleSchema.extend({lastReportedState:ProductionAttemptSchema.shape.state.nullable(),
 latestRevision:count.nullable(),generation:count.nullable(),leaseState:z.enum(['none','active','expired','ended']),leaseExpiresAt:TimestampSchema.nullable(),
 producerConnectionAvailable:z.boolean(),condition:z.enum(['not_started','missing_inputs','lease_active','lease_expired','validation_failed','failed','saved_draft','cancelled','needs_recheck','blocked']),
 conditionReason:z.string().max(500),missingInputs:z.array(z.string()).max(100),blockers:z.array(issue).max(30),
 job:ProductionAttemptSchema.shape.job,savedRecords:z.array(RunSavedRecordSchema).max(10),canPrepareRecovery:z.boolean()}).strict();
export const RunOperationsSchema=z.object({run:ProductionRunSchema,productName:z.string(),checkedAt:TimestampSchema,workspaceOwned:z.boolean(),
 canStop:z.boolean(),stopBlockedReason:z.string().nullable(),issues:z.array(issue).max(30),modules:z.array(RunModuleOperationsSchema).max(40),
 summary:z.object({savedModules:count,attentionModules:count,unstartedModules:count,unknownJobs:count}).strict(),
 usage:z.object({attempts:count,activeClaims:count,reportedCostFen:count,reportedTokens:count,unknownCost:z.boolean(),unknownTokens:z.boolean()}).strict(),
 platformExecuted:z.literal(false)}).strict();
export const RunStopPreviewSchema=z.object({checkedAt:TimestampSchema,ready:z.boolean(),digest:digest.nullable(),productName:z.string(),runId:id,runKey:z.string(),
 savedModules:count,unknownJobs:z.array(z.object({attemptId:id,provider:z.string(),jobId:z.string()}).strict()).max(40),issues:z.array(issue).max(30)}).strict();
export const RunStopConfirmSchema=z.object({expectedDigest:digest,reason:z.string().trim().min(1).max(500),consent:z.literal(true),requestId:id}).strict();
export const RunRecoveryInputsQuerySchema=z.object({recordId:id,page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().int().min(1).max(50).default(20)}).strict();
export const RunRecoveryInputsSchema=PageSchema(ProjectHandoffInputChoiceSchema);
export const RunRecoverySelectionSchema=z.object({expectedRevision:count,expectedGeneration:z.number().int().positive(),connectionId:id.nullable(),
 inputs:z.array(ProjectHandoffInputSchema).max(100),consent:z.literal(true)}).strict();
export const RunRecoveryManifestSchema=z.object({schemaVersion:z.literal(1),kind:z.literal('production_recovery_handoff'),
 run:z.object({id,runKey:z.string(),digest,limits:ProductionRunSchema.shape.limits}).strict(),
 basisDigest:digest,attempt:z.object({id,revision:count,generation:count,clientKey:z.string(),inputFingerprint:digest,sourceFrontierFingerprint:digest}).strict(),
 action:z.enum(['inspect_original_job','inspect_current_attempt','explicit_retry']),retryOfAttemptId:id.nullable(),originalJob:ProductionAttemptSchema.shape.job,
 fixed:ProjectRecoveryFixedManifestSchema,instructions:z.array(z.string()).min(1).max(12),executionStarted:z.literal(false),credentialIncluded:z.literal(false),leaseTokenIncluded:z.literal(false)}).strict();
export const RunRecoveryPreviewSchema=z.object({checkedAt:TimestampSchema,ready:z.boolean(),digest:digest.nullable(),issues:z.array(issue).max(100),manifest:RunRecoveryManifestSchema.nullable()}).strict();
export const RunRecoveryExportSchema=z.object({selection:RunRecoverySelectionSchema,expectedDigest:digest}).strict();
export const RunRecoveryExportedSchema=z.object({digest,manifest:RunRecoveryManifestSchema}).strict();
export type RunOperations=z.infer<typeof RunOperationsSchema>;
export type RunModuleOperations=z.infer<typeof RunModuleOperationsSchema>;
