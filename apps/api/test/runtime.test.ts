import 'reflect-metadata';
import { reviewThreejsFixture } from './publication-fixture';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { QuestionsResponseSchema, ReportResponseSchema, SaveAnswerResponseSchema, FeedbackSchema } from '@orai/contracts/private';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/config/configuration';
import { loadConfiguration } from '../src/config/configuration';
import { AdminRetentionPreviewSchema } from '@orai/contracts/admin';
import { configureApp } from '../src/common/configure-app';
import { ApiException } from '../src/common/http-errors';
import { VersionsService } from '../src/catalog/versions.service';
import { Prisma } from '../src/generated/prisma/client';
import { RetentionService } from '../src/runtime/retention.service';
import { credentialDigest } from '../src/redemption/credentials';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { DeliveryAdminService } from '../src/redemption/delivery-admin.service';
import { demoId, DemoIdentityScenarios, DemoProducts } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';

let fixture: Awaited<ReturnType<typeof createLocalFixture>>, app: INestApplication, base: string;
let authority: CatalogAdminAccess, delivery: DeliveryAdminService;
before(async()=>{
  fixture=await createLocalFixture('t05');
  const configuration={...fixture.configuration,security:{...fixture.configuration.security,claimIpLimit:1000,claimCodeLimit:1000,readIpLimit:2000,writeIpLimit:2000}};
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue(configuration).compile();
  app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');base=await app.getUrl();
  authority=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);
  delivery=app.get(DeliveryAdminService);
});
after(async()=>{await app?.close();await fixture?.close();});
class Browser {
  constructor(private readonly target=base) {}
  cookies=new Map<string,string>();csrf='';
  async request(path:string,method='GET',body?:unknown,headers:Record<string,string>={}) {
    const response=await fetch(this.target+path,{method,headers:{origin:'http://127.0.0.1:5173',cookie:[...this.cookies].map(([k,v])=>k+'='+v).join('; '),
      ...(method==='GET'?{}:{'content-type':'application/json','x-csrf-token':this.csrf}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
    for(const item of response.headers.getSetCookie()){const [name,...parts]=item.split(';')[0]!.split('=');const value=parts.join('=');if(value)this.cookies.set(name!,value);else this.cookies.delete(name!);}
    return {response,body:response.status===204?null:await response.json()};
  }
  async bootstrap(){const result=await this.request('/api/session/context');assert.equal(result.response.status,200);this.csrf=result.body.csrfToken;}
  async start(id:string,requestId=randomUUID()){return this.request('/api/attempts','POST',{entitlementId:id,requestId});}
  async save(id:string,question:string,optionId:string,expectedRevision:number,requestId=randomUUID()){return this.request('/api/attempts/'+id+'/answers/'+question,'PUT',{optionId,expectedRevision,requestId});}
  async submit(id:string,expectedRevision:number,requestId=randomUUID()){return this.request('/api/attempts/'+id+'/submit','POST',{expectedRevision,requestId});}
}
async function owned(versionId=demoId('demo-partner-v2')) {
  const order=await delivery.recordOrder(authority,{platform:'manual',reference:'demo:t05:'+randomUUID(),productVersionId:versionId,scope:'demo',quantity:1,amountFen:990,requestId:randomUUID()});
  const batch=await delivery.issueOrder(authority,order.id,{requestId:randomUUID()}),browser=new Browser();await browser.bootstrap();
  const claim=await browser.request('/api/redemptions/claim','POST',{code:batch.deliveries[0]!.code,requestId:randomUUID()});assert.equal(claim.response.status,200);
  return {browser,entitlementId:claim.body.entitlement.id as string,code:batch.deliveries[0]!.code,codeId:batch.deliveries[0]!.id,orderId:order.id};
}
async function started(versionId=demoId('demo-partner-v2')) {
  const value=await owned(versionId),result=await value.browser.start(value.entitlementId);assert.equal(result.response.status,200);
  return {...value,questions:QuestionsResponseSchema.parse(result.body)};
}
async function fill(session:Awaited<ReturnType<typeof started>>,choice='often'){
  let revision=session.questions.revision;
  for(const question of session.questions.questions){const response=await session.browser.save(session.questions.attemptId,question.id,choice,revision);assert.equal(response.response.status,200);revision=response.body.attemptRevision;}
  return revision;
}
async function complete(session:Awaited<ReturnType<typeof started>>,choice='often'){
  const revision=await fill(session,choice),result=await session.browser.submit(session.questions.attemptId,revision);assert.equal(result.response.status,200);return {revision,report:ReportResponseSchema.parse(result.body)};
}
async function fixtureBrowser(key:string){const browser=new Browser();browser.cookies.set('orai_session',fixture.credentials.sessions[key]!);await browser.bootstrap();return browser;}
async function questionCount(versionId=demoId('demo-partner-v2'),questionId='question-1'){return (await fixture.runtime.client.questionStat.findUnique({where:{productVersionId_questionId:{productVersionId:versionId,questionId}}}))?.answerCount??0;}
async function resultCount(versionId=demoId('demo-partner-v2')){return (await fixture.runtime.client.resultStat.findUnique({where:{productVersionId:versionId}}))?.completedCount??0;}
async function freshVersion(configuration=structuredClone(DemoProducts[0]!.configurations[1]!)){
  const versions=app.get(VersionsService);
  const value=await versions.importConfiguration(authority,demoId('demo-partner'),{configuration,requestId:randomUUID()});
  await reviewThreejsFixture(app,fixture,authority,value.id);
  await versions.review(authority,demoId('demo-partner'),value.id,{requestId:randomUUID()});
  await versions.publish(authority,demoId('demo-partner'),value.id,{requestId:randomUUID()});return value.id;
}

test('three placeholder products use owned version questions, save, report and code recovery without extra consumption',async()=>{
  for(const product of DemoProducts){
    const version=demoId(product.slug+'-v'+product.configurations.length),session=await started(version);
    assert.equal(session.questions.questions.length,product.configurations.at(-1)!.questions.length);assert.equal(session.questions.answers.length,0);
    let revision=session.questions.revision;
    for(const question of session.questions.questions){const saved=await session.browser.save(session.questions.attemptId,question.id,'often',revision);assert.equal(saved.response.status,200);const value=SaveAnswerResponseSchema.parse(saved.body);revision=value.attemptRevision;}
    const completed=await session.browser.submit(session.questions.attemptId,revision);assert.equal(completed.response.status,200);
    const report=ReportResponseSchema.parse(completed.body);assert.equal(report.content.totalScore,100);assert.equal(report.content.versionNumber,product.configurations.length);
    assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:session.entitlementId}})).reportsConsumed,1);
    const other=new Browser();await other.bootstrap();const restored=await other.request('/api/redemptions/recover','POST',{code:session.code,requestId:randomUUID()});assert.equal(restored.body.entitlement.id,session.entitlementId);
    const resumed=await other.start(session.entitlementId);assert.equal(resumed.response.status,200);assert.equal(resumed.body.attemptId,session.questions.attemptId);assert.equal(resumed.body.status,'completed');
    const fetched=await other.request('/api/reports/'+report.id);assert.equal(fetched.response.status,200);assert.deepEqual(fetched.body,report);
    assert.equal(await fixture.runtime.client.attempt.count({where:{entitlementId:session.entitlementId}}),1);
  }
});

