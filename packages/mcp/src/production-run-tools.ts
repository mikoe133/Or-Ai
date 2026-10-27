import type { McpServer,CallToolResult } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { ProductionRunOperationSchema,ProductionRunCreateSchema,ProductionRunGetSchema,ProductionRunListSchema,ProductionRunCancelSchema,
  ProductionAttemptClaimSchema,ProductionAttemptGetSchema,ProductionAttemptEventInputSchema,ProductionAttemptCompleteSchema,ProductionAttemptRenewSchema,
  ProductionRunSchema,ProductionRunPageSchema,ProductionAttemptSchema,ProductionAttemptClaimedSchema,type ProductionRunOperation } from '@orai/contracts/admin';
import type { AdapterConfig } from './config.js';
import type { MachineApi } from './api.js';

export const productionRunToolNames=(domain:AdapterConfig['domain'])=>ProductionRunOperationSchema.options.filter(name=>
  domain==='assessment'||!['production_run_create','production_run_cancel'].includes(name));
export function registerProductionRunTools(server:McpServer,config:AdapterConfig,api:MachineApi,
  run:(action:()=>Promise<unknown>)=>Promise<CallToolResult>,resultSchema:<T extends z.ZodType>(schema:T)=>z.ZodType){
  const definitions:Record<ProductionRunOperation,[z.ZodType,z.ZodType,boolean,string]>={
    production_run_create:[ProductionRunCreateSchema,ProductionRunSchema,true,'Create or recover a bounded external production run for one fixed product/plan. Stable runKey and identical limits recover the same run. This records external work; no scheduler, model call, media job or publication is started.'],
    production_run_get:[ProductionRunGetSchema,ProductionRunSchema,false,'Read durable module progress, validated saved-record IDs, input recheck signals and human review links. Other domains return status metadata rather than private methods or producer diagnostics. Saved outputs were verified at completion; this read does not rerun all byte checks.'],
    production_run_list:[ProductionRunListSchema,ProductionRunPageSchema,false,'List authorized product runs. A different plan or deliberate variant must have a new runKey.'],
    production_run_cancel:[ProductionRunCancelSchema,ProductionRunSchema,true,'Cancel platform acceptance of further run claims/receipts. Does not stop or cancel any external provider job; the external operator must handle it.'],
    module_attempt_claim:[ProductionAttemptClaimSchema,ProductionAttemptClaimedSchema,true,'Claim one domain module with exact captured methods and input record digests. Returns a short-lived lease token, stored only as a digest. Same clientKey/input resumes an existing claim; another active client conflicts. Failed/expired work needs explicit retryOfAttemptId, and unknown external work must resume its original jobId. Always inspect nextAction before starting paid work; the platform never starts it.'],
    module_attempt_get:[ProductionAttemptGetSchema,ProductionAttemptSchema,false,'Read one authorized domain attempt after interruption. Returns immutable fixed input identities, stage receipts, original external jobId, source-change signals and saved record. Never returns the lease token or consumer data.'],
    module_attempt_event:[ProductionAttemptEventInputSchema,ProductionAttemptSchema,true,'Append a bounded external progress/failure declaration with the current lease and expected revision. A producer cannot declare saved_draft or approve a review. Job IDs cannot change within an attempt; token/cost metrics are labeled external declarations.'],
    module_attempt_complete:[ProductionAttemptCompleteSchema,ProductionAttemptSchema,true,'Verify a real same-module production record, all selected methods/inputs and mandatory actual files before accepting saved_draft. Uses lease fencing and source-head checks; a late expired attempt cannot replace the current result. It does not prove a model was executed or approve/publish the product.'],
    module_attempt_renew:[ProductionAttemptRenewSchema,ProductionAttemptSchema,true,'Extend a currently valid claim up to run and credential deadlines. Expired/replaced claims cannot be renewed. Reuse requestId on an unknown response, then reread the receipt instead of starting a duplicate job.'],
  };
  for(const name of productionRunToolNames(config.domain)){
    const [inputSchema,outputSchema,write,description]=definitions[name];
    server.registerTool(name,{inputSchema,outputSchema:resultSchema(outputSchema),description,
      annotations:{readOnlyHint:!write,destructiveHint:false,idempotentHint:true,openWorldHint:false}},
      async input=>run(()=>api.run(name,input,outputSchema)));
  }
}
