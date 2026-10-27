import {Inject,Injectable} from '@nestjs/common';
import {IdSchema} from '@orai/contracts';
import {ExternalRunConfigurationDocumentSchema,ExternalConfigurationCreateSchema,ExternalConfigurationSaveSchema,
 ExternalConfigurationSchema,ExternalConfigurationRevisionSchema,ExternalConfigurationValidationSchema,ExternalConfigurationValidateSchema,
 ExternalConfigurationExportSchema,ExternalConfigurationExportedSchema,ExternalConfigurationOptionsQuerySchema,ExternalConfigurationOptionsSchema,
 ProductionPlanModuleSchema,ProductionPlanDocumentSchema,externalConfigurationTimeCandidates,type ExternalRunConfigurationDocument} from '@orai/contracts/admin';
import {DatabaseService} from '../database/database.service';
import {CatalogAdminAccessService,type CatalogAdminAccess} from '../catalog/admin-access.service';
import {ApiException} from '../common/http-errors';
import {parseInput} from '../common/parse-input';
import {Prisma,type ExternalRunConfiguration,type ExternalRunConfigurationRevision} from '../generated/prisma/client';
import {AdminMutationService} from './admin-mutation.service';
import {contentDigest} from './content-projections';
import {ProjectMethodOperationsService} from './project-method-operations.service';
import {inspectProductionPlan} from './production-plan-inspection';