test('concurrent starts and request retries retain one attempt, original version and one start event',async()=>{
  const session=await owned(),requestId=randomUUID();
  const results=await Promise.all(Array.from({length:5},()=>session.browser.start(session.entitlementId,requestId)));
  assert.ok(results.every(value=>value.response.status===200));const ids=new Set(results.map(value=>value.body.attemptId));assert.equal(ids.size,1);
  assert.equal(await fixture.runtime.client.attempt.count({where:{entitlementId:session.entitlementId}}),1);
  assert.equal(await fixture.runtime.client.event.count({where:{dedupeKey:'start:'+results[0]!.body.attemptId}}),1);
  assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:session.entitlementId}})).reportsConsumed,0);
  assert.equal((await session.browser.start(session.entitlementId)).body.attemptId,results[0]!.body.attemptId);
});

test('every private runtime endpoint denies other ids, forged identity, invalid input and missing browser authorization',async()=>{
  const owner=await started(),stranger=await owned(),id=owner.questions.attemptId;
  for(const path of ['/api/attempts/'+id+'/questions','/api/attempts/'+id+'/feedback?questionId=question-1','/api/reports/'+demoId('report-population-0')])assert.equal((await stranger.browser.request(path)).response.status,404);
  assert.equal((await stranger.browser.start(owner.entitlementId)).response.status,404);
  assert.equal((await stranger.browser.save(id,'question-1','often',0)).response.status,404);
  assert.equal((await stranger.browser.submit(id,0)).response.status,404);
  assert.equal((await stranger.browser.request('/api/reports/'+demoId('report-population-0'),'DELETE',{requestId:randomUUID()})).response.status,404);
  const empty=new Browser();await empty.bootstrap();assert.equal((await empty.start(owner.entitlementId)).response.status,401);
  assert.equal((await owner.browser.request('/api/attempts/'+id+'/questions?scope=live')).response.status,400);
  assert.equal((await owner.browser.request('/api/attempts/'+id+'/feedback')).response.status,400);
  assert.equal((await owner.browser.request('/api/attempts/not-a-uuid/questions')).response.status,400);
  for(const extra of [{userId:DemoIdentityScenarios.admin.id},{score:100},{scope:'live'}])assert.equal((await owner.browser.request('/api/attempts/'+id+'/answers/question-1','PUT',{optionId:'often',expectedRevision:0,requestId:randomUUID(),...extra})).response.status,400);
  assert.equal((await owner.browser.save(id,'question-999','often',0)).response.status,404);assert.equal((await owner.browser.save(id,'question-1','unknown',0)).response.status,400);
  assert.equal((await owner.browser.request('/api/attempts/'+id+'/answers/question-1','PUT',{optionId:'often',expectedRevision:0,requestId:randomUUID()},{'x-csrf-token':''})).body.error.code,'CSRF_INVALID');
  const json=JSON.stringify(owner.questions);for(const field of ['points','weight','configuration','templates','ownerUserId','tokenDigest'])assert.equal(json.includes('"'+field+'"'),false);
});

