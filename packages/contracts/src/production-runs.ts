import { z } from 'zod';
import { IdSchema,KeySchema,TimestampSchema,DataScopeSchema,PageSchema } from './shared.js';
import { ProductionDomainSchema } from './content-domain.js';
import { ProjectProductionSaveSchema } from './project-production.js';

const id=IdSchema.toLowerCase(),digest=z.string().regex(/^[0-9a-f]{64}$/),jobId=z.string().regex(/^[A-Za-z0-9_.:-]{1,160}$/);
export const ProductionWorkStageSchema=z.enum(['S3','S4','S5']);
export const productionWorkStages={assessment:'S3',copy:'S4',experience:'S4',cover:'S5',video:'S5'} as const;
export const ProductionStageLimitsSchema=z.object({maxAttempts:z.number().int().min(1).max(400),maxConcurrency:z.number().int().min(1).max(8),
  maxDurationSeconds:z.number().int().min(60).max(86400),maxReportedCostFen:z.number().int().min(0).max(100_000_000).nullable(),
  maxReportedTokens:z.number().int().min(1).max(100_000_000).nullable()}).strict();
export const ProductionRunLimitsSchema=z.object({maxAttemptsPerModule:z.number().int().min(1).max(10),
  maxTotalAttempts:z.number().int().min(1).max(400),maxConcurrency:z.number().int().min(1).max(8),
  maxDurationSeconds:z.number().int().min(60).max(86400),maxReportedCostFen:z.number().int().min(0).max(100_000_000).nullable(),
  maxReportedTokens:z.number().int().min(1).max(100_000_000).nullable(),
  stageLimits:z.object({S3:ProductionStageLimitsSchema.optional(),S4:ProductionStageLimitsSchema.optional(),S5:ProductionStageLimitsSchema.optional()}).strict().optional(),
}).strict().superRefine((value,ctx)=>{
  if(value.stageLimits&&!Object.values(value.stageLimits).some(Boolean))ctx.addIssue({code:'custom',path:['stageLimits'],message:'阶段策略至少配置一个阶段'});
  for(const [stage,limits] of Object.entries(value.stageLimits??{}))if(limits){
    for(const [key,total] of [['maxAttempts',value.maxTotalAttempts],['maxConcurrency',value.maxConcurrency],['maxDurationSeconds',value.maxDurationSeconds],
      ['maxReportedCostFen',value.maxReportedCostFen],['maxReportedTokens',value.maxReportedTokens]] as const){
      const limit=limits[key];if(total!==null&&limit!==null&&limit>total)ctx.addIssue({code:'custom',path:['stageLimits',stage,key],message:'阶段限制不能扩大批次总限制'});
    }
  }
});
export const ProductionRunCreateSchema=z.object({productId:id,planRevisionId:id,expectedPlanDigest:digest,runKey:KeySchema,
  limits:ProductionRunLimitsSchema,requestId:id}).strict();
export const ProductionRunGetSchema=z.object({runId:id}).strict();
export const ProductionRunListSchema=z.object({productId:id,page:z.number().int().min(1).default(1),pageSize:z.number().int().min(1).max(50).default(20)}).strict();
export const ProductionRunCancelSchema=z.object({runId:id,reason:z.string().trim().min(1).max(500),requestId:id}).strict();
export const ProductionAttemptClaimSchema=z.object({runId:id,planModuleId:id,clientKey:KeySchema,
  methods:z.array(ProjectProductionSaveSchema.shape.methods.element).max(12),inputs:ProjectProductionSaveSchema.shape.inputs,
  leaseSeconds:z.number().int().min(10).max(1800).default(300),retryOfAttemptId:id.optional(),resumeJobId:jobId.optional(),requestId:id}).strict();
