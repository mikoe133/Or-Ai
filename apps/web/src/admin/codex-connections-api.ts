import { IdSchema, PageSchema } from '@orai/contracts';
import { AdminCategorySchema, CodexConnectionPageSchema, CodexConnectionSchema, CodexConnectionPreviewSchema,
  CodexConnectionPlanSchema, CodexConnectionCreateSchema, CodexConnectionIssuedSchema, MachineWorkspaceSchema } from '@orai/contracts/admin';
import { api } from '../api/consumer.js';

const root='/api/admin/codex-connections',id=(value:string)=>IdSchema.parse(value).toLowerCase();
export const codexConnectionsApi={
  list:(page:number,signal?:AbortSignal)=>api.request(root+`?page=${page}&pageSize=20`,CodexConnectionPageSchema,{signal}),
  read:(key:string,signal?:AbortSignal)=>api.request(root+'/'+id(key),CodexConnectionSchema,{signal}),
  preview:(plan:unknown)=>api.request(root+'/preview',CodexConnectionPreviewSchema,{method:'POST',body:CodexConnectionPlanSchema.parse(plan)}),
  create:(body:unknown)=>api.request(root,CodexConnectionIssuedSchema,{method:'POST',body:CodexConnectionCreateSchema.parse(body)}),
  revoke:(key:string,body:unknown)=>api.request(root+'/'+id(key)+'/revoke',CodexConnectionSchema,{method:'POST',body}),
  workspaces:(page:number,signal?:AbortSignal)=>api.request(`/api/admin/machine-workspaces?page=${page}&pageSize=20`,PageSchema(MachineWorkspaceSchema),{signal}),
  categories:(page:number,signal?:AbortSignal)=>api.request(`/api/admin/categories?page=${page}&pageSize=50`,PageSchema(AdminCategorySchema),{signal}),
};
export type CodexConnection=ReturnType<typeof CodexConnectionSchema.parse>;
export type CodexPreview=ReturnType<typeof CodexConnectionPreviewSchema.parse>;
export type CodexIssued=ReturnType<typeof CodexConnectionIssuedSchema.parse>;
export type CodexWorkspace=ReturnType<typeof MachineWorkspaceSchema.parse>;