test('duplicate saves are idempotent and altered or stale retries cannot overwrite later confirmed answers',async()=>{
  const session=await started(),id=session.questions.attemptId,requestId=randomUUID(),before=await questionCount();
  const results=await Promise.all([session.browser.save(id,'question-1','often',0,requestId),session.browser.save(id,'question-1','often',0,requestId)]);
  assert.ok(results.every(value=>value.response.status===200));assert.equal(await questionCount(),before+1);
  assert.equal((await session.browser.save(id,'question-1','rarely',0,requestId)).body.error.code,'IDEMPOTENCY_CONFLICT');
  assert.equal((await session.browser.save(id,'question-1','rarely',0)).body.error.code,'REVISION_CONFLICT');
  const changed=await session.browser.save(id,'question-1','rarely',1);assert.equal(changed.body.attemptRevision,2);
  assert.equal((await session.browser.save(id,'question-1','often',0,requestId)).body.error.code,'REVISION_CONFLICT');
  assert.equal((await fixture.runtime.client.attemptAnswer.findUniqueOrThrow({where:{attemptId_questionId:{attemptId:id,questionId:'question-1'}}})).optionId,'rarely');
  assert.equal(await questionCount(),before+1);
});

test('competing saves with the same revision accept one current choice and one contribution',async()=>{
  const session=await started(),id=session.questions.attemptId,before=await questionCount();
  const results=await Promise.all([session.browser.save(id,'question-1','often',0),session.browser.save(id,'question-1','rarely',0)]);
  assert.deepEqual(results.map(value=>value.response.status).sort(),[200,409]);assert.equal(await questionCount(),before+1);
  const progress=await session.browser.request('/api/attempts/'+id+'/questions');assert.equal(progress.body.revision,1);assert.equal(progress.body.answers.length,1);
});

test('choice replacement and not-applicable saves keep the denominator fixed and preserve answer revisions',async()=>{
  const session=await started(),id=session.questions.attemptId,before=await questionCount();
  for(const [revision,choice] of ['often','rarely','na','na'].entries()){const saved=await session.browser.save(id,'question-1',choice,revision);assert.equal(saved.response.status,200);assert.equal(saved.body.answer.revision,revision+1);assert.equal(await questionCount(),before+1);}
  const stats=await fixture.runtime.client.questionStat.findUniqueOrThrow({where:{productVersionId_questionId:{productVersionId:demoId('demo-partner-v2'),questionId:'question-1'}},include:{options:true}});
  assert.equal(stats.options.reduce((sum,value)=>sum+value.count,0),stats.answerCount);
});

