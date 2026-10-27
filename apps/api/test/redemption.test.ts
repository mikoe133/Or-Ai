import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AnonymousSessionContextSchema, EntitlementPageSchema, RedemptionResponseSchema } from '@orai/contracts/private';
import { AppModule } from '../src/app.module';
import { APP_CONFIG, loadConfiguration, type AppConfiguration } from '../src/config/configuration';
import { configureApp } from '../src/common/configure-app';
import { ApiException } from '../src/common/http-errors';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { DeliveryAdminService } from '../src/redemption/delivery-admin.service';
import { EntitlementAccessService } from '../src/redemption/entitlement-access.service';
import { SessionsService, type AnonymousAccess } from '../src/redemption/sessions.service';
import { BrowserSecurityService, type BrowserMutationAccess } from '../src/redemption/browser-security.service';
import { credentialDigest, newCredential } from '../src/redemption/credentials';
import { Prisma } from '../src/generated/prisma/client';
import { demoId, DemoIdentityScenarios } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';

const execute = promisify(execFile), origin = 'http://127.0.0.1:5173';
let fixture: Awaited<ReturnType<typeof createLocalFixture>>, app: INestApplication, url: string, directory: string;
let administrator: CatalogAdminAccess, delivery: DeliveryAdminService, access: EntitlementAccessService, sessions: SessionsService;
let configuration: AppConfiguration;
const partnerV2 = demoId('demo-partner-v2');
const extraApps: INestApplication[] = [];
async function application(config: AppConfiguration) {
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG).useValue(config).compile();
  const instance = module.createNestApplication({ logger: false }); configureApp(instance); await instance.listen(0, '127.0.0.1'); return instance;
}
before(async () => {
  fixture = await createLocalFixture('t04'); directory = await mkdtemp(join(tmpdir(), 'orai-t04-'));
  configuration = { ...fixture.configuration, security: { ...fixture.configuration.security, claimIpLimit:1000, claimCodeLimit:1000, readIpLimit:2000 } };
  app = await application(configuration); url = await app.getUrl();
  administrator = await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.admin.id);
  delivery = app.get(DeliveryAdminService); access = app.get(EntitlementAccessService); sessions = app.get(SessionsService);
});
after(async () => { for (const instance of extraApps) await instance.close(); await app?.close(); await fixture?.close(); if(directory) await rm(directory,{recursive:true,force:true}); });
async function rejects(promise: Promise<unknown>, code: string) { await assert.rejects(promise, (error: unknown) => error instanceof ApiException && error.code === code); }
class Browser {
  cookies = new Map<string,string>(); csrf = '';
  constructor(readonly base=url, readonly expectedOrigin=origin, readonly sessionName='orai_session', readonly csrfName='orai_csrf') {}
  async request(path: string, method='GET', body?: unknown, headers: Record<string,string>={}) {
    const response = await fetch(this.base+path, { method, headers:{ origin:this.expectedOrigin, cookie:[...this.cookies].map(([k,v])=>k+'='+v).join('; '),
      ...(method==='GET'?{}:{'content-type':'application/json','x-csrf-token':this.csrf}), ...headers }, body: body===undefined ? undefined : JSON.stringify(body) });
    for(const item of response.headers.getSetCookie()) { const [name,...parts]=item.split(';')[0]!.split('='); const value=parts.join('='); if(value) this.cookies.set(name!,value); else this.cookies.delete(name!); }
    const value=response.status===204?null:await response.json(); return {response,body:value};
  }
  async bootstrap() { const result=await this.request('/api/session/context'); assert.equal(result.response.status,200); const context=AnonymousSessionContextSchema.parse(result.body); this.csrf=context.csrfToken; return result; }
  async claim(code: string, requestId=randomUUID(), action='claim') { return this.request('/api/redemptions/'+action,'POST',{code,requestId}); }
  token() { const value=this.cookies.get(this.sessionName); assert.equal(typeof value,'string'); return value!; }
}
async function order(quantity=1, versionId=partnerV2, reference='demo:t04:'+randomUUID()) {
  return delivery.recordOrder(administrator,{platform:'manual',reference,productVersionId:versionId,quantity,amountFen:990*quantity,scope:'demo',requestId:randomUUID()});
}
async function issued(quantity=1,versionId=partnerV2) { const record=await order(quantity,versionId); return delivery.issueOrder(administrator,record.id,{requestId:randomUUID()}); }
async function registered(code: string) { const browser=new Browser(); await browser.bootstrap(); const result=await browser.claim(code); assert.equal(result.response.status,200); return {browser,result:RedemptionResponseSchema.parse(result.body)}; }
async function anonymous(browser: Browser) { const proof=await sessions.fromToken(browser.token()); assert.equal(Boolean(proof),true); return proof!; }
const codeFor=(key:string)=>fixture.credentials.codes[key]!;
const sessionFor=(key:string)=>fixture.credentials.sessions[key]!;

