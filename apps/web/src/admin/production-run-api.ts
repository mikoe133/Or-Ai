import {IdSchema} from '@orai/contracts';
import {ProductionRunPageSchema,RunOperationsSchema,RunAttemptHistorySchema,RunStopPreviewSchema,RunStopConfirmSchema,RunRecoveryInputsSchema,
 RunRecoverySelectionSchema,RunRecoveryPreviewSchema,RunRecoveryExportSchema,RunRecoveryExportedSchema,ProjectProductionRecordSchema} from '@orai/contracts/admin';
import {api} from '../api/consumer.js';
const id=(v:string)=>IdSchema.parse(v).toLowerCase();
export const runOperationsApi={
 list:(productId:string,page:number,signal?:AbortSignal)=>api.request(`/api/admin/products/${id(productId)}/production-runs?page=${page}&pageSize=20`,ProductionRunPageSchema,{signal}),
 read:(runId:string,signal?:AbortSignal)=>api.request(`/api/admin/production-runs/${id(runId)}/operations`,RunOperationsSchema,{signal}),
 history:(runId:string,moduleId:string,page:number,signal?:AbortSignal)=>api.request(`/api/admin/production-runs/${id(runId)}/attempts?planModuleId=${id(moduleId)}&page=${page}&pageSize=10`,RunAttemptHistorySchema,{signal}),
 stopPreview:(runId:string)=>api.request(`/api/admin/production-runs/${id(runId)}/stop/preview`,RunStopPreviewSchema,{method:'POST',body:{}}),
 stop:(runId:string,body:unknown)=>api.request(`/api/admin/production-runs/${id(runId)}/stop`,RunOperationsSchema,{method:'POST',body:RunStopConfirmSchema.parse(body)}),
 inputs:(attemptId:string,recordId:string,page:number,signal?:AbortSignal)=>api.request(`/api/admin/production-attempts/${id(attemptId)}/recovery-inputs?recordId=${id(recordId)}&page=${page}&pageSize=20`,RunRecoveryInputsSchema,{signal}),
 preview:(attemptId:string,body:unknown)=>api.request(`/api/admin/production-attempts/${id(attemptId)}/recovery/preview`,RunRecoveryPreviewSchema,{method:'POST',body:RunRecoverySelectionSchema.parse(body)}),
 export:(attemptId:string,body:unknown)=>api.request(`/api/admin/production-attempts/${id(attemptId)}/recovery/export`,RunRecoveryExportedSchema,{method:'POST',body:RunRecoveryExportSchema.parse(body)}),
 record:(recordId:string,signal?:AbortSignal)=>api.request(`/api/admin/project-productions/${id(recordId)}`,ProjectProductionRecordSchema,{signal}),
};
export type RunData=ReturnType<typeof RunOperationsSchema.parse>;
export type RunModule=RunData['modules'][number];
export type RunAttemptPage=ReturnType<typeof RunAttemptHistorySchema.parse>;
export type RecoveryInput=ReturnType<typeof RunRecoveryInputsSchema.parse>['items'][number];
export type RecoverySelection=ReturnType<typeof RunRecoverySelectionSchema.parse>;
export type RecoveryPreview=ReturnType<typeof RunRecoveryPreviewSchema.parse>;