test('corrupt answer aggregates roll back saves and a repaired retry commits once',async()=>{
  const session=await started(),id=session.questions.attemptId,key={productVersionId:demoId('demo-partner-v2'),questionId:'question-1'},before=await questionCount(),requestId=randomUUID();
  await fixture.runtime.client.questionStat.update({where:{productVersionId_questionId:key},data:{answerCount:before+1}});
  try {assert.equal((await session.browser.save(id,'question-1','often',0,requestId)).response.status,409);assert.equal(await fixture.runtime.client.attemptAnswer.count({where:{attemptId:id}}),0);assert.equal((await fixture.runtime.client.attempt.findUniqueOrThrow({where:{id}})).revision,0);}
  finally {await fixture.runtime.client.questionStat.update({where:{productVersionId_questionId:key},data:{answerCount:before}});}
  assert.equal((await session.browser.save(id,'question-1','often',0,requestId)).response.status,200);assert.equal(await questionCount(),before+1);
});

test('concurrent report submissions consume one credit and add one result and completion event',async()=>{
  const session=await started(),revision=await fill(session),before=await resultCount(),requestId=randomUUID(),id=session.questions.attemptId;
  const results=await Promise.all(Array.from({length:5},()=>session.browser.submit(id,revision,requestId)));
  assert.ok(results.every(value=>value.response.status===200));assert.equal(new Set(results.map(value=>value.body.id)).size,1);
  assert.equal(await resultCount(),before+1);assert.equal(await fixture.runtime.client.report.count({where:{attemptId:id}}),1);
  assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:session.entitlementId}})).reportsConsumed,1);
  assert.equal(await fixture.runtime.client.event.count({where:{dedupeKey:'complete:'+id}}),1);
  assert.equal((await session.browser.submit(id,revision+1,requestId)).body.error.code,'IDEMPOTENCY_CONFLICT');
  assert.equal((await session.browser.save(id,'question-1','rarely',revision)).body.error.code,'ATTEMPT_COMPLETED');
  assert.equal((await session.browser.submit(id,revision)).body.id,results[0]!.body.id);
});

test('incomplete or stale submissions leave no report or usage and all not-applicable answers create a null report',async()=>{
  const session=await started(),id=session.questions.attemptId;
  assert.equal((await session.browser.submit(id,0)).body.error.code,'ANSWERS_INCOMPLETE');assert.equal((await session.browser.submit(id,1)).body.error.code,'REVISION_CONFLICT');
  assert.equal(await fixture.runtime.client.report.count({where:{attemptId:id}}),0);assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:session.entitlementId}})).reportsConsumed,0);
  const result=await complete(session,'na');assert.equal(result.report.content.totalScore,null);assert.equal(result.report.content.resultTypeId,'insufficient');
  assert.ok(result.report.content.dimensions.every(value=>value.score===null&&value.applicableAnswers===0));
});

test('feedback excludes the current answer and conclusion with separate real thresholds and no individual data',async()=>{
  const completed=await fixtureBrowser('population-0'),partial=await fixtureBrowser('partial'),pending=await fixtureBrowser('pending');
  const read=await completed.request('/api/attempts/'+demoId('attempt-population-0')+'/feedback?questionId=question-1');assert.equal(read.response.status,200);const feedback=FeedbackSchema.parse(read.body);
  assert.equal(feedback.answers.sampleSize,21);assert.equal(feedback.results.sampleSize,20);assert.equal(feedback.answers.state,'ready');assert.equal(feedback.results.state,'ready');
  const unfinished=await partial.request('/api/attempts/'+demoId('attempt-partial')+'/feedback?questionId=question-1');assert.equal(unfinished.body.answers.sampleSize,21);assert.equal(unfinished.body.results.sampleSize,21);
  const pendingStart=await pending.start(demoId('entitlement-pending'));assert.equal(pendingStart.response.status,200);
  assert.equal((await pending.request('/api/attempts/'+pendingStart.body.attemptId+'/feedback?questionId=question-1')).response.status,403);
  assert.equal((await partial.request('/api/attempts/'+demoId('attempt-partial')+'/feedback?questionId=question-2')).response.status,403);
  const json=JSON.stringify(feedback);for(const field of ['attemptId','userId','reportId','snapshot','explanation','code'])assert.equal(json.includes('"'+field+'"'),false);
  await delivery.refundOrder(authority,demoId('order-population-1'),{requestId:randomUUID()});
  const boundary=await completed.request('/api/attempts/'+demoId('attempt-population-0')+'/feedback?questionId=question-1');assert.equal(boundary.body.answers.sampleSize,20);assert.equal(boundary.body.answers.state,'ready');assert.equal(boundary.body.results.sampleSize,19);assert.equal(boundary.body.results.state,'insufficient');assert.deepEqual(boundary.body.results.items,[]);
  await delivery.refundOrder(authority,demoId('order-population-2'),{requestId:randomUUID()});
  assert.equal((await completed.request('/api/attempts/'+demoId('attempt-population-0')+'/feedback?questionId=question-1')).body.answers.state,'insufficient');
});

