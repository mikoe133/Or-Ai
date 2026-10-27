import { IdSchema } from '@orai/contracts';
import { ExperienceWorkspaceSchema, ExperienceHistorySchema, ExperienceAuthoringRevisionSchema, ExperienceCheckSchema, ExperiencePreviewSchema } from '@orai/contracts/admin';
import { api } from '../api/consumer.js';
const id=(value:string)=>IdSchema.parse(value).toLowerCase();
const root=(product:string,version:string)=>`/api/admin/products/${id(product)}/versions/${id(version)}/experience`;
export const experienceApi={
  workspace:(p:string,v:string,profileId?:string,signal?:AbortSignal)=>api.request(root(p,v)+'?includeCapabilities=true&capabilityVersion=2'+(profileId?'&profileId='+id(profileId):''),ExperienceWorkspaceSchema,{signal}),
  history:(p:string,v:string,page=1,signal?:AbortSignal)=>api.request(root(p,v)+`/history?page=${page}&pageSize=20`,ExperienceHistorySchema,{signal}),
  save:(p:string,v:string,body:unknown)=>api.request(root(p,v),ExperienceAuthoringRevisionSchema,{method:'POST',body}),
  check:(p:string,v:string,body:unknown)=>api.request(root(p,v)+'/validate',ExperienceCheckSchema,{method:'POST',body}),
  review:(revisionId:string,body:unknown)=>api.request(`/api/admin/experience-revisions/${id(revisionId)}/review`,ExperienceAuthoringRevisionSchema,{method:'POST',body}),
  preview:(revisionId:string,body:unknown)=>api.request(`/api/admin/experience-revisions/${id(revisionId)}/preview`,ExperiencePreviewSchema,{method:'POST',body}),
};
export type ExperienceWorkspace=Awaited<ReturnType<typeof experienceApi.workspace>>;
