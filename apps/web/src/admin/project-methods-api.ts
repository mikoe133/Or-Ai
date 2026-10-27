import {IdSchema} from '@orai/contracts';
import {ProjectMethodCandidatePageSchema,ProjectMethodCandidateQuerySchema,ProjectMethodCaptureSchema,ProjectMethodSnapshotSchema,
 ProjectHandoffOptionsQuerySchema,ProjectHandoffOptionsSchema,ProjectHandoffSelectionSchema,ProjectHandoffPreviewSchema,
 ProjectHandoffExportSchema,ProjectHandoffExportedSchema,ProjectMethodPageSchema} from '@orai/contracts/admin';
import {api} from '../api/consumer.js';
const root=(id:string)=>'/api/admin/production-modules/'+IdSchema.parse(id).toLowerCase();
const query=(input:object)=>new URLSearchParams(Object.entries(input).filter(([,v])=>v!==undefined).map(([k,v])=>[k,String(v)])).toString();
export const projectMethodsApi={
 candidates:(moduleId:string,input:unknown,signal?:AbortSignal)=>api.request(root(moduleId)+'/method-candidates?'+query(ProjectMethodCandidateQuerySchema.parse(input)),ProjectMethodCandidatePageSchema,{signal}),
 methods:(moduleId:string,page=1,signal?:AbortSignal)=>api.request(root(moduleId)+'/methods?page='+page+'&pageSize=20',ProjectMethodPageSchema,{signal}),
 capture:(moduleId:string,body:unknown)=>api.request(root(moduleId)+'/methods',ProjectMethodSnapshotSchema,{method:'POST',body:ProjectMethodCaptureSchema.parse(body)}),
 inputs:(moduleId:string,input:unknown,signal?:AbortSignal)=>api.request(root(moduleId)+'/handoff-inputs?'+query(ProjectHandoffOptionsQuerySchema.parse(input)),ProjectHandoffOptionsSchema,{signal}),
 preview:(moduleId:string,body:unknown)=>api.request(root(moduleId)+'/handoff/preview',ProjectHandoffPreviewSchema,{method:'POST',body:ProjectHandoffSelectionSchema.parse(body)}),
 export:(moduleId:string,body:unknown)=>api.request(root(moduleId)+'/handoff/export',ProjectHandoffExportedSchema,{method:'POST',body:ProjectHandoffExportSchema.parse(body)}),
};
export type MethodCandidate=Awaited<ReturnType<typeof projectMethodsApi.candidates>>['items'][number];
export type HandoffOptions=Awaited<ReturnType<typeof projectMethodsApi.inputs>>;
export type HandoffSelection=ReturnType<typeof ProjectHandoffSelectionSchema.parse>;
export type HandoffPreview=Awaited<ReturnType<typeof projectMethodsApi.preview>>;