test('new versions start with genuine empty statistics and never mix older samples',async()=>{
  const version=await freshVersion(),session=await started(version),first=await session.browser.save(session.questions.attemptId,'question-1','often',0);
  assert.equal(first.response.status,200);assert.equal(first.body.feedback.answers.state,'empty');assert.equal(first.body.feedback.results.state,'empty');assert.equal(first.body.feedback.answers.sampleSize,0);
  let revision=1;for(const question of session.questions.questions.slice(1)){const response=await session.browser.save(session.questions.attemptId,question.id,'often',revision);assert.equal(response.response.status,200);revision=response.body.attemptRevision;}
  assert.equal((await session.browser.submit(session.questions.attemptId,revision)).response.status,200);
  const self=await session.browser.request('/api/attempts/'+session.questions.attemptId+'/feedback?questionId=question-1');assert.equal(self.body.results.sampleSize,0);
  const other=await started(version),saved=await other.browser.save(other.questions.attemptId,'question-1','rarely',0);assert.equal(saved.body.feedback.answers.sampleSize,1);assert.equal(saved.body.feedback.results.sampleSize,1);assert.equal(saved.body.feedback.answers.state,'insufficient');
});

test('historical rights retain v1 rules after publication/unlisting and completed reports remain snapshots',async()=>{
  const browser=await fixtureBrowser('pending'),start=await browser.start(demoId('entitlement-pending'));assert.equal(start.body.versionNumber,1);
  let revision=start.body.revision;for(const question of start.body.questions){const result=await browser.save(start.body.attemptId,question.id,'sometimes',revision);assert.equal(result.response.status,200);revision=result.body.attemptRevision;}
  const submitted=await browser.submit(start.body.attemptId,revision);assert.equal(submitted.response.status,200);assert.equal(submitted.body.content.totalScore,50);assert.ok(submitted.body.content.explanation.includes('第一版'));
  const current=await fixture.runtime.client.product.findUniqueOrThrow({where:{id:demoId('demo-partner')}});
  await fixture.runtime.client.product.update({where:{id:current.id},data:{name:'后续商品名称 · 测试',status:'ARCHIVED'}});
  try {assert.deepEqual((await browser.request('/api/reports/'+submitted.body.id)).body,submitted.body);assert.equal((await browser.start(demoId('entitlement-pending'))).body.attemptId,start.body.attemptId);}
  finally {await fixture.runtime.client.product.update({where:{id:current.id},data:{name:current.name,status:current.status}});}
});

test('a real statistics SELECT failure never rolls back a committed answer and feedback can be retried',async()=>{
  const session=await started(),id=session.questions.attemptId,before=await questionCount(),requestId=randomUUID();
  await fixture.owner.client.$executeRawUnsafe('REVOKE SELECT ON orai.result_type_stats FROM orai_app');
  try {
    const saved=await session.browser.save(id,'question-1','often',0,requestId);assert.equal(saved.response.status,200);assert.equal(saved.body.feedbackStatus,'unavailable');assert.equal(saved.body.feedback,null);
    const read=await session.browser.request('/api/attempts/'+id+'/feedback?questionId=question-1');assert.equal(read.response.status,503);assert.equal(read.body.error.code,'SAMPLE_UNAVAILABLE');
    assert.equal(await questionCount(),before+1);assert.equal((await fixture.runtime.client.attempt.findUniqueOrThrow({where:{id}})).revision,1);
  } finally {await fixture.owner.client.$executeRawUnsafe('GRANT SELECT ON orai.result_type_stats TO orai_app');}
  const replay=await session.browser.save(id,'question-1','often',0,requestId);assert.equal(replay.response.status,200);assert.equal(replay.body.feedbackStatus,'ready');assert.equal(await questionCount(),before+1);
});

test('inconsistent result contributions roll back report, completion, usage and retry cache together',async()=>{
  const session=await started(),revision=await fill(session),version=demoId('demo-partner-v2'),before=await resultCount(version),requestId=randomUUID();
  await fixture.runtime.client.resultStat.update({where:{productVersionId:version},data:{completedCount:before+1}});
  try {
    assert.equal((await session.browser.submit(session.questions.attemptId,revision,requestId)).response.status,409);
    assert.equal(await fixture.runtime.client.report.count({where:{attemptId:session.questions.attemptId}}),0);
    assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:session.entitlementId}})).reportsConsumed,0);
    assert.equal((await fixture.runtime.client.attempt.findUniqueOrThrow({where:{id:session.questions.attemptId}})).status,'STARTED');
  } finally {await fixture.runtime.client.resultStat.update({where:{productVersionId:version},data:{completedCount:before}});}
  assert.equal((await session.browser.submit(session.questions.attemptId,revision,requestId)).response.status,200);assert.equal(await resultCount(version),before+1);
});

