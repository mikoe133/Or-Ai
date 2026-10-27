import 'reflect-metadata';
import { before,after,beforeEach,test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ProductionRunSchema,ProductionAttemptSchema,ProductionAttemptClaimedSchema,MachineProjectResultSchema,
  ProductionPlanRevisionSchema,MachineProjectMethodSnapshotSchema,MachineProjectDraftResultSchema,
  MachineProjectProductionRecordSchema,CreativeProfileSchema,StyleSkillManifestSchema,skillPurposes,ProductionRunLimitsSchema } from '@orai/contracts/admin';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/config/configuration';
import { configureApp } from '../src/common/configure-app';
import { CatalogAdminAccessService,type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { CatalogAdminService } from '../src/operations/catalog-admin.service';
import { MachineCredentialsService } from '../src/operations/machine-credentials.service';
import { MachineProjectsService } from '../src/operations/machine-projects.service';
import { SkillsService } from '../src/operations/skills.service';
import { ProductionRunsService,PRODUCTION_RUN_CLOCK } from '../src/operations/production-runs.service';
import { ProjectReviewService } from '../src/operations/project-review.service';
import { ProjectWorkspaceService } from '../src/operations/project-workspace.service';
import { ProductionPlansService } from '../src/operations/production-plans.service';
import { demoId,DemoIdentityScenarios } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';
import { Prisma } from '../src/generated/prisma/client';

let fixture:Awaited<ReturnType<typeof createLocalFixture>>,app:INestApplication,access:CatalogAdminAccess,base:string,
  runs:ProductionRunsService,projects:MachineProjectsService,clockStamp=Date.now();
before(async()=>{
  fixture=await createLocalFixture('t14');const module=await Test.createTestingModule({imports:[AppModule]})
    .overrideProvider(APP_CONFIG).useValue(fixture.configuration).overrideProvider(PRODUCTION_RUN_CLOCK).useValue(()=>new Date(clockStamp)).compile();
  app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');base=await app.getUrl();
  access=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);
  runs=app.get(ProductionRunsService);projects=app.get(MachineProjectsService);
});
beforeEach(()=>{clockStamp=Date.now();});
after(async()=>{await app?.close();await fixture?.close();});
type Domain=keyof typeof skillPurposes;
type RunLimits=ReturnType<typeof ProductionRunLimitsSchema.parse>;
const limits:RunLimits={maxAttemptsPerModule:3,maxTotalAttempts:15,maxConcurrency:4,maxDurationSeconds:3600,maxReportedCostFen:null,maxReportedTokens:null};
async function fresh(overrides:Partial<RunLimits>={},maxRunsPerProject=3){
  const original=await app.get(CatalogAdminService).product(access,demoId('demo-partner')),
    workspace=await projects.createWorkspace(access,{name:'运行接续隔离授权',categoryIds:[original.categoryId],maxProjects:1,maxMethodsPerProject:10,maxRunsPerProject,
      expiresAt:new Date(Date.now()+7200_000).toISOString(),requestId:randomUUID()});
  const grants={} as Record<Domain,{id:string;token:string;access:CatalogAdminAccess}>;
  for(const domain of ['assessment','cover','copy','video','experience'] as const){
    const issued=await app.get(MachineCredentialsService).create(access,{name:'运行领域连接',domain,workspaceId:workspace.id,
      permissions:['content:read','content:write','skills:read','skills:write','context:read','projects:read','methods:create',...(domain==='assessment'?['projects:write','projects:create']:[])],
      productIds:[],skillIds:[],expiresAt:new Date(Date.now()+3600_000).toISOString(),requestId:randomUUID()});
    grants[domain]={id:issued.credential.id,token:issued.token!,access:await app.get(CatalogAdminAccessService).authorizeMachine(issued.token!,domain)};
  }
  const profile=CreativeProfileSchema.parse({schemaVersion:1,title:'运行测试共同设定',audience:'自我观察者',situation:'日常沟通',emotionalGoal:'被理解',understandingGoal:'认识表达方式',
    takeaway:'一个具体行动',perspective:'self',experienceForm:'web',pace:'从容',world:'安静空间',language:'具体直接',visual:'紫色',sound:'安静',channels:['manual'],deliverables:['assessment','cover','copy','video'],
    reportPlan:{schemaVersion:1,title:'观察报告',narrative:'观察与行动',presentation:'standard',sections:[{sectionId:'next',title:'下一步',purpose:'形成行动'}]}});
  const output=(outputKey:string,kind:string,mime?:string)=>({outputKey,label:outputKey,kind,required:true,original:{storage:'platform',representation:mime?'file':'structured'},
    files:mime?[{fileKey:'source',purpose:'original',label:'原文件',required:true,mimeTypes:[mime],sourceUrl:null}]:[]});
  const module=(domain:Domain,outputs:unknown[],dependsOn:string[]=[])=>({moduleKey:domain,title:domain,domain,required:domain==='assessment',purpose:'运行协议验收',dependsOn,
    target:{form:'web',runtime:null},methodPurposes:[...skillPurposes[domain]],methodRetention:'manifest_instructions_and_references',outputs});
  const {isDemo:_,...publicSample}=original.publicSample;
  const project=MachineProjectResultSchema.parse(await projects.execute(grants.assessment.access,'project_bootstrap',{requestId:randomUUID(),projectKey:'run-project-'+randomUUID(),
    product:{slug:'run-project-'+randomUUID(),name:'运行接续合成项目',hook:'观察自己的节奏',summary:'隔离协议验收',description:'技术测试草稿',categoryId:original.categoryId,
      priceFen:original.priceFen,durationMinutes:5,experienceType:original.experienceType,themeKey:original.themeKey,publicSample},profile,
    plan:{schemaVersion:1,title:'运行计划',selection:{basis:'manual',rationale:'隔离测试',evidenceKeys:[]},freshnessWindowHours:24,evidence:[],retention:'platform_originals_and_exact_methods',
      modules:[module('assessment',[output('questions','assessment'),output('report','report')]),module('cover',[output('cover','image','image/png')]),
        module('copy',[output('copy','copy')],['assessment']),module('video',[output('video','video','video/webm')],['assessment','copy']),module('experience',[output('web','web_bundle','text/html')],['assessment'])]}}));
  const plan=ProductionPlanRevisionSchema.parse(await projects.execute(grants.assessment.access,'project_plan_get',{planRevisionId:project.planRevisionId}));
  const createBody={productId:project.productId,planRevisionId:plan.id,expectedPlanDigest:plan.digest,runKey:'run-'+randomUUID(),limits:{...limits,...overrides},requestId:randomUUID()};
  const run=ProductionRunSchema.parse(await runs.execute(grants.assessment.access,grants.assessment.token,'production_run_create',createBody));
  return {workspace,grants,project,plan,run,createBody,module:(domain:Domain)=>plan.modules.find(m=>m.definition.domain===domain)!,
    methods:{} as Record<Domain,{snapshotId:string;digest:string}[]>,records:{} as Record<Domain,ReturnType<typeof MachineProjectProductionRecordSchema.parse>>,
    drafts:{} as Record<Domain,ReturnType<typeof MachineProjectDraftResultSchema.parse>>};
}
type Context=Awaited<ReturnType<typeof fresh>>;
async function methods(c:Context,domain:Domain){
  const manifest=StyleSkillManifestSchema.parse({schemaVersion:1,domain,name:'运行候选方法',description:'技术测试',purposes:[...skillPurposes[domain]],styles:['紫色'],supportedForms:['web'],
    inputs:[{key:'creative-profile',description:'固定共同设定',required:true}],outputs:[{key:'deliverable',description:'模块产物'}],instructions:'以具体观察形成理解与下一步。',examples:[],references:[]});
  const created=await projects.execute(c.grants[domain].access,'project_method_create',{productId:c.project.productId,methodKey:domain,manifest,requestId:randomUUID()}) as {skillId:string;versionId:string};
  const version=await app.get(SkillsService).readVersion(access,domain,created.skillId,created.versionId),module=c.module(domain),selected=[];
  for(const purpose of skillPurposes[domain]){const fixed=MachineProjectMethodSnapshotSchema.parse(await projects.execute(c.grants[domain].access,'project_method_capture',{
    planModuleId:module.id,expectedModuleDigest:module.digest,purpose,sourceVersionId:version.id,expectedSourceDigest:version.digest,expectedSourceRevision:version.revision,requestId:randomUUID()}));
    selected.push({snapshotId:fixed.id,digest:fixed.digest});}
  c.methods[domain]=selected;return selected;
}
function claimBody(c:Context,domain:Domain,clientKey='worker-a',extra:Record<string,unknown>={}){
  return {runId:c.run.id,planModuleId:c.module(domain).id,clientKey,methods:c.methods[domain]??[],
    inputs:c.module(domain).definition.dependsOn.flatMap(key=>{const record=c.records[key as Domain];return record?[{recordId:record.id,digest:record.digest}]:[];}),
    leaseSeconds:10,requestId:randomUUID(),...extra};
}
async function claim(c:Context,domain:Domain,clientKey='worker-a',extra:Record<string,unknown>={}){
  const body=claimBody(c,domain,clientKey,extra),g=c.grants[domain];return ProductionAttemptClaimedSchema.parse(await runs.execute(g.access,g.token,'module_attempt_claim',body));
}
function eventBody(a:ReturnType<typeof ProductionAttemptClaimedSchema.parse>,state='producing',extra:Record<string,unknown>={}){
  return {attemptId:a.attempt.id,leaseToken:a.leaseToken,expectedRevision:a.attempt.revision,requestId:randomUUID(),state,step:'S3',reasonCode:null,
    reason:'合成外部进度申报',job:null,reportedCostFen:null,reportedTokens:null,...extra};
}
async function event(c:Context,domain:Domain,a:ReturnType<typeof ProductionAttemptClaimedSchema.parse>,state='producing',extra:Record<string,unknown>={}){
  const g=c.grants[domain];return ProductionAttemptSchema.parse(await runs.execute(g.access,g.token,'module_attempt_event',eventBody(a,state,extra)));
}
async function assessment(c:Context,expectedRevision=0,partial=false){
  const module=c.module('assessment'),config=await fixture.runtime.client.productVersion.findFirstOrThrow({where:{productId:demoId('demo-partner')}});
  const draft=MachineProjectDraftResultSchema.parse(await projects.execute(c.grants.assessment.access,'project_draft_save',{
    planModuleId:module.id,expectedModuleDigest:module.digest,methods:c.methods.assessment,requestId:randomUUID(),payload:{kind:'assessment',configuration:config.configuration,
      expectedRevision,productVersionId:c.drafts.assessment?.productVersionId}}));c.drafts.assessment=draft;
  const record=MachineProjectProductionRecordSchema.parse(await projects.execute(c.grants.assessment.access,'project_production_save',{
    planModuleId:module.id,expectedModuleDigest:module.digest,methods:c.methods.assessment,inputs:[],expectedRevision:c.records.assessment?.revision??0,requestId:randomUUID(),
    outputs:(partial?['questions']:['questions','report']).map(outputKey=>({kind:'content_revision',outputKey,revisionId:draft.revisionId,digest:draft.digest})),
    external:{client:'isolated-client',runKey:'output-'+randomUUID(),note:'外部制作声明',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()}}));c.records.assessment=record;return record;
}
const completeBody=(a:ReturnType<typeof ProductionAttemptClaimedSchema.parse>,record:{id:string;digest:string})=>({attemptId:a.attempt.id,leaseToken:a.leaseToken,
  expectedRevision:a.attempt.revision,requestId:randomUUID(),recordId:record.id,expectedRecordDigest:record.digest});
