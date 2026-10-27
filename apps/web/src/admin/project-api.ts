import { IdSchema } from '@orai/contracts';
import { ProjectWorkspaceSchema,ProjectWorkspaceQuerySchema,ProjectReviewPreviewSchema,ProjectReviewRevisionSchema,ProductionAttemptSchema,
  ProductionPlanRevisionSchema,ProductionPlanSaveSchema,ProjectCanvasStateSchema,ProjectCanvasLayoutSaveSchema,ProjectCanvasLayoutRevisionSchema } from '@orai/contracts/admin';
import { api } from '../api/consumer.js';
const id=(value:string)=>IdSchema.parse(value).toLowerCase();
export const projectApi={
  canvas:(planId:string,signal?:AbortSignal)=>api.request(`/api/admin/production-plans/${id(planId)}/canvas-layout`,ProjectCanvasStateSchema,{signal}),
  savePlan:(productId:string,body:unknown)=>api.request(`/api/admin/products/${id(productId)}/production-plans`,ProductionPlanRevisionSchema,{method:'POST',body:ProductionPlanSaveSchema.parse(body)}),
  saveLayout:(planId:string,body:unknown)=>api.request(`/api/admin/production-plans/${id(planId)}/canvas-layout`,ProjectCanvasLayoutRevisionSchema,{method:'POST',body:ProjectCanvasLayoutSaveSchema.parse(body)}),
  workspace:(productId:string,query:ReturnType<typeof ProjectWorkspaceQuerySchema.parse>,signal?:AbortSignal)=>api.request(
    `/api/admin/products/${id(productId)}/project-workspace?${new URLSearchParams(Object.entries(query).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)]))}`,ProjectWorkspaceSchema,{signal}),
  check:(productId:string,body:unknown)=>api.request(`/api/admin/products/${id(productId)}/project-reviews/preview`,ProjectReviewPreviewSchema,{method:'POST',body}),
  save:(productId:string,body:unknown)=>api.request(`/api/admin/products/${id(productId)}/project-reviews`,ProjectReviewRevisionSchema,{method:'POST',body}),
  transition:(reviewId:string,action:'submit'|'return'|'retain',body:unknown)=>api.request(`/api/admin/project-reviews/${id(reviewId)}/${action}`,ProjectReviewRevisionSchema,{method:'POST',body}),
  attempt:(attemptId:string,signal?:AbortSignal)=>api.request(`/api/admin/production-attempts/${id(attemptId)}`,ProductionAttemptSchema,{signal}),
};
export type ProjectWorkspaceData=Awaited<ReturnType<typeof projectApi.workspace>>;
export type ProjectModule=NonNullable<ProjectWorkspaceData['plan']>['modules'][number];
export type ProjectMethod=ProjectWorkspaceData['methods'][number];
export type ProjectRecord=ProjectWorkspaceData['records'][number];
export type ProjectOutput=ProjectRecord['outputs'][number];