test('real owner authority is required; invalid orders and scope cannot create delivery records',async()=>{
  const before=await fixture.runtime.client.order.count();
  await rejects(delivery.recordOrder({actorUserId:DemoIdentityScenarios.admin.id,scope:'DEMO'} as CatalogAdminAccess,{}),'FORBIDDEN');
  await rejects(delivery.recordOrder(administrator,{platform:'manual',reference:'demo:bad',productVersionId:partnerV2,quantity:0,amountFen:990,scope:'demo',requestId:randomUUID()}),'VALIDATION_ERROR');
  await rejects(delivery.recordOrder(administrator,{platform:'manual',reference:'demo:bad',productVersionId:partnerV2,quantity:1,amountFen:990,scope:'live',requestId:randomUUID()}),'FORBIDDEN');
  assert.equal(await fixture.runtime.client.order.count(),before);
});

test('concurrent order references reuse one order and reject mismatched quantities',async()=>{
  const reference='demo:t04:unique:'+randomUUID();
  const [a,b]=await Promise.all([order(2,partnerV2,reference),order(2,partnerV2,reference)]);
  assert.equal(a.id,b.id); assert.equal(await fixture.runtime.client.order.count({where:{platform:'MANUAL',reference}}),1);
  await rejects(order(3,partnerV2,reference),'CONFLICT');
});

test('concurrent batch issuance produces exactly the quantity; replay stores no plaintext',async()=>{
  const record=await order(3), request={requestId:randomUUID()};
  const results=await Promise.all([delivery.issueOrder(administrator,record.id,request),delivery.issueOrder(administrator,record.id,request)]);
  assert.equal(results.filter(value=>value.deliveryAvailable).length,1);
  const actual=results.find(value=>value.deliveryAvailable)!;
  assert.equal(actual.deliveries.length,3); assert.equal(new Set(actual.deliveries.map(value=>value.code)).size,3);
  const codes=await fixture.runtime.client.redemptionCode.findMany({where:{orderId:record.id}});
  assert.equal(codes.length,3); assert.equal(await fixture.runtime.client.codeBatch.count({where:{orderId:record.id}}),1);
  for(const value of actual.deliveries) { assert.equal(/^[A-Za-z0-9_-]{43}$/.test(value.code),true); assert.equal(codes.some(row=>row.id===value.id && row.digest===credentialDigest(value.code)),true); }
  const cache=JSON.stringify(await fixture.runtime.client.idempotentRequest.findMany());
  assert.equal(actual.deliveries.some(value=>cache.includes(value.code)),false);
  assert.equal((await fixture.runtime.client.order.findUniqueOrThrow({where:{id:record.id}})).status,'FULFILLED');
  await rejects(delivery.issueOrder(administrator,record.id,{requestId:randomUUID()}),'CONFLICT');
});

test('bootstrap does not grant an entitlement and cookie/form CSRF and origin checks are enforced',async()=>{
  const browser=new Browser(), before=await fixture.runtime.client.accessSession.count();
  const context=await browser.bootstrap(); assert.equal(context.body.authenticated,false); assert.equal(await fixture.runtime.client.accessSession.count(),before);
  const csrfCookie=context.response.headers.getSetCookie().find(value=>value.startsWith('orai_csrf='))!;
  for(const flag of ['HttpOnly','SameSite=Strict','Path=/']) assert.equal(csrfCookie.includes(flag),true);
  const raw=newCredential(), request={code:raw,requestId:randomUUID()};
  assert.equal((await browser.request('/api/redemptions/claim','POST',request,{'x-csrf-token':''})).body.error.code,'CSRF_INVALID');
  assert.equal((await browser.request('/api/redemptions/claim','POST',request,{origin:'https://evil.example'})).body.error.code,'ORIGIN_FORBIDDEN');
  assert.equal((await browser.request('/api/redemptions/claim','POST',request,{'sec-fetch-site':'cross-site'})).response.status,403);
  assert.equal((await browser.request('/api/redemptions/claim','POST',request,{'content-type':'application/x-www-form-urlencoded'})).response.status,400);
  const noOrigin=await fetch(url+'/api/redemptions/claim',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)});
  assert.equal(noOrigin.status,403);
});

test('signed CSRF tokens reject expiration, tampering and duplicate cookie injection',async()=>{
  const browser=new Browser(); await browser.bootstrap();
  const timestamp=String(Math.floor(Date.now()/1000)-configuration.security.csrfTtlSeconds-1),nonce=newCredential();
  const signature=createHmac('sha256',configuration.security.csrfSigningKey).update(timestamp+':'+nonce+':csrf-v1').digest('base64url');
  browser.csrf=timestamp+'.'+nonce+'.'+signature; browser.cookies.set('orai_csrf',browser.csrf);
  assert.equal((await browser.claim(newCredential())).body.error.code,'CSRF_INVALID');
  await browser.bootstrap(); const valid=browser.csrf; browser.csrf=valid.slice(0,-1)+(valid.endsWith('x')?'y':'x');
  assert.equal((await browser.claim(newCredential())).body.error.code,'CSRF_INVALID');
  browser.csrf=valid;
  assert.equal((await browser.request('/api/redemptions/claim','POST',{code:newCredential(),requestId:randomUUID()},{cookie:'orai_csrf='+valid+'; orai_csrf='+valid})).response.status,403);
});