async function request(c:Context,domain:Domain,operation:string,body:unknown,headers:Record<string,string>={}){
  return fetch(base+'/api/machine/'+domain+'/tools/'+operation,{method:'POST',headers:{authorization:'Bearer '+c.grants[domain].token,'content-type':'application/json',...headers},body:JSON.stringify(body)});
}

test('run business keys restore the same fixed plan and limits while deliberate variants remain distinct and bounded',async()=>{
  const c=await fresh({},2),g=c.grants.assessment;
  assert.deepEqual(await runs.execute(g.access,g.token,'production_run_create',{...c.createBody,requestId:randomUUID()}),c.run);
  await assert.rejects(runs.execute(g.access,g.token,'production_run_create',{...c.createBody,requestId:randomUUID(),limits:{...limits,maxConcurrency:2}}));
  const variant=ProductionRunSchema.parse(await runs.execute(g.access,g.token,'production_run_create',{...c.createBody,runKey:'variant',requestId:randomUUID()}));
  assert.notEqual(variant.id,c.run.id);
  await assert.rejects(runs.execute(g.access,g.token,'production_run_create',{...c.createBody,runKey:'over-quota',requestId:randomUUID()}));
  assert.equal(await fixture.runtime.client.externalProductionRun.count({where:{productId:c.project.productId}}),2);
});
test('claims without required methods or inputs persist waiting/failure receipts without inventing a successful production record',async()=>{
  const c=await fresh(),a=await claim(c,'copy');assert.equal(a.nextAction,'prepare_inputs');assert.equal(a.attempt.state,'waiting_input');
  await assert.rejects(event(c,'copy',a,'producing'));
  const failed=await event(c,'copy',a,'failed',{reason:'缺输入，保留失败阶段。',reasonCode:'missing-input'});assert.equal(failed.state,'failed');
  assert.equal(failed.outputRecordId,null);assert.equal(await fixture.runtime.client.projectProductionRecord.count({where:{productId:c.project.productId}}),0);
});
test('two real HTTP clients compete for one active phase, stable retries recover one token and secrets never enter persisted responses',async()=>{
  const c=await fresh();await methods(c,'assessment');const a=claimBody(c,'assessment','client-a'),b=claimBody(c,'assessment','client-b');
  const results=await Promise.all([request(c,'assessment','module_attempt_claim',a),request(c,'assessment','module_attempt_claim',b)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const winner=results[0]!.status===200?0:1,
    first=ProductionAttemptClaimedSchema.parse(await results[winner]!.json()),input=winner===0?a:b;
  const again=ProductionAttemptClaimedSchema.parse(await runs.execute(c.grants.assessment.access,c.grants.assessment.token,'module_attempt_claim',{...input,requestId:randomUUID()}));
  assert.equal(again.attempt.id,first.attempt.id);assert.equal(again.leaseToken,first.leaseToken);
  const cached=await fixture.runtime.client.idempotentRequest.findMany({where:{operation:'external.attempt.claim'}});
  assert.equal(JSON.stringify(cached).includes(first.leaseToken!),false);assert.equal(JSON.stringify(cached).includes(c.grants.assessment.token),false);
});
test('fenced replacement after expiry rejects the old worker event, renewal and completion while preserving its history',async()=>{
  const c=await fresh();await methods(c,'assessment');const old=await claim(c,'assessment'),record=await assessment(c);
  clockStamp+=11_000;const next=await claim(c,'assessment','worker-b',{retryOfAttemptId:old.attempt.id});
  assert.notEqual(next.attempt.id,old.attempt.id);assert.equal(next.attempt.generation,2);
  await assert.rejects(event(c,'assessment',old,'uploading'));
  await assert.rejects(runs.execute(c.grants.assessment.access,c.grants.assessment.token,'module_attempt_renew',{
    attemptId:old.attempt.id,leaseToken:old.leaseToken,expectedRevision:0,leaseSeconds:30,requestId:randomUUID()}));
  await assert.rejects(runs.execute(c.grants.assessment.access,c.grants.assessment.token,'module_attempt_complete',completeBody(old,record)));
  const historical=ProductionAttemptSchema.parse(await runs.execute(c.grants.assessment.access,c.grants.assessment.token,'module_attempt_get',{attemptId:old.attempt.id}));
  assert.equal(historical.leaseActive,false);assert.equal(historical.events.length,1);assert.equal(historical.outputRecordId,null);
});
test('renewal persists an extended deadline once, and expired claims cannot be revived by renewal',async()=>{
  const c=await fresh();await methods(c,'assessment');const a=await claim(c,'assessment');clockStamp+=1000;
  const body={attemptId:a.attempt.id,leaseToken:a.leaseToken,expectedRevision:0,leaseSeconds:30,requestId:randomUUID()},g=c.grants.assessment;
  const renewed=ProductionAttemptSchema.parse(await runs.execute(g.access,g.token,'module_attempt_renew',body));
  assert.equal(renewed.revision,1);assert.ok(renewed.leaseExpiresAt>a.attempt.leaseExpiresAt);
  assert.deepEqual(await runs.execute(g.access,g.token,'module_attempt_renew',body),renewed);
  clockStamp+=31_000;await assert.rejects(runs.execute(g.access,g.token,'module_attempt_renew',{...body,expectedRevision:1,requestId:randomUUID()}));
});
test('unknown external job outcomes require restoring the original job and cannot be converted into another paid-job identity',async()=>{
  const c=await fresh();await methods(c,'assessment');const a=await claim(c,'assessment'),job={provider:'synthetic-provider',jobId:'job-'+randomUUID(),terminal:false};
  await event(c,'assessment',a,'producing',{job});clockStamp+=11_000;
  await assert.rejects(claim(c,'assessment','restarted-client',{retryOfAttemptId:a.attempt.id}));
  const resumed=await claim(c,'assessment','restarted-client',{retryOfAttemptId:a.attempt.id,resumeJobId:job.jobId});
  assert.equal(resumed.nextAction,'inspect_existing_job');assert.deepEqual(resumed.attempt.job,job);
  await assert.rejects(event(c,'assessment',resumed,'producing',{job:{...job,jobId:'another-job'}}));
  const marked=await event(c,'assessment',resumed,'validation_failed',{job:{...job,terminal:true},reason:'外部工具确认失败，未保存产物。'});
  assert.equal(marked.state,'validation_failed');assert.equal(marked.outputRecordId,null);
});
test('only verified complete saved outputs can finish an attempt and identical lost-response retries do not duplicate work',async()=>{
  const c=await fresh();await methods(c,'assessment');const a=await claim(c,'assessment'),record=await assessment(c),g=c.grants.assessment,
    body=completeBody(a,record),saved=ProductionAttemptSchema.parse(await runs.execute(g.access,g.token,'module_attempt_complete',body));
  assert.equal(saved.state,'saved_draft');assert.equal(saved.outputRecordId,record.id);assert.equal(saved.platformExecuted,false);assert.ok(saved.savedOutputsVerifiedAt);
  assert.deepEqual(await runs.execute(g.access,g.token,'module_attempt_complete',body),saved);
  const retried=await claim(c,'assessment');assert.equal(retried.attempt.id,a.attempt.id);assert.equal(retried.leaseToken,null);assert.equal(retried.nextAction,'reuse_saved_record');
  assert.equal(await fixture.runtime.client.externalProductionAttempt.count({where:{runId:c.run.id,planModuleId:c.module('assessment').id}}),1);
  assert.equal(await fixture.runtime.client.externalAttemptEvent.count({where:{attemptId:a.attempt.id,state:'saved_draft'}}),1);
});
test('client finished flags or a partial assessment cannot fake saved_draft or a complete report delivery',async()=>{
  const c=await fresh();await methods(c,'assessment');const a=await claim(c,'assessment'),record=await assessment(c,0,true);
  await assert.rejects(runs.execute(c.grants.assessment.access,c.grants.assessment.token,'module_attempt_complete',completeBody(a,record)));
  assert.equal((await request(c,'assessment','module_attempt_event',eventBody(a,'saved_draft'))).status,400);
  assert.equal((await request(c,'assessment','module_attempt_event',{...eventBody(a),finished:true,platformExecuted:true})).status,400);
  assert.equal((await fixture.runtime.client.externalProductionAttempt.findUniqueOrThrow({where:{id:a.attempt.id}})).outputRecordId,null);
});
test('upstream changes mark affected attempts for recheck, preserve saved peers and require a new fixed input attempt',async()=>{
  const c=await fresh();await methods(c,'assessment');await methods(c,'copy');const a=await claim(c,'assessment'),first=await assessment(c),g=c.grants.assessment;
  await runs.execute(g.access,g.token,'module_attempt_complete',completeBody(a,first));
  const copy=await claim(c,'copy'),second=await assessment(c,c.drafts.assessment.revision);
  const observed=ProductionRunSchema.parse(await runs.execute(g.access,g.token,'production_run_get',{runId:c.run.id}));
  assert.equal(observed.modules.find(m=>m.domain==='copy')!.needsRecheck,true);assert.equal(observed.modules.find(m=>m.domain==='assessment')!.recordId,first.id);
  await assert.rejects(event(c,'copy',copy,'producing'));
  await event(c,'copy',copy,'validation_failed',{reason:'上游产生新稿，需要复查。'});
  const next=await claim(c,'copy','worker-a',{retryOfAttemptId:copy.attempt.id});
  assert.notEqual(next.attempt.inputFingerprint,copy.attempt.inputFingerprint);assert.equal(next.attempt.inputs[0]!.recordId,second.id);
  assert.equal((await fixture.runtime.client.product.findUniqueOrThrow({where:{id:c.project.productId}})).status,'DRAFT');
});
test('service limits enforce attempt count, concurrency and cumulative declared budgets without claiming to meter real billing',async()=>{
  const c=await fresh({maxConcurrency:1,maxAttemptsPerModule:2});await methods(c,'assessment');await methods(c,'cover');const first=await claim(c,'assessment');
  await assert.rejects(claim(c,'cover'));await event(c,'assessment',first,'failed');const second=await claim(c,'assessment','retry',{retryOfAttemptId:first.attempt.id});
  await event(c,'assessment',second,'failed');await assert.rejects(claim(c,'assessment','last',{retryOfAttemptId:second.attempt.id}));
  const budget=await fresh({maxReportedTokens:10});await methods(budget,'assessment');await methods(budget,'cover');const active=await claim(budget,'assessment');
  const spent=await event(budget,'assessment',active,'failed',{reportedTokens:10,reportedCostFen:null});
  assert.equal(spent.events.at(-1)!.metricsSource,'external_declaration');await assert.rejects(claim(budget,'cover'));
});
test('P4 review links provide authoritative pending_review, returned and retained states without producer self-approval',async()=>{
  const c=await fresh();await methods(c,'assessment');const a=await claim(c,'assessment'),record=await assessment(c),g=c.grants.assessment;
  await runs.execute(g.access,g.token,'module_attempt_complete',completeBody(a,record));const reviews=app.get(ProjectReviewService),
    draft=await reviews.save(access,c.project.productId,{selection:{planRevisionId:c.plan.id,records:[{recordId:record.id,digest:record.digest}]},expectedRevision:0,note:'合成审核',requestId:randomUUID()});
  const action=(r:typeof draft)=>({expectedRevision:r.revision,expectedFingerprint:r.fingerprint,expectedFrontierFingerprint:r.frontierFingerprint,note:'核对固定稿',requestId:randomUUID()});
  const submitted=await reviews.transition(access,draft.id,'submit',action(draft));
  let observed=ProductionRunSchema.parse(await runs.execute(g.access,g.token,'production_run_get',{runId:c.run.id}));assert.equal(observed.modules[0]!.state,'pending_review');
  const returned=await reviews.transition(access,submitted.id,'return',{...action(submitted),returns:[{planModuleId:c.module('assessment').id,reason:'核对语气'}]});
  observed=ProductionRunSchema.parse(await runs.execute(g.access,g.token,'production_run_get',{runId:c.run.id}));assert.equal(observed.modules[0]!.state,'returned');
  const resubmitted=await reviews.transition(access,returned.id,'submit',action(returned)),retained=await reviews.transition(access,resubmitted.id,'retain',action(resubmitted));
  observed=ProductionRunSchema.parse(await runs.execute(g.access,g.token,'production_run_get',{runId:c.run.id}));assert.equal(observed.modules[0]!.state,'retained');assert.equal(observed.modules[0]!.reviewId,retained.id);
  assert.equal((await fixture.runtime.client.product.findUniqueOrThrow({where:{id:c.project.productId}})).currentVersionId,null);
});
test('cross workspace/domain/credential targets, forged capabilities and browser headers never bypass run authorization',async()=>{
  const c=await fresh(),other=await fresh();await methods(c,'assessment');const a=await claim(c,'assessment');
  assert.equal((await request(other,'assessment','production_run_get',{runId:c.run.id})).status,403);
  assert.equal((await request(c,'copy','module_attempt_get',{attemptId:a.attempt.id})).status,403);
  assert.equal((await request(c,'assessment','production_run_get',{runId:c.run.id},{origin:'http://localhost:5173'})).status,403);
  assert.equal((await request(c,'assessment','production_run_get',{runId:c.run.id},{cookie:'session=anything'})).status,403);
  await assert.rejects(runs.execute({actorUserId:access.actorUserId,scope:'DEMO'} as CatalogAdminAccess,c.grants.assessment.token,'production_run_get',{runId:c.run.id}));
  await assert.rejects(runs.execute(c.grants.assessment.access,other.grants.assessment.token,'module_attempt_claim',claimBody(c,'assessment','wrong-proof')));
  const credential=await app.get(MachineCredentialsService).create(access,{name:'另一个同域连接',domain:'assessment',workspaceId:c.workspace.id,
    permissions:['content:write','projects:read','skills:read','context:read'],productIds:[],skillIds:[],expiresAt:new Date(Date.now()+3600_000).toISOString(),requestId:randomUUID()});
  const actor=await app.get(CatalogAdminAccessService).authorizeMachine(credential.token!,'assessment');
  await assert.rejects(runs.execute(actor,credential.token!,'module_attempt_event',eventBody(a)));
});
test('credential revocation and explicit run cancellation stop later receipts while preserving history and partial outputs',async()=>{
  const c=await fresh();await methods(c,'assessment');const a=await claim(c,'assessment');await app.get(MachineCredentialsService).revoke(access,c.grants.assessment.id,{requestId:randomUUID()});
  await assert.rejects(event(c,'assessment',a));assert.equal(await fixture.runtime.client.externalAttemptEvent.count({where:{attemptId:a.attempt.id}}),1);
  const other=await fresh();await methods(other,'assessment');const active=await claim(other,'assessment'),g=other.grants.assessment;
  const cancelled=ProductionRunSchema.parse(await runs.execute(g.access,g.token,'production_run_cancel',{runId:other.run.id,reason:'人工停止接续',requestId:randomUUID()}));
  assert.ok(cancelled.cancelledAt);await assert.rejects(event(other,'assessment',active));await assert.rejects(claim(other,'assessment'));
  assert.ok(await runs.readAdmin(access,other.run.id));
});
test('an INSERT failure cannot leave a lease without its first receipt and immutable anchors cannot be rewritten',async()=>{
  const c=await fresh();await methods(c,'assessment');const body=claimBody(c,'assessment'),g=c.grants.assessment;
  await fixture.owner.client.$executeRaw(Prisma.sql`REVOKE INSERT ON orai.external_attempt_events FROM orai_app`);
  try{await assert.rejects(runs.execute(g.access,g.token,'module_attempt_claim',body));}
  finally{await fixture.owner.client.$executeRaw(Prisma.sql`GRANT INSERT ON orai.external_attempt_events TO orai_app`);}
  assert.equal(await fixture.runtime.client.externalProductionAttempt.count({where:{runId:c.run.id}}),0);assert.equal(await fixture.runtime.client.externalModuleLease.count({where:{runId:c.run.id}}),0);
  const claimed=ProductionAttemptClaimedSchema.parse(await runs.execute(g.access,g.token,'module_attempt_claim',body));
  await assert.rejects(fixture.runtime.client.externalProductionAttempt.update({where:{id:claimed.attempt.id},data:{inputFingerprint:'0'.repeat(64)}}));
  await assert.rejects(fixture.runtime.client.externalAttemptEvent.deleteMany({where:{attemptId:claimed.attempt.id}}));
  await assert.rejects(fixture.runtime.client.externalProductionAttempt.update({where:{id:claimed.attempt.id},data:{revision:1,state:'producing'}}));
});
test('a fresh official SDK process restores the durable attempt and original external job without a second attempt or job creation',async()=>{
  const c=await fresh();await methods(c,'assessment');const g=c.grants.assessment,jobId='synthetic-job-'+randomUUID(),
    scenario={runId:c.run.id,planModuleId:c.module('assessment').id,jobId};
  const invoke=async(phase:string)=>{
    const {stdout,stderr}=await promisify(execFile)(process.execPath,['../../packages/mcp/test/real-run-client.mjs'],{env:{...process.env,
      ORAI_MCP_API_URL:base,ORAI_MCP_TOKEN:g.token,ORAI_MCP_DOMAIN:'assessment',ORAI_MCP_ALLOWED_ROOT:process.cwd(),
      ORAI_MCP_RUN_SCENARIO_JSON:JSON.stringify({...scenario,phase,...(phase==='start'?{claim:claimBody(c,'assessment','sdk-recovery')}: {})})},maxBuffer:1_000_000});
    assert.equal(stderr,'');assert.equal(stdout.includes(g.token),false);return JSON.parse(stdout);
  };
  const first=await invoke('start'),resumed=await invoke('resume');
  assert.notEqual(first.pid,resumed.pid);assert.equal(resumed.attemptId,first.attemptId);assert.equal(resumed.jobId,jobId);
  assert.equal(resumed.nextAction,'inspect_existing_job');assert.equal(resumed.state,'uploading');assert.equal(resumed.revision,2);assert.equal(resumed.platformExecuted,false);
  assert.equal(await fixture.runtime.client.externalProductionAttempt.count({where:{runId:c.run.id}}),1);
  assert.equal(await fixture.runtime.client.externalAttemptEvent.count({where:{attemptId:resumed.attemptId}}),3);
});
test('native output edits invalidate the saved status even before a new production record exists, while old receipts stay readable',async()=>{
  const c=await fresh();await methods(c,'assessment');const a=await claim(c,'assessment'),record=await assessment(c),g=c.grants.assessment;
  await runs.execute(g.access,g.token,'module_attempt_complete',completeBody(a,record));
  const config=await fixture.runtime.client.productVersion.findUniqueOrThrow({where:{id:c.drafts.assessment.productVersionId!}});
  await projects.execute(g.access,'project_draft_save',{planModuleId:c.module('assessment').id,expectedModuleDigest:c.module('assessment').digest,methods:c.methods.assessment,requestId:randomUUID(),
    payload:{kind:'assessment',configuration:config.configuration,expectedRevision:config.revision,productVersionId:config.id}});
  const current=ProductionRunSchema.parse(await runs.execute(g.access,g.token,'production_run_get',{runId:c.run.id}));
  assert.equal(current.modules[0]!.state,'needs_recheck');assert.equal(current.modules[0]!.recordId,record.id);
  const read=await claim(c,'assessment');assert.equal(read.nextAction,'explicit_retry_required');assert.equal(read.leaseToken,null);
  const retry=await claim(c,'assessment','sdk-repair',{retryOfAttemptId:a.attempt.id});assert.notEqual(retry.attempt.id,a.attempt.id);
  await assert.rejects(runs.execute(g.access,g.token,'module_attempt_complete',completeBody(retry,record)));
});
test('video failure and missing inputs preserve their failure state and never discard an independently saved assessment',async()=>{
  const c=await fresh();await methods(c,'assessment');const a=await claim(c,'assessment'),record=await assessment(c),g=c.grants.assessment;
  await runs.execute(g.access,g.token,'module_attempt_complete',completeBody(a,record));
  const video=await claim(c,'video');assert.equal(video.nextAction,'prepare_inputs');
  await event(c,'video',video,'failed',{reason:'成片工具不可用，等待人工处理。',reasonCode:'tool-unavailable'});
  const read=ProductionRunSchema.parse(await runs.execute(g.access,g.token,'production_run_get',{runId:c.run.id}));
  assert.equal(read.modules.find(m=>m.domain==='video')!.state,'failed');assert.equal(read.modules[0]!.recordId,record.id);
  assert.equal(read.modules[0]!.state,'saved_draft');assert.equal(await fixture.runtime.client.projectProductionRecord.count({where:{productId:c.project.productId}}),1);
});
test('product parameters and instructions create immutable effective methods while reusing the exact unchanged base skill',async()=>{
  const c=await fresh();await methods(c,'assessment');const g=c.grants.assessment,module=c.module('assessment'),
    original=MachineProjectMethodSnapshotSchema.parse(await projects.execute(g.access,'project_method_get',{snapshotId:c.methods.assessment[0]!.snapshotId})),
    source=await fixture.runtime.client.styleSkillVersion.findUniqueOrThrow({where:{id:original.version.id}}),
    body={planModuleId:module.id,expectedModuleDigest:module.digest,purpose:original.purpose,sourceVersionId:source.id,expectedSourceDigest:source.digest,
      expectedSourceRevision:source.revision,customization:{parameters:{audience:'初识自我','question-count':6},instructions:'使用具体的日常选择，不贴人格标签。'},requestId:randomUUID()};
  const first=MachineProjectMethodSnapshotSchema.parse(await projects.execute(g.access,'project_method_capture',body)),
    retried=MachineProjectMethodSnapshotSchema.parse(await projects.execute(g.access,'project_method_capture',{...body,requestId:randomUUID(),
      customization:{...body.customization,parameters:{'question-count':6,audience:'初识自我'}}}));
  assert.equal(first.id,retried.id);assert.deepEqual(first.version,original.version);assert.ok(first.customization!.effectiveInstructions.startsWith(original.version.manifest.instructions));
  assert.ok(first.customization!.effectiveInstructions.includes('本商品补充方法'));assert.equal(first.customization!.parameters['question-count'],6);
  c.methods.assessment[0]={snapshotId:first.id,digest:first.digest};const a=await claim(c,'assessment');await event(c,'assessment',a,'failed');
  const changed=MachineProjectMethodSnapshotSchema.parse(await projects.execute(g.access,'project_method_capture',{...body,requestId:randomUUID(),
    customization:{...body.customization,instructions:'换成双方沟通的日常选择。'}}));
  assert.notEqual(changed.id,first.id);c.methods.assessment[0]={snapshotId:changed.id,digest:changed.digest};
  const next=await claim(c,'assessment','adapted-retry',{retryOfAttemptId:a.attempt.id});assert.notEqual(next.attempt.inputFingerprint,a.attempt.inputFingerprint);
  assert.deepEqual(await fixture.runtime.client.styleSkillVersion.findUniqueOrThrow({where:{id:source.id}}),source);
  const record=await assessment(c);await runs.execute(g.access,g.token,'module_attempt_complete',completeBody(next,record));
  const review=await app.get(ProjectReviewService).preview(access,c.project.productId,{planRevisionId:c.plan.id,records:[{recordId:record.id,digest:record.digest}]});
  assert.equal(review.manifest.methods.find(m=>m.id===changed.id)!.customization!.instructions,'换成双方沟通的日常选择。');
});
test('project aggregation pins plan, run and review identities and never mixes a historical review with current draft heads',async()=>{
  const c=await fresh();await methods(c,'assessment');const a=await claim(c,'assessment'),record=await assessment(c),g=c.grants.assessment;
  await runs.execute(g.access,g.token,'module_attempt_complete',completeBody(a,record));
  const workspaces=app.get(ProjectWorkspaceService),reviews=app.get(ProjectReviewService),review=await reviews.save(access,c.project.productId,{
    selection:{planRevisionId:c.plan.id,records:[{recordId:record.id,digest:record.digest}]},expectedRevision:0,note:'固定审核版本',requestId:randomUUID()});
  await assessment(c,c.drafts.assessment.revision);
  const newer=await app.get(ProductionPlansService).save(access,c.project.productId,{plan:{...c.plan.plan,title:'新计划'},expectedRevision:1,requestId:randomUUID()});
  const live=await workspaces.read(access,c.project.productId,{});assert.equal(live.plan!.id,newer.id);assert.equal(live.records.length,0);assert.equal(live.methods.length,0);
  const snapshot=await workspaces.read(access,c.project.productId,{reviewId:review.id});assert.equal(snapshot.source,'review_snapshot');assert.equal(snapshot.plan!.id,c.plan.id);
  assert.deepEqual(snapshot.records,review.manifest.records);assert.deepEqual(snapshot.methods,review.manifest.methods);assert.deepEqual(snapshot.content,review.manifest.content);
  const runView=await workspaces.read(access,c.project.productId,{runId:c.run.id});assert.equal(runView.source,'run');assert.equal(runView.records[0]!.id,record.id);
  assert.equal(runView.run!.modules[0]!.needsRecheck,true);assert.equal(runView.plan!.id,c.plan.id);
  await assert.rejects(workspaces.read(access,c.project.productId,{planRevisionId:newer.id,reviewId:review.id}));
  await assert.rejects(workspaces.read(access,c.project.productId,{runId:c.run.id,reviewId:review.id}));
});
test('empty projects return an honest empty workspace and aggregation rejects machine, foreign targets and forged administrators',async()=>{
  const workspaces=app.get(ProjectWorkspaceService),empty=await workspaces.read(access,demoId('demo-partner'),{});
  assert.equal(empty.plan,null);assert.deepEqual(empty.records,[]);assert.deepEqual(empty.methods,[]);
  const c=await fresh(),other=await fresh();
  await assert.rejects(workspaces.read(c.grants.assessment.access,c.project.productId,{}));
  await assert.rejects(workspaces.read({actorUserId:access.actorUserId,scope:'DEMO'} as CatalogAdminAccess,c.project.productId,{}));
  await assert.rejects(workspaces.read(access,c.project.productId,{planRevisionId:other.plan.id}));
  await assert.rejects(workspaces.read(access,c.project.productId,{runId:other.run.id}));
  const response=await fetch(base+'/api/admin/products/'+c.project.productId+'/project-workspace',{headers:{authorization:'Bearer '+c.grants.assessment.token}});
  assert.equal(response.status,401);assert.equal(JSON.stringify(await response.json()).includes(c.grants.assessment.token),false);
});
const stageLimits={maxAttempts:4,maxConcurrency:2,maxDurationSeconds:600,maxReportedCostFen:null,maxReportedTokens:null};
test('stage concurrency and total attempts are shared by the fixed production domains and cannot be relabeled by a client event',async()=>{
  const c=await fresh({stageLimits:{S5:{...stageLimits,maxConcurrency:1,maxAttempts:2}}});await methods(c,'cover');await methods(c,'copy');
  const cover=await claim(c,'cover');await assert.rejects(claim(c,'video'));const copy=await claim(c,'copy');assert.ok(copy.leaseToken);
  await event(c,'cover',cover,'failed',{step:'S3',reason:'外部阶段标签不改变固定领域的预算归属。'});
  const video=await claim(c,'video');await event(c,'video',video,'failed');
  await assert.rejects(claim(c,'cover','retry-cover',{retryOfAttemptId:cover.attempt.id}));
  assert.equal(await fixture.runtime.client.externalProductionAttempt.count({where:{runId:c.run.id,domain:{in:['cover','video']}}}),2);
  assert.equal((await fixture.runtime.client.externalProductionAttempt.findUniqueOrThrow({where:{id:copy.attempt.id}})).state,'waiting_input');
});
test('declared stage cost and tokens stop new work in that stage while preserving unknowns, partial receipts and other stages',async()=>{
  for(const metric of ['cost','tokens'] as const){
    const c=await fresh({stageLimits:{S5:{...stageLimits,...(metric==='cost'?{maxReportedCostFen:10}:{maxReportedTokens:10})}}});await methods(c,'cover');
    const cover=await claim(c,'cover'),failed=await event(c,'cover',cover,'failed',{reportedCostFen:metric==='cost'?10:null,reportedTokens:metric==='tokens'?10:null});
    assert.equal(metric==='cost'?failed.reportedTokens:failed.reportedCostFen,null);assert.equal(failed.events.at(-1)!.metricsSource,'external_declaration');
    await assert.rejects(claim(c,'video'));const assessment=await claim(c,'assessment');assert.ok(assessment.leaseToken);
    const read=ProductionRunSchema.parse(await runs.execute(c.grants.assessment.access,c.grants.assessment.token,'production_run_get',{runId:c.run.id}));
    assert.equal(read.modules.find(m=>m.domain==='cover')!.state,'failed');assert.equal(read.platformExecuted,false);
  }
});
test('stage deadlines begin at the first stage attempt, bound renewal and cannot revive expired work or reset on a new module',async()=>{
  const c=await fresh({stageLimits:{S5:{...stageLimits,maxDurationSeconds:60}}});await methods(c,'cover');clockStamp+=30_000;
  const first=await claim(c,'cover'),g=c.grants.cover,deadline=new Date(new Date(first.attempt.createdAt).getTime()+60_000).toISOString();clockStamp+=1000;
  const renewed=ProductionAttemptSchema.parse(await runs.execute(g.access,g.token,'module_attempt_renew',{attemptId:first.attempt.id,leaseToken:first.leaseToken,
    expectedRevision:0,leaseSeconds:120,requestId:randomUUID()}));assert.equal(renewed.leaseExpiresAt,deadline);
  first.attempt=renewed;clockStamp+=60_000;
  await assert.rejects(event(c,'cover',first,'uploading'));await assert.rejects(claim(c,'video'));
  await assert.rejects(runs.execute(g.access,g.token,'module_attempt_renew',{attemptId:first.attempt.id,leaseToken:first.leaseToken,expectedRevision:1,leaseSeconds:120,requestId:randomUUID()}));
  const other=await claim(c,'copy');assert.ok(other.leaseToken);
  const history=ProductionAttemptSchema.parse(await runs.execute(g.access,g.token,'module_attempt_get',{attemptId:first.attempt.id}));assert.equal(history.leaseActive,false);assert.equal(history.events.length,2);
});
test('zero batch or stage cost budget prevents the first production claim rather than treating an unknown cost as free',async()=>{
  const zero=await fresh({maxReportedCostFen:0});await methods(zero,'assessment');await assert.rejects(claim(zero,'assessment'));
  assert.equal(await fixture.runtime.client.externalProductionAttempt.count({where:{runId:zero.run.id}}),0);
  const stage=await fresh({stageLimits:{S5:{...stageLimits,maxReportedCostFen:0}}});await assert.rejects(claim(stage,'cover'));assert.ok((await claim(stage,'assessment')).leaseToken);
  assert.equal(await fixture.runtime.client.projectProductionRecord.count({where:{productId:stage.project.productId}}),0);
});
test('invalid stage policies never widen global caps or create a partial run and unknown stage names are rejected',async()=>{
  const c=await fresh(),g=c.grants.assessment;
  for(const policy of [{S5:{...stageLimits,maxAttempts:16}},{S5:{...stageLimits,maxConcurrency:5}},{S5:{...stageLimits,maxDurationSeconds:4000}},
    {S0:stageLimits},{}])await assert.rejects(runs.execute(g.access,g.token,'production_run_create',{...c.createBody,runKey:'invalid-stage',requestId:randomUUID(),limits:{...limits,stageLimits:policy}}));
  await assert.rejects(runs.execute(g.access,g.token,'production_run_create',{...c.createBody,runKey:'invalid-cost',requestId:randomUUID(),limits:{...limits,maxReportedCostFen:5,
    stageLimits:{S5:{...stageLimits,maxReportedCostFen:6}}}}));
  assert.equal(await fixture.runtime.client.externalProductionRun.count({where:{productId:c.project.productId}}),1);
});
test('stage policies are immutable run inputs, preserve genuine retry identities and do not retroactively modify legacy runs',async()=>{
  const c=await fresh({stageLimits:{S3:stageLimits,S5:{...stageLimits,maxAttempts:2}}}),g=c.grants.assessment;
  const again=ProductionRunSchema.parse(await runs.execute(g.access,g.token,'production_run_create',{...c.createBody,requestId:randomUUID(),limits:{...c.createBody.limits,
    stageLimits:{S5:{...stageLimits,maxAttempts:2},S3:stageLimits}}}));assert.equal(again.id,c.run.id);assert.deepEqual(again.limits,c.run.limits);
  await assert.rejects(runs.execute(g.access,g.token,'production_run_create',{...c.createBody,requestId:randomUUID(),limits:{...c.createBody.limits,stageLimits:{S5:{...stageLimits,maxAttempts:3}}}}));
  const {stdout,stderr}=await promisify(execFile)(process.execPath,['../../packages/mcp/test/real-project-client.mjs'],{env:{...process.env,
    ORAI_MCP_API_URL:base,ORAI_MCP_TOKEN:g.token,ORAI_MCP_DOMAIN:'assessment',ORAI_MCP_ALLOWED_ROOT:process.cwd(),
    ORAI_MCP_PROJECT_SCENARIO_JSON:JSON.stringify({calls:[{name:'production_run_create',input:{...c.createBody,requestId:randomUUID()}},
      {name:'production_run_get',input:{runId:c.run.id}}]})},maxBuffer:1_000_000});
  assert.equal(stderr,'');const sdk=JSON.parse(stdout);assert.equal(sdk.ok,true);assert.equal(sdk.results[0].data.id,c.run.id);assert.deepEqual(sdk.results[1].data.limits,c.run.limits);
  const legacy=await fresh();assert.equal(legacy.run.limits.stageLimits,undefined);const a=await claim(legacy,'assessment');assert.equal(a.attempt.reportedCostFen,null);
});
