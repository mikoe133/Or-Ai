import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { IdSchema } from '@orai/contracts';
import { ProjectOriginalPrepareSchema, ProjectOriginalFileSchema, ProductionPlanModuleSchema, AdminDeliveryActionSchema } from '@orai/contracts/admin';
import { DatabaseService } from '../database/database.service';
import type { CatalogAdminAccess } from '../catalog/admin-access.service';
import { Prisma, type ProjectOriginalFile } from '../generated/prisma/client';
import { APP_CONFIG, type AppConfiguration } from '../config/configuration';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AdminMutationService } from './admin-mutation.service';
import { AssetStorage, persistentAssetStorageConfigured } from './asset-storage';
import { storedFileContent } from './files.service';

export function originalFileDto(row: ProjectOriginalFile) {
  return ProjectOriginalFileSchema.parse({ id:row.id,productId:row.productId,scope:row.scope.toLowerCase(),
    target:{type:'project_original',planModuleId:row.planModuleId,outputKey:row.outputKey,fileKey:row.fileKey},
    fileName:row.originalName,mimeType:row.mimeType,byteSize:row.byteSize,checksum:row.checksum,status:row.status.toLowerCase(),
    expiresAt:row.expiresAt.toISOString(),verifiedAt:row.verifiedAt?.toISOString()??null,storage:'platform',execution:'not_executed' });
}
@Injectable()
export class ProjectOriginalFilesService {
  constructor(private readonly db:DatabaseService,private readonly mutations:AdminMutationService,
    private readonly storage:AssetStorage,@Inject(APP_CONFIG) private readonly config:AppConfiguration) {}
  async prepare(access:CatalogAdminAccess,input:unknown) {
    const body=parseInput(ProjectOriginalPrepareSchema,input), {target}=body;
    if(!persistentAssetStorageConfigured(this.config))throw new ApiException('SERVICE_UNAVAILABLE','原件持久化存储尚未配置',503);
    const extensions:Record<string,string[]>={'application/zip':['zip'],'text/html':['html','htm'],'model/gltf-binary':['glb']};
    if(!extensions[body.mimeType]!.includes(body.fileName.split('.').at(-1)!.toLowerCase())||body.mimeType==='text/html'&&body.byteSize>2*1024*1024)
      throw new ApiException('VALIDATION_ERROR','原件的扩展名、类型或大小不符合要求',400);
    const result=await this.mutations.run(access,'project.original.prepare',body.requestId,body,async tx=>{
      await this.mutations.administrators.requireOriginalTarget(access,target,tx);
      const module=await tx.productionPlanModule.findFirst({where:{id:target.planModuleId,scope:access.scope}});
      if(!module)throw new ApiException('NOT_FOUND','原件目标模块不存在',404);
      const definition=ProductionPlanModuleSchema.parse(module.definition),slot=definition.outputs.find(o=>o.outputKey===target.outputKey),
        file=slot?.files.find(f=>f.fileKey===target.fileKey&&f.purpose==='original');
      if(!slot||!['web_bundle','scene_bundle'].includes(slot.kind)||!file||!file.mimeTypes.includes(body.mimeType))
        throw new ApiException('VALIDATION_ERROR','原件必须匹配固定模块声明的文件槽位',400);
      await tx.$queryRaw(Prisma.sql`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'project-originals:'+access.actorUserId},0))`);
      if(await tx.projectOriginalFile.count({where:{ownerUserId:access.actorUserId,scope:access.scope,status:{in:['PENDING','VERIFYING','UPLOADED']},expiresAt:{gt:new Date()}}})>=20)
        throw new ApiException('CONFLICT','待完成的原件上传过多',409);
      const id=randomUUID(),createdAt=new Date();
      await tx.projectOriginalFile.create({data:{id,productId:module.productId,scope:access.scope,planModuleId:module.id,
        outputKey:target.outputKey,fileKey:target.fileKey,ownerUserId:access.actorUserId,originalName:body.fileName,mimeType:body.mimeType,
        byteSize:body.byteSize,checksum:body.checksum,storageKey:id+'.blob',createdAt,expiresAt:new Date(createdAt.getTime()+3600_000)}});
      return {response:{id},entityKind:'project_original',entityId:id};
    });
    return this.status(access,result.id);
  }
  private async owned(access:CatalogAdminAccess,key:unknown,tx:Prisma.TransactionClient=this.db.client) {
    await this.mutations.administrators.require(access,tx);
    const row=await tx.projectOriginalFile.findFirst({where:{id:parseInput(IdSchema,key).toLowerCase(),scope:access.scope,ownerUserId:access.actorUserId}});
    if(!row)throw new ApiException('NOT_FOUND','原件上传不存在于当前范围',404);
    await this.mutations.administrators.requireOriginalTarget(access,row,tx);return row;
  }
  private usable(row:ProjectOriginalFile) {
    if(row.status!=='AVAILABLE'&&row.expiresAt<=new Date())throw new ApiException('ENTITLEMENT_EXPIRED','原件上传已到期',410);
    if(['FAILED','EXPIRED','DELETING','DELETED'].includes(row.status))throw new ApiException('CONFLICT','原件导入未完成，请重新申请',409);
  }
  async status(access:CatalogAdminAccess,key:unknown) {
    const row=await this.owned(access,key);
    if(row.status!=='AVAILABLE'&&row.expiresAt<=new Date()&&!['FAILED','EXPIRED','DELETING','DELETED'].includes(row.status)){
      await this.db.client.projectOriginalFile.updateMany({where:{id:row.id,status:row.status},data:{status:'EXPIRED'}});
      return originalFileDto(await this.owned(access,row.id));
    }return originalFileDto(row);
  }
  async upload(access:CatalogAdminAccess,key:unknown,request:Request) {
    const row=await this.db.client.$transaction(async tx=>{
      const row=await this.owned(access,key,tx);
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.project_original_files WHERE id=${row.id}::uuid FOR UPDATE`);
      const fresh=await this.owned(access,row.id,tx);this.usable(fresh);
      if(fresh.status!=='PENDING')throw new ApiException('CONFLICT','原件上传已开始，请查询状态',409);
      return tx.projectOriginalFile.update({where:{id:row.id},data:{status:'VERIFYING'}});
    });
    const deadline=setTimeout(()=>request.destroy(new Error('Upload deadline exceeded')),120_000);
    try{
      await this.storage.receiveOriginal(row.storageKey,request,{byteSize:row.byteSize,mimeType:row.mimeType,checksum:row.checksum});
      await this.db.client.$transaction(async tx=>{
        await this.mutations.administrators.requireOriginalTarget(access,row,tx);
        const changed=await tx.projectOriginalFile.updateMany({where:{id:row.id,status:'VERIFYING',expiresAt:{gt:new Date()}},data:{status:'UPLOADED'}});
        if(changed.count!==1)throw new ApiException('CONFLICT','原件上传状态已变化',409);
      });return this.status(access,row.id);
    }catch(error){await this.storage.remove(row.storageKey).catch(()=>undefined);
      await this.db.client.projectOriginalFile.updateMany({where:{id:row.id,status:{in:['VERIFYING','UPLOADED']}},data:{status:'FAILED'}});throw error;
    }finally{clearTimeout(deadline);}
  }
  async complete(access:CatalogAdminAccess,key:unknown,input:unknown) {
    const body=parseInput(AdminDeliveryActionSchema,input),row=await this.owned(access,key);this.usable(row);
    if(row.status==='AVAILABLE')return originalFileDto(row);
    if(row.status!=='UPLOADED')throw new ApiException('CONFLICT','原件尚未上传完成',409);
    try{
      const actual=await this.storage.inspectOriginal(row.storageKey,row.byteSize,row.mimeType);
      if(actual.byteSize!==row.byteSize||actual.checksum!==row.checksum)throw new ApiException('VALIDATION_ERROR','原件字节与摘要不符',400);
    }catch(error){
      if(error instanceof ApiException&&error.getStatus()===400){
        const rejected=await this.db.client.$transaction(async tx=>{await this.mutations.administrators.requireOriginalTarget(access,row,tx);
          return tx.projectOriginalFile.updateMany({where:{id:row.id,status:'UPLOADED'},data:{status:'FAILED'}});});
        if(rejected.count)await this.storage.remove(row.storageKey).catch(()=>undefined);
      }throw error;
    }
    await this.mutations.run(access,'project.original.complete:'+row.id,body.requestId,{},async tx=>{
      await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.project_original_files WHERE id=${row.id}::uuid FOR UPDATE`);
      const fresh=await this.owned(access,row.id,tx);this.usable(fresh);
      if(fresh.status!=='AVAILABLE'){
        if(fresh.status!=='UPLOADED')throw new ApiException('CONFLICT','原件上传状态不能完成',409);
        await tx.projectOriginalFile.update({where:{id:row.id},data:{status:'AVAILABLE',verifiedAt:new Date()}});
      }return {response:{id:row.id},entityKind:'project_original',entityId:row.id};
    });return this.status(access,row.id);
  }
  async verifiedIn(tx:Prisma.TransactionClient,access:CatalogAdminAccess,key:string,moduleId:string) {
    await this.mutations.administrators.require(access,tx);
    const row=await tx.projectOriginalFile.findFirst({where:{id:key,planModuleId:moduleId,scope:access.scope,status:'AVAILABLE'}});
    if(!row||!row.verifiedAt)throw new ApiException('NOT_FOUND','该模块原件尚未验证就绪',404);
    const module=await tx.productionPlanModule.findUniqueOrThrow({where:{id:moduleId}});
    await this.mutations.administrators.requireProjectRow(access,['content:write','projects:read'],{productId:row.productId,planRevisionId:module.planRevisionId,planModuleId:moduleId},tx);
    const actual=await this.storage.inspectOriginal(row.storageKey,row.byteSize,row.mimeType);
    if(actual.checksum!==row.checksum||actual.byteSize!==row.byteSize)throw new ApiException('VALIDATION_ERROR','固定原件字节已损坏',400);
    return row;
  }
  async content(access:CatalogAdminAccess,key:unknown,range?:string) {
    await this.mutations.administrators.require(access);if(access.machineCredentialId)throw new ApiException('FORBIDDEN','原件下载需要管理员授权',403);
    const row=await this.db.client.projectOriginalFile.findFirst({where:{id:parseInput(IdSchema,key).toLowerCase(),scope:access.scope,status:'AVAILABLE'}});
    if(!row)throw new ApiException('NOT_FOUND','原件尚未就绪',404);
    const checked=await this.verifiedIn(this.db.client,access,row.id,row.planModuleId);
    await this.mutations.administrators.require(access);return storedFileContent(this.storage,checked,range);
  }
}