test('claim and recover return the same version/rights with a digest-only HttpOnly session',async()=>{
  const batch=await issued(), value=batch.deliveries[0]!, browser=new Browser(); await browser.bootstrap();
  const requestId=randomUUID(), first=await browser.claim(value.code,requestId); assert.equal(first.response.status,200);
  const initial=RedemptionResponseSchema.parse(first.body); assert.equal(initial.disposition,'claimed'); assert.equal(initial.entitlement.versionNumber,2);
  assert.equal(initial.entitlement.reportsConsumed,0); assert.equal(initial.entitlement.reportState,'absent');
  const cookie=first.response.headers.getSetCookie().find(item=>item.startsWith('orai_session='))!;
  for(const flag of ['HttpOnly','SameSite=Strict','Path=/']) assert.equal(cookie.includes(flag),true);
  assert.equal(cookie.includes('Domain='),false);
  const session=await fixture.runtime.client.accessSession.findUniqueOrThrow({where:{tokenDigest:credentialDigest(browser.token())}}); assert.equal(session.scope,'DEMO');
  const replay=await browser.claim(value.code,requestId,'recover'); assert.equal(replay.response.status,200); assert.equal(replay.body.entitlement.id,initial.entitlement.id);
  assert.equal(await fixture.runtime.client.entitlement.count({where:{orderId:batch.receipt.orderId}}),1);
  assert.equal(await fixture.runtime.client.event.count({where:{dedupeKey:'redemption:'+value.id}}),1);
  const second=new Browser(); await second.bootstrap(); const recovered=await second.claim(value.code,randomUUID(),'recover');
  assert.equal(recovered.body.entitlement.id,initial.entitlement.id); assert.equal(recovered.body.entitlement.accessExpiresAt,initial.entitlement.accessExpiresAt);
  assert.equal(await fixture.runtime.client.accessGrant.count({where:{entitlementId:initial.entitlement.id}}),2);
});

test('concurrent devices and duplicate no-cookie requests create one entitlement without extra credit',async()=>{
  const batch=await issued(), raw=batch.deliveries[0]!.code;
  const browsers=Array.from({length:5},()=>new Browser()); for(const browser of browsers) await browser.bootstrap();
  const results=await Promise.all(browsers.map(browser=>browser.claim(raw)));
  assert.equal(results.every(value=>value.response.status===200),true); assert.equal(new Set(results.map(value=>value.body.entitlement.id)).size,1);
  const entitlement=await fixture.runtime.client.entitlement.findFirstOrThrow({where:{orderId:batch.receipt.orderId}}); assert.equal(entitlement.reportsAllowed,1); assert.equal(entitlement.reportsConsumed,0);
  const browser=new Browser(); await browser.bootstrap(); const id=randomUUID();
  const duplicate=await Promise.all([browser.claim(raw,id),browser.claim(raw,id)]);
  assert.equal(duplicate.every(value=>value.response.status===200),true); assert.equal(await fixture.runtime.client.entitlement.count({where:{orderId:batch.receipt.orderId}}),1);
});

test('changed request-id payload, invalid bodies and secret tracing headers cannot bypass validation',async()=>{
  const batch=await issued(2), browser=new Browser(); await browser.bootstrap(); const requestId=randomUUID();
  assert.equal((await browser.claim(batch.deliveries[0]!.code,requestId)).response.status,200);
  assert.equal((await browser.claim(batch.deliveries[1]!.code,requestId)).body.error.code,'IDEMPOTENCY_CONFLICT');
  for(const body of [{code:'123',requestId:randomUUID()},{code:batch.deliveries[1]!.code,requestId:randomUUID(),userId:DemoIdentityScenarios.admin.id},{code:batch.deliveries[1]!.code,requestId:randomUUID(),scope:'live'}]) {
    assert.equal((await browser.request('/api/redemptions/claim','POST',body)).response.status,400);
  }
  const secret=browser.token(), bad=await browser.request('/api/redemptions/claim','POST',{code:newCredential(),requestId:randomUUID()},{'x-request-id':secret});
  assert.equal(bad.response.status,404); assert.equal(bad.body.error.requestId===secret,false);
  assert.equal(JSON.stringify(bad.body).includes(secret),false);
});

