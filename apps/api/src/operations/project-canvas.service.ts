import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { IdSchema } from '@orai/contracts';
import { ProjectCanvasLayoutDocumentSchema,ProjectCanvasLayoutSaveSchema,ProjectCanvasLayoutRevisionSchema,
  ProjectCanvasLayoutQuerySchema,ProjectCanvasStateSchema,ProductionPlanDocumentSchema } from '@orai/contracts/admin';
import type { CatalogAdminAccess } from '../catalog/admin-access.service';
import { DatabaseService } from '../database/database.service';
import { Prisma,type ProjectCanvasLayoutRevision } from '../generated/prisma/client';
import { ApiException } from '../common/http-errors';
import { parseInput } from '../common/parse-input';
import { AdminMutationService } from './admin-mutation.service';
import { contentDigest } from './content-projections';

const id=(value:unknown)=>parseInput(IdSchema,value).toLowerCase();
const projection=(row:ProjectCanvasLayoutRevision)=>ProjectCanvasLayoutRevisionSchema.parse({id:row.id,productId:row.productId,
  planRevisionId:row.planRevisionId,revision:row.number,layout:row.document,digest:row.digest,createdAt:row.createdAt.toISOString()});
type Layout=z.infer<typeof ProjectCanvasLayoutDocumentSchema>;

@Injectable()
export class ProjectCanvasService {
  constructor(private readonly db:DatabaseService,private readonly mutations:AdminMutationService){}
  private async human(access:CatalogAdminAccess,tx?:Prisma.TransactionClient){
    if(access.machineCredentialId)throw new ApiException('FORBIDDEN','画布布局仅供当前管理员维护',403);
    await this.mutations.administrators.require(access,tx);
  }
  private async plan(tx:Prisma.TransactionClient,access:CatalogAdminAccess,planId:string){
    await this.human(access,tx);
    const row=await tx.productionPlanRevision.findFirst({where:{id:planId,scope:access.scope}});
    if(!row)throw new ApiException('NOT_FOUND','计划不存在于当前管理范围',404);
    await this.mutations.administrators.requireProjectRow(access,['projects:read','projects:write'],{productId:row.productId,planRevisionId:row.id},tx);
    return row;
  }
  async read(access:CatalogAdminAccess,planInput:unknown,query:unknown={}){
    await this.human(access);const planId=id(planInput),args=parseInput(ProjectCanvasLayoutQuerySchema,query);
    return this.db.client.$transaction(async tx=>{
      const plan=await this.plan(tx,access,planId),latest=await tx.productionPlanRevision.findFirstOrThrow({where:{productId:plan.productId,scope:access.scope},orderBy:{number:'desc'},select:{id:true}}),
        layout=await tx.projectCanvasLayoutRevision.findFirst({where:{planRevisionId:plan.id,productId:plan.productId,scope:access.scope,
          ...(args.layoutRevisionId?{id:args.layoutRevisionId}:{})},orderBy:{number:'desc'}});
      if(args.layoutRevisionId&&!layout)throw new ApiException('NOT_FOUND','布局版本不属于该固定计划',404);
      return ProjectCanvasStateSchema.parse({planRevisionId:plan.id,latestPlanRevisionId:latest.id,editable:plan.id===latest.id&&!args.layoutRevisionId,layout:layout?projection(layout):null});
    },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
  }
  async save(access:CatalogAdminAccess,planInput:unknown,input:unknown){
    await this.human(access);const planId=id(planInput),body=parseInput(ProjectCanvasLayoutSaveSchema,input);
    return this.mutations.run(access,'project.canvas:'+planId,body.requestId,body,async tx=>({
      response:await this.appendIn(tx,access,planId,body),entityKind:'project_canvas_layout',entityId:planId,
    }));
  }
  async initialIn(tx:Prisma.TransactionClient,access:CatalogAdminAccess,planId:string,layout:Layout){
    const plan=await this.plan(tx,access,planId);
    return this.appendIn(tx,access,planId,{layout:parseInput(ProjectCanvasLayoutDocumentSchema,layout),expectedPlanDigest:plan.digest,expectedRevision:0});
  }
  private async appendIn(tx:Prisma.TransactionClient,access:CatalogAdminAccess,planId:string,
    body:Pick<z.infer<typeof ProjectCanvasLayoutSaveSchema>,'layout'|'expectedPlanDigest'|'expectedRevision'>){
    const plan=await this.plan(tx,access,planId);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.products WHERE id=${plan.productId}::uuid AND scope=${access.scope}::orai."DataScope" FOR UPDATE`);
    const latest=await tx.productionPlanRevision.findFirstOrThrow({where:{productId:plan.productId,scope:access.scope},orderBy:{number:'desc'},select:{id:true}});
    if(latest.id!==plan.id||plan.digest!==body.expectedPlanDigest)throw new ApiException('REVISION_CONFLICT','计划已更新或固定摘要不符，请保留草稿并重新读取',409);
    const last=await tx.projectCanvasLayoutRevision.aggregate({where:{planRevisionId:plan.id,scope:access.scope},_max:{number:true}});
    if((last._max.number??0)!==body.expectedRevision)throw new ApiException('REVISION_CONFLICT','布局已有新版本，请保留当前布局并重新读取',409);
    const definition=ProductionPlanDocumentSchema.parse(plan.document),keys=new Set(['plan',...definition.modules.map(module=>'module:'+module.moduleKey)]);
    if(body.layout.positions.some(position=>!keys.has(position.nodeKey)))throw new ApiException('VALIDATION_ERROR','布局只可包含该计划根节点和交付模块，方法/来源不属于可编辑关系',400);
    const row=await tx.projectCanvasLayoutRevision.create({data:{planRevisionId:plan.id,productId:plan.productId,scope:access.scope,
      number:body.expectedRevision+1,document:body.layout,digest:contentDigest({planRevisionId:plan.id,planDigest:plan.digest,layout:body.layout}),actorUserId:access.actorUserId}});
    return projection(row);
  }
}
