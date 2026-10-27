import {Inject,Injectable} from '@nestjs/common';
import {z} from 'zod';
import {IdSchema} from '@orai/contracts';
import {RunOperationsSchema,RunAttemptHistoryQuerySchema,RunAttemptHistorySchema,RunStopPreviewSchema,RunStopConfirmSchema,
 RunRecoveryInputsQuerySchema,RunRecoveryInputsSchema,RunRecoverySelectionSchema,RunRecoveryPreviewSchema,RunRecoveryManifestSchema,RunRecoveryExportSchema,RunRecoveryExportedSchema,
 ProductionPlanModuleSchema,ProductionRunLimitsSchema,ProductionAttemptEventInputSchema,productionWorkStages,ProductConfigurationSchema,
 type RunOperations,type RunModuleOperations,type ContentLocator} from '@orai/contracts/admin';
import type {CatalogAdminAccess} from '../catalog/admin-access.service';
import {requireMachineTarget} from '../catalog/machine-authorization';
import {DatabaseService} from '../database/database.service';
import {Prisma} from '../generated/prisma/client';
import {ApiException} from '../common/http-errors';
import {parseInput} from '../common/parse-input';
import {AdminMutationService} from './admin-mutation.service';
import {ProductionRunsService,PRODUCTION_RUN_CLOCK} from './production-runs.service';
import {ProjectMethodOperationsService} from './project-method-operations.service';
import {contentDigest,contentFragment,locatorKey,snapshotAuthoring} from './content-projections';
const id=(v:unknown)=>parseInput(IdSchema,v).toLowerCase();
const include={workspace:{include:{owner:{select:{disabledAt:true,role:true}}}},attempts:{orderBy:{generation:'desc' as const},
 include:{lease:true,credential:{select:{revokedAt:true,expiresAt:true,owner:{select:{disabledAt:true,role:true}}}}}},plan:{include:{modules:{orderBy:{position:'asc' as const},include:{identity:true}}}},product:{select:{name:true}}} as const;
type RunRow=Prisma.ExternalProductionRunGetPayload<{include:typeof include}>;
type AttemptRow=RunRow['attempts'][number];
type Selection=z.infer<typeof RunRecoverySelectionSchema>;
const issue=(code:string,message:string)=>({code,message:message.slice(0,500)});
const reasons:Record<string,string>={not_started:'尚未创建尝试；先核对方法与输入，再由外部客户端明确发起。',missing_inputs:'固定方法或依赖未齐，请先复查输入。',lease_active:'当前认领仍有效，由原客户端处理；其他客户端不能抢占。',
 lease_expired:'认领已经到期；最后一次外部申报不代表当前作业状态。',validation_failed:'原件或引用校验未通过，先核对失败原因。',failed:'制作端申报失败，先复核原作业与固定依据。',
 saved_draft:'已有已校验保存记录，优先复用成果，不重复制作。',cancelled:'本批或本次尝试已停止，保留历史并交人工处理。',needs_recheck:'输入或成果已有变化；原记录保留，继续制作前需复查。',blocked:'当前接续条件不满足，保留已有成果。'};