test('unknown, expired and revoked codes leave sessions and entitlements unchanged',async()=>{
  const browser=new Browser(); await browser.bootstrap(); const before=await fixture.runtime.client.accessSession.count();
  for(const [raw,expected] of [[newCredential(),'CODE_INVALID'],[codeFor('unclaimed-EXPIRED'),'CODE_EXPIRED'],[codeFor('unclaimed-REVOKED'),'CODE_REVOKED']] as const) {
    const result=await browser.claim(raw); assert.equal(result.body.error.code,expected); assert.equal(result.response.headers.getSetCookie().some(value=>value.startsWith('orai_session=')),false);
  }
  const batch=await issued(); await fixture.runtime.client.redemptionCode.update({where:{id:batch.deliveries[0]!.id},data:{claimDeadline:new Date(Date.now()-1000)}});
  assert.equal((await browser.claim(batch.deliveries[0]!.code)).body.error.code,'CODE_EXPIRED');
  assert.equal(await fixture.runtime.client.entitlement.count({where:{orderId:batch.receipt.orderId}}),0); assert.equal(await fixture.runtime.client.accessSession.count(),before);
});

test('a claimed code ignores first-claim deadline and distinguishes report expiry from access expiry',async()=>{
  await fixture.runtime.client.redemptionCode.update({where:{id:demoId('code-report-expired')},data:{claimDeadline:new Date(Date.now()-86400000)}});
  const recovered=await registered(codeFor('report-expired')); assert.equal(recovered.result.entitlement.status,'active'); assert.equal(recovered.result.entitlement.reportState,'expired');
  const proof=await anonymous(recovered.browser); await rejects(access.requireReport(proof,demoId('report-report-expired')),'REPORT_EXPIRED');
  const browser=new Browser(); await browser.bootstrap(); assert.equal((await browser.claim(codeFor('entitlement-expired'))).body.error.code,'ENTITLEMENT_EXPIRED');
});

test('multi-product anonymous lists paginate, omit private fields and reject ID/bearer/query spoofing',async()=>{
  const browser=new Browser(); browser.cookies.set('orai_session',sessionFor('multiple-products')); await browser.bootstrap();
  const result=await browser.request('/api/session/entitlements?page=1&pageSize=1'); assert.equal(result.response.status,200);
  const page=EntitlementPageSchema.parse(result.body); assert.equal(page.total,2); assert.equal(page.items.length,1);
  const beyond=await browser.request('/api/session/entitlements?page=3&pageSize=1'); assert.equal(beyond.body.total,2); assert.equal(beyond.body.items.length,0);
  const json=JSON.stringify(result.body); for(const key of ['ownerUserId','digest','tokenDigest','configuration','snapshot','code']) assert.equal(json.includes('"'+key+'"'),false);
  assert.equal((await browser.request('/api/session/entitlements?userId='+DemoIdentityScenarios.admin.id)).response.status,400);
  assert.equal((await browser.request('/api/session/entitlements/'+demoId('entitlement-population-10'))).response.status,404);
  assert.equal((await browser.request('/api/session/entitlements?pageSize=51')).response.status,400);
  const stranger=new Browser(); assert.equal((await stranger.request('/api/session/entitlements','GET',undefined,{authorization:'Bearer '+randomUUID()})).response.status,401);
  const proof=await anonymous(browser); await rejects(access.requireAttempt(proof,demoId('attempt-population-10')),'NOT_FOUND');
  await rejects(access.requireReport(proof,demoId('report-population-10')),'NOT_FOUND');
  await rejects(access.requireEntitlement({sessionId:proof.sessionId,scope:'DEMO'} as AnonymousAccess,demoId('entitlement-pending')),'FORBIDDEN');
});

test('session expiry/revocation is rechecked and expired ownership metadata stays distinguishable',async()=>{
  const browser=new Browser(); browser.cookies.set('orai_session',sessionFor('expired')); assert.equal((await browser.request('/api/session/entitlements')).response.status,401);
  const active=await sessions.fromToken(sessionFor('pending')); assert.equal(Boolean(active),true);
  await fixture.runtime.client.accessSession.update({where:{id:active!.sessionId},data:{createdAt:new Date(Date.now()-20000),expiresAt:new Date(Date.now()-1000)}});
  await rejects(access.requireEntitlement(active!,demoId('entitlement-pending')),'AUTH_REQUIRED');
  const metadata=new Browser(); metadata.cookies.set('orai_session',sessionFor('entitlement-expired'));
  const list=await metadata.request('/api/session/entitlements'); assert.equal(list.response.status,200); assert.equal(list.body.items[0].status,'expired');
  const expiredProof=await anonymous(metadata); await rejects(access.requireEntitlement(expiredProof,demoId('entitlement-entitlement-expired')),'ENTITLEMENT_EXPIRED');
});

