import { Inject,Injectable } from '@nestjs/common';
import { createHmac,randomUUID } from 'node:crypto';
import { z } from 'zod';
import { IdSchema } from '@orai/contracts';
import { ProductionRunOperationSchema, ProductionRunCreateSchema, ProductionRunGetSchema, ProductionRunListSchema,
  ProductionRunCancelSchema, ProductionAttemptClaimSchema, ProductionAttemptGetSchema, ProductionAttemptEventInputSchema,
  ProductionAttemptCompleteSchema, ProductionAttemptRenewSchema, ProductionRunSchema, ProductionRunPageSchema,
  ProductionAttemptSchema, ProductionAttemptClaimedSchema, ProductionRunLimitsSchema, ProductionPlanModuleSchema,
  ProjectProductionSaveSchema, productionWorkStages, type ProductionRunOperation } from '@orai/contracts/admin';
import { CatalogAdminAccessService,type CatalogAdminAccess } from '../catalog/admin-access.service';
import { machineDigest,machineDenied,machineWorkspace,type ProjectTarget,type MachineRequirement } from '../catalog/machine-authorization';
import { DatabaseService } from '../database/database.service';
import { Prisma,type ExternalProductionRun,type ExternalProductionAttempt } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AdminMutationService } from './admin-mutation.service';
import { ProjectProductionService } from './project-production.service';
import { contentDigest } from './content-projections';
import { contentLock } from './content-workflow.service';
import { inspectProductionPlan } from './production-plan-inspection';
import { ProductionPlanDocumentSchema } from '@orai/contracts/admin';

export const PRODUCTION_RUN_CLOCK=Symbol('PRODUCTION_RUN_CLOCK');
export const productionRunClock={provide:PRODUCTION_RUN_CLOCK,useValue:()=>new Date()};
const id=(value:unknown)=>parseInput(IdSchema,value).toLowerCase();
const terminal=new Set(['validation_failed','failed','saved_draft','cancelled']);
const relations={events:{orderBy:{number:'asc' as const}},lease:true,run:true,module:{include:{plan:true,identity:true}}} as const;
type AttemptRow=Prisma.ExternalProductionAttemptGetPayload<{include:typeof relations}>;
type Choices=z.infer<typeof ProductionAttemptClaimSchema>;
type PublicAttempt=z.infer<typeof ProductionAttemptSchema>;
type EventInput=z.infer<typeof ProductionAttemptEventInputSchema>;
const selections=z.array(ProjectProductionSaveSchema.shape.methods.element).max(12);
const inputsSchema=ProjectProductionSaveSchema.shape.inputs;
const jobSchema=ProductionAttemptEventInputSchema.shape.job;
const scrub=(value:string)=>value.replace(/orai_mcp_[A-Za-z0-9_-]{43}/g,'[redacted]').replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g,'[redacted]');
const sorted=<T extends {digest:string}>(values:T[],key:(v:T)=>string)=>[...values].sort((a,b)=>key(a).localeCompare(key(b)));
const methodChoices=(values:{snapshotId:string;digest:string}[])=>sorted(values,v=>v.snapshotId).map(({snapshotId,digest})=>({snapshotId,digest}));
const inputChoices=(values:{recordId:string;digest:string}[])=>sorted(values,v=>v.recordId).map(({recordId,digest})=>({recordId,digest}));

