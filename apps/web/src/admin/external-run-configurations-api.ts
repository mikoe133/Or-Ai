import {IdSchema} from '@orai/contracts';
import {ExternalConfigurationPageSchema,ExternalConfigurationSchema,ExternalConfigurationRevisionPageSchema,
 ExternalConfigurationCreateSchema,ExternalConfigurationSaveSchema,ExternalConfigurationValidationSchema,ExternalConfigurationValidateSchema,
 ExternalConfigurationExportedSchema,ExternalConfigurationExportSchema,ExternalConfigurationOptionsSchema} from '@orai/contracts/admin';
import {api} from '../api/consumer.js';
const root='/api/admin/external-run-configurations',id=(v:string)=>IdSchema.parse(v).toLowerCase();
export const externalConfigurationsApi={
 list:(page=1,signal?:AbortSignal)=>api.request(root+`?page=${page}&pageSize=10`,ExternalConfigurationPageSchema,{signal}),
 read:(key:string,revisionId?:string,signal?:AbortSignal)=>api.request(root+'/'+id(key)+(revisionId?'?revisionId='+id(revisionId):''),ExternalConfigurationSchema,{signal}),
 history:(key:string,page=1,signal?:AbortSignal)=>api.request(root+'/'+id(key)+`/revisions?page=${page}&pageSize=10`,ExternalConfigurationRevisionPageSchema,{signal}),
 create:(body:unknown)=>api.request(root,ExternalConfigurationSchema,{method:'POST',body:ExternalConfigurationCreateSchema.parse(body)}),
 save:(key:string,body:unknown)=>api.request(root+'/'+id(key)+'/revisions',ExternalConfigurationSchema,{method:'POST',body:ExternalConfigurationSaveSchema.parse(body)}),
 validate:(key:string,body:unknown)=>api.request(root+'/'+id(key)+'/validate',ExternalConfigurationValidationSchema,{method:'POST',body:ExternalConfigurationValidateSchema.parse(body)}),
 export:(key:string,body:unknown)=>api.request(root+'/'+id(key)+'/export',ExternalConfigurationExportedSchema,{method:'POST',body:ExternalConfigurationExportSchema.parse(body)}),
 options:(workspaceId:string,page=1,signal?:AbortSignal)=>api.request(root+`/options?workspaceId=${id(workspaceId)}&page=${page}&pageSize=20`,ExternalConfigurationOptionsSchema,{signal}),
};
export type ExternalConfiguration=Awaited<ReturnType<typeof externalConfigurationsApi.read>>;
export type ExternalConfigurationValidation=Awaited<ReturnType<typeof externalConfigurationsApi.validate>>;