test('bootstrap clears a session revoked between credential lookup and the fresh check',async()=>{
  const instance=await application(configuration); extraApps.push(instance);
  const browser=new Browser(await instance.getUrl()); await browser.bootstrap();
  const batch=await issued(); assert.equal((await browser.claim(batch.deliveries[0]!.code)).response.status,200);
  const service=instance.get(SessionsService), lookup=service.fromRequest.bind(service);
  service.fromRequest=async request=>{
    const proof=await lookup(request);
    if(proof) await service.revoke(proof);
    return proof;
  };
  try {
    const context=await browser.bootstrap();
    assert.equal(context.body.authenticated,false); assert.equal(context.body.sessionExpiresAt,null);
    assert.equal(browser.cookies.has('orai_session'),false);
    assert.equal((await browser.request('/api/session/entitlements')).response.status,401);
  } finally { service.fromRequest=lookup; }
});

test('bound rights refuse anonymous recovery even with the code; deleted reports do not restore credit',async()=>{
  const browser=new Browser(); await browser.bootstrap(); const bound=await browser.claim(codeFor('bound')); assert.equal(bound.body.error.code,'ACCOUNT_REQUIRED');
  assert.equal(JSON.stringify(bound.body).includes(DemoIdentityScenarios.verified.id),false);
  const deleted=await registered(codeFor('deleted-report')); assert.equal(deleted.result.entitlement.reportState,'deleted'); assert.equal(deleted.result.entitlement.reportsConsumed,1);
  await rejects(access.requireReport(await anonymous(deleted.browser),demoId('report-deleted-report')),'REPORT_DELETED');
});

test('unlisting refuses new claims but existing rights still restore their original version',async()=>{
  const batch=await issued(), browser=new Browser(); await browser.bootstrap();
  await fixture.runtime.client.product.update({where:{id:demoId('demo-partner')},data:{status:'ARCHIVED'}});
  try {
    assert.equal((await browser.claim(batch.deliveries[0]!.code)).body.error.code,'CODE_INVALID');
    const existing=await browser.claim(codeFor('partial')); assert.equal(existing.response.status,200); assert.equal(existing.body.entitlement.versionNumber,1);
    assert.equal((await browser.request('/api/session/entitlements/'+demoId('entitlement-partial'))).response.status,200);
  } finally { await fixture.runtime.client.product.update({where:{id:demoId('demo-partner')},data:{status:'PUBLISHED'}}); }
});

test('replacement revokes old sessions/code and preserves attempt, expiry, report snapshot and consumed count',async()=>{
  const old=await registered(codeFor('population-0')), proof=await anonymous(old.browser);
  const entitlement=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:demoId('entitlement-population-0')}});
  const report=await fixture.runtime.client.report.findUniqueOrThrow({where:{id:demoId('report-population-0')}});
  const request={requestId:randomUUID()}, results=await Promise.all([delivery.replaceCode(administrator,demoId('code-population-0'),request),delivery.replaceCode(administrator,demoId('code-population-0'),request)]);
  assert.equal(results.filter(value=>value.deliveryAvailable).length,1); const actual=results.find(value=>value.deliveryAvailable)!;
  assert.equal(actual.deliveries.length,1); await rejects(access.requireReport(proof,report.id),'AUTH_REQUIRED');
  assert.equal((await old.browser.claim(codeFor('population-0'))).body.error.code,'CODE_REVOKED');
  const restored=await registered(actual.deliveries[0]!.code); assert.equal(restored.result.entitlement.id,entitlement.id); assert.equal(restored.result.entitlement.reportsConsumed,1);
  assert.equal(restored.result.entitlement.attemptId,report.attemptId); assert.equal(restored.result.entitlement.reportId,report.id);
  assert.deepEqual(await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:entitlement.id}}),entitlement);
  assert.deepEqual((await fixture.runtime.client.report.findUniqueOrThrow({where:{id:report.id}})).snapshot,report.snapshot);
  await rejects(delivery.replaceCode(administrator,demoId('code-population-0'),{requestId:randomUUID()}),'CONFLICT');
});

test('replacement preserves account binding and multi-product sessions retain their other grant',async()=>{
  const bound=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:demoId('entitlement-bound')}});
  const result=await delivery.replaceCode(administrator,demoId('code-bound'),{requestId:randomUUID()});
  assert.deepEqual(await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:bound.id}}),bound);
  const browser=new Browser(); await browser.bootstrap(); assert.equal((await browser.claim(result.deliveries[0]!.code)).body.error.code,'ACCOUNT_REQUIRED');
  const multiple=new Browser(); multiple.cookies.set('orai_session',sessionFor('multiple-products')); await multiple.bootstrap();
  await delivery.replaceCode(administrator,demoId('code-pending'),{requestId:randomUUID()});
  const page=await multiple.request('/api/session/entitlements'); assert.equal(page.response.status,200); assert.equal(page.body.total,1); assert.equal(page.body.items[0].id,demoId('entitlement-all-answered'));
  assert.equal((await multiple.request('/api/session/entitlements/'+demoId('entitlement-pending'))).response.status,403);
});