export const EXTERNAL_CONFIGURATION_CLOCK=Symbol('EXTERNAL_CONFIGURATION_CLOCK');
export const externalConfigurationClock={provide:EXTERNAL_CONFIGURATION_CLOCK,useValue:()=>new Date()};
const id=(value:unknown)=>parseInput(IdSchema,value).toLowerCase();
type Tx=Prisma.TransactionClient;
type Document=ExternalRunConfigurationDocument;
type Validation=ReturnType<typeof ExternalConfigurationValidationSchema.parse>;
@Injectable()
export class ExternalRunConfigurationsService{
 constructor(private readonly db:DatabaseService,private readonly administrators:CatalogAdminAccessService,
  private readonly mutations:AdminMutationService,private readonly methods:ProjectMethodOperationsService,
  @Inject(EXTERNAL_CONFIGURATION_CLOCK) private readonly now:()=>Date){}
 private async human(access:CatalogAdminAccess,tx?:Tx){await this.administrators.require(access,tx);if(access.machineCredentialId)throw new ApiException('FORBIDDEN','运行配置仅供管理员核对',403);}
 private async workspace(tx:Tx,access:CatalogAdminAccess,key:string){const row=await tx.machineProjectWorkspace.findFirst({where:{id:key,scope:access.scope,ownerUserId:access.actorUserId}});
  if(!row)throw new ApiException('FORBIDDEN','工作区不属于当前管理员',403);return row;}
 private async parent(tx:Tx,access:CatalogAdminAccess,key:string){await this.human(access,tx);const row=await tx.externalRunConfiguration.findFirst({where:{id:key,scope:access.scope,ownerUserId:access.actorUserId}});
  if(!row)throw new ApiException('NOT_FOUND','运行配置不存在于当前账户',404);await this.workspace(tx,access,row.workspaceId);return row;}
 private async lock(tx:Tx,key:string){await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'external-config:'+key},0))`);}
 private revisionDto(row:ExternalRunConfigurationRevision){return ExternalConfigurationRevisionSchema.parse({id:row.id,configurationId:row.configurationId,revision:row.revision,digest:row.digest,document:row.document,createdAt:row.createdAt.toISOString(),enabled:false,externalReadiness:'not_verified'});}
 private async dto(tx:Tx,row:ExternalRunConfiguration,revisionId?:string){const revision=await tx.externalRunConfigurationRevision.findFirst({where:{configurationId:row.id,scope:row.scope,...(revisionId?{id:revisionId}:{revision:row.currentRevision})}});
  if(!revision)throw new ApiException('NOT_FOUND','配置修订不属于此配置',404);return ExternalConfigurationSchema.parse({id:row.id,scope:row.scope.toLowerCase(),workspaceId:row.workspaceId,currentRevision:row.currentRevision,createdAt:row.createdAt.toISOString(),revision:this.revisionDto(revision),enabled:false});}
 private async references(tx:Tx,access:CatalogAdminAccess,d:Document){
  await this.workspace(tx,access,d.workspaceId);
  const keys=[d.connectionId,...d.modules.map(m=>m.connectionId)].filter((v):v is string=>!!v);
  for(const key of new Set(keys)){const connection=await tx.codexConnection.findFirst({where:{id:key,scope:access.scope,ownerUserId:access.actorUserId,workspaceId:d.workspaceId}});
   if(!connection)throw new ApiException('FORBIDDEN','连接必须属于同一工作区和当前管理员',403);}
  if(d.target.kind==='new_topics')return;
  if(d.target.productId){const project=await tx.machineProject.findFirst({where:{productId:d.target.productId,scope:access.scope,workspaceId:d.workspaceId}});
   if(!project)throw new ApiException('FORBIDDEN','商品不属于所选工作区',403);}
  if(!d.target.planRevisionId){if(d.target.planDigest)throw new ApiException('VALIDATION_ERROR','摘要需要固定计划',400);return;}
  const plan=await tx.productionPlanRevision.findFirst({where:{id:d.target.planRevisionId,productId:d.target.productId??'',scope:access.scope}});
  if(!plan||plan.digest!==d.target.planDigest)throw new ApiException('REVISION_CONFLICT','计划归属或摘要不符',409);
  const modules=await tx.productionPlanModule.findMany({where:{planRevisionId:plan.id,scope:access.scope},include:{identity:true}});
  for(const selection of d.modules){const module=modules.find(m=>m.id===selection.planModuleId);
   if(!module||module.digest!==selection.digest)throw new ApiException('REVISION_CONFLICT','模块必须固定本计划及摘要',409);
   const definition=ProductionPlanModuleSchema.parse(module.definition);
   for(const choice of selection.methods){const method=await tx.projectMethodSnapshot.findFirst({where:{id:choice.snapshotId,scope:access.scope,planModuleId:module.id}});
    if(!method||method.digest!==choice.digest||method.purpose!==choice.purpose||!definition.methodPurposes.includes(choice.purpose))throw new ApiException('FORBIDDEN','方法不属于本模块的固定用途和摘要',403);}
   for(const dependency of selection.dependencies){const upstream=modules.find(m=>m.id===dependency.planModuleId);
    if(!upstream||!definition.dependsOn.includes(upstream.identity.moduleKey))throw new ApiException('FORBIDDEN','依赖不属于本计划的直接上游',403);
    if(dependency.kind==='fixed'&&dependency.recordId){const record=await tx.projectProductionRecord.findFirst({where:{id:dependency.recordId,scope:access.scope,planModuleId:upstream.id}});
     if(!record||record.digest!==dependency.digest)throw new ApiException('FORBIDDEN','固定回执或摘要不属于所选依赖',403);}
   }
  }
 }
 async list(access:CatalogAdminAccess,q:{page:number;pageSize:number}){await this.human(access);return this.db.client.$transaction(async tx=>{
  await this.human(access,tx);const where={ownerUserId:access.actorUserId,scope:access.scope},total=await tx.externalRunConfiguration.count({where}),rows=await tx.externalRunConfiguration.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(q.page-1)*q.pageSize,take:q.pageSize});
  return {items:await Promise.all(rows.map(row=>this.dto(tx,row))),total,...q};});}
 async read(access:CatalogAdminAccess,key:unknown,revisionId?:string){await this.human(access);return this.db.client.$transaction(async tx=>this.dto(tx,await this.parent(tx,access,id(key)),revisionId));}
 async history(access:CatalogAdminAccess,key:unknown,q:{page:number;pageSize:number}){await this.human(access);return this.db.client.$transaction(async tx=>{const p=await this.parent(tx,access,id(key)),where={configurationId:p.id,scope:access.scope};
  return {items:(await tx.externalRunConfigurationRevision.findMany({where,orderBy:{revision:'desc'},skip:(q.page-1)*q.pageSize,take:q.pageSize})).map(row=>this.revisionDto(row)),total:await tx.externalRunConfigurationRevision.count({where}),...q};});}
 async create(access:CatalogAdminAccess,input:unknown){await this.human(access);const b=parseInput(ExternalConfigurationCreateSchema,input),digest=contentDigest(b.document);
  return this.mutations.run(access,'external_configuration.create',b.requestId,b,async tx=>{
   await this.human(access,tx);await this.lock(tx,access.actorUserId+':'+access.scope+':'+b.clientKey);await this.references(tx,access,b.document);
   const previous=await tx.externalRunConfiguration.findUnique({where:{ownerUserId_scope_clientKey:{ownerUserId:access.actorUserId,scope:access.scope,clientKey:b.clientKey}}});
   if(previous){if(previous.inputDigest!==digest)throw new ApiException('IDEMPOTENCY_CONFLICT','配置业务编号已用于不同输入',409);const first=await tx.externalRunConfigurationRevision.findUniqueOrThrow({where:{configurationId_revision:{configurationId:previous.id,revision:1}}});
    return {response:await this.dto(tx,previous,first.id),entityKind:'external_configuration',entityId:previous.id};}
   const row=await tx.externalRunConfiguration.create({data:{ownerUserId:access.actorUserId,scope:access.scope,workspaceId:b.document.workspaceId,clientKey:b.clientKey,inputDigest:digest,currentRevision:1}});
   await tx.externalRunConfigurationRevision.create({data:{configurationId:row.id,scope:access.scope,revision:1,digest,document:b.document as Prisma.InputJsonValue,createdById:access.actorUserId}});
   return {response:await this.dto(tx,row),entityKind:'external_configuration',entityId:row.id};});
 }
 async save(access:CatalogAdminAccess,key:unknown,input:unknown){await this.human(access);const configurationId=id(key),b=parseInput(ExternalConfigurationSaveSchema,input);
  return this.mutations.run(access,'external_configuration.revise:'+configurationId,b.requestId,b,async tx=>{await this.lock(tx,configurationId);const row=await this.parent(tx,access,configurationId);
   if(row.currentRevision!==b.expectedRevision)throw new ApiException('REVISION_CONFLICT','配置已有新修订，请保留修改并重新核对',409);
   if(row.workspaceId!==b.document.workspaceId)throw new ApiException('FORBIDDEN','不能迁移既有配置的工作区归属',403);
   await this.references(tx,access,b.document);const updated=await tx.externalRunConfiguration.update({where:{id:row.id},data:{currentRevision:row.currentRevision+1}});
   await tx.externalRunConfigurationRevision.create({data:{configurationId:row.id,scope:access.scope,revision:updated.currentRevision,digest:contentDigest(b.document),document:b.document as Prisma.InputJsonValue,createdById:access.actorUserId}});
   return {response:await this.dto(tx,updated),entityKind:'external_configuration',entityId:row.id};});
 }
 async options(access:CatalogAdminAccess,input:unknown){await this.human(access);const q=parseInput(ExternalConfigurationOptionsQuerySchema,input);return this.db.client.$transaction(async tx=>{
  await this.human(access,tx);const w=await this.workspace(tx,access,q.workspaceId),where={workspaceId:w.id,scope:access.scope},total=await tx.machineProject.count({where});
  const projects=await tx.machineProject.findMany({where,orderBy:{createdAt:'desc'},skip:(q.page-1)*q.pageSize,take:q.pageSize,include:{product:true}}),plans=await tx.productionPlanRevision.findMany({where:{productId:{in:projects.map(p=>p.productId)},scope:access.scope},orderBy:{number:'desc'}});
  return ExternalConfigurationOptionsSchema.parse({workspace:{id:w.id,name:w.name,expiresAt:w.expiresAt.toISOString(),status:w.revokedAt?'revoked':w.expiresAt<=this.now()?'expired':'active'},projects:{items:projects.map(p=>{const plan=plans.find(v=>v.productId===p.productId);return {productId:p.productId,name:p.product.name,planRevisionId:plan?.id??null,planDigest:plan?.digest??null};}),total,page:q.page,pageSize:q.pageSize}});});}
 private calendar(d:Document,add:(code:string,step:number,message:string)=>void,bounds:{last:string|null}){const t=d.timing;let first:string|null=null;
  if(!t.kind||!t.date||!t.time||!t.timeZone){add('TIME_REQUIRED',1,'请明确时间形式、日期、时间和IANA时区');return null;}
  if(!t.missed||!t.overlap||t.quantity===null)add('TIME_POLICY',1,'请明确产量及错过/重叠处理');
  if(t.kind==='weekly'&&!t.weekdays.length)add('WEEKDAY_REQUIRED',1,'每周安排需要明确星期');
  if(t.kind!=='once'&&!t.until){add('END_DATE_REQUIRED',1,'重复安排需要明确结束日期');return null;}
  const end=t.kind==='once'?t.date:t.until!,start=Date.parse(t.date+'T00:00:00Z'),last=Date.parse(end+'T00:00:00Z');
  if(!Number.isFinite(start)||!Number.isFinite(last)||new Date(start).toISOString().slice(0,10)!==t.date||new Date(last).toISOString().slice(0,10)!==end||last<start||(last-start)/86400000>90){add('TIME_RANGE',1,'日期范围无效或超过90天');return null;}
  try{for(let day=start;day<=last;day+=86400000){const date=new Date(day);if(t.kind==='weekly'&&!t.weekdays.includes(date.getUTCDay()))continue;
   const matches=externalConfigurationTimeCandidates(date.toISOString().slice(0,10),t.time,t.timeZone);
   if(matches.length!==1){add('TIME_AMBIGUOUS',1,'安排包含不存在或重复的本地时间，请改选明确时间');return null;}first??=matches[0]!;bounds.last=matches[0]!;}
  }catch{add('TIME_ZONE',1,'需要有效的IANA时区');return null;}
  if(!first)add('NO_OCCURRENCE',1,'日期范围内没有符合星期的安排');else if(new Date(first)<=this.now())add('TIME_PAST',1,'首次安排时间已过去，请明确调整后再交接');
  return first;
 }
 private async inspect(tx:Tx,access:CatalogAdminAccess,configurationId:string,b:ReturnType<typeof ExternalConfigurationValidateSchema.parse>){
  await this.lock(tx,configurationId);
  const parent=await this.parent(tx,access,configurationId),dto=await this.dto(tx,parent,b.revisionId),d=dto.revision.document;
  if(dto.revision.digest!==b.expectedDigest)throw new ApiException('REVISION_CONFLICT','配置摘要不符',409);
  await this.references(tx,access,d);const issues:Validation['issues']=[],add=(code:string,step:number,message:string)=>{if(issues.length<200)issues.push({code,step,message:message.slice(0,500)});};
  const workspace=await this.workspace(tx,access,parent.workspaceId),frontier:unknown[]=[{currentRevision:parent.currentRevision,workspace:{id:workspace.id,expiresAt:workspace.expiresAt,revokedAt:workspace.revokedAt}}];
  if(parent.currentRevision!==dto.revision.revision)add('HISTORICAL_REVISION',0,'历史修订只读，交接前请回到当前修订');
  if(workspace.revokedAt||workspace.expiresAt<=this.now())add('WORKSPACE_UNAVAILABLE',0,'工作区已撤销或到期');
  if(!d.client.kind||!d.client.workingDirectory)add('CLIENT_REQUIRED',0,'客户端与本机工作目录尚未明确；目录不会被读取');
  const calendarBounds={last:null as string|null},first=this.calendar(d,add,calendarBounds),connectionIds=[d.connectionId,...d.modules.map(m=>m.connectionId)].filter((v):v is string=>!!v);
  frontier.push({lastDeclaredTime:calendarBounds.last});
  if(!d.connectionId)add('CONNECTION_REQUIRED',0,'请明确选择已有连接');
  for(const key of new Set(connectionIds)){const c=await tx.codexConnection.findUniqueOrThrow({where:{id:key},include:{credentials:true}});
   const available=!c.revokedAt&&c.expiresAt>this.now();frontier.push({connectionId:c.id,available,expiresAt:c.expiresAt,revokedAt:c.revokedAt,credentials:c.credentials.map(g=>({id:g.id,domain:g.domain,expiresAt:g.expiresAt,revokedAt:g.revokedAt})).sort((a,b)=>a.domain.localeCompare(b.domain))});
   if(!available)add('CONNECTION_UNAVAILABLE',0,'所选连接已撤销或到期');
   const endDay=d.timing.until??d.timing.date;if(calendarBounds.last&&new Date(calendarBounds.last)>c.expiresAt||endDay&&endDay>c.expiresAt.toISOString().slice(0,10))add('CONNECTION_TERM',1,'安排超出连接期限，不能扩大原授权');
  }
  const s=d.sourcing,l=d.limits;
  if(s.freshnessWindowHours===null||s.maxSources===null||s.maxDurationMinutes===null||!s.missing||!s.sources.length)add('SOURCE_REQUIRED',2,'请明确允许来源、新鲜度、次数/时长及缺新鲜来源的处理');
  if(s.sources.some(source=>!source.region||!source.language||!source.name||!source.url))add('SOURCE_FIELDS',2,'来源地区、语言、名称或地址尚未明确，不代入建议值');
  if(!d.tools.length)add('TOOLS_REQUIRED',4,'尚未声明允许的工具');
  for(const tool of d.tools){if(tool.approval!=='allowed'||!tool.provider)add('TOOL_PERMISSION',4,tool.name+'的提供者或允许状态尚未明确');
   if(tool.cost!=='known'||tool.maxCostFen===null)add('TOOL_COST',4,tool.name+'费用未知；不能当作免费');
   if(tool.maxCalls===null||tool.maxDurationSeconds===null)add('TOOL_LIMITS',4,tool.name+'的调用次数或时长尚未明确');}
  if([l.maxAttemptsPerModule,l.maxTotalAttempts,l.maxConcurrency,l.maxDurationSeconds,l.maxReportedCostFen].some(v=>v===null)||!l.unknownCost)add('RUN_LIMITS',4,'请明确总次数、并发、时长、申报上限与未知费用处理');
  for(const stage of l.stageLimits){for(const [value,total] of [[stage.maxAttempts,l.maxTotalAttempts],[stage.maxConcurrency,l.maxConcurrency],[stage.maxDurationSeconds,l.maxDurationSeconds],[stage.maxReportedCostFen,l.maxReportedCostFen]] as const)
   if(value===null||total!==null&&value>total)add('STAGE_LIMITS',4,'阶段限制不能缺失或扩大总限制');}
  if(Object.values(d.recovery).some(v=>v===null))add('RECOVERY_REQUIRED',4,'请明确原作业未知、失败、暂停及恢复规则');
  let productName:string|null=null,methodCount=0,waiting=0;
  if(d.target.kind==='new_topics')add('TOPIC_PREPARATION',0,'新题目尚无固定证据、计划和方法，当前只可准备草稿');
  else if(!d.target.planRevisionId)add('PLAN_REQUIRED',3,'尚未固定商品计划、模块和方法');
  else{const plan=await tx.productionPlanRevision.findUniqueOrThrow({where:{id:d.target.planRevisionId}}),product=await tx.product.findUniqueOrThrow({where:{id:plan.productId}}),latest=await tx.productionPlanRevision.findFirst({where:{productId:plan.productId,scope:access.scope},orderBy:{number:'desc'}});
   productName=product.name;frontier.push({planId:plan.id,digest:plan.digest,latestPlanId:latest?.id,latestPlanDigest:latest?.digest});
   if(latest?.id!==plan.id)add('PLAN_CHANGED',3,'计划已有新修订；原依据保留，请重新核对');
   const planDocument=ProductionPlanDocumentSchema.parse(plan.document);
   if(planDocument.selection.basis==='evidence'||d.sourcing.basis==='evidence'){
    if(!planDocument.evidence.length)add('EVIDENCE_REQUIRED',2,'固定计划尚无来源证据，不能证明新鲜度');
    for(const issue of inspectProductionPlan({...planDocument,freshnessWindowHours:s.freshnessWindowHours??planDocument.freshnessWindowHours},this.now()).issues.filter(i=>i.code.startsWith('SOURCE_')))add('EVIDENCE_'+issue.code,2,issue.message);
   }
   const rows=await tx.productionPlanModule.findMany({where:{planRevisionId:plan.id,scope:access.scope},include:{identity:true}});
   for(const row of rows){const definition=ProductionPlanModuleSchema.parse(row.definition),selected=d.modules.find(m=>m.planModuleId===row.id);
    if(!selected){if(definition.required)add('MODULE_REQUIRED',3,'尚未配置必需模块：'+definition.title);continue;}
    if(selected.methods.length!==definition.methodPurposes.length||definition.methodPurposes.some(p=>!selected.methods.some(m=>m.purpose===p)))add('METHOD_REQUIRED',3,'请逐用途固定方法：'+definition.title);
    methodCount+=selected.methods.length;
    if(!d.tools.some(t=>t.domains.includes(definition.domain)))add('DOMAIN_TOOL',4,'尚未声明'+definition.title+'使用的工具');
    const connectionId=d.orchestration==='multiple'?selected.connectionId:d.connectionId;
    if(!connectionId)add('ROLE_CONNECTION',3,'请明确'+definition.title+'的领域连接');
    if(d.orchestration==='single'&&selected.connectionId&&selected.connectionId!==d.connectionId)add('ROLE_MODE',3,'单任务不能夹带不同连接，请明确切换分工方式');
    const expected=definition.dependsOn.map(k=>rows.find(m=>m.identity.moduleKey===k)!.id);
    if(expected.some(key=>!selected.dependencies.some(v=>v.planModuleId===key)))add('DEPENDENCY_REQUIRED',3,'请明确'+definition.title+'的每个上游输入方式');
    if(selected.dependencies.some(v=>v.kind==='fixed'&&!v.recordId))add('FIXED_RECORD_REQUIRED',3,'尚未选择'+definition.title+'的精确依赖回执');
    const fixed=selected.dependencies.flatMap(v=>v.kind==='fixed'&&v.recordId&&v.digest?[{...v,recordId:v.recordId,digest:v.digest}]:[]),waitingKeys=selected.dependencies.filter(v=>v.kind==='waiting').map(v=>rows.find(r=>r.id===v.planModuleId)!.identity.moduleKey);waiting+=waitingKeys.length;
    try{const preview=await this.methods.fixedPreviewIn(tx,access,row.id,{expectedModuleDigest:row.digest,connectionId,methods:selected.methods.map(({snapshotId,digest})=>({snapshotId,digest})),records:fixed.map(v=>({recordId:v.recordId,digest:v.digest})),inputs:fixed.flatMap(v=>v.inputs)});
     frontier.push({moduleId:row.id,previewDigest:preview.digest,issues:preview.issues});
     for(const issue of preview.issues){if(issue.code==='MISSING_DEPENDENCY'&&waitingKeys.some(k=>issue.message.endsWith('：'+k)))continue;add(issue.code,3,definition.title+'：'+issue.message);}
    }catch(error){if(error instanceof ApiException)add(error.code,3,definition.title+'：'+error.publicMessage);else throw error;}
   }
  }
  await this.human(access,tx);const summary={workspaceName:workspace.name,productName,planRevisionId:d.target.planRevisionId,moduleCount:d.modules.length,methodCount,waitingDependencies:waiting};
  const validationDigest=contentDigest({configurationId,parentRevision:parent.currentRevision,revisionId:dto.revision.id,documentDigest:dto.revision.digest,issues,frontier,summary,first});
  return {dto,validation:ExternalConfigurationValidationSchema.parse({checkedAt:this.now().toISOString(),configurationId,revisionId:dto.revision.id,revision:dto.revision.revision,readyForReview:issues.length===0,digest:validationDigest,issues,firstDeclaredTime:first,scopeSummary:summary,externalReadiness:'not_verified',enabled:false,executionStarted:false})};
 }
 async validate(access:CatalogAdminAccess,key:unknown,input:unknown){await this.human(access);const b=parseInput(ExternalConfigurationValidateSchema,input);return this.db.client.$transaction(async tx=>(await this.inspect(tx,access,id(key),b)).validation,{timeout:60000,maxWait:5000});}
 async export(access:CatalogAdminAccess,key:unknown,input:unknown){await this.human(access);const b=parseInput(ExternalConfigurationExportSchema,input);return this.db.client.$transaction(async tx=>{
  const {dto,validation}=await this.inspect(tx,access,id(key),b);if(validation.digest!==b.expectedValidationDigest)throw new ApiException('REVISION_CONFLICT','配置依据或权限已变化，请保留选择并重新核对',409);
  const document=ExternalRunConfigurationDocumentSchema.parse({...dto.revision.document,client:{...dto.revision.document.client,workingDirectory:b.includeWorkingDirectory?dto.revision.document.client.workingDirectory:null}});
  const manifest={schemaVersion:1 as const,kind:'external_run_configuration' as const,reviewMode:validation.readyForReview?'review_only' as const:'incomplete_review' as const,configurationId:dto.id,revisionId:dto.revision.id,revision:dto.revision.revision,configurationDigest:dto.revision.digest,validationDigest:validation.digest,document,issues:validation.issues,
   externalUnverified:['真实客户端及MCP配置','工作目录存在性','工具授权及实际费用','来源访问与新鲜度','手动完整制作链','未来日程和无人值守'],handoffInstructions:validation.readyForReview?['人工核对本配置修订、固定方法与最小依赖；本清单始终未启用。','单任务按依赖顺序，多任务按领域分工，共用批次身份；未来上游回执未到时先等待。','实际调用前重查当前权限、原件和固定摘要；未知原作业先按原jobId核对，成功成果复用。','真实客户端、工具费用和未来日程需分别明确确认；审核留存与发布独立。']:[],enabled:false as const,executionStarted:false as const,credentialIncluded:false as const,externalReadiness:'not_verified' as const};
  const markdown=b.format==='markdown'?'# 未启用运行配置 · 仅审核\n\n外部环境未验证。此文件不创建任务、日程、run或认领。\n\n```json\n'+JSON.stringify(manifest,null,2).replaceAll('```','\\u0060\\u0060\\u0060')+'\n```\n':null;
  return ExternalConfigurationExportedSchema.parse({digest:contentDigest(manifest),manifest,markdown});},{timeout:60000,maxWait:5000});}
}