test('report deletion is permanent across retries and recovery; refunds still remove retained aggregate contribution',async()=>{
  const session=await started(),completed=await complete(session),report=completed.report,before=await resultCount(),requestId=randomUUID();
  assert.equal((await session.browser.request('/api/reports/'+report.id,'DELETE',{requestId})).response.status,204);
  assert.equal((await session.browser.request('/api/reports/'+report.id,'DELETE',{requestId})).response.status,204);
  assert.equal((await session.browser.request('/api/reports/'+report.id)).body.error.code,'REPORT_DELETED');
  assert.equal((await session.browser.submit(session.questions.attemptId,completed.revision)).body.error.code,'REPORT_DELETED');
  assert.equal(await resultCount(),before);assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:session.entitlementId}})).reportsConsumed,1);
  const other=new Browser();await other.bootstrap();const recovered=await other.request('/api/redemptions/recover','POST',{code:session.code,requestId:randomUUID()});assert.equal(recovered.body.entitlement.reportState,'deleted');
  assert.equal((await other.request('/api/reports/'+report.id)).body.error.code,'REPORT_DELETED');
  const cached=JSON.stringify(await fixture.runtime.client.idempotentRequest.findMany({where:{actorKey:'runtime:DEMO:'+session.entitlementId}}));assert.equal(cached.includes('snapshot'),false);assert.equal(cached.includes(report.content.explanation),false);
  await delivery.refundOrder(authority,session.orderId,{requestId:randomUUID()});assert.equal(await resultCount(),before-1);
  assert.equal((await fixture.runtime.client.report.findUniqueOrThrow({where:{id:report.id}})).snapshot,null);
});

test('report and entitlement expiry remain independent and expired content cannot be replayed by submit',async()=>{
  const expired=await fixtureBrowser('report-expired');assert.equal((await expired.request('/api/reports/'+demoId('report-report-expired'))).body.error.code,'REPORT_EXPIRED');
  assert.equal((await expired.submit(demoId('attempt-report-expired'),3)).body.error.code,'REPORT_EXPIRED');
  assert.equal((await expired.request('/api/reports/'+demoId('report-report-expired'),'DELETE',{requestId:randomUUID()})).response.status,204);
  const entitlement=await fixtureBrowser('entitlement-expired');assert.equal((await entitlement.request('/api/reports/'+demoId('report-entitlement-expired'))).body.error.code,'ENTITLEMENT_EXPIRED');
});

test('save/refund and submit/refund races cannot leave active access, negative counts or extra credits',async()=>{
  const saving=await started(),before=await questionCount();
  const first=await Promise.all([saving.browser.save(saving.questions.attemptId,'question-1','often',0),delivery.refundOrder(authority,saving.orderId,{requestId:randomUUID()})]);
  assert.ok([200,401,403,410].includes(first[0].response.status));assert.equal(await questionCount(),before);assert.equal((await fixture.runtime.client.attempt.findUniqueOrThrow({where:{id:saving.questions.attemptId}})).statsValid,false);
  const submitting=await started(),revision=await fill(submitting),resultBefore=await resultCount();
  const results=await Promise.all([submitting.browser.submit(submitting.questions.attemptId,revision),delivery.refundOrder(authority,submitting.orderId,{requestId:randomUUID()})]);
  assert.ok([200,401,403,410].includes(results[0].response.status));assert.equal(await resultCount(),resultBefore);
  const rights=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:submitting.entitlementId}});assert.equal(rights.status,'REVOKED');assert.ok(rights.reportsConsumed===0||rights.reportsConsumed===1);
  assert.equal((await submitting.browser.request('/api/attempts/'+submitting.questions.attemptId+'/questions')).response.status,401);
});

