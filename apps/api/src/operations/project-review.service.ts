import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { IdSchema } from '@orai/contracts';
import { AdminPageQuerySchema, ProjectReviewSelectionSchema, ProjectReviewSaveSchema, ProjectReviewActionSchema,
  ProjectReviewReturnSchema, ProjectReviewManifestSchema, ProjectReviewRevisionSchema, ProjectReviewPreviewSchema,
  ProjectReviewPageSchema } from '@orai/contracts/admin';
import type { CatalogAdminAccess } from '../catalog/admin-access.service';
import { Prisma, type ProjectReviewRevision } from '../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { parseInput } from '../common/parse-input';
import { ApiException } from '../common/http-errors';
import { AdminMutationService } from './admin-mutation.service';
import { ProductionPlansService } from './production-plans.service';
import { ProjectProductionService } from './project-production.service';
import { ProjectOriginalFilesService } from './project-original-files.service';
import { AssetStorage } from './asset-storage';
import { FilesService } from './files.service';
import { contentDigest, profileDto, revisionDto } from './content-projections';
import { experienceRevisionDto } from './experience-authoring.service';
import { contentLock } from './content-workflow.service';
import { inspectProductionPlan } from './production-plan-inspection';

const id=(value:unknown)=>parseInput(IdSchema,value).toLowerCase();
type Selection=z.infer<typeof ProjectReviewSelectionSchema>;
type Preview=z.infer<typeof ProjectReviewPreviewSchema>;
type Manifest=z.infer<typeof ProjectReviewManifestSchema>;
type Issue=Preview['issues'][number];
export function projectReviewDto(row:ProjectReviewRevision) {
  return ProjectReviewRevisionSchema.parse({ id:row.id,productId:row.productId,scope:row.scope.toLowerCase(),revision:row.number,
    previousRevisionId:row.previousRevisionId,status:row.status,selection:row.selection,fingerprint:row.fingerprint,
    frontierFingerprint:row.frontierFingerprint,manifest:row.manifest,issues:row.issues,returns:row.returns,note:row.note,
    createdAt:row.createdAt.toISOString(),archiveReady:row.status==='retained' });
}
const dto=projectReviewDto;
@Injectable()
export class ProjectReviewService {
  constructor(private readonly db:DatabaseService,private readonly mutations:AdminMutationService,
    private readonly plans:ProductionPlansService,private readonly production:ProjectProductionService,
    private readonly originals:ProjectOriginalFilesService,private readonly storage:AssetStorage,private readonly files:FilesService) {}
  private async human(access:CatalogAdminAccess,tx?:Prisma.TransactionClient) {
    await this.mutations.administrators.require(access,tx);
    if(access.machineCredentialId)throw new ApiException('FORBIDDEN','整套项目审核与留存由管理员执行',403);
  }
  private async latest(tx:Prisma.TransactionClient,access:CatalogAdminAccess,productId:string) {
    return tx.projectReviewRevision.findFirst({where:{productId,scope:access.scope},orderBy:{number:'desc'}});
  }
  private async lock(tx:Prisma.TransactionClient,access:CatalogAdminAccess,productId:string,planId:string) {
    await this.human(access,tx);
    await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'project-review:'+productId},0))`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${productId}::uuid AND scope=${access.scope}::orai."DataScope" FOR UPDATE`);
    await contentLock(tx,access,productId);
    const modules=await tx.productionPlanModule.findMany({where:{planRevisionId:planId,productId,scope:access.scope},orderBy:{id:'asc'},select:{id:true}});
    for(const module of modules)await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'project-production:'+module.id},0))`);
  }
  private async build(tx:Prisma.TransactionClient,access:CatalogAdminAccess,productId:string,selection:Selection,verifyBytes:boolean):Promise<Preview> {
    await this.human(access,tx);
    const plan=await this.plans.read(access,selection.planRevisionId);
    if(plan.productId!==productId)throw new ApiException('FORBIDDEN','计划不属于该项目',403);
    const profile=await tx.creativeProfileRevision.findFirstOrThrow({where:{id:plan.creativeProfileRevisionId,productId,scope:access.scope}});
    const records:Manifest['records']=[],methods=new Map<string,Manifest['methods'][number]>(),content=new Map<string,Manifest['content'][number]>(),
      experiences=new Map<string,Manifest['experiences'][number]>(),resources=new Map<string,Manifest['resources'][number]>(),issues:Issue[]=[];
    const issue=(code:string,message:string,planModuleId:string|null=null,outputKey:string|null=null)=>issues.push({code,message,planModuleId,outputKey});
    for(const selected of [...selection.records].sort((a,b)=>a.recordId.localeCompare(b.recordId))) {
      const record=await this.production.readRecordIn(tx,access,selected.recordId);
      if(record.productId!==productId||record.planRevisionId!==plan.id||record.digest!==selected.digest)
        throw new ApiException('CONFLICT','选择的制作记录不属于固定计划或摘要不符',409);
      if(records.some(r=>r.planModuleId===record.planModuleId))throw new ApiException('VALIDATION_ERROR','一个模块只能选择一份固定制作记录',400);
      records.push(record);
      if(verifyBytes)try{await this.production.verifyRecordIn(tx,access,record.id);}catch(error){
        if(!(error instanceof ApiException)||![400,404,409].includes(error.getStatus()))throw error;
        issue('INVALID_RETAINED_BYTES','产物原件或方法附件未通过实际字节校验。',record.planModuleId);
      }
      for(const method of record.methods)if(!methods.has(method.snapshotId))methods.set(method.snapshotId,await this.production.readMethodIn(tx,access,method.snapshotId));
      for(const output of record.outputs) {
        if(output.contentRevisionId&&!content.has(output.contentRevisionId)) {
          const row=await tx.contentRevision.findFirstOrThrow({where:{id:output.contentRevisionId,productId,scope:access.scope},include:{file:true,previewFile:true}});
          content.set(row.id,revisionDto(row));
        }
        if(output.experienceRevisionId&&!experiences.has(output.experienceRevisionId)) {
          const row=await tx.experienceAuthoringRevision.findFirstOrThrow({where:{id:output.experienceRevisionId,productId,scope:access.scope}});
          experiences.set(row.id,experienceRevisionDto(row));
          const references=await tx.experienceAuthoringResource.findMany({where:{revisionId:row.id},include:{file:true},orderBy:{fileId:'asc'}});
          for(const ref of references) {
            const file=ref.file;
            resources.set(file.id,{id:file.id,fileName:file.originalName,mimeType:file.mimeType,byteSize:file.byteSize,checksum:file.checksum});
            if(file.status!=='AVAILABLE')issue('MISSING_EXPERIENCE_RESOURCE','体验资源尚未验证就绪。',record.planModuleId,output.outputKey);
            else if(verifyBytes)try{
              const actual=await this.storage.inspect(file.storageKey,file.byteSize);
              if(actual.checksum!==file.checksum||actual.byteSize!==file.byteSize||actual.mimeType!==file.mimeType)throw new ApiException('VALIDATION_ERROR','体验资源摘要不符',400);
            }catch(error){if(!(error instanceof ApiException))throw error;issue('INVALID_EXPERIENCE_RESOURCE','体验资源未通过实际字节校验。',record.planModuleId,output.outputKey);}
          }
        }
      }
    }
    if(!records.length)issue('MISSING_OUTPUTS','尚无真实制作产物，不能作为整套留存。');
    records.sort((a,b)=>a.planModuleId.localeCompare(b.planModuleId));
    const inspection=inspectProductionPlan(plan.plan);
    for(const module of plan.modules) {
      const record=records.find(r=>r.planModuleId===module.id);
      if(!record){if(module.definition.required)issue('MISSING_MODULE','必需模块尚未选择制作记录。',module.id);continue;}
      for(const slot of module.definition.outputs.filter(o=>o.required)) {
        const outputs=record.outputs.filter(o=>o.outputKey===slot.outputKey);
        if(slot.original.representation==='structured') {
          if(!outputs.some(o=>o.contentRevisionId))issue('MISSING_STRUCTURED_ORIGINAL','必需的题库、报告或文案原稿未保存。',module.id,slot.outputKey);
        }else for(const file of slot.files.filter(f=>f.required&&f.purpose==='original')) {
          if(!outputs.some(o=>o.fileKey===file.fileKey&&o.purpose==='original'&&!!(o.fileId||o.originalFileId)))
            issue('MISSING_ORIGINAL','必需原文件未保存；预览、外部地址和体验制作稿不能替代原件。',module.id,slot.outputKey);
        }
      }
      if(module.definition.domain==='experience'&&inspection.modules.find(m=>m.moduleKey===module.moduleKey)?.template==='registered_pair'&&
        !record.outputs.some(o=>o.experienceRevisionId))issue('MISSING_AUTHORING','已支持的原生体验还需固定独立制作修订和资源。',module.id);
      for(const dependencyKey of module.definition.dependsOn) {
        const dependency=plan.modules.find(m=>m.moduleKey===dependencyKey)!,chosen=records.find(r=>r.planModuleId===dependency.id);
        if(!chosen||!record.inputs.some(input=>input.planModuleId===dependency.id&&input.recordId===chosen.id&&input.digest===chosen.digest))
          issue('MISSING_DEPENDENCY','制作输入没有固定本次选择的依赖模块记录及摘要。',module.id);
      }
    }
    const ordered=<T extends {id:string}>(values:Iterable<T>)=>[...values].sort((a,b)=>a.id.localeCompare(b.id));
    const manifest=ProjectReviewManifestSchema.parse({schemaVersion:1,kind:'project_retention',plan,creativeProfile:profileDto(profile),records,
      methods:ordered(methods.values()),content:ordered(content.values()),experiences:ordered(experiences.values()),resources:ordered(resources.values()),
      runtimeValidation:'not_performed',publicationEffect:'none',activationEffect:'none'});
    const latestPlan=await tx.productionPlanRevision.findFirst({where:{productId,scope:access.scope},orderBy:{number:'desc'},select:{id:true,number:true}});
    const productionHeads=await tx.projectProductionRecord.findMany({where:{planModuleId:{in:plan.modules.map(m=>m.id)},scope:access.scope},
      orderBy:[{planModuleId:'asc'},{number:'desc'}],distinct:['planModuleId'],select:{id:true,planModuleId:true,number:true,digest:true}});
    const versionIds=[...new Set([...manifest.content.map(c=>c.productVersionId),...manifest.experiences.map(e=>e.productVersionId)])];
    const versions=await tx.productVersion.findMany({where:{id:{in:versionIds},productId,scope:access.scope},orderBy:{id:'asc'},select:{id:true,revision:true,status:true}});
    const assets=await tx.campaignAsset.findMany({where:{id:{in:manifest.content.flatMap(c=>c.assetId?[c.assetId]:[])},scope:access.scope},
      orderBy:{id:'asc'},select:{id:true,revision:true,status:true}});
    const experienceHeads=await tx.experienceAuthoringRevision.findMany({where:{productVersionId:{in:versionIds},scope:access.scope},
      orderBy:[{productVersionId:'asc'},{number:'desc'}],distinct:['productVersionId'],select:{id:true,productVersionId:true,number:true,digest:true}});
    const product=await tx.product.findFirstOrThrow({where:{id:productId,scope:access.scope},select:{id:true,revision:true,status:true,currentVersionId:true}});
    return ProjectReviewPreviewSchema.parse({manifest,issues,fingerprint:contentDigest(manifest),
      frontierFingerprint:contentDigest({latestPlan,productionHeads,versions,assets,experienceHeads,product}),canSubmit:issues.length===0,
      latestRevision:(await this.latest(tx,access,productId))?.number??0});
  }
  async preview(access:CatalogAdminAccess,product:unknown,input:unknown) {
    await this.human(access);const productId=id(product),selection=parseInput(ProjectReviewSelectionSchema,input);
    // Hash bytes before taking the write locks. Commit recomputes the immutable
    // manifest and all mutable heads; a concurrent edit invalidates the scan.
    return this.db.client.$transaction(tx=>this.build(tx,access,productId,selection,true),{timeout:120_000});
  }
  private async append(tx:Prisma.TransactionClient,access:CatalogAdminAccess,productId:string,previous:ProjectReviewRevision|null,
    selection:Selection,preview:Preview,status:string,note:string,returns:z.infer<typeof ProjectReviewReturnSchema>['returns']=[]) {
    const row=await tx.projectReviewRevision.create({data:{productId,scope:access.scope,planRevisionId:selection.planRevisionId,
      number:(previous?.number??0)+1,previousRevisionId:previous?.id??null,status,selection,fingerprint:preview.fingerprint,
      frontierFingerprint:preview.frontierFingerprint,manifest:preview.manifest as Prisma.InputJsonValue,issues:preview.issues,returns,note,actorUserId:access.actorUserId}});
    for(const selected of selection.records)await tx.projectReviewRecord.create({data:{reviewId:row.id,productId,scope:access.scope,recordId:selected.recordId}});
    return {response:dto(row),entityKind:'project_review',entityId:row.id};
  }
  private sameScan(scanned:Preview,current:Preview) {
    if(scanned.fingerprint!==current.fingerprint||scanned.frontierFingerprint!==current.frontierFingerprint)
      throw new ApiException('REVISION_CONFLICT','扫描后项目已有新稿，请重新检查并选择固定版本',409);
  }
  async save(access:CatalogAdminAccess,product:unknown,input:unknown) {
    await this.human(access);const productId=id(product),body=parseInput(ProjectReviewSaveSchema,input),scanned=await this.preview(access,productId,body.selection);
    return this.mutations.run(access,'project.review.save:'+productId,body.requestId,body,async tx=>{
      await this.lock(tx,access,productId,body.selection.planRevisionId);const previous=await this.latest(tx,access,productId);
      if((previous?.number??0)!==body.expectedRevision)throw new ApiException('REVISION_CONFLICT','项目审核草稿已更新',409);
      this.sameScan(scanned,await this.build(tx,access,productId,body.selection,false));
      return this.append(tx,access,productId,previous,body.selection,scanned,'draft',body.note);
    });
  }
  async read(access:CatalogAdminAccess,key:unknown) {
    await this.human(access);const row=await this.db.client.projectReviewRevision.findFirst({where:{id:id(key),scope:access.scope}});
    if(!row)throw new ApiException('NOT_FOUND','项目审核修订不存在',404);return dto(row);
  }
  async list(access:CatalogAdminAccess,product:unknown,input:unknown) {
    await this.human(access);const productId=id(product),args=parseInput(AdminPageQuerySchema,input),where={productId,scope:access.scope};
    const rows=await this.db.client.projectReviewRevision.findMany({where,orderBy:{number:'desc'},skip:(args.page-1)*args.pageSize,take:args.pageSize});
    return ProjectReviewPageSchema.parse({items:rows.map(dto),total:await this.db.client.projectReviewRevision.count({where}),...args});
  }
  async transition(access:CatalogAdminAccess,key:unknown,action:'submit'|'return'|'retain',input:unknown) {
    await this.human(access);const revisionId=id(key),body=parseInput(action==='return'?ProjectReviewReturnSchema:ProjectReviewActionSchema,input),
      fixed=await this.read(access,revisionId),selection=fixed.selection,productId=fixed.productId;
    const scanned=action==='return'?null:await this.preview(access,productId,selection);
    return this.mutations.run(access,'project.review.'+action+':'+revisionId,body.requestId,body,async tx=>{
      await this.lock(tx,access,productId,selection.planRevisionId);const latest=await this.latest(tx,access,productId);
      if(action==='retain'&&latest?.status==='retained'&&latest.previousRevisionId===revisionId&&
        fixed.revision===body.expectedRevision&&fixed.fingerprint===body.expectedFingerprint&&fixed.frontierFingerprint===body.expectedFrontierFingerprint)
        return {response:dto(latest),entityKind:'project_review',entityId:latest.id};
      if(!latest||latest.id!==revisionId||latest.number!==body.expectedRevision||latest.fingerprint!==body.expectedFingerprint||
        latest.frontierFingerprint!==body.expectedFrontierFingerprint)throw new ApiException('REVISION_CONFLICT','审核选择或固定版本已变化',409);
      const allowed=action==='submit'?['draft','returned']:['submitted'];
      if(!allowed.includes(latest.status))throw new ApiException('CONFLICT','当前项目状态不允许此审核动作',409);
      if(action==='return'){
        const reasons=(body as z.infer<typeof ProjectReviewReturnSchema>).returns;
        if(reasons.some(r=>!fixed.manifest.plan.modules.some(m=>m.id===r.planModuleId)))throw new ApiException('VALIDATION_ERROR','退回模块必须属于固定计划',400);
        return this.append(tx,access,productId,latest,selection,{manifest:fixed.manifest,issues:fixed.issues,fingerprint:fixed.fingerprint,
          frontierFingerprint:fixed.frontierFingerprint,canSubmit:false,latestRevision:fixed.revision},'returned',body.note,reasons);
      }
      const current=await this.build(tx,access,productId,selection,false);this.sameScan(scanned!,current);
      if(scanned!.frontierFingerprint!==latest.frontierFingerprint||scanned!.fingerprint!==latest.fingerprint)
        throw new ApiException('REVISION_CONFLICT','提交后项目已有新稿，旧提交不能批准，请重新保存并提交',409);
      if(!scanned!.canSubmit)throw new ApiException('CONFLICT','必需产物、方法或原件尚未完整且通过校验',409);
      return this.append(tx,access,productId,latest,selection,scanned!,action==='submit'?'submitted':'retained',body.note);
    });
  }
  async file(access:CatalogAdminAccess,key:unknown,kind:'original'|'media'|'method',fileInput:unknown,range?:string) {
    const fixed=await this.read(access,key),fileId=id(fileInput),manifest=fixed.manifest;
    if(kind==='method'){
      const method=manifest.methods.find(m=>m.version.files.some(f=>f.file.id===fileId));
      if(!method)throw new ApiException('NOT_FOUND','方法附件不在该固定留存版本中',404);
      return this.production.methodFile(access,method.id,fileId,range);
    }
    if(kind==='original'){
      if(!manifest.records.some(r=>r.outputs.some(o=>o.originalFileId===fileId)))throw new ApiException('NOT_FOUND','原件不在该固定留存版本中',404);
      return this.originals.content(access,fileId,range);
    }
    const metadata=manifest.records.flatMap(r=>r.outputs).find(o=>o.fileId===fileId)?.file??manifest.resources.find(r=>r.id===fileId);
    if(!metadata)throw new ApiException('NOT_FOUND','媒体文件不在该固定留存版本中',404);
    const file=await this.db.client.assetFile.findFirst({where:{id:fileId,scope:access.scope,status:'AVAILABLE',productVersion:{productId:fixed.productId}}});
    if(!file||file.checksum!==metadata.checksum)throw new ApiException('CONFLICT','固定留存文件已不可用',409);
    const actual=await this.storage.inspect(file.storageKey,file.byteSize);
    if(actual.checksum!==metadata.checksum||actual.byteSize!==metadata.byteSize||actual.mimeType!==metadata.mimeType)
      throw new ApiException('VALIDATION_ERROR','固定留存媒体字节已损坏',400);
    await this.human(access);return this.files.storedContent(file,range);
  }
}