@Injectable()
export class ProductionRunOperationsService{
 constructor(private readonly db:DatabaseService,private readonly mutations:AdminMutationService,private readonly runs:ProductionRunsService,
  private readonly methods:ProjectMethodOperationsService,@Inject(PRODUCTION_RUN_CLOCK)private readonly now:()=>Date){}
 private async human(access:CatalogAdminAccess,tx?:Prisma.TransactionClient){await this.mutations.administrators.require(access,tx);
  if(access.machineCredentialId)throw new ApiException('FORBIDDEN','此运营入口仅供当前管理员使用',403);}
 private async raw(tx:Prisma.TransactionClient,access:CatalogAdminAccess,key:string){
  await this.human(access,tx);const row=await tx.externalProductionRun.findFirst({where:{id:key,scope:access.scope},include});
  if(!row)throw new ApiException('NOT_FOUND','制作批次不存在于当前范围',404);return row;
 }
 private lease(row:AttemptRow,run:RunRow){return !row.endedAt&&!run.cancelledAt&&row.lease?.activeAttemptId===row.id&&row.lease.generation===row.generation&&
  row.lease.expiresAt>this.now()&&row.leaseExpiresAt>this.now();}
 private usage(rows:AttemptRow[],run:RunRow){return {attempts:rows.length,activeClaims:rows.filter(a=>this.lease(a,run)).length,
  reportedCostFen:rows.reduce((s,a)=>s+(a.reportedCostFen??0),0),reportedTokens:rows.reduce((s,a)=>s+(a.reportedTokens??0),0),
  unknownCost:rows.some(a=>a.reportedCostFen===null),unknownTokens:rows.some(a=>a.reportedTokens===null)};}
 private budget(limits:{maxAttempts?:number;maxTotalAttempts?:number;maxConcurrency:number;maxReportedCostFen:number|null;maxReportedTokens:number|null},
  usage:ReturnType<ProductionRunOperationsService['usage']>,prefix:string){
  const issues=[];if(usage.attempts>=(limits.maxAttempts??limits.maxTotalAttempts??Infinity))issues.push(issue(prefix+'_ATTEMPTS','尝试次数已达上限，不准备新的接续。'));
  if(usage.activeClaims>=limits.maxConcurrency)issues.push(issue(prefix+'_CONCURRENCY','当前并发已满，等待原客户端释放认领。'));
  if(limits.maxReportedCostFen!==null&&usage.reportedCostFen>=limits.maxReportedCostFen)issues.push(issue(prefix+'_COST','已知申报费用已达上限；未知费用不能视为免费。'));
  if(limits.maxReportedTokens!==null&&usage.reportedTokens>=limits.maxReportedTokens)issues.push(issue(prefix+'_TOKENS','已知申报用量已达上限。'));return issues;
 }
 private async operationsIn(tx:Prisma.TransactionClient,access:CatalogAdminAccess,key:string):Promise<{dto:RunOperations;raw:RunRow}>{
  const raw=await this.raw(tx,access,key),run=await this.runs.readAdminIn(tx,access,key),limits=ProductionRunLimitsSchema.parse(raw.limits),usage=this.usage(raw.attempts,raw),issues=[];
  const owned=raw.workspace.ownerUserId===access.actorUserId,workspaceValid=!raw.workspace.revokedAt&&raw.workspace.expiresAt>this.now()&&!raw.workspace.owner.disabledAt&&raw.workspace.owner.role==='ADMIN';
  const expired=raw.createdAt.getTime()+limits.maxDurationSeconds*1000<=this.now().getTime();
  if(raw.cancelledAt)issues.push(issue('RUN_CANCELLED','本批已停止平台接续，外部作业仍须另行核对。'));
  if(expired)issues.push(issue('RUN_EXPIRED','本批制作期限已到，不能复活或延长此批次。'));
  if(!workspaceValid)issues.push(issue('WORKSPACE_UNAVAILABLE','所属工作区或其管理员已失效。'));
  const budget=this.budget(limits,usage,'RUN'),modules:RunModuleOperations[]=[];
  const savedIds=raw.attempts.flatMap(a=>a.outputRecordId?[a.outputRecordId]:[]),reviews=await tx.projectReviewRecord.findMany({where:{recordId:{in:savedIds},scope:access.scope},
   include:{review:{select:{status:true,number:true}}},orderBy:{review:{number:'desc'}}});
  for(const meta of run.modules){
   const rows=raw.attempts.filter(a=>a.planModuleId===meta.planModuleId),latest=rows[0],details=latest?await this.runs.inspectAttemptAdminIn(tx,access,latest.id):null,
    module=raw.plan.modules.find(m=>m.id===meta.planModuleId)!,definition=ProductionPlanModuleSchema.parse(module.definition),stage=productionWorkStages[definition.domain],stagePolicy=limits.stageLimits?.[stage];
   const blockers=[...issues,...budget];
   if(!owned)blockers.push(issue('WORKSPACE_NOT_OWNED','此批属于其他管理员工作区，只读查看。'));
   if(rows.length>=limits.maxAttemptsPerModule)blockers.push(issue('MODULE_ATTEMPTS','本模块尝试次数已达上限。'));
   if(stagePolicy){const stageRows=raw.attempts.filter(a=>productionWorkStages[a.domain as keyof typeof productionWorkStages]===stage),stageUsage=this.usage(stageRows,raw);
    blockers.push(...this.budget(stagePolicy,stageUsage,stage));
    const first=Math.min(...stageRows.map(a=>a.createdAt.getTime()));
    if(Number.isFinite(first)&&first+stagePolicy.maxDurationSeconds*1000<=this.now().getTime())blockers.push(issue('STAGE_EXPIRED',stage+' 阶段期限已到，不重置阶段计时。'));
   }
   const producerAvailable=!!latest&&!latest.credential.revokedAt&&latest.credential.expiresAt>this.now()&&!latest.credential.owner.disabledAt&&latest.credential.owner.role==='ADMIN'&&workspaceValid;
   const active=!!latest&&this.lease(latest,raw),leaseState=!latest?'none':latest.endedAt?'ended':active?'active':'expired';
   const missing=details?.missing??[],state=details?.attempt.state,job=latest?ProductionAttemptEventInputSchema.shape.job.parse(latest.job??null):null;
   let condition:RunModuleOperations['condition']=!latest?'not_started':state==='saved_draft'?'saved_draft':state==='cancelled'?'cancelled':
    details?.attempt.needsRecheck?'needs_recheck':missing.length?'missing_inputs':active?'lease_active':!latest.endedAt?'lease_expired':state==='validation_failed'?'validation_failed':'failed';
   if(issues.length)condition=raw.cancelledAt?'cancelled':'blocked';
   const savedRecords=rows.filter(a=>a.outputRecordId).filter((a,i,all)=>all.findIndex(b=>b.outputRecordId===a.outputRecordId)===i).map(a=>{const review=reviews.find(r=>r.recordId===a.outputRecordId);
    return {recordId:a.outputRecordId!,digest:a.outputDigest!,attemptId:a.id,generation:a.generation,verifiedAt:a.verifiedAt?.toISOString()??null,reviewId:review?.reviewId??null,reviewState:review?.review.status??null};});
   modules.push({...meta,lastReportedState:state??null,latestRevision:latest?.revision??null,generation:latest?.generation??null,leaseState,leaseExpiresAt:latest?.leaseExpiresAt.toISOString()??null,
    producerConnectionAvailable:producerAvailable,condition,conditionReason:issues[0]?.message??reasons[condition]??'当前情况待核对。',missingInputs:missing,blockers,job,savedRecords,
    canPrepareRecovery:!!latest&&state!=='saved_draft'&&state!=='cancelled'&&blockers.length===0});
  }
  const dto=RunOperationsSchema.parse({run,productName:raw.product.name,checkedAt:this.now().toISOString(),workspaceOwned:owned,canStop:owned&&!raw.cancelledAt&&!expired,
   stopBlockedReason:!owned?'其他管理员工作区只读。':raw.cancelledAt?'本批已经停止。':expired?'本批期限已到，无需重新停止。':null,
   issues,modules,summary:{savedModules:modules.filter(m=>m.savedRecords.length).length,attentionModules:modules.filter(m=>!!m.latestAttemptId&&!['saved_draft','lease_active'].includes(m.condition)).length,
    unstartedModules:modules.filter(m=>!m.latestAttemptId).length,unknownJobs:modules.filter(m=>m.job&&!m.job.terminal).length},usage,platformExecuted:false});
  return {dto,raw};
 }
 async read(access:CatalogAdminAccess,key:unknown){await this.human(access);return this.db.client.$transaction(async tx=>(await this.operationsIn(tx,access,id(key))).dto,{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:30000});}
 async history(access:CatalogAdminAccess,key:unknown,input:unknown){await this.human(access);const runId=id(key),q=parseInput(RunAttemptHistoryQuerySchema,input);
  return this.db.client.$transaction(async tx=>{const run=await this.raw(tx,access,runId);
   if(!run.plan.modules.some(m=>m.id===q.planModuleId))throw new ApiException('NOT_FOUND','模块不属于此批固定计划',404);
   const where={runId,planModuleId:q.planModuleId,scope:access.scope},rows=await tx.externalProductionAttempt.findMany({where,orderBy:{generation:'desc'},skip:(q.page-1)*q.pageSize,take:q.pageSize});
   const items=[];for(const row of rows)items.push((await this.runs.inspectAttemptAdminIn(tx,access,row.id)).attempt);
   return RunAttemptHistorySchema.parse({items,total:await tx.externalProductionAttempt.count({where}),page:q.page,pageSize:q.pageSize});
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:30000});
 }
 private fingerprint(dto:RunOperations){return contentDigest({runId:dto.run.id,digest:dto.run.digest,cancelledAt:dto.run.cancelledAt,workspaceOwned:dto.workspaceOwned,
  canStop:dto.canStop,issues:dto.issues,usage:dto.usage,modules:dto.modules});}
 private stopDto(dto:RunOperations){return RunStopPreviewSchema.parse({checkedAt:dto.checkedAt,ready:dto.canStop,digest:dto.canStop?this.fingerprint(dto):null,
  productName:dto.productName,runId:dto.run.id,runKey:dto.run.runKey,savedModules:dto.summary.savedModules,
  unknownJobs:dto.modules.flatMap(m=>m.job&&!m.job.terminal&&m.latestAttemptId?[{attemptId:m.latestAttemptId,provider:m.job.provider,jobId:m.job.jobId}]:[]),
  issues:dto.canStop?[]:[issue('STOP_UNAVAILABLE',dto.stopBlockedReason??'当前不能停止。')]});}
 async stopPreview(access:CatalogAdminAccess,key:unknown){return this.stopDto(await this.read(access,key));}
 async stop(access:CatalogAdminAccess,key:unknown,input:unknown){await this.human(access);const runId=id(key),body=parseInput(RunStopConfirmSchema,input);
  await this.mutations.run(access,'external.run.admin-stop:'+runId,body.requestId,body,async tx=>{
   await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'external-run:'+runId},0))`);
   const {dto}=await this.operationsIn(tx,access,runId),preview=this.stopDto(dto);
   if(!preview.ready)throw new ApiException('CONFLICT',preview.issues[0]?.message??'批次不能停止',409);
   if(preview.digest!==body.expectedDigest)throw new ApiException('REVISION_CONFLICT','停止影响已有变化，请保留原因并重新核对',409);
   await this.runs.stopAdminIn(tx,access,runId,body.reason);
   return {response:{id:runId},entityKind:'production_run',entityId:runId};
  });return this.read(access,runId);
 }
 private async attemptTarget(tx:Prisma.TransactionClient,access:CatalogAdminAccess,key:string){
  await this.human(access,tx);const row=await tx.externalProductionAttempt.findFirst({where:{id:key,scope:access.scope},select:{runId:true}});
  if(!row)throw new ApiException('NOT_FOUND','尝试不存在于当前范围',404);return row;
 }
 async recoveryInputs(access:CatalogAdminAccess,key:unknown,input:unknown){await this.human(access);const attemptId=id(key),q=parseInput(RunRecoveryInputsQuerySchema,input);
  return this.db.client.$transaction(async tx=>{const {attempt}=await this.runs.inspectAttemptAdminIn(tx,access,attemptId);
   if(!attempt.inputs.some(i=>i.recordId===q.recordId))throw new ApiException('FORBIDDEN','输入记录不属于原尝试',403);
   const record=await tx.projectProductionRecord.findFirstOrThrow({where:{id:q.recordId,scope:access.scope},include:{outputs:true}}),choices=[];
   for(const output of record.outputs){if(!output.contentRevisionId)continue;
    const row=await tx.contentRevision.findFirstOrThrow({where:{id:output.contentRevisionId,scope:access.scope,productId:attempt.productId}});
    let locators:ContentLocator[]=[];
    if(row.domain==='assessment')locators=ProductConfigurationSchema.parse((row.snapshot as Record<string,unknown>).configuration).questions.map(q=>({kind:'question',questionId:q.id}));
    else{const content=snapshotAuthoring(row.snapshot)?.content;locators=content?.kind==='copy'?content.blocks.map(b=>({kind:'block',blockId:b.blockId})):
      content?.kind==='video'||content?.kind==='script'?content.scenes.map(s=>({kind:'scene',sceneId:s.sceneId})):[{kind:'whole'}];}
    for(const locator of locators){const content=contentFragment(row,locator,attempt.domain);choices.push({recordId:record.id,recordDigest:record.digest,revisionId:row.id,digest:row.digest,
     locator,label:String(content.text??content.title??content.description??locatorKey(locator)).slice(0,500),content});}
   }
   const unique=choices.filter((c,i,a)=>a.findIndex(o=>o.revisionId===c.revisionId&&locatorKey(o.locator)===locatorKey(c.locator))===i);
   return RunRecoveryInputsSchema.parse({items:unique.slice((q.page-1)*q.pageSize,q.page*q.pageSize),total:unique.length,page:q.page,pageSize:q.pageSize});
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:30000});
 }
 private async recoveryIn(tx:Prisma.TransactionClient,access:CatalogAdminAccess,attemptId:string,body:Selection){
  const target=await this.attemptTarget(tx,access,attemptId);
  await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'external-run:'+target.runId},0))`);
  const {dto,raw}=await this.operationsIn(tx,access,target.runId),module=dto.modules.find(m=>m.latestAttemptId===attemptId),issues:{code:string;message:string}[]=[];
  const result=(manifest:z.infer<typeof RunRecoveryManifestSchema>|null)=>RunRecoveryPreviewSchema.parse({checkedAt:this.now().toISOString(),ready:!!manifest,digest:manifest?contentDigest(manifest):null,issues:issues.slice(0,100),manifest});
  if(!module){issues.push(issue('HISTORICAL_ATTEMPT','旧代次只读，接续须重新选择当前尝试。'));return result(null);}
  const inspected=await this.runs.inspectAttemptAdminIn(tx,access,attemptId),attempt=inspected.attempt;
  if(attempt.revision!==body.expectedRevision||attempt.generation!==body.expectedGeneration)throw new ApiException('REVISION_CONFLICT','回执或代次已有变化，请重新核对',409);
  if(!module.canPrepareRecovery)issues.push(...(module.blockers.length?module.blockers:[issue('RECOVERY_UNAVAILABLE','此尝试已有成果或已经主动停止，不准备重复制作。')]));
  const job=attempt.job,unknownJob=!!job&&!job.terminal;
  if((attempt.needsRecheck||inspected.missing.length)&&!unknownJob)issues.push(issue('INPUT_RECHECK','固定输入或成果已有变化/缺项，请先复查，不准备新的制作。'));
  if(!body.connectionId)issues.push(issue('CONNECTION_REQUIRED','请选择当前管理员名下的有效领域连接。'));
  if(issues.length)return result(null);
  const connection=await tx.codexConnection.findFirst({where:{id:body.connectionId!,scope:access.scope,ownerUserId:access.actorUserId},include:{credentials:true}});
  if(!connection||connection.workspaceId!==raw.workspaceId){issues.push(issue('CONNECTION_WORKSPACE','所选连接不属于此批工作区或当前管理员。'));return result(null);}
  // Lock connection rows in the same order as connection revocation. The fixed-method verifier rechecks full machine target permissions.
  await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.codex_connections WHERE id=${connection.id}::uuid FOR SHARE`);
  const credential=connection.credentials.find(c=>c.domain===module.domain);
  if(credential)await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.machine_credentials WHERE id=${credential.id}::uuid FOR SHARE`);
  await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.machine_project_workspaces WHERE id=${raw.workspaceId}::uuid FOR SHARE`);
  if(!credential||credential.revokedAt||credential.expiresAt<=this.now()||connection.revokedAt||connection.expiresAt<=this.now()){
   issues.push(issue('CONNECTION_UNAVAILABLE','当前领域连接已失效，请重新选择。'));return result(null);}
  try{await requireMachineTarget(credential,{permission:'projects:read',extraPermissions:['skills:read','context:read','content:read','content:write'],target:{type:'project',attemptId}},tx);}
  catch(error){if(error instanceof ApiException){issues.push(issue(error.code,error.publicMessage));return result(null);}throw error;}
  const moduleRow=raw.plan.modules.find(m=>m.id===module.planModuleId)!,fixed=await this.methods.fixedPreviewIn(tx,access,module.planModuleId,{
   expectedModuleDigest:moduleRow.digest,connectionId:connection.id,methods:attempt.methods,records:attempt.inputs,inputs:body.inputs});
  if(!fixed.ready||!fixed.manifest){issues.push(...fixed.issues);return result(null);}
  const action=unknownJob?'inspect_original_job':module.leaseState==='active'?'inspect_current_attempt':'explicit_retry';
  const instructions=['外部客户端先重新读取 production_run_get 和 module_attempt_get，核对当前代次、固定输入及真实权限。',
   action==='inspect_original_job'?'先向原服务核对原 provider/jobId；结果未知时不得重复创建作业，不得把新输入用于旧作业。':
    action==='inspect_current_attempt'?'当前认领仍有效，只核对原尝试状态；其他客户端不得抢占或创建替代作业。':
    '由外部客户端明确携带 retryOfAttemptId 申请接续，再按服务端 nextAction 处理；网页没有发起认领。',
   '上传或保存响应未知时，复用外部客户端原 requestId 查询回执；本页无法找回未保存的原请求标识。',
   '二进制原件需管理员按授权另行取回，本清单只含已核验固定引用与摘要。',
   '本说明没有签发凭据、认领 token、创建新运行、查询外部作业、调用模型或安排日程。'];
  const manifest=RunRecoveryManifestSchema.parse({schemaVersion:1,kind:'production_recovery_handoff',run:{id:raw.id,runKey:raw.runKey,digest:raw.digest,limits:raw.limits},
   basisDigest:this.fingerprint(dto),attempt:{id:attempt.id,revision:attempt.revision,generation:attempt.generation,clientKey:attempt.clientKey,inputFingerprint:attempt.inputFingerprint,sourceFrontierFingerprint:attempt.sourceFrontierFingerprint},
   action,retryOfAttemptId:action==='explicit_retry'?attemptId:null,originalJob:job,fixed:{...fixed.manifest,instructions:['此处仅保存固定依据；允许的下一步以外层恢复 action 和 instructions 为准。','原外部作业未知或当前认领有效时，只核对原作业/尝试，不创建替代作业或开始新制作。','二进制原件需管理员按授权另行取回，不包含公开下载路径。']},instructions,executionStarted:false,credentialIncluded:false,leaseTokenIncluded:false});
  await this.human(access,tx);return result(manifest);
 }
 async recoveryPreview(access:CatalogAdminAccess,key:unknown,input:unknown){await this.human(access);const body=parseInput(RunRecoverySelectionSchema,input),attemptId=id(key);
  return this.db.client.$transaction(tx=>this.recoveryIn(tx,access,attemptId,body),{isolationLevel:Prisma.TransactionIsolationLevel.ReadCommitted,timeout:30000});}
 async recoveryExport(access:CatalogAdminAccess,key:unknown,input:unknown){const body=parseInput(RunRecoveryExportSchema,input),preview=await this.recoveryPreview(access,key,body.selection);
  if(!preview.ready||!preview.manifest)throw new ApiException('CONFLICT','恢复依据已变化：'+preview.issues.map(i=>i.message).join('；').slice(0,350),409);
  if(preview.digest!==body.expectedDigest)throw new ApiException('REVISION_CONFLICT','恢复依据摘要已变化，请重新核对',409);
  return RunRecoveryExportedSchema.parse({digest:preview.digest,manifest:preview.manifest});}
}