test('replacing an unclaimed expired code renews only first claim; expired entitlements cannot be revived',async()=>{
  const batch=await issued(); await fixture.runtime.client.redemptionCode.update({where:{id:batch.deliveries[0]!.id},data:{status:'EXPIRED',claimDeadline:new Date(Date.now()-1000)}});
  const replacement=await delivery.replaceCode(administrator,batch.deliveries[0]!.id,{requestId:randomUUID()});
  const claimed=await registered(replacement.deliveries[0]!.code); assert.equal(claimed.result.entitlement.reportsAllowed,1);
  assert.equal(await fixture.runtime.client.entitlement.count({where:{orderId:batch.receipt.orderId}}),1);
  await rejects(delivery.replaceCode(administrator,demoId('code-entitlement-expired'),{requestId:randomUUID()}),'ENTITLEMENT_EXPIRED');
});

test('refund atomically removes actual answer/result contributions and revokes all access without resetting snapshots',async()=>{
  const old=await registered(codeFor('population-1')), proof=await anonymous(old.browser), version=demoId('demo-partner-v1');
  const entitlement=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:demoId('entitlement-population-1')}});
  const report=await fixture.runtime.client.report.findUniqueOrThrow({where:{id:demoId('report-population-1')}});
  const question=await fixture.runtime.client.questionStat.findUniqueOrThrow({where:{productVersionId_questionId:{productVersionId:version,questionId:'question-1'}}});
  const result=await fixture.runtime.client.resultStat.findUniqueOrThrow({where:{productVersionId:version}});
  const request={requestId:randomUUID()}, refunds=await Promise.all([delivery.refundOrder(administrator,entitlement.orderId,request),delivery.refundOrder(administrator,entitlement.orderId,request)]);
  assert.equal(refunds.every(value=>value.status==='refunded'),true);
  assert.equal((await fixture.runtime.client.questionStat.findUniqueOrThrow({where:{productVersionId_questionId:{productVersionId:version,questionId:'question-1'}}})).answerCount,question.answerCount-1);
  assert.equal((await fixture.runtime.client.resultStat.findUniqueOrThrow({where:{productVersionId:version}})).completedCount,result.completedCount-1);
  const current=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:entitlement.id}}); assert.equal(current.status,'REVOKED'); assert.equal(current.reportsConsumed,entitlement.reportsConsumed);
  assert.deepEqual((await fixture.runtime.client.report.findUniqueOrThrow({where:{id:report.id}})).snapshot,report.snapshot);
  await rejects(access.requireReport(proof,report.id),'AUTH_REQUIRED'); assert.equal((await old.browser.claim(codeFor('population-1'))).body.error.code,'CODE_REVOKED');
  const count=(await fixture.runtime.client.resultStat.findUniqueOrThrow({where:{productVersionId:version}})).completedCount;
  await delivery.refundOrder(administrator,entitlement.orderId,{requestId:randomUUID()}); assert.equal((await fixture.runtime.client.resultStat.findUniqueOrThrow({where:{productVersionId:version}})).completedCount,count);
  assert.equal(await fixture.runtime.client.event.count({where:{dedupeKey:'refund:'+entitlement.orderId}}),1);
});

test('statistics inconsistency rolls back refund, grants, codes and audit; repaired counts allow retry',async()=>{
  const version=demoId('demo-partner-v1'), key={productVersionId_questionId:{productVersionId:version,questionId:'question-1'}};
  const original=await fixture.runtime.client.questionStat.findUniqueOrThrow({where:key}); const orderId=demoId('order-population-2'), request={requestId:randomUUID()};
  const beforeAudit=await fixture.runtime.client.adminAuditLog.count(); await fixture.runtime.client.questionStat.update({where:key,data:{answerCount:0}});
  try { await rejects(delivery.refundOrder(administrator,orderId,request),'CONFLICT'); }
  finally { await fixture.runtime.client.questionStat.update({where:key,data:{answerCount:original.answerCount}}); }
  assert.equal((await fixture.runtime.client.order.findUniqueOrThrow({where:{id:orderId}})).status,'FULFILLED');
  assert.equal((await fixture.runtime.client.redemptionCode.findUniqueOrThrow({where:{id:demoId('code-population-2')}})).status,'CLAIMED');
  assert.equal((await fixture.runtime.client.accessGrant.findUniqueOrThrow({where:{sessionId_entitlementId:{sessionId:demoId('session-population-2'),entitlementId:demoId('entitlement-population-2')}}})).revokedAt,null);
  assert.equal(await fixture.runtime.client.adminAuditLog.count(),beforeAudit);
  assert.equal((await delivery.refundOrder(administrator,orderId,request)).status,'refunded');
});