test('fresh ownership and invalid state checks reject a bound grant and a disabled answer record',async()=>{
  const session=await owned(),sessionRecord=await fixture.runtime.client.accessSession.findUniqueOrThrow({where:{tokenDigest:credentialDigest(session.browser.cookies.get('orai_session')!)}});
  await fixture.runtime.client.accessGrant.create({data:{sessionId:sessionRecord.id,entitlementId:demoId('entitlement-bound'),scope:'DEMO'}});
  assert.equal((await session.browser.request('/api/reports/'+demoId('report-bound'))).body.error.code,'ACCOUNT_REQUIRED');
  const invalid=await fixtureBrowser('invalid');assert.equal((await invalid.request('/api/attempts/'+demoId('attempt-invalid')+'/questions')).response.status,403);
});

test('concurrent independent attempts share only aggregates and finish without exhausting the transaction pool',async()=>{
  const version=await freshVersion(),sessions=await Promise.all(Array.from({length:5},()=>started(version)));
  const results=await Promise.all(sessions.map(session=>complete(session,'sometimes')));
  assert.equal(new Set(results.map(value=>value.report.id)).size,5);assert.ok(results.every(value=>value.report.content.totalScore===40));
  assert.equal(await resultCount(version),5);assert.equal(await questionCount(version),5);
});

test('retention preview requires real admin authority, excludes in-progress answers and performs no deletion',async()=>{
  const service=app.get(RetentionService),before={answers:await fixture.runtime.client.attemptAnswer.count(),reports:await fixture.runtime.client.report.count()};
  await assert.rejects(service.preview({actorUserId:DemoIdentityScenarios.admin.id,scope:'DEMO'} as CatalogAdminAccess,{}),(error:unknown)=>error instanceof ApiException&&error.code==='FORBIDDEN');
  const future=new Date(Date.now()+200*86400000).toISOString();
  const preview=await service.preview(authority,{asOf:future,page:1,pageSize:50});
  assert.equal(preview.dryRun,true);assert.equal(preview.scope,'demo');assert.ok(preview.rawAnswers.total>0);assert.ok(preview.reports.total>0);
  const active=await fixture.runtime.client.attempt.findMany({where:{status:{in:['STARTED','SUBMITTED']}}});
  assert.equal(preview.rawAnswers.items.some((value:{attemptId:string})=>active.some(attempt=>attempt.id===value.attemptId)),false);
  assert.equal(await fixture.runtime.client.attemptAnswer.count(),before.answers);assert.equal(await fixture.runtime.client.report.count(),before.reports);
  const json=JSON.stringify(preview);for(const field of ['answers','snapshot','tokenDigest','ownerUserId','optionId'])assert.equal(json.includes('"'+field+'"'),false);
});

test('retention preview CLI validates authority, dates and pagination without exposing or modifying content',async()=>{
  const execute=promisify(execFile),future=new Date(Date.now()+200*86400000).toISOString();
  const snapshot=await fixture.runtime.client.report.findMany({orderBy:{id:'asc'}});
  const args=['.test-build/scripts/retention-cli.js','--actor',DemoIdentityScenarios.admin.id,'--as-of',future];
  const run=async(extra:string[])=>AdminRetentionPreviewSchema.parse(JSON.parse((await execute(process.execPath,[...args,...extra],{env:fixture.env,maxBuffer:1_000_000})).stdout));
  const first=await run(['--page-size','1']),second=await run(['--page-size','1','--page','2']);
  assert.ok(first.rawAnswers.total>1);assert.ok(first.reports.total>1);assert.equal(first.rawAnswers.total,second.rawAnswers.total);
  assert.notEqual(first.rawAnswers.items[0]!.attemptId,second.rawAnswers.items[0]!.attemptId);assert.notEqual(first.reports.items[0]!.reportId,second.reports.items[0]!.reportId);
  const distant=await run(['--page','100000']);assert.deepEqual(distant.rawAnswers.items,[]);assert.equal(distant.rawAnswers.total,first.rawAnswers.total);
  for(const invalid of [['--page','0'],['--page-size','51'],['--as-of','invalid'],['--delete'],['--actor',DemoIdentityScenarios.verified.id]]) {
    await assert.rejects(execute(process.execPath,[...args,...invalid],{env:fixture.env,maxBuffer:1_000_000}),(error:any)=>{
      assert.equal(error.code,1);assert.equal(error.stdout,'');const json=JSON.parse(error.stderr);
      assert.ok(['VALIDATION_ERROR','FORBIDDEN'].includes(json.error.code));assert.equal(error.stderr.includes(fixture.env.DATABASE_URL),false);return true;
    });
  }
  await assert.rejects(execute(process.execPath,args,{env:{...fixture.env,APP_ENV:'production',NODE_ENV:'production'},maxBuffer:1_000_000}));
  await assert.rejects(app.get(RetentionService).preview(authority,{scope:'live'}), (error:unknown)=>error instanceof ApiException&&error.code==='VALIDATION_ERROR');
  const current=await app.get(RetentionService).preview(authority,{});assert.ok(new Date(current.asOf).getTime()<=Date.now());
  assert.deepEqual(await fixture.runtime.client.report.findMany({orderBy:{id:'asc'}}),snapshot);
});

