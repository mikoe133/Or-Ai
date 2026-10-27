import {randomUUID} from 'node:crypto';
import {ProductionPlansService} from '../src/operations/production-plans.service';
import type {INestApplication} from '@nestjs/common';
import {emptyExternalRunConfiguration,skillPurposes,type ExternalRunConfigurationDocument} from '@orai/contracts/admin';
import type {CatalogAdminAccess} from '../src/catalog/admin-access.service';
import type {createLocalFixture} from './local-fixture';
import {methodProject,captureMethod} from './project-methods-fixture';

export async function configurationProject(app:INestApplication,fixture:Awaited<ReturnType<typeof createLocalFixture>>,access:CatalogAdminAccess,includeVideo=false){
 const initial=await methodProject(app,fixture,access);
 const plan=includeVideo?await app.get(ProductionPlansService).save(access,initial.boot.productId,{expectedRevision:initial.plan.revision,requestId:randomUUID(),plan:{...initial.plan.plan,modules:[...initial.plan.plan.modules,{moduleKey:"video",title:"宣传视频",domain:"video",required:true,purpose:"隔离运行配置验证",dependsOn:["assessment","copy","cover"],target:{form:"web",runtime:null},methodPurposes:["video_production"],methodRetention:"manifest_instructions_and_references",outputs:[{outputKey:"video",label:"视频原件",kind:"video",required:true,original:{storage:"platform",representation:"file"},files:[{fileKey:"source",label:"原件",purpose:"original",required:true,mimeTypes:["video/mp4"],sourceUrl:null}]}]}]}}):initial.plan;
 const c={...initial,plan,module:(domain:string)=>plan.modules.find(m=>m.definition.domain===domain)!},document=emptyExternalRunConfiguration(c.connection.workspace.id,'关系表达 · 隔离配置');
 document.connectionId=c.connection.id;document.target={kind:'fixed_project',productId:c.boot.productId,planRevisionId:c.plan.id,planDigest:c.plan.digest};
 document.client={kind:'codex_desktop',workingDirectory:'/example/orai-production'};
 const future=new Date(Date.now()+600000);document.timing={kind:'once',date:future.toISOString().slice(0,10),time:future.toISOString().slice(11,16),timeZone:'UTC',until:null,weekdays:[],quantity:1,missed:'manual_review',overlap:'skip'};
 document.sourcing={basis:'manual',freshnessWindowHours:24,maxSources:8,maxDurationMinutes:5,missing:'manual_review',sources:[
  {key:'domestic',region:'domestic',language:'zh-CN',name:'国内合成来源',url:'https://cn.example.test/relationships'},
  {key:'international',region:'international',language:'en',name:'国际合成来源',url:'https://global.example.test/relationships'}]};
 for(const module of c.plan.modules){const domain=module.definition.domain,methods=[];
  for(const purpose of skillPurposes[domain]){const captured=await captureMethod(c,domain,purpose);methods.push({snapshotId:captured.snapshot.id,digest:captured.snapshot.digest,purpose});}
  document.modules.push({planModuleId:module.id,digest:module.digest,methods,connectionId:null,
   dependencies:module.definition.dependsOn.map(k=>({kind:'waiting' as const,planModuleId:c.plan.modules.find(m=>m.moduleKey===k)!.id}))});
 }
 document.tools=[{key:'text',name:'文本工具（合成声明）',provider:'synthetic-text',domains:['assessment','copy'],approval:'allowed',cost:'known',maxCostFen:200,maxDurationSeconds:120,maxCalls:2},
  {key:'image',name:'图片工具（合成声明）',provider:'synthetic-image',domains:includeVideo?['cover','video']:['cover'],approval:'allowed',cost:'known',maxCostFen:500,maxDurationSeconds:600,maxCalls:2}];
 document.limits={maxAttemptsPerModule:2,maxTotalAttempts:8,maxConcurrency:1,maxDurationSeconds:3600,maxReportedCostFen:1000,maxReportedTokens:null,unknownCost:'stop_and_review',stageLimits:[]};
 document.recovery={unknownJob:'inspect_original',failedModule:'manual_retry',pause:'preserve_and_review',resume:'recheck_all'};
 return {...c,document};
}
export type ConfigurationProject=Awaited<ReturnType<typeof configurationProject>>;
export const copyConfiguration=(value:ExternalRunConfigurationDocument)=>structuredClone(value);