test('concurrent first claim/refund and logout/refund leave no active rights and no deadlock',async()=>{
  const batch=await issued(), browser=new Browser(); await browser.bootstrap();
  const results=await Promise.all([browser.claim(batch.deliveries[0]!.code),delivery.refundOrder(administrator,batch.receipt.orderId,{requestId:randomUUID()})]);
  assert.equal([200,410].includes(results[0].response.status),true); assert.equal(results[1].status,'refunded');
  assert.equal(await fixture.runtime.client.entitlement.count({where:{orderId:batch.receipt.orderId,status:'ACTIVE'}}),0);
  const client=await registered(codeFor('population-3'));
  const simultaneous=await Promise.all([client.browser.request('/api/session/logout','POST',{}),delivery.refundOrder(administrator,demoId('order-population-3'),{requestId:randomUUID()})]);
  assert.equal(simultaneous[0].response.status,204); assert.equal(simultaneous[1].status,'refunded');
  assert.equal((await client.browser.request('/api/session/entitlements')).response.status,401);
});

test('refund retains bound owner and ordinary logout can recover unbound rights without extra credit',async()=>{
  const previous=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:demoId('entitlement-bound')}});
  await delivery.refundOrder(administrator,previous.orderId,{requestId:randomUUID()});
  const current=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:previous.id}}); assert.equal(current.ownerUserId,previous.ownerUserId); assert.equal(current.ownership,'ACCOUNT_BOUND'); assert.equal(current.status,'REVOKED');
  const created=await issued(), client=await registered(created.deliveries[0]!.code), token=client.browser.token();
  assert.equal((await client.browser.request('/api/session/logout','POST',{})).response.status,204); assert.equal(await sessions.fromToken(token),undefined);
  await client.browser.bootstrap(); const recovered=await client.browser.claim(created.deliveries[0]!.code); assert.equal(recovered.body.entitlement.id,client.result.entitlement.id);
});

test('protected maintenance CLI writes 0600 files, refuses overwrite/replay plaintext and performs issue/replace/refund',async()=>{
  const input=join(directory,'order.json'), output=join(directory,'codes.json'), replacement=join(directory,'replacement.json');
  await writeFile(input,JSON.stringify({platform:'manual',reference:'demo:t04:cli:'+randomUUID(),productVersionId:partnerV2,quantity:2,amountFen:1980,scope:'demo'}),{mode:0o600});
  async function command(action:string,args:string[]=[],env=fixture.env) { const result=await execute(process.execPath,['.test-build/scripts/delivery-cli.js',action,'--actor',DemoIdentityScenarios.admin.id,...args],{env,maxBuffer:1_000_000}); return {raw:result.stdout,value:JSON.parse(result.stdout)}; }
  const record=(await command('order',['--input',input])).value, requestId=randomUUID();
  const issued=await command('issue',['--order',record.id,'--request-id',requestId,'--output',output]); const payload=JSON.parse(await readFile(output,'utf8'));
  assert.equal((await stat(output)).mode&0o777,0o600); assert.equal(payload.deliveries.length,2);
  for(const value of payload.deliveries) assert.equal(issued.raw.includes(value.code),false);
  const duplicateFile=join(directory,'duplicate.json'), replay=await command('issue',['--order',record.id,'--request-id',requestId,'--output',duplicateFile]);
  assert.equal(replay.value.deliveryAvailable,false); assert.equal(replay.value.deliveredCount,0); await assert.rejects(stat(duplicateFile));
  await assert.rejects(command('issue',['--order',record.id,'--request-id',requestId,'--output',output]));
  const changed=await command('replace',['--code-id',payload.receipt.codeIds[0],'--output',replacement]);
  assert.equal(changed.value.deliveredCount,1); assert.equal((await stat(replacement)).mode&0o777,0o600);
  assert.equal((await command('refund',['--order',record.id])).value.status,'refunded');
  const deniedOutput=join(directory,'denied.json');
  await assert.rejects(command('issue',['--order',record.id,'--output',deniedOutput],{...fixture.env,MIGRATION_DATABASE_URL:fixture.env.DATABASE_URL})); await assert.rejects(stat(deniedOutput));
});

test('shared database rate limits survive another API instance and forged forwarded IP; windows reset',async()=>{
  await fixture.runtime.client.requestRateBucket.deleteMany();
  const limitedConfig={...configuration,security:{...configuration.security,claimIpLimit:3,claimCodeLimit:1000}};
  const a=await application(limitedConfig), b=await application(limitedConfig); extraApps.push(a,b);
  const one=new Browser(await a.getUrl()), two=new Browser(await b.getUrl()); await one.bootstrap(); await two.bootstrap();
  for(const client of [one,two,one]) assert.equal((await client.claim(newCredential())).response.status,404);
  const blocked=await two.request('/api/redemptions/claim','POST',{code:newCredential(),requestId:randomUUID()},{'x-forwarded-for':'203.0.113.7','cf-connecting-ip':'203.0.113.8'});
  assert.equal(blocked.response.status,429); assert.equal(blocked.body.error.code,'RATE_LIMITED'); assert.equal(Number(blocked.response.headers.get('retry-after'))>0,true);
  const stored=await fixture.runtime.client.requestRateBucket.findMany(); assert.equal(stored.every(value=>/^[0-9a-f]{64}$/.test(value.keyHash)),true);
  await fixture.runtime.client.requestRateBucket.updateMany({data:{windowEndsAt:new Date(Date.now()-1000)}});
  assert.equal((await two.claim(newCredential())).response.status,404);
});

