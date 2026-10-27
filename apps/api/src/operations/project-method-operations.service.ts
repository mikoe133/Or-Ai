import {Injectable} from '@nestjs/common';
import {z} from 'zod';
import {IdSchema} from '@orai/contracts';
import {ProjectMethodCandidateQuerySchema,ProjectMethodCandidatePageSchema,ProjectMethodCaptureSchema,
 ProjectHandoffOptionsQuerySchema,ProjectHandoffOptionsSchema,ProjectHandoffSelectionSchema,ProjectHandoffPreviewSchema,
 ProjectHandoffManifestSchema,ProjectRecoveryFixedManifestSchema,ProjectRecoveryFixedPreviewSchema,ProjectHandoffExportSchema,ProjectHandoffExportedSchema,ProductionPlanModuleSchema,
 ProductConfigurationSchema,type ContentLocator} from '@orai/contracts/admin';
import type {CatalogAdminAccess} from '../catalog/admin-access.service';
import {requireMachineTarget} from '../catalog/machine-authorization';
import {DatabaseService} from '../database/database.service';
import {Prisma,type ContentRevision} from '../generated/prisma/client';
import {ApiException} from '../common/http-errors';
import {parseInput} from '../common/parse-input';
import {AdminMutationService} from './admin-mutation.service';
import {ProjectProductionService} from './project-production.service';
import {fixedVersion} from './skill-bindings.service';
import {contentDigest,contentFragment,locatorKey,profileDto,snapshotAuthoring} from './content-projections';

const id=(v:unknown)=>parseInput(IdSchema,v).toLowerCase();
const moduleInclude={plan:true,identity:true} as const;
type Module=Prisma.ProductionPlanModuleGetPayload<{include:typeof moduleInclude}>;
type Selection=z.infer<typeof ProjectHandoffSelectionSchema>;
type Choice=z.infer<typeof ProjectHandoffOptionsSchema>['fragments']['items'][number];
type Preview=z.infer<typeof ProjectHandoffPreviewSchema>;