export const ProductionAttemptGetSchema=z.object({attemptId:id}).strict();
const proof={attemptId:id,leaseToken:z.string().regex(/^[A-Za-z0-9_-]{43}$/),expectedRevision:z.number().int().nonnegative(),requestId:id};
export const ProductionAttemptStateSchema=z.enum(['waiting_input','producing','uploading','validation_failed','failed','saved_draft','cancelled']);
export const ProductionAttemptEventInputSchema=z.object({...proof,
  state:z.enum(['waiting_input','producing','uploading','validation_failed','failed','cancelled']),step:z.enum(['S2','S3','S4','S5','S6']),
  reasonCode:KeySchema.nullable(),reason:z.string().trim().min(1).max(500),
  job:z.object({provider:KeySchema,jobId,terminal:z.boolean()}).strict().nullable(),
  reportedCostFen:z.number().int().min(0).max(100_000_000).nullable(),reportedTokens:z.number().int().min(0).max(100_000_000).nullable(),
}).strict();
export const ProductionAttemptCompleteSchema=z.object({...proof,recordId:id,expectedRecordDigest:digest}).strict();
export const ProductionAttemptRenewSchema=z.object({...proof,leaseSeconds:z.number().int().min(10).max(1800)}).strict();
export const ProductionAttemptEventSchema=z.object({id,revision:z.number().int().nonnegative(),state:ProductionAttemptStateSchema,
  step:z.enum(['S2','S3','S4','S5','S6']),reasonCode:KeySchema.nullable(),reason:z.string(),
  job:ProductionAttemptEventInputSchema.shape.job,reportedCostFen:z.number().int().nonnegative().nullable(),reportedTokens:z.number().int().nonnegative().nullable(),
  metricsSource:z.literal('external_declaration'),createdAt:TimestampSchema}).strict();
export const ProductionAttemptSchema=z.object({id,runId:id,productId:id,planModuleId:id,domain:ProductionDomainSchema,clientKey:KeySchema,
  inputFingerprint:digest,sourceFrontierFingerprint:digest,methods:z.array(ProjectProductionSaveSchema.shape.methods.element).max(12),inputs:ProjectProductionSaveSchema.shape.inputs,
  state:ProductionAttemptStateSchema,revision:z.number().int().nonnegative(),generation:z.number().int().positive(),
  leaseExpiresAt:TimestampSchema,leaseActive:z.boolean(),outputRecordId:id.nullable(),outputDigest:digest.nullable(),
  job:ProductionAttemptEventInputSchema.shape.job,reportedCostFen:z.number().int().nonnegative().nullable(),reportedTokens:z.number().int().nonnegative().nullable(),
  createdAt:TimestampSchema,endedAt:TimestampSchema.nullable(),events:z.array(ProductionAttemptEventSchema).max(201),
  platformExecuted:z.literal(false),savedOutputsVerifiedAt:TimestampSchema.nullable(),needsRecheck:z.boolean(),
}).strict();
export const ProductionAttemptClaimedSchema=z.object({attempt:ProductionAttemptSchema,leaseToken:z.string().nullable(),
  nextAction:z.enum(['prepare_inputs','produce','inspect_existing_job','reuse_saved_record','explicit_retry_required'])}).strict();
export const ProductionRunModuleSchema=z.object({planModuleId:id,moduleId:id,moduleKey:KeySchema,title:z.string(),domain:ProductionDomainSchema,required:z.boolean(),
  state:z.enum(['waiting_input','producing','uploading','validation_failed','failed','saved_draft','cancelled','needs_recheck','pending_review','returned','retained']),
  latestAttemptId:id.nullable(),recordId:id.nullable(),recordDigest:digest.nullable(),reviewId:id.nullable(),reason:z.string().nullable(),
  needsRecheck:z.boolean(),attemptCount:z.number().int().nonnegative()}).strict();
export const ProductionRunSchema=z.object({id,productId:id,planRevisionId:id,scope:DataScopeSchema,runKey:KeySchema,digest,
  limits:ProductionRunLimitsSchema,createdAt:TimestampSchema,cancelledAt:TimestampSchema.nullable(),cancelReason:z.string().nullable(),
  modules:z.array(ProductionRunModuleSchema).max(40),readyForHumanReview:z.boolean(),
  metricsSource:z.literal('external_declaration'),platformExecuted:z.literal(false),scheduler:z.literal('external'),
}).strict();
export const ProductionRunPageSchema=PageSchema(ProductionRunSchema);
export const ProductionRunOperationSchema=z.enum(['production_run_create','production_run_get','production_run_list','production_run_cancel',
  'module_attempt_claim','module_attempt_get','module_attempt_event','module_attempt_complete','module_attempt_renew']);
export type ProductionRunOperation=z.infer<typeof ProductionRunOperationSchema>;