@Injectable()
export class ProductionRunsService {
  constructor(private readonly db:DatabaseService,private readonly administrators:CatalogAdminAccessService,
    private readonly mutations:AdminMutationService,private readonly production:ProjectProductionService,
    @Inject(PRODUCTION_RUN_CLOCK) private readonly now:()=>Date) {}
  private restrict(access:CatalogAdminAccess,permission:MachineRequirement['permission'],target:Omit<ProjectTarget,'type'>,
    extraPermissions:MachineRequirement['permission'][]=[]){
    return this.administrators.restrictMachine(access,{permission,extraPermissions,target:{type:'project',...target}});
  }
  private async run(tx:Prisma.TransactionClient,access:CatalogAdminAccess,key:string,moduleId?:string){
    await this.administrators.require(access,tx);
    const row=await tx.externalProductionRun.findFirst({where:{id:key,scope:access.scope}});
    if(!row)throw new ApiException('NOT_FOUND','外部制作 run 不存在',404);
    await this.administrators.requireProjectRow(access,['projects:read','projects:write','content:write'],
      {productId:row.productId,planRevisionId:row.planRevisionId,runId:row.id,planModuleId:moduleId},tx);return row;
  }
  private async attempt(tx:Prisma.TransactionClient,access:CatalogAdminAccess,key:string){
    await this.administrators.require(access,tx);
    const row=await tx.externalProductionAttempt.findFirst({where:{id:key,scope:access.scope},include:relations});
    if(!row)throw new ApiException('NOT_FOUND','模块尝试不存在',404);
    await this.administrators.requireProjectRow(access,['projects:read','content:write'],{productId:row.productId,
      planRevisionId:row.run.planRevisionId,planModuleId:row.planModuleId,runId:row.runId,attemptId:row.id},tx);return row;
  }
  private async lockRun(tx:Prisma.TransactionClient,key:string){
    await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'external-run:'+key},0))`);
  }
  private available(run:ExternalProductionRun){
    const limits=ProductionRunLimitsSchema.parse(run.limits);
    if(run.cancelledAt||run.createdAt.getTime()+limits.maxDurationSeconds*1000<=this.now().getTime())
      throw new ApiException('CONFLICT','此 run 已取消或超过允许时长',409);return limits;
  }
  private async stageBudget(tx:Prisma.TransactionClient,run:ExternalProductionRun,domain:string){
    const stage=productionWorkStages[domain as keyof typeof productionWorkStages],policy=ProductionRunLimitsSchema.parse(run.limits).stageLimits?.[stage];
    if(!policy)return null;
    const domains=Object.entries(productionWorkStages).filter(([,value])=>value===stage).map(([key])=>key),where={runId:run.id,domain:{in:domains}},
      usage=await tx.externalProductionAttempt.aggregate({where,_count:{_all:true},_sum:{reportedCostFen:true,reportedTokens:true},_min:{createdAt:true}}),
      active=await tx.externalModuleLease.count({where:{runId:run.id,expiresAt:{gt:this.now()},activeAttempt:{endedAt:null,domain:{in:domains}}}}),
      deadline=new Date((usage._min.createdAt??this.now()).getTime()+policy.maxDurationSeconds*1000);
    return {stage,policy,usage,active,deadline};
  }
  private active(row:AttemptRow){return !row.endedAt&&!row.run.cancelledAt&&row.lease?.activeAttemptId===row.id&&
    row.lease.generation===row.generation&&row.lease.expiresAt>this.now()&&row.leaseExpiresAt>this.now();}
  private token(bearer:string,attemptId:string){return createHmac('sha256',bearer).update('orai-production-attempt-v1:'+attemptId).digest('base64url');}
  private async context(tx:Prisma.TransactionClient,access:CatalogAdminAccess,run:ExternalProductionRun,moduleId:string,
    methods:{snapshotId:string;digest:string}[],inputs:{recordId:string;digest:string}[]){
    const module=await tx.productionPlanModule.findFirst({where:{id:moduleId,planRevisionId:run.planRevisionId,productId:run.productId,scope:access.scope},include:{plan:true}});
    if(!module)throw new ApiException('NOT_FOUND','模块不属于该固定 run 计划',404);
    await this.administrators.requireProjectRow(access,['projects:read','content:write'],{productId:run.productId,planRevisionId:run.planRevisionId,planModuleId:module.id,runId:run.id},tx);
    const definition=ProductionPlanModuleSchema.parse(module.definition),missing:string[]=[],purposes=new Set<string>();
    if(new Set(methods.map(m=>m.snapshotId)).size!==methods.length||new Set(inputs.map(i=>i.recordId)).size!==inputs.length)
      throw new ApiException('VALIDATION_ERROR','方法或输入选择重复',400);
    for(const selected of methods){
      const method=await tx.projectMethodSnapshot.findFirst({where:{id:selected.snapshotId,scope:access.scope,planModuleId:module.id},select:{planModuleId:true,digest:true,purpose:true}});
      if(!method||method.digest!==selected.digest)throw new ApiException('CONFLICT','尝试方法必须固定本模块快照及摘要',409);
      purposes.add(method.purpose);
    }
    if(definition.methodPurposes.some(p=>!purposes.has(p)))missing.push('missing_methods');
    const dependencyModules=await tx.productionPlanModule.findMany({where:{planRevisionId:run.planRevisionId,productId:run.productId,scope:access.scope},include:{identity:true}});
    const dependencies=dependencyModules.filter(m=>definition.dependsOn.includes(m.identity.moduleKey)),chosen:string[]=[];
    const nativeHeads:{id:string;revision:number;status:string}[]=[];
    for(const selected of inputs){
      const source=await tx.projectProductionRecord.findFirst({where:{id:selected.recordId,productId:run.productId,scope:access.scope},include:{outputs:true}});
      if(!source||source.digest!==selected.digest||!dependencies.some(m=>m.id===source.planModuleId))throw new ApiException('CONFLICT','尝试输入必须来自固定计划声明的依赖模块',409);
      chosen.push(source.planModuleId);
      for(const output of source.outputs){
        if(output.contentRevisionId){
          const row=await tx.contentRevision.findUniqueOrThrow({where:{id:output.contentRevisionId},select:{sourceRevision:true,asset:{select:{id:true,revision:true,status:true}},version:{select:{id:true,revision:true,status:true}}}}),head=row.asset??row.version;
          nativeHeads.push({id:head.id,revision:head.revision,status:head.status});
          if(row.sourceRevision!==head.revision)missing.push('input_content_changed');
        }
        if(output.experienceRevisionId){
          const row=await tx.experienceAuthoringRevision.findUniqueOrThrow({where:{id:output.experienceRevisionId}});
          const head=await tx.experienceAuthoringRevision.findFirstOrThrow({where:{productVersionId:row.productVersionId},orderBy:{number:'desc'}});
          nativeHeads.push({id:head.id,revision:head.number,status:head.status});if(row.id!==head.id)missing.push('input_experience_changed');
        }
      }
    }
    if(dependencies.some(m=>!chosen.includes(m.id)))missing.push('missing_dependency');
    const heads=await tx.projectProductionRecord.findMany({where:{planModuleId:{in:dependencies.map(d=>d.id)},scope:access.scope},
      orderBy:[{planModuleId:'asc'},{number:'desc'}],distinct:['planModuleId'],select:{id:true,planModuleId:true,digest:true}});
    if(inputs.some(i=>!heads.some(h=>h.id===i.recordId&&h.digest===i.digest)))missing.push('input_production_changed');
    const latestPlan=await tx.productionPlanRevision.findFirstOrThrow({where:{productId:run.productId,scope:access.scope},orderBy:{number:'desc'},select:{id:true,digest:true}});
    if(latestPlan.id!==run.planRevisionId)missing.push('plan_changed');
    nativeHeads.sort((a,b)=>a.id.localeCompare(b.id));
    const frontier=contentDigest({latestPlan,heads,nativeHeads});
    const inputFingerprint=contentDigest({planRevisionId:run.planRevisionId,moduleDigest:module.digest,profileDigest:module.plan.creativeProfileDigest,
      methods:methodChoices(methods),inputs:inputChoices(inputs),sourceFrontierFingerprint:frontier});
    return {module,definition,missing:[...new Set(missing)],frontier,inputFingerprint};
  }
  private async dto(tx:Prisma.TransactionClient,access:CatalogAdminAccess,row:AttemptRow):Promise<PublicAttempt>{
    const methods=selections.parse(row.methods),inputs=inputsSchema.parse(row.inputs),context=await this.context(tx,access,row.run,row.planModuleId,methods,inputs);
    const outputChanged=await this.outputChanged(tx,row);
    return ProductionAttemptSchema.parse({id:row.id,runId:row.runId,productId:row.productId,planModuleId:row.planModuleId,domain:row.domain,clientKey:row.clientKey,
      inputFingerprint:row.inputFingerprint,sourceFrontierFingerprint:row.sourceFrontierFingerprint,methods,inputs,state:row.state,revision:row.revision,generation:row.generation,
      leaseExpiresAt:row.leaseExpiresAt.toISOString(),leaseActive:this.active(row),outputRecordId:row.outputRecordId,outputDigest:row.outputDigest,job:row.job,
      reportedCostFen:row.reportedCostFen,reportedTokens:row.reportedTokens,createdAt:row.createdAt.toISOString(),endedAt:row.endedAt?.toISOString()??null,
      events:row.events.map(e=>({id:e.id,revision:e.number,state:e.state,step:e.step,reasonCode:e.reasonCode,reason:e.reason,job:e.job,
        reportedCostFen:e.reportedCostFen,reportedTokens:e.reportedTokens,metricsSource:'external_declaration',createdAt:e.createdAt.toISOString()})),
      platformExecuted:false,savedOutputsVerifiedAt:row.verifiedAt?.toISOString()??null,
      needsRecheck:context.frontier!==row.sourceFrontierFingerprint||outputChanged});
  }
  // Reads inspect native revision heads and file availability; byte verification is done on completion.
  private async outputChanged(tx:Prisma.TransactionClient,row:Pick<ExternalProductionAttempt,'outputRecordId'|'planModuleId'|'scope'>){
    if(!row.outputRecordId)return false;
    const head=await tx.projectProductionRecord.findFirst({where:{planModuleId:row.planModuleId,scope:row.scope},orderBy:{number:'desc'},select:{id:true}});
    if(head?.id!==row.outputRecordId)return true;
    const outputs=await tx.projectProductionOutput.findMany({where:{recordId:row.outputRecordId}});
    for(const output of outputs){
      if(output.contentRevisionId){
        const fixed=await tx.contentRevision.findUniqueOrThrow({where:{id:output.contentRevisionId},include:{asset:true,version:true}}),native=fixed.asset??fixed.version;
        if(native.revision!==fixed.sourceRevision)return true;
      }
      if(output.experienceRevisionId){
        const fixed=await tx.experienceAuthoringRevision.findUniqueOrThrow({where:{id:output.experienceRevisionId}}),
          current=await tx.experienceAuthoringRevision.findFirst({where:{productVersionId:fixed.productVersionId},orderBy:{number:'desc'},select:{id:true}});
        if(current?.id!==fixed.id)return true;
      }
      if(output.fileId&&(await tx.assetFile.findUnique({where:{id:output.fileId},select:{status:true}}))?.status!=='AVAILABLE')return true;
      if(output.originalFileId&&(await tx.projectOriginalFile.findUnique({where:{id:output.originalFileId},select:{status:true}}))?.status!=='AVAILABLE')return true;
    }
    return false;
  }
  private async runDto(tx:Prisma.TransactionClient,access:CatalogAdminAccess,run:ExternalProductionRun){
    const modules=await tx.productionPlanModule.findMany({where:{planRevisionId:run.planRevisionId,productId:run.productId,scope:access.scope},orderBy:{position:'asc'},include:{identity:true}});
    const rows=await tx.externalProductionAttempt.findMany({where:{runId:run.id},orderBy:[{planModuleId:'asc'},{generation:'desc'}],include:relations}),items=[];
    const credential=access.machineCredentialId?await tx.machineCredential.findUniqueOrThrow({where:{id:access.machineCredentialId}}):null;
    for(const module of modules){
      const definition=ProductionPlanModuleSchema.parse(module.definition),row=rows.find(r=>r.planModuleId===module.id);
      const current=row?await this.context(tx,access,run,module.id,selections.parse(row.methods),inputsSchema.parse(row.inputs)):null;
      const needsRecheck=!!row&&(current!.frontier!==row.sourceFrontierFingerprint||await this.outputChanged(tx,row));
      let state:string=run.cancelledAt?'cancelled':needsRecheck?'needs_recheck':row?.state??'waiting_input',reviewId:string|null=null;
      if(row&&!row.endedAt&&!this.active(row)&&!needsRecheck&&!run.cancelledAt)state='waiting_input';
      if(row?.outputRecordId){
        const linked=await tx.projectReviewRecord.findFirst({where:{recordId:row.outputRecordId,scope:access.scope},orderBy:{review:{number:'desc'}},include:{review:true}});
        if(linked&&['submitted','returned','retained'].includes(linked.review.status)&&!needsRecheck){
          state=linked.review.status==='submitted'?'pending_review':linked.review.status;reviewId=linked.reviewId;
        }
      }
      items.push({planModuleId:module.id,moduleId:module.moduleId,moduleKey:module.identity.moduleKey,title:definition.title,domain:definition.domain,required:definition.required,
        state,latestAttemptId:row?.id??null,recordId:row?.outputRecordId??null,recordDigest:row?.outputDigest??null,reviewId,
        reason:(!credential||credential.domain===definition.domain)?row?.events.at(-1)?.reason??null:null,needsRecheck,
        attemptCount:rows.filter(r=>r.planModuleId===module.id).length});
    }
    return ProductionRunSchema.parse({id:run.id,productId:run.productId,planRevisionId:run.planRevisionId,scope:run.scope.toLowerCase(),runKey:run.runKey,digest:run.digest,
      limits:run.limits,createdAt:run.createdAt.toISOString(),cancelledAt:run.cancelledAt?.toISOString()??null,cancelReason:run.cancelReason,modules:items,
      readyForHumanReview:items.some(m=>m.recordId!==null)&&items.filter(m=>m.required).every(m=>['saved_draft','pending_review','retained'].includes(m.state)),
      metricsSource:'external_declaration',platformExecuted:false,scheduler:'external'});
  }
  async execute(access:CatalogAdminAccess,bearer:string,operationInput:unknown,input:unknown):Promise<unknown>{
    await this.administrators.require(access);if(!access.machineCredentialId)throw machineDenied();
    const operation=parseInput(ProductionRunOperationSchema,operationInput),result=await this.dispatch(access,bearer,operation,input);
    await this.administrators.require(access);return result;
  }
  private async dispatch(access:CatalogAdminAccess,bearer:string,operation:ProductionRunOperation,input:unknown):Promise<unknown>{
    switch(operation){
      case 'production_run_create':return this.create(access,input);
      case 'production_run_get':{
        const b=parseInput(ProductionRunGetSchema,input),scoped=await this.restrict(access,'projects:read',b);
        return this.db.client.$transaction(async tx=>this.runDto(tx,scoped,await this.run(tx,scoped,b.runId)));
      }
      case 'production_run_list':{
        const b=parseInput(ProductionRunListSchema,input),scoped=await this.restrict(access,'projects:read',{productId:b.productId});
        return this.list(scoped,b.productId,{page:b.page,pageSize:b.pageSize});
      }
      case 'production_run_cancel':return this.cancel(access,input);
      case 'module_attempt_claim':return this.claim(access,bearer,input);
      case 'module_attempt_get':{
        const b=parseInput(ProductionAttemptGetSchema,input),scoped=await this.restrict(access,'projects:read',b,['projects:read','skills:read','context:read']);
        return this.db.client.$transaction(async tx=>this.dto(tx,scoped,await this.attempt(tx,scoped,b.attemptId)));
      }
      case 'module_attempt_event':return this.event(access,input);
      case 'module_attempt_renew':return this.renew(access,input);
      case 'module_attempt_complete':return this.complete(access,input);
    }
  }
  private async create(access:CatalogAdminAccess,input:unknown){
    const body=parseInput(ProductionRunCreateSchema,input),scoped=await this.restrict(access,'projects:write',{productId:body.productId,planRevisionId:body.planRevisionId},['projects:read']);
    const result=await this.mutations.run(scoped,'external.run.create',body.requestId,body,async tx=>{
      const c=await tx.machineCredential.findUniqueOrThrow({where:{id:access.machineCredentialId!}}),workspace=await machineWorkspace(c,tx);
      await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'machine-workspace:'+workspace.id},0))`);
      const plan=await tx.productionPlanRevision.findFirst({where:{id:body.planRevisionId,productId:body.productId,scope:access.scope}});
      if(!plan||plan.digest!==body.expectedPlanDigest)throw new ApiException('REVISION_CONFLICT','run 必须固定计划修订及摘要',409);
      const {requestId:_,...fixed}=body,digest=contentDigest(fixed),previous=await tx.externalProductionRun.findUnique({where:{productId_runKey:{productId:body.productId,runKey:body.runKey}}});
      if(previous){if(previous.digest!==digest||previous.creatorCredentialId!==c.id)throw new ApiException('IDEMPOTENCY_CONFLICT','run 业务键已被不同输入或凭证使用',409);
        return {response:{id:previous.id},entityKind:'production_run',entityId:previous.id};}
      if(await tx.externalProductionRun.count({where:{productId:body.productId}})>=workspace.maxRunsPerProject)throw new ApiException('CONFLICT','此项目的 run 创建额度已用完',409);
      const row=await tx.externalProductionRun.create({data:{productId:body.productId,scope:access.scope,planRevisionId:body.planRevisionId,
        workspaceId:workspace.id,creatorCredentialId:c.id,runKey:body.runKey,limits:body.limits,digest,createdAt:this.now()}});
      return {response:{id:row.id},entityKind:'production_run',entityId:row.id};
    });
    return this.execute(access,'','production_run_get',{runId:result.id});
  }
  private async cancel(access:CatalogAdminAccess,input:unknown){
    const body=parseInput(ProductionRunCancelSchema,input),scoped=await this.restrict(access,'projects:write',{runId:body.runId},['projects:read']);
    await this.mutations.run(scoped,'external.run.cancel:'+body.runId,body.requestId,body,async tx=>{
      await this.cancelIn(tx,scoped,body.runId,body.reason);
      return {response:{id:body.runId},entityKind:'production_run',entityId:body.runId};
    });return this.execute(access,'','production_run_get',{runId:body.runId});
  }
  private async claim(access:CatalogAdminAccess,bearer:string,input:unknown){
    const credentialProof=await this.db.client.machineCredential.findUniqueOrThrow({where:{id:access.machineCredentialId!}});
    if(machineDigest(bearer)!==credentialProof.tokenDigest)throw machineDenied();
    const body=parseInput(ProductionAttemptClaimSchema,input),scoped=await this.restrict(access,'content:write',{runId:body.runId,planModuleId:body.planModuleId},['projects:read','skills:read','context:read']);
    const result=await this.mutations.run(scoped,'external.attempt.claim',body.requestId,body,async tx=>{
      await this.lockRun(tx,body.runId);const run=await this.run(tx,scoped,body.runId,body.planModuleId),limits=this.available(run),context=await this.context(tx,scoped,run,body.planModuleId,body.methods,body.inputs);
      const previous=await tx.externalProductionAttempt.findFirst({where:{runId:run.id,planModuleId:body.planModuleId},orderBy:{generation:'desc'},include:relations});
      if(previous&&previous.inputFingerprint===context.inputFingerprint){
        if(previous.state==='saved_draft'&&!body.retryOfAttemptId||(!body.retryOfAttemptId&&(!this.active(previous)||previous.clientKey===body.clientKey&&previous.credentialId===access.machineCredentialId)))
          return {response:{id:previous.id},entityKind:'production_attempt',entityId:previous.id};
      }
      if(previous&&this.active(previous))throw new ApiException('CONFLICT','该模块已有有效认领者，请读取当前回执',409);
      if(previous&&previous.inputFingerprint===context.inputFingerprint&&body.retryOfAttemptId!==previous.id)
        throw new ApiException('CONFLICT','恢复失败或过期尝试前需显式指定 retryOfAttemptId',409);
      const previousJob=previous?.state==='saved_draft'?null:jobSchema.parse(previous?.job??null);
      if(previousJob&&!previousJob.terminal&&previous&&
        (contentDigest(methodChoices(body.methods))!==contentDigest(methodChoices(selections.parse(previous.methods)))||
         contentDigest(inputChoices(body.inputs))!==contentDigest(inputChoices(inputsSchema.parse(previous.inputs)))))
        throw new ApiException('CONFLICT','旧外部作业仍使用原输入，先恢复并核对其终态，不能冒用新输入',409);
      if(previousJob&&!previousJob.terminal&&body.resumeJobId!==previousJob.jobId)
        throw new ApiException('CONFLICT','外部作业结果不明，必须先查询并恢复原 jobId，不能重复创建作业',409);
      const count=await tx.externalProductionAttempt.count({where:{runId:run.id}}),moduleCount=await tx.externalProductionAttempt.count({where:{runId:run.id,planModuleId:body.planModuleId}});
      const active=await tx.externalModuleLease.count({where:{runId:run.id,expiresAt:{gt:this.now()},activeAttempt:{endedAt:null}}});
      const spend=await tx.externalProductionAttempt.aggregate({where:{runId:run.id},_sum:{reportedCostFen:true,reportedTokens:true}});
      if(count>=limits.maxTotalAttempts||moduleCount>=limits.maxAttemptsPerModule||active>=limits.maxConcurrency||
        limits.maxReportedCostFen!==null&&(spend._sum.reportedCostFen??0)>=limits.maxReportedCostFen||
        limits.maxReportedTokens!==null&&(spend._sum.reportedTokens??0)>=limits.maxReportedTokens)
        throw new ApiException('CONFLICT','run 的次数、并发或外部申报预算已达上限，请交管理员处理',409);
      const stage=await this.stageBudget(tx,run,context.definition.domain);
      if(stage&&(stage.usage._count._all>=stage.policy.maxAttempts||stage.active>=stage.policy.maxConcurrency||stage.deadline<=this.now()||
        stage.policy.maxReportedCostFen!==null&&(stage.usage._sum.reportedCostFen??0)>=stage.policy.maxReportedCostFen||
        stage.policy.maxReportedTokens!==null&&(stage.usage._sum.reportedTokens??0)>=stage.policy.maxReportedTokens))
        throw new ApiException('CONFLICT',`${stage.stage} 阶段的次数、并发、期限或外部申报预算已达上限，请交管理员处理`,409);
      const now=this.now(),credential=await tx.machineCredential.findUniqueOrThrow({where:{id:access.machineCredentialId!}}),
        expiresAt=new Date(Math.min(now.getTime()+body.leaseSeconds*1000,run.createdAt.getTime()+limits.maxDurationSeconds*1000,credential.expiresAt.getTime(),stage?.deadline.getTime()??Infinity));
      const attemptId=randomUUID(),generation=(previous?.generation??0)+1,job=previousJob&&!previousJob.terminal?previousJob:null;
      await tx.externalProductionAttempt.create({data:{id:attemptId,runId:run.id,productId:run.productId,scope:access.scope,planModuleId:body.planModuleId,
        credentialId:credential.id,domain:context.definition.domain,clientKey:body.clientKey,inputFingerprint:context.inputFingerprint,
        sourceFrontierFingerprint:context.frontier,methods:methodChoices(body.methods),inputs:inputChoices(body.inputs),missingInputs:context.missing,
        generation,tokenDigest:machineDigest(this.token(bearer,attemptId)),leaseExpiresAt:expiresAt,state:'waiting_input',createdAt:now,job:job??Prisma.DbNull}});
      await tx.externalModuleLease.upsert({where:{runId_planModuleId:{runId:run.id,planModuleId:body.planModuleId}},
        create:{runId:run.id,planModuleId:body.planModuleId,productId:run.productId,scope:access.scope,activeAttemptId:attemptId,generation,expiresAt},
        update:{activeAttemptId:attemptId,generation,expiresAt}});
      await tx.externalAttemptEvent.create({data:{attemptId,productId:run.productId,scope:access.scope,number:0,state:'waiting_input',step:'S2',
        reasonCode:context.missing.length?'missing-inputs':null,reason:context.missing.length?'方法或依赖未齐，等待输入。':job?'认领已恢复，先核对原外部 jobId。':'输入已固定，可以开始外部制作。',
        job:job??Prisma.DbNull,details:{missing:context.missing,productionStage:productionWorkStages[context.definition.domain],
          ...(stage?{stageDeadline:stage.deadline.toISOString()}: {})},createdAt:now}});
      return {response:{id:attemptId},entityKind:'production_attempt',entityId:attemptId};
    });
    return this.db.client.$transaction(async tx=>{
      const row=await this.attempt(tx,scoped,result.id),attempt=await this.dto(tx,scoped,row),owner=row.credentialId===access.machineCredentialId&&row.clientKey===body.clientKey,
        leaseToken=owner&&this.active(row)?this.token(bearer,row.id):null;
      return ProductionAttemptClaimedSchema.parse({attempt,leaseToken,nextAction:row.state==='saved_draft'?(attempt.needsRecheck?'explicit_retry_required':'reuse_saved_record'):!leaseToken?'explicit_retry_required':
        row.job?'inspect_existing_job':attempt.needsRecheck||(row.missingInputs as string[]).length?'prepare_inputs':'produce'});
    });
  }
  private async proof(tx:Prisma.TransactionClient,access:CatalogAdminAccess,body:{attemptId:string;leaseToken:string;expectedRevision:number}){
    const row=await this.attempt(tx,access,body.attemptId);this.available(row.run);
    const stage=await this.stageBudget(tx,row.run,row.domain);
    if(stage&&stage.deadline<=this.now())throw new ApiException('CONFLICT','阶段制作期限已到，保留回执并交人工处理',409);
    if(row.credentialId!==access.machineCredentialId||!this.active(row)||machineDigest(body.leaseToken)!==row.tokenDigest)
      throw new ApiException('CONFLICT','认领已过期、被替换或不属于此连接，晚回包不能覆盖当前尝试',409);
    if(row.revision!==body.expectedRevision)throw new ApiException('REVISION_CONFLICT','模块回执已有新修订，请先读取',409);
    if(row.revision>=200)throw new ApiException('CONFLICT','阶段回执数量已达上限',409);return row;
  }
  private async append(tx:Prisma.TransactionClient,row:AttemptRow,event:{state:string;step:string;reasonCode:string|null;reason:string;
    job:EventInput['job'];reportedCostFen:number|null;reportedTokens:number|null;details:Prisma.InputJsonValue},
    update:Partial<Pick<ExternalProductionAttempt,'outputRecordId'|'outputDigest'|'verifiedAt'|'leaseExpiresAt'>>={}){
    const now=this.now(),revision=row.revision+1;
    await tx.externalAttemptEvent.create({data:{attemptId:row.id,productId:row.productId,scope:row.scope,number:revision,state:event.state,step:event.step,
      reasonCode:event.reasonCode,reason:scrub(event.reason),job:event.job??Prisma.DbNull,reportedCostFen:event.reportedCostFen,reportedTokens:event.reportedTokens,details:event.details,createdAt:now}});
    await tx.externalProductionAttempt.update({where:{id:row.id},data:{state:event.state,revision,job:event.job??Prisma.DbNull,
      reportedCostFen:event.reportedCostFen,reportedTokens:event.reportedTokens,...update,endedAt:terminal.has(event.state)?now:null}});
    return {response:{id:row.id},entityKind:'production_attempt',entityId:row.id};
  }
  private async event(access:CatalogAdminAccess,input:unknown){
    const body=parseInput(ProductionAttemptEventInputSchema,input),scoped=await this.restrict(access,'content:write',{attemptId:body.attemptId},['projects:read','skills:read','context:read']);
    const existing=await this.db.client.externalProductionAttempt.findUniqueOrThrow({where:{id:body.attemptId}});
    await this.mutations.run(scoped,'external.attempt.event:'+body.attemptId,body.requestId,body,async tx=>{
      await this.lockRun(tx,existing.runId);const row=await this.proof(tx,scoped,body),context=await this.context(tx,scoped,row.run,row.planModuleId,selections.parse(row.methods),inputsSchema.parse(row.inputs));
      if(['producing','uploading'].includes(body.state)&&(context.frontier!==row.sourceFrontierFingerprint||context.missing.length))
        throw new ApiException('REVISION_CONFLICT','方法或上游输入需要复查，不能继续标记制作中',409);
      const oldJob=jobSchema.parse(row.job),job=body.job??oldJob;
      if(body.job&&(body.job.jobId.startsWith('orai_mcp_')||body.job.jobId.startsWith('sk-')))throw new ApiException('VALIDATION_ERROR','jobId 不得包含凭据',400);
      if(oldJob&&body.job&&(oldJob.jobId!==body.job.jobId||oldJob.provider!==body.job.provider||oldJob.terminal&&!body.job.terminal))
        throw new ApiException('CONFLICT','同一尝试只能恢复原作业，不能替换 jobId 或回退终态',409);
      if(row.reportedCostFen!==null&&(body.reportedCostFen??row.reportedCostFen)<row.reportedCostFen||
        row.reportedTokens!==null&&(body.reportedTokens??row.reportedTokens)<row.reportedTokens)throw new ApiException('CONFLICT','累计外部申报用量不能回退',409);
      return this.append(tx,row,{state:body.state,step:body.step,reasonCode:body.reasonCode,reason:body.reason,job,
        reportedCostFen:body.reportedCostFen??row.reportedCostFen,reportedTokens:body.reportedTokens??row.reportedTokens,details:{source:'external_declaration'}});
    });return this.execute(access,'','module_attempt_get',{attemptId:body.attemptId});
  }
  private async renew(access:CatalogAdminAccess,input:unknown){
    const body=parseInput(ProductionAttemptRenewSchema,input),scoped=await this.restrict(access,'content:write',{attemptId:body.attemptId},['projects:read','skills:read','context:read']),
      existing=await this.db.client.externalProductionAttempt.findUniqueOrThrow({where:{id:body.attemptId}});
    await this.mutations.run(scoped,'external.attempt.renew:'+body.attemptId,body.requestId,body,async tx=>{
      await this.lockRun(tx,existing.runId);const row=await this.proof(tx,scoped,body),limits=this.available(row.run),c=await tx.machineCredential.findUniqueOrThrow({where:{id:access.machineCredentialId!}}),
        stage=await this.stageBudget(tx,row.run,row.domain),
        expiresAt=new Date(Math.min(this.now().getTime()+body.leaseSeconds*1000,row.run.createdAt.getTime()+limits.maxDurationSeconds*1000,c.expiresAt.getTime(),stage?.deadline.getTime()??Infinity));
      if(expiresAt<=row.leaseExpiresAt)throw new ApiException('CONFLICT','续期需延长有效认领时间',409);
      await tx.externalModuleLease.update({where:{runId_planModuleId:{runId:row.runId,planModuleId:row.planModuleId}},data:{expiresAt}});
      return this.append(tx,row,{state:row.state,step:row.events.at(-1)?.step??'S3',reasonCode:null,reason:'有效认领已续期。',job:jobSchema.parse(row.job),
        reportedCostFen:row.reportedCostFen,reportedTokens:row.reportedTokens,details:{leaseExpiresAt:expiresAt.toISOString()}},{leaseExpiresAt:expiresAt});
    });return this.execute(access,'','module_attempt_get',{attemptId:body.attemptId});
  }
  private async complete(access:CatalogAdminAccess,input:unknown){
    const body=parseInput(ProductionAttemptCompleteSchema,input),scoped=await this.restrict(access,'content:write',{attemptId:body.attemptId},['projects:read','skills:read','context:read']);
    const scanned=await this.db.client.$transaction(async tx=>{
      const row=await this.attempt(tx,scoped,body.attemptId);
      if(row.state!=='saved_draft')await this.proof(tx,scoped,body);
      else if(row.credentialId!==access.machineCredentialId||machineDigest(body.leaseToken)!==row.tokenDigest)
        throw new ApiException('CONFLICT','完成回执不属于该认领',409);
      const record=await this.production.verifyRecordIn(tx,scoped,body.recordId);
      if(record.planModuleId!==row.planModuleId||record.digest!==body.expectedRecordDigest||
        contentDigest(methodChoices(record.methods))!==contentDigest(methodChoices(selections.parse(row.methods)))||
        contentDigest(inputChoices(record.inputs))!==contentDigest(inputChoices(inputsSchema.parse(row.inputs))))
        throw new ApiException('CONFLICT','保存回执必须匹配本次固定模块、方法、输入和真实产物摘要',409);
      const definition=ProductionPlanModuleSchema.parse(row.module.definition);
      for(const slot of definition.outputs.filter(o=>o.required)){
        const outputs=record.outputs.filter(o=>o.outputKey===slot.outputKey);
        if(slot.original.representation==='structured'?!outputs.some(o=>o.contentRevisionId):slot.files.filter(f=>f.required&&f.purpose==='original')
          .some(f=>!outputs.some(o=>o.fileKey===f.fileKey&&o.purpose==='original'&&!!(o.fileId||o.originalFileId))))
          throw new ApiException('CONFLICT','模块尚缺真实必需产物，脚本、预览或制作 JSON 不能替代原件',409);
      }
      const plan=ProductionPlanDocumentSchema.parse(row.module.plan.document),inspection=inspectProductionPlan(plan);
      if(definition.domain==='experience'&&inspection.modules.find(m=>m.moduleKey===definition.moduleKey)?.template==='registered_pair'&&!record.outputs.some(o=>o.experienceRevisionId))
        throw new ApiException('CONFLICT','原生体验还缺独立制作修订',409);
      return {runId:row.runId,verifiedAt:this.now()};
    },{timeout:120_000});
    await this.mutations.run(scoped,'external.attempt.complete:'+body.attemptId,body.requestId,body,async tx=>{
      await this.lockRun(tx,scanned.runId);const row=await this.proof(tx,scoped,body);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${row.productId}::uuid FOR UPDATE`);await contentLock(tx,scoped,row.productId);
      const modules=await tx.productionPlanModule.findMany({where:{planRevisionId:row.run.planRevisionId},orderBy:{id:'asc'},select:{id:true}});
      for(const module of modules)await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'project-production:'+module.id},0))`);
      const context=await this.context(tx,scoped,row.run,row.planModuleId,selections.parse(row.methods),inputsSchema.parse(row.inputs));
      if(context.frontier!==row.sourceFrontierFingerprint||context.missing.length)throw new ApiException('REVISION_CONFLICT','上游输入或计划已变化，需要重新认领并检查',409);
      const record=await tx.projectProductionRecord.findFirst({where:{id:body.recordId,scope:access.scope,planModuleId:row.planModuleId,digest:body.expectedRecordDigest}});
      if(!record)throw new ApiException('CONFLICT','固定产物已不可用',409);
      if(await this.outputChanged(tx,{...row,outputRecordId:record.id}))throw new ApiException('REVISION_CONFLICT','产物已有新修订，需重新保存和核对',409);
      return this.append(tx,row,{state:'saved_draft',step:'S6',reasonCode:null,reason:'已重新校验固定制作记录及实际原件，草稿已保存。',
        job:jobSchema.parse(row.job),reportedCostFen:row.reportedCostFen,reportedTokens:row.reportedTokens,
        details:{recordId:record.id,digest:record.digest,verifiedAt:scanned.verifiedAt.toISOString(),validation:'saved_outputs_and_files',platformExecuted:false}},
        {outputRecordId:record.id,outputDigest:record.digest,verifiedAt:scanned.verifiedAt});
    });return this.execute(access,'','module_attempt_get',{attemptId:body.attemptId});
  }
  async list(access:CatalogAdminAccess,product:string,input:{page:number;pageSize:number}){
    await this.administrators.require(access);
    return this.db.client.$transaction(async tx=>{
      const where={productId:id(product),scope:access.scope},rows=await tx.externalProductionRun.findMany({where,orderBy:{createdAt:'desc'},skip:(input.page-1)*input.pageSize,take:input.pageSize}),items=[];
      for(const row of rows){await this.run(tx,access,row.id);items.push(await this.runDto(tx,access,row));}
      return ProductionRunPageSchema.parse({items,total:await tx.externalProductionRun.count({where}),...input});
    });
  }
  private async cancelIn(tx:Prisma.TransactionClient,access:CatalogAdminAccess,key:string,reason:string){
    await this.lockRun(tx,key);const run=await this.run(tx,access,key);
    if(!run.cancelledAt)await tx.externalProductionRun.update({where:{id:run.id},data:{cancelledAt:this.now(),cancelReason:scrub(reason),cancelActorUserId:access.actorUserId}});
  }
  async stopAdminIn(tx:Prisma.TransactionClient,access:CatalogAdminAccess,key:string,reason:string){
    await this.administrators.require(access,tx);if(access.machineCredentialId)throw machineDenied();
    const run=await this.run(tx,access,key),workspace=await tx.machineProjectWorkspace.findUniqueOrThrow({where:{id:run.workspaceId}});
    if(workspace.ownerUserId!==access.actorUserId)throw machineDenied();
    await this.cancelIn(tx,access,key,reason);
  }
  async inspectAttemptAdminIn(tx:Prisma.TransactionClient,access:CatalogAdminAccess,key:string){
    await this.administrators.require(access,tx);if(access.machineCredentialId)throw machineDenied();
    const row=await this.attempt(tx,access,key),context=await this.context(tx,access,row.run,row.planModuleId,selections.parse(row.methods),inputsSchema.parse(row.inputs));
    return {attempt:await this.dto(tx,access,row),missing:context.missing};
  }
  async readAdmin(access:CatalogAdminAccess,key:unknown){
    await this.administrators.require(access);if(access.machineCredentialId)throw machineDenied();
    return this.db.client.$transaction(async tx=>this.runDto(tx,access,await this.run(tx,access,id(key))));
  }
  async readAdminIn(tx:Prisma.TransactionClient,access:CatalogAdminAccess,key:string){
    await this.administrators.require(access,tx);if(access.machineCredentialId)throw machineDenied();
    return this.runDto(tx,access,await this.run(tx,access,key));
  }
  async attemptAdmin(access:CatalogAdminAccess,key:unknown){
    await this.administrators.require(access);if(access.machineCredentialId)throw machineDenied();
    return this.db.client.$transaction(async tx=>this.dto(tx,access,await this.attempt(tx,access,id(key))));
  }
}