test('per-code limits apply across browsers and invalid origins do not grant an anonymous context',async()=>{
  await fixture.runtime.client.requestRateBucket.deleteMany();
  const instance=await application({...configuration,security:{...configuration.security,claimCodeLimit:2}}); extraApps.push(instance);
  const one=new Browser(await instance.getUrl()), two=new Browser(await instance.getUrl()); await one.bootstrap(); await two.bootstrap(); const guessed=newCredential();
  assert.equal((await one.claim(guessed)).response.status,404); assert.equal((await two.claim(guessed)).response.status,404); assert.equal((await one.claim(guessed)).response.status,429);
  assert.equal((await one.request('/api/session/context','GET',undefined,{origin:'null'})).response.status,403);
});

test('production scope and HTTPS cookie policy exclude demo codes without a public auth bypass',async()=>{
  const original=await fixture.runtime.client.product.findUniqueOrThrow({where:{id:demoId('demo-partner')}});
  const {id:_id,currentVersionId:_current,scope:_scope,...fields}=original, productId=randomUUID();
  await fixture.runtime.client.product.create({data:{...fields,id:productId,slug:'live-t04-fixture',scope:'LIVE',status:'DRAFT',currentVersionId:null,
    publicSample: original.publicSample === null ? Prisma.JsonNull : original.publicSample as Prisma.InputJsonValue}});
  const source=await fixture.runtime.client.productVersion.findUniqueOrThrow({where:{id:partnerV2}});
  const version=await fixture.owner.client.productVersion.create({data:{productId,scope:'LIVE',number:1,status:'PUBLISHED',publishedAt:new Date(),configuration:source.configuration as Prisma.InputJsonValue}});
  await fixture.runtime.client.product.update({where:{id:productId},data:{status:'PUBLISHED',currentVersionId:version.id,publishedAt:new Date()}});
  const record=await fixture.runtime.client.order.create({data:{platform:'MANUAL',reference:'local:live-scope:'+randomUUID(),productVersionId:version.id,scope:'LIVE',quantity:1,amountFen:990,status:'FULFILLED'}});
  const raw=newCredential(); await fixture.runtime.client.redemptionCode.create({data:{digest:credentialDigest(raw),scope:'LIVE',orderId:record.id,productVersionId:version.id,claimDeadline:new Date(Date.now()+86400000)}});
  const instance=await application({...configuration,environment:'production',security:{...configuration.security,origins:['https://orai.test']}}); extraApps.push(instance);
  const browser=new Browser(await instance.getUrl(),'https://orai.test','__Host-orai_session','__Host-orai_csrf'); const boot=await browser.bootstrap();
  const csrf=boot.response.headers.getSetCookie()[0]!; assert.equal(csrf.startsWith('__Host-orai_csrf='),true); assert.equal(csrf.includes('Secure'),true); assert.equal(csrf.includes('Domain='),false);
  assert.equal((await browser.claim(codeFor('partial'))).body.error.code,'CODE_INVALID');
  const claimed=await browser.claim(raw); assert.equal(claimed.response.status,200); assert.equal(claimed.body.entitlement.isDemo,false);
  const session=claimed.response.headers.getSetCookie().find(value=>value.startsWith('__Host-orai_session='))!; assert.equal(session.includes('Secure'),true); assert.equal(session.includes('HttpOnly'),true);
  const demo=new Browser(); await demo.bootstrap(); assert.equal((await demo.claim(raw)).body.error.code,'CODE_INVALID');
});

test('production boot requires HTTPS origins, signing key and explicit valid proxy CIDRs',()=>{
  const base={DATABASE_URL:'postgresql://user:secret@127.0.0.1/test',APP_ENV:'production',DATABASE_SSL_MODE:'verify-full'};
  assert.throws(()=>loadConfiguration(base),/APP_PUBLIC_ORIGIN/);
  assert.throws(()=>loadConfiguration({...base,APP_PUBLIC_ORIGIN:'https://orai.example'}),/CSRF_SIGNING_KEY/);
  const configured={...base,APP_PUBLIC_ORIGIN:'https://orai.example',CSRF_SIGNING_KEY:newCredential()};
  assert.equal(loadConfiguration(configured).security.origins[0],'https://orai.example');
  assert.throws(()=>loadConfiguration({...configured,APP_PUBLIC_ORIGIN:'http://orai.example'}),/APP_PUBLIC_ORIGIN/);
  assert.throws(()=>loadConfiguration({...configured,TRUST_PROXY_CIDRS:'untrusted-anything'}),/TRUST_PROXY_CIDRS/);
  assert.equal(loadConfiguration({...configured,TRUST_PROXY_CIDRS:'127.0.0.1/32,::1/128'}).security.trustedProxyCidrs.length,2);
});