test('a report read waiting behind deletion cannot return the earlier private snapshot',async()=>{
  const session=await started(),completed=await complete(session);let pending:ReturnType<Browser['request']>|undefined;
  await fixture.owner.client.$transaction(async tx=>{
    await tx.$queryRaw(Prisma.sql`SELECT id FROM orai.entitlements WHERE id=${session.entitlementId}::uuid FOR UPDATE`);
    pending=session.browser.request('/api/reports/'+completed.report.id);
    let waiting=false;
    for(let index=0;index<80;index++){
      const rows=await fixture.runtime.client.$queryRaw<{count:number}[]>(Prisma.sql`SELECT count(*)::integer AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%orai.entitlements%'`);
      if(rows[0]!.count>0){waiting=true;break;}await delay(25);
    }
    assert.equal(waiting,true,'Reader must actually wait at the entitlement lock');
    await tx.report.update({where:{id:completed.report.id},data:{snapshot:Prisma.DbNull,deletedAt:new Date()}});
  });
  const result=await pending!;assert.equal(result.response.status,410);assert.equal(result.body.error.code,'REPORT_DELETED');assert.equal('content' in result.body,false);
});

test('100-question, 12-dimension configurations finish through real HTTP with the default per-minute write allowance',async()=>{
  const configuration=structuredClone(DemoProducts[0]!.configurations[1]!);
  configuration.dimensions=Array.from({length:12},(_,index)=>({...configuration.dimensions[0]!,id:'dimension-'+(index+1),label:'演示维度 '+(index+1)}));
  configuration.questions=Array.from({length:100},(_,index)=>({...structuredClone(configuration.questions[0]!),id:'question-'+(index+1),dimensionId:'dimension-'+(index%12+1),text:'题量联调 · '+(index+1)}));
  const version=await freshVersion(configuration),session=await owned(version);
  // A second process has its own generated CSRF key when no key is configured,
  // as on CI. Do not let a developer's .env hide cross-process token misuse.
  const defaults=loadConfiguration({...fixture.env,CSRF_SIGNING_KEY:undefined,ANONYMOUS_WRITE_IP_LIMIT:undefined,ANONYMOUS_READ_IP_LIMIT:undefined});
  assert.equal(defaults.security.writeIpLimit,120);
  // Reset only this disposable fixture's counters so earlier stress tests do
  // not spend the default application's single-minute allowance.
  await fixture.runtime.client.requestRateBucket.deleteMany();
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue(defaults).compile();
  const bounded=module.createNestApplication({logger:false});configureApp(bounded);await bounded.listen(0,'127.0.0.1');
  try {
    const browser=new Browser(await bounded.getUrl());browser.cookies=new Map(session.browser.cookies);browser.csrf=session.browser.csrf;
    const foreignCsrf=await browser.start(session.entitlementId);
    assert.equal(foreignCsrf.response.status,403);assert.equal(foreignCsrf.body.error.code,'CSRF_INVALID');
    assert.equal(await fixture.runtime.client.attempt.count({where:{entitlementId:session.entitlementId}}),0);
    await browser.bootstrap();
    const first=await browser.start(session.entitlementId);assert.equal(first.response.status,200,'Starting the bounded attempt failed: '+JSON.stringify(first.body.error));assert.equal(first.body.questions.length,100);
    let revision=0;for(const question of first.body.questions){const saved=await browser.save(first.body.attemptId,question.id,'often',revision);assert.equal(saved.response.status,200);revision=saved.body.attemptRevision;}
    const submitted=await browser.submit(first.body.attemptId,revision);assert.equal(submitted.response.status,200);assert.equal(submitted.body.content.totalScore,100);assert.equal(submitted.body.content.dimensions.length,12);
    assert.equal((await browser.request('/api/reports/'+submitted.body.id)).response.status,200);
    assert.equal(await fixture.runtime.client.attemptAnswer.count({where:{attemptId:first.body.attemptId}}),100);
  } finally {await bounded.close();}
});
