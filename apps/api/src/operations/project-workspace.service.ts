import { Injectable } from '@nestjs/common';
import { IdSchema } from '@orai/contracts';
import { ProjectWorkspaceQuerySchema,ProjectWorkspaceSchema,ProductionPlanDocumentSchema } from '@orai/contracts/admin';
import { CatalogAdminAccessService,type CatalogAdminAccess } from '../catalog/admin-access.service';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { parseInput } from '../common/parse-input';
import { ApiException } from '../common/http-errors';
import { projection } from './production-plans.service';
import { methodDto,recordDto } from './project-production.service';
import { projectReviewDto } from './project-review.service';
import { originalFileDto } from './project-original-files.service';
import { profileDto,revisionDto } from './content-projections';
import { experienceRevisionDto } from './experience-authoring.service';
import { ProductionRunsService } from './production-runs.service';

const moduleInclude={plan:true,identity:true} as const;
const pageSize=20;
@Injectable()
export class ProjectWorkspaceService {
  constructor(private readonly db:DatabaseService,private readonly admins:CatalogAdminAccessService,private readonly runs:ProductionRunsService){}
  async read(access:CatalogAdminAccess,productInput:unknown,input:unknown){
    await this.admins.require(access);
    if(access.machineCredentialId)throw new ApiException('FORBIDDEN','项目聚合视图仅供管理员查看',403);
    const productId=parseInput(IdSchema,productInput).toLowerCase(),query=parseInput(ProjectWorkspaceQuerySchema,input);
    return this.db.client.$transaction(async tx=>{
      await this.admins.require(access,tx);
      if(!await tx.product.findFirst({where:{id:productId,scope:access.scope}}))throw new ApiException('NOT_FOUND','商品项目不存在于当前范围',404);
      const where={productId,scope:access.scope};
      const planRows=await tx.productionPlanRevision.findMany({where,orderBy:{number:'desc'},skip:(query.planPage-1)*pageSize,take:pageSize}),
        reviewRows=await tx.projectReviewRevision.findMany({where,orderBy:{number:'desc'},skip:(query.reviewPage-1)*pageSize,take:pageSize}),
        runRows=await tx.externalProductionRun.findMany({where,orderBy:{createdAt:'desc'},skip:(query.runPage-1)*pageSize,take:pageSize});
      const reviewRow=query.reviewId?await tx.projectReviewRevision.findFirst({where:{...where,id:query.reviewId}}):null;
      if(query.reviewId&&!reviewRow)throw new ApiException('NOT_FOUND','审核快照不属于当前项目或范围',404);
      const review=reviewRow?projectReviewDto(reviewRow):null;
      const run=query.runId?await this.runs.readAdminIn(tx,access,query.runId):null;
      if(run&&run.productId!==productId)throw new ApiException('NOT_FOUND','批次不属于当前项目',404);
      const pinnedPlan=review?.manifest.plan.id??run?.planRevisionId;
      if(pinnedPlan&&query.planRevisionId&&pinnedPlan!==query.planRevisionId)throw new ApiException('CONFLICT','选中的计划与审核快照或批次不一致',409);
      const planRow=await tx.productionPlanRevision.findFirst({where:{...where,...((pinnedPlan??query.planRevisionId)?{id:pinnedPlan??query.planRevisionId}:{})},
        orderBy:{number:'desc'},include:{modules:{include:{identity:true},orderBy:{position:'asc'}}}});
      if((query.planRevisionId||pinnedPlan)&&!planRow)throw new ApiException('NOT_FOUND','固定计划不属于当前项目或范围',404);
      const plan=review?.manifest.plan??(planRow?projection(planRow):null),moduleIds=plan?.modules.map(m=>m.id)??[];
      const lists={plans:{items:planRows.map(r=>({id:r.id,revision:r.number,createdAt:r.createdAt.toISOString(),title:ProductionPlanDocumentSchema.parse(r.document).title})),
          total:await tx.productionPlanRevision.count({where}),page:query.planPage,pageSize},
        reviews:{items:reviewRows.map(r=>({id:r.id,revision:r.number,status:r.status,planRevisionId:r.planRevisionId,createdAt:r.createdAt.toISOString()})),
          total:await tx.projectReviewRevision.count({where}),page:query.reviewPage,pageSize},
        runs:{items:runRows.map(r=>({id:r.id,planRevisionId:r.planRevisionId,runKey:r.runKey,createdAt:r.createdAt.toISOString(),cancelledAt:r.cancelledAt?.toISOString()??null})),
          total:await tx.externalProductionRun.count({where}),page:query.runPage,pageSize}};
      if(review)return ProjectWorkspaceSchema.parse({productId,scope:access.scope.toLowerCase(),observedAt:new Date().toISOString(),source:'review_snapshot',...lists,
        plan,profile:review.manifest.creativeProfile,review,run:null,methods:review.manifest.methods,records:review.manifest.records,content:review.manifest.content,
        experiences:review.manifest.experiences,originals:[],originalsTruncated:false});
      const recordRows=await tx.projectProductionRecord.findMany({where:{...where,planModuleId:{in:moduleIds},...(run?{id:{in:run.modules.flatMap(m=>m.recordId?[m.recordId]:[])}}:{})},
        orderBy:[{planModuleId:'asc'},{number:'desc'}],distinct:['planModuleId'],include:{module:{include:moduleInclude},outputs:{orderBy:[{outputKey:'asc'},{fileKey:'asc'}]}}}),records=recordRows.map(recordDto);
      const currentMethods=await tx.projectMethodSnapshot.findMany({where:{...where,planModuleId:{in:moduleIds}},orderBy:[{planModuleId:'asc'},{purpose:'asc'},{createdAt:'desc'}],
        distinct:['planModuleId','purpose'],select:{id:true}});
      const attempts=run?await tx.externalProductionAttempt.findMany({where:{id:{in:run.modules.flatMap(m=>m.latestAttemptId?[m.latestAttemptId]:[])}},select:{methods:true}}):[];
      const methodIds=new Set([...(!run?currentMethods.map(m=>m.id):[]),...records.flatMap(r=>r.methods.map(m=>m.snapshotId)),
        ...attempts.flatMap(a=>(a.methods as {snapshotId:string}[]).map(m=>m.snapshotId))]);
      const methods=(await tx.projectMethodSnapshot.findMany({where:{...where,id:{in:[...methodIds]},planModuleId:{in:moduleIds}},
        include:{module:{include:moduleInclude},references:{include:{file:true}}},orderBy:{createdAt:'asc'}})).map(methodDto);
      const contentIds=records.flatMap(r=>r.outputs.flatMap(o=>o.contentRevisionId?[o.contentRevisionId]:[])),experienceIds=records.flatMap(r=>r.outputs.flatMap(o=>o.experienceRevisionId?[o.experienceRevisionId]:[]));
      const content=(await tx.contentRevision.findMany({where:{...where,id:{in:contentIds}},include:{file:true,previewFile:true}})).map(revisionDto),
        experiences=(await tx.experienceAuthoringRevision.findMany({where:{...where,id:{in:experienceIds}}})).map(experienceRevisionDto),
        originalRows=await tx.projectOriginalFile.findMany({where:{...where,planModuleId:{in:moduleIds}},orderBy:{createdAt:'desc'},take:401}),
        originals=originalRows.slice(0,400).map(row=>originalFileDto(row.status!=='AVAILABLE'&&row.expiresAt<new Date()&&['PENDING','VERIFYING','UPLOADED'].includes(row.status)?{...row,status:'EXPIRED'}:row));
      const profile=plan?await tx.creativeProfileRevision.findFirstOrThrow({where:{...where,id:plan.creativeProfileRevisionId}}):null;
      return ProjectWorkspaceSchema.parse({productId,scope:access.scope.toLowerCase(),observedAt:new Date().toISOString(),source:run?'run':'live',...lists,plan,
        profile:profile?profileDto(profile):null,review:null,run,methods,records,content,experiences,originals,originalsTruncated:originalRows.length>400});
    },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:30_000});
  }
}
