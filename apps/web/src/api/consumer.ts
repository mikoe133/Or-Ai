import {CategoryListSchema,TagListSchema,ProductPageSchema,ProductDetailSchema,IdSchema,KeySchema} from '@orai/contracts';
import {AccountReportPageSchema,AnonymousSessionContextSchema,EntitlementPageSchema,FeedbackSchema,QuestionsResponseSchema,RedemptionResponseSchema,ReportResponseSchema,SaveAnswerResponseSchema} from '@orai/contracts/private';
import {ApiClient,EmptySchema} from './client.js';
import {privacyEpoch} from './privacy.js';
export const api=new ApiClient(undefined,privacyEpoch);
const id=(value:string)=>IdSchema.parse(value).toLowerCase();
export const consumer={
  categories:(signal?:AbortSignal)=>api.request('/api/categories',CategoryListSchema,{signal}),
  tags:(signal?:AbortSignal)=>api.request('/api/tags',TagListSchema,{signal}),
  catalog:(search:string,signal?:AbortSignal)=>api.request('/api/products'+(search?'?'+search:''),ProductPageSchema,{signal}),
  product:(slug:string,signal?:AbortSignal)=>api.request('/api/products/'+KeySchema.parse(slug),ProductDetailSchema,{signal}),
  session:(signal?:AbortSignal)=>api.request('/api/session/context',AnonymousSessionContextSchema,{signal}),
  entitlements:(source:'anonymous'|'account',page:number,signal?:AbortSignal)=>api.request('/api/'+(source==='account'?'me':'session')+'/entitlements?page='+page,EntitlementPageSchema,{signal}),
  accountReports:(page:number,signal?:AbortSignal)=>api.request('/api/me/reports?page='+page,AccountReportPageSchema,{signal}),
  redeem:(body:{code:string;requestId:string})=>api.request('/api/redemptions/claim',RedemptionResponseSchema,{method:'POST',body}),
  bind:(body:{code:string;confirmed:true;requestId:string})=>api.request('/api/me/entitlements/bind',RedemptionResponseSchema,{method:'POST',body}),
  start:(body:{entitlementId:string;requestId:string})=>api.request('/api/attempts',QuestionsResponseSchema,{method:'POST',body}),
  questions:(attemptId:string,signal?:AbortSignal)=>api.request('/api/attempts/'+id(attemptId)+'/questions',QuestionsResponseSchema,{signal}),
  save:(attemptId:string,questionId:string,body:{optionId:string;expectedRevision:number;requestId:string})=>api.request('/api/attempts/'+id(attemptId)+'/answers/'+KeySchema.parse(questionId),SaveAnswerResponseSchema,{method:'PUT',body}),
  feedback:(attemptId:string,questionId:string,signal?:AbortSignal)=>api.request('/api/attempts/'+id(attemptId)+'/feedback?questionId='+KeySchema.parse(questionId),FeedbackSchema,{signal}),
  submit:(attemptId:string,body:{expectedRevision:number;requestId:string})=>api.request('/api/attempts/'+id(attemptId)+'/submit',ReportResponseSchema,{method:'POST',body}),
  report:(reportId:string,signal?:AbortSignal)=>api.request('/api/reports/'+id(reportId),ReportResponseSchema,{signal}),
  deleteReport:(reportId:string,body:{requestId:string})=>api.request('/api/reports/'+id(reportId),EmptySchema,{method:'DELETE',body}),
  logout:()=>api.request('/api/session/logout',EmptySchema,{method:'POST',body:{}}),
};