@Injectable()
export class ProjectMethodOperationsService{
 constructor(private readonly db:DatabaseService,private readonly mutations:AdminMutationService,private readonly production:ProjectProductionService){}
 private async human(access:CatalogAdminAccess,tx?:Prisma.TransactionClient){
  await this.mutations.administrators.require(access,tx);
  if(access.machineCredentialId)throw new ApiException('FORBIDDEN','此运营操作仅供当前管理员使用',403);
 }
 private async current(tx:Prisma.TransactionClient,access:CatalogAdminAccess,key:string,lock=false){
  await this.human(access,tx);
  const row=await tx.productionPlanModule.findFirst({where:{id:key,scope:access.scope},include:moduleInclude});
  if(!row)throw new ApiException('NOT_FOUND','计划模块不存在于当前范围',404);
  if(lock)await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${row.productId}::uuid FOR SHARE`);
  const latest=await tx.productionPlanRevision.findFirst({where:{productId:row.productId,scope:access.scope},orderBy:{number:'desc'},select:{id:true}});
  if(latest?.id!==row.planRevisionId)throw new ApiException('REVISION_CONFLICT','历史计划只读，请读取当前计划再设置方法或交接',409);
  return row;
 }
 private async sourceOwnership(tx:Prisma.TransactionClient,module:Module,skillId:string){
  const membership=await tx.machineProjectSkill.findUnique({where:{skillId}});
  if(membership&&(membership.scope!==module.scope||membership.productId!==module.productId))
   throw new ApiException('FORBIDDEN','候选方法属于另一个商品，不能作为本商品候选使用',403);
 }
 async candidates(access:CatalogAdminAccess,key:unknown,input:unknown){
  await this.human(access);const moduleId=id(key),query=parseInput(ProjectMethodCandidateQuerySchema,input);
  return this.db.client.$transaction(async tx=>{
   const module=await this.current(tx,access,moduleId),definition=ProductionPlanModuleSchema.parse(module.definition);
   if(!definition.methodPurposes.includes(query.purpose))throw new ApiException('VALIDATION_ERROR','用途不属于当前模块',400);
   const where:Prisma.StyleSkillVersionWhereInput={scope:access.scope,
    manifest:{path:['purposes'],array_contains:[query.purpose]},
    ...(query.status?{status:query.status.toUpperCase() as never}:{}),
    skill:{domain:definition.domain,scope:access.scope,AND:[{OR:[{projectMemberships:{none:{}}},{projectMemberships:{some:{productId:module.productId,scope:access.scope}}}]}],
     ...(query.q?{OR:[{name:{contains:query.q,mode:'insensitive'}},{slug:{contains:query.q,mode:'insensitive'}}]}:{})}};
   const rows=await tx.styleSkillVersion.findMany({where,include:{skill:true,attachments:{include:{file:true}}},
    orderBy:[{skill:{name:'asc'}},{number:'desc'},{id:'desc'}],skip:(query.page-1)*query.pageSize,take:query.pageSize});
   const owned=await tx.machineProjectSkill.findMany({where:{skillId:{in:rows.map(r=>r.skillId)}}});
   return ProjectMethodCandidatePageSchema.parse({items:rows.map(row=>{const version=fixedVersion(row),manifest=version.manifest;
    const reason=row.status==='ARCHIVED'?'已归档版本不能用于新固定':!manifest.supportedForms.includes(definition.target.form as never)?'方法形式与本模块不兼容':
     row.attachments.some(a=>a.file.status!=='AVAILABLE')?'参考附件尚未就绪':null;
    return {skillId:row.skillId,versionId:row.id,revision:row.revision,status:row.status.toLowerCase(),
     origin:owned.some(o=>o.skillId===row.skillId)?'project':'shared',compatible:!reason,unavailableReason:reason,version};}),
    total:await tx.styleSkillVersion.count({where}),page:query.page,pageSize:query.pageSize});
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
 }
 async capture(access:CatalogAdminAccess,key:unknown,input:unknown){
  await this.human(access);const moduleId=id(key),body=parseInput(ProjectMethodCaptureSchema,input);
  return this.mutations.run(access,'project.method:'+moduleId,body.requestId,body,async tx=>{
   const module=await this.current(tx,access,moduleId,true),source=await tx.styleSkillVersion.findFirst({where:{id:body.sourceVersionId,scope:access.scope}});
   if(!source)throw new ApiException('NOT_FOUND','基础版本不存在于当前范围',404);
   await this.sourceOwnership(tx,module,source.skillId);
   return this.production.captureIn(tx,access,moduleId,body);
  });
 }
 private async dependency(tx:Prisma.TransactionClient,module:Module,dependencyId:string){
  const definition=ProductionPlanModuleSchema.parse(module.definition),source=await tx.productionPlanModule.findFirst({where:{
   id:dependencyId,planRevisionId:module.planRevisionId,scope:module.scope},include:moduleInclude});
  if(!source||!definition.dependsOn.includes(source.identity.moduleKey))throw new ApiException('NOT_FOUND','输入模块不属于当前计划的直接依赖',404);
  return source;
 }
 private choices(row:ContentRevision,recordId:string,recordDigest:string,domain:string):Choice[]{
  let locators:ContentLocator[]=[];
  if(row.domain==='assessment')locators=ProductConfigurationSchema.parse((row.snapshot as Record<string,unknown>).configuration).questions.map(q=>({kind:'question',questionId:q.id}));
  else{const content=snapshotAuthoring(row.snapshot)?.content;
   locators=content?.kind==='copy'?content.blocks.map(b=>({kind:'block',blockId:b.blockId})):
    content?.kind==='video'||content?.kind==='script'?content.scenes.map(s=>({kind:'scene',sceneId:s.sceneId})):[{kind:'whole'}];}
  return locators.map(locator=>{const content=contentFragment(row,locator,domain);
   const label=String(content.text??content.title??content.description??content.id??locatorKey(locator)).slice(0,500);
   return {recordId,recordDigest,revisionId:row.id,digest:row.digest,locator,label,content};});
 }
 async inputOptions(access:CatalogAdminAccess,key:unknown,input:unknown){
  await this.human(access);const moduleId=id(key),query=parseInput(ProjectHandoffOptionsQuerySchema,input);
  return this.db.client.$transaction(async tx=>{
   const module=await this.current(tx,access,moduleId),dependency=await this.dependency(tx,module,query.dependencyId),definition=ProductionPlanModuleSchema.parse(module.definition);
   const where={planModuleId:dependency.id,scope:access.scope};
   const rows=await tx.projectProductionRecord.findMany({where,orderBy:[{number:'desc'},{id:'desc'}],skip:(query.recordPage-1)*10,take:10});
   const dto=(r:typeof rows[number])=>({id:r.id,digest:r.digest,planModuleId:r.planModuleId,title:ProductionPlanModuleSchema.parse(dependency.definition).title,revision:r.number,createdAt:r.createdAt.toISOString()});
   const selected=query.recordId?await tx.projectProductionRecord.findFirst({where:{...where,id:query.recordId},include:{outputs:true}}):null;
   if(query.recordId&&!selected)throw new ApiException('NOT_FOUND','输入记录不属于所选依赖',404);
   const choices:Choice[]=[];
   if(selected){const revisions=await tx.contentRevision.findMany({where:{id:{in:selected.outputs.flatMap(o=>o.contentRevisionId?[o.contentRevisionId]:[])},productId:module.productId,scope:access.scope},orderBy:{id:'asc'}});
    for(const revision of revisions)choices.push(...this.choices(revision,selected.id,selected.digest,definition.domain));}
   return ProjectHandoffOptionsSchema.parse({records:{items:rows.map(dto),total:await tx.projectProductionRecord.count({where}),page:query.recordPage,pageSize:10},
    selectedRecord:selected?dto(selected):null,fileOnly:!!selected&&selected.outputs.length>0&&selected.outputs.every(o=>!o.contentRevisionId),
    fragments:{items:choices.slice((query.page-1)*query.pageSize,query.page*query.pageSize),total:choices.length,page:query.page,pageSize:query.pageSize}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
 }
 async preview(access:CatalogAdminAccess,key:unknown,input:unknown){
  await this.human(access);const moduleId=id(key),selection=parseInput(ProjectHandoffSelectionSchema,input);
  return this.db.client.$transaction(tx=>this.previewIn(tx,access,moduleId,selection),{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:30000});
 }
 async fixedPreviewIn(tx:Prisma.TransactionClient,access:CatalogAdminAccess,moduleId:string,body:Selection){
  return this.previewIn(tx,access,moduleId,body,true);
 }
 private async previewIn(tx:Prisma.TransactionClient,access:CatalogAdminAccess,moduleId:string,body:Selection,fixedHistory=false):Promise<Preview>{
  await this.human(access,tx);
  const module=fixedHistory?await tx.productionPlanModule.findFirst({where:{id:moduleId,scope:access.scope},include:moduleInclude}):await this.current(tx,access,moduleId,true);
  if(!module)throw new ApiException('NOT_FOUND','固定计划模块不存在于当前范围',404);
  const definition=ProductionPlanModuleSchema.parse(module.definition),issues:Preview['issues']=[];
  const issue=(code:string,message:string)=>{issues.push({code,message:message.slice(0,500)});};
  const failure=(e:unknown)=>{if(e instanceof ApiException)issue(e.code,e.publicMessage);else throw e;};
  if(module.digest!==body.expectedModuleDigest)throw new ApiException('REVISION_CONFLICT','模块摘要已变化，请重新读取',409);
  let methods:Awaited<ReturnType<ProjectProductionService['selectedMethodsIn']>>['methods']=[];
  try{methods=(await this.production.selectedMethodsIn(tx,access,module.id,module.digest,body.methods)).methods;
   if(!fixedHistory&&(methods.length!==definition.methodPurposes.length||new Set(methods.map(m=>m.purpose)).size!==methods.length))
    issue('METHOD_SELECTION','每个专业用途必须明确选择一份固定方法');
  }catch(e){failure(e);}
  const records:Awaited<ReturnType<ProjectProductionService['verifyRecordIn']>>[]=[];
  if(new Set(body.records.map(r=>r.recordId)).size!==body.records.length)issue('DUPLICATE_INPUT','输入记录不能重复');
  for(const selection of body.records){try{
   const record=await this.production.verifyRecordIn(tx,access,selection.recordId);
   const dependency=await this.dependency(tx,module,record.planModuleId),sourceDefinition=ProductionPlanModuleSchema.parse(dependency.definition);
   if(record.digest!==selection.digest)throw new ApiException('REVISION_CONFLICT','输入记录摘要不符',409);
   if(records.some(r=>r.planModuleId===record.planModuleId))throw new ApiException('CONFLICT','每个依赖只选择一份精确制作记录',409);
   for(const slot of sourceDefinition.outputs.filter(o=>o.required)){
    const outputs=record.outputs.filter(o=>o.outputKey===slot.outputKey&&o.purpose==='original');
    const complete=slot.original.representation==='structured'?outputs.some(o=>o.contentRevisionId):
     slot.files.filter(f=>f.required&&f.purpose==='original').every(f=>outputs.some(o=>o.fileKey===f.fileKey&&(o.fileId||o.originalFileId)));
    if(!complete)throw new ApiException('CONFLICT','上游“'+sourceDefinition.title+'”缺少必需原件或结构化内容',409);
   }
   records.push(record);
  }catch(e){failure(e);}}
  for(const key of definition.dependsOn){const dependency=await tx.productionPlanModule.findFirst({where:{planRevisionId:module.planRevisionId,identity:{moduleKey:key}}});
   if(!records.some(r=>r.planModuleId===dependency?.id))issue('MISSING_DEPENDENCY','尚未选择并核验依赖：'+key);}
  const fragments:Choice[]=[];
  if(new Set(body.inputs.map(i=>i.revisionId+':'+locatorKey(i.locator))).size!==body.inputs.length)issue('DUPLICATE_FRAGMENT','输入片段不能重复');
  for(const input of body.inputs){try{
   const record=records.find(r=>r.outputs.some(o=>o.contentRevisionId===input.revisionId));
   if(!record)throw new ApiException('FORBIDDEN','片段不属于明确选中的依赖记录',403);
   const row=await tx.contentRevision.findFirst({where:{id:input.revisionId,productId:module.productId,scope:access.scope}});
   if(!row||row.digest!==input.digest||row.creativeProfileRevisionId!==module.plan.creativeProfileRevisionId)
    throw new ApiException('REVISION_CONFLICT','输入片段摘要或共同设定不符',409);
   const content=contentFragment(row,input.locator,definition.domain);
   fragments.push({...input,recordId:record.id,recordDigest:record.digest,label:String(content.text??content.title??locatorKey(input.locator)).slice(0,500),content});
  }catch(e){failure(e);}}
  for(const record of records)if(record.outputs.some(o=>o.contentRevisionId)&&!fragments.some(f=>record.outputs.some(o=>o.contentRevisionId===f.revisionId)))
   issue('MISSING_FRAGMENT','请明确选择依赖记录 r'+record.revision+' 的最小内容片段');
  const connection=body.connectionId?await tx.codexConnection.findFirst({where:{id:body.connectionId,ownerUserId:access.actorUserId,scope:access.scope},include:{credentials:true,workspace:true}}):null;
  const credential=connection?.credentials.find(c=>c.domain===definition.domain);
  const validConnection=()=>!!connection&&!!credential&&!connection.revokedAt&&connection.expiresAt>new Date()&&!connection.workspace.revokedAt&&connection.workspace.expiresAt>new Date()&&!credential.revokedAt&&credential.expiresAt>new Date();
  if(!validConnection())issue('CONNECTION_UNAVAILABLE','请选择当前管理员名下有效的本领域连接');
  else try{
   await requireMachineTarget(credential!,{permission:'projects:read',extraPermissions:['skills:read','context:read','content:read','content:write'],target:{type:'project',planModuleId:module.id}},tx);
   for(const method of methods)await requireMachineTarget(credential!,{permission:'projects:read',extraPermissions:['skills:read'],target:{type:'project',snapshotId:method.id}},tx);
   await requireMachineTarget(credential!,{permission:'context:read',target:{type:'content',productId:module.productId,
    ...(definition.domain==='experience'?{}:{profileId:module.plan.creativeProfileRevisionId}),inputs:body.inputs}},tx);
  }catch(e){failure(e);}
  await this.human(access,tx);
  if(connection&&!validConnection()&&!issues.some(i=>i.code==='CONNECTION_UNAVAILABLE'))issue('CONNECTION_UNAVAILABLE','连接在核对期间已失效，请重新选择');
  if(issues.length)return (fixedHistory?ProjectRecoveryFixedPreviewSchema:ProjectHandoffPreviewSchema).parse({checkedAt:new Date().toISOString(),ready:false,digest:null,issues:issues.slice(0,100),manifest:null});
  const profile=await tx.creativeProfileRevision.findUniqueOrThrow({where:{id:module.plan.creativeProfileRevisionId}}),product=await tx.product.findUniqueOrThrow({where:{id:module.productId},select:{name:true}});
  const manifest=(fixedHistory?ProjectRecoveryFixedManifestSchema:ProjectHandoffManifestSchema).parse({schemaVersion:1,kind:'project_method_handoff',productId:module.productId,productName:product.name,planRevisionId:module.planRevisionId,planDigest:module.plan.digest,
   creativeProfile:profileDto(profile),module:{id:module.id,moduleId:module.moduleId,moduleKey:module.identity.moduleKey,digest:module.digest,title:definition.title,domain:definition.domain,target:definition.target,
    outputs:definition.outputs.map(o=>({outputKey:o.outputKey,label:o.label,kind:o.kind,required:o.required,files:o.files.map(({sourceUrl:_,...file})=>file)}))},
   connection:{id:connection!.id,workspaceId:connection!.workspaceId,domain:definition.domain,expiresAt:credential!.expiresAt.toISOString()},
   methods:methods.map(({machineCredentialId:_,machineRequestId:__,version,...method})=>({...method,version:{...version,files:version.files.map(({path,file:{downloadPath:_,...file}})=>({path,file}))}})),
   records:records.map(r=>({recordId:r.id,digest:r.digest,planModuleId:r.planModuleId})),inputs:fragments,
   originals:records.flatMap(r=>r.outputs.filter(o=>o.file&&o.purpose==='original').map(({file,...output})=>{const {downloadPath:_,...metadata}=file!;return {...output,file:metadata};})),
   instructions:['按固定计划和共同设定制作，只使用明确选中的方法与输入。','使用 project_method_get 读取精确 snapshotId；文本附件用 project_method_reference_get。',
    '使用 project_context_get 读取明确 revisionId/digest/locator；不读取完整计分或消费者资料。',
    '平台原件已按当前字节核验；二进制输入需管理员按授权取回后提供给客户端，本清单不包含公开下载地址。',
    '使用 project_draft_save 和 project_production_save 保存本领域草稿及准确来源，回到后台人工审核。',
    '本说明没有启动制作、创建运行或启用日程；实际工具调用仍须重新核验权限。'],
   executionStarted:false,credentialIncluded:false,canReview:false,canPublish:false});
  return (fixedHistory?ProjectRecoveryFixedPreviewSchema:ProjectHandoffPreviewSchema).parse({checkedAt:new Date().toISOString(),ready:true,digest:contentDigest(manifest),issues:[],manifest});
 }
 async export(access:CatalogAdminAccess,key:unknown,input:unknown){
  const body=parseInput(ProjectHandoffExportSchema,input),preview=await this.preview(access,key,body.selection);
  if(!preview.ready||!preview.manifest)throw new ApiException('CONFLICT','交接条件已变化：'+preview.issues.map(i=>i.message).join('；').slice(0,350),409);
  if(preview.digest!==body.expectedDigest)throw new ApiException('REVISION_CONFLICT','交接摘要已变化，请重新核对',409);
  return ProjectHandoffExportedSchema.parse({digest:preview.digest,manifest:preview.manifest});
 }
}
