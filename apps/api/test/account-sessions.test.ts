import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { APP_CONFIG, type AppConfiguration } from '../src/config/configuration';
import { configureApp } from '../src/common/configure-app';
import { ApiException } from '../src/common/http-errors';
import { AccountSessionsService } from '../src/accounts/account-sessions.service';
import { AccountIdentityService } from '../src/accounts/account-identity.service';
import { AccountTokenCipher } from '../src/accounts/account-token-cipher';
import { AccountEntitlementsService } from '../src/accounts/account-entitlements.service';
import { AccountCookiesService } from '../src/accounts/account-cookies.service';
import { SupabaseAuthGateway, type SupabaseIdentity } from '../src/accounts/supabase-auth.gateway';
import { credentialDigest } from '../src/redemption/credentials';
import { createLocalFixture } from './local-fixture';
import { DemoIdentityScenarios, demoId } from '../scripts/demo-fixtures';
import { DeliveryAdminService } from '../src/redemption/delivery-admin.service';
import { CatalogAdminAccessService } from '../src/catalog/admin-access.service';

class Browser {
  cookies=new Map<string,string>();csrf='';
  constructor(account?:string){if(account)this.cookies.set('orai_account',account);}
  async request(path:string,method='GET',input?:unknown){
    const headers:Record<string,string>={cookie:[...this.cookies].map(([k,v])=>k+'='+v).join(';'),origin:configuration.security.origins[0]!};
    if(method!=='GET'){headers['content-type']='application/json';headers['x-csrf-token']=this.csrf;}
    const response=await fetch(url+'/api'+path,{method,headers,body:input===undefined?undefined:JSON.stringify(input)});
    for(const line of response.headers.getSetCookie()){const first=line.split(';')[0]!,at=first.indexOf('=');this.cookies.set(first.slice(0,at),first.slice(at+1));}
    const body=response.status===204?null:await response.json();return {status:response.status,body};
  }
  async bootstrap(){const result=await this.request('/account/context');assert.equal(result.status,200);this.csrf=result.body.csrfToken;}
  claim(code:string){return this.request('/redemptions/claim','POST',{code,requestId:randomUUID()});}
  bind(code:string,requestId=randomUUID()){return this.request('/me/entitlements/bind','POST',{code,confirmed:true,requestId});}
}
async function issued(){
  const delivery=app.get(DeliveryAdminService),authority=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);
  const order=await delivery.recordOrder(authority,{platform:'manual',reference:'demo:t06:'+randomUUID(),productVersionId:demoId('demo-partner-v2'),scope:'demo',quantity:1,amountFen:990,requestId:randomUUID()});
  const codes=await delivery.issueOrder(authority,order.id,{requestId:randomUUID()});return {code:codes.deliveries[0]!.code,orderId:order.id,authority,delivery};
}
async function logged(owner:string=randomUUID()){return new Browser((await sessions.handoff(credentials(owner))).token);}

let fixture:Awaited<ReturnType<typeof createLocalFixture>>,app:INestApplication,url:string;
let sessions:AccountSessionsService,identity:AccountIdentityService,configuration:AppConfiguration;
let refreshes=0,logouts=0,unavailable=false,logoutFailure=false,revoked=false,verified=true;
const claims=new Map<string,SupabaseIdentity>(),refreshClaims=new Map<string,{accessToken:string;refreshToken:string}>();
const userId=randomUUID();
function credentials(owner:string=userId,sid:string=randomUUID()){
  const accessToken=randomBytes(60).toString('base64url'),refreshToken=randomBytes(40).toString('base64url');
  claims.set(accessToken,{supabaseUserId:owner,supabaseSessionId:sid,expiresAt:new Date(Date.now()+3600_000),emailVerified:true});
  refreshClaims.set(refreshToken,{accessToken,refreshToken});return {accessToken,refreshToken};
}
const fail=(code:string)=>(error:unknown)=>error instanceof ApiException&&error.code===code;
before(async()=>{
  fixture=await createLocalFixture('t06');
  // The batch exercises many independent consumers from one loopback IP.
  // Default IP/code limit behavior is verified in redemption.test.ts.
  configuration={...fixture.configuration,security:{...fixture.configuration.security,claimIpLimit:100},auth:{url:'https://isolated.example.test',publishableKey:'sb_publishable_'+'p'.repeat(40),
    sessionEncryptionKey:randomBytes(32).toString('base64url'),sessionDays:30,requestTimeoutMs:1000}};
  // Only a Nest test override; this verified-facts adapter is not an HTTP route,
  // signing bypass or real cloud/email acceptance. Real SDK tests are separate.
  const gateway={verify:async(token:string)=>{
    if(unavailable)throw new ApiException('SERVICE_UNAVAILABLE','Unavailable',503);
    const value=claims.get(token);if(!value||revoked)throw new ApiException('AUTH_REQUIRED','Invalid',401);
    return {...value,emailVerified:verified};
  },refresh:async(token:string)=>{
    refreshes++;if(unavailable)throw new ApiException('SERVICE_UNAVAILABLE','Unavailable',503);
    const value=refreshClaims.get(token);if(!value||revoked)throw new ApiException('AUTH_REQUIRED','Invalid',401);
    const fact=claims.get(value.accessToken)!;const next=credentials(fact.supabaseUserId,fact.supabaseSessionId);
    refreshClaims.delete(token);return {...next,identity:claims.get(next.accessToken)!};
  },logout:async()=>{logouts++;if(logoutFailure)throw new ApiException('SERVICE_UNAVAILABLE','Unavailable',503);}};
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue(configuration)
    .overrideProvider(SupabaseAuthGateway).useValue(gateway).compile();
  app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');url=await app.getUrl();
  sessions=app.get(AccountSessionsService);identity=app.get(AccountIdentityService);
});
after(async()=>{await app?.close();await fixture?.close();});

test('handoff verifies matching access/refresh identity, encrypts credentials and issues only an opaque account cookie',async()=>{
  const input=credentials(),result=await sessions.handoff(input);const row=await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{tokenDigest:credentialDigest(result.token)}});
  assert.equal(row.userId,result.account.id);assert.equal(result.account.role,'user');assert.equal(result.account.emailVerified,true);
  assert.equal(row.accessCredential?.includes(input.accessToken),false);assert.equal(row.refreshCredential?.includes(input.refreshToken),false);
  assert.equal(JSON.stringify(result.account).includes(input.accessToken),false);assert.equal('refreshToken' in result,false);
  const actor=await sessions.fromToken(result.token);assert.ok(actor);assert.equal((await identity.fresh(actor)).id,result.account.id);
  assert.equal(await sessions.fromToken('invalid'),undefined);assert.equal(await sessions.fromToken(randomBytes(32).toString('base64url')),undefined);
  const other=credentials(randomUUID());await assert.rejects(sessions.handoff({accessToken:input.accessToken,refreshToken:other.refreshToken}),fail('AUTH_REQUIRED'));
});
test('concurrent refreshes serialize on one database session, retaining the original device deadline and current identity',async()=>{
  const result=await sessions.handoff(credentials()),row=await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{tokenDigest:credentialDigest(result.token)}});
  await fixture.runtime.client.accountSession.update({where:{id:row.id},data:{accessExpiresAt:new Date(Date.now()-1000)}});
  const before=refreshes,actors=await Promise.all(Array.from({length:4},()=>sessions.fromToken(result.token)));
  assert.equal(actors.every(Boolean),true);assert.equal(refreshes-before,1);assert.equal(new Set(actors.map(value=>value?.userId)).size,1);
  const current=await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{id:row.id}});
  assert.equal(current.expiresAt.getTime(),row.expiresAt.getTime());assert.ok(current.accessExpiresAt.getTime()>Date.now());
});
test('logout commits local revocation before provider failure, clears credentials and rejects previously minted authorization',async()=>{
  const result=await sessions.handoff(credentials()),actor=await sessions.fromToken(result.token);assert.ok(actor);
  logoutFailure=true;try{assert.equal((await sessions.logout(result.token)).providerRevoked,false);}finally{logoutFailure=false;}
  const row=await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{tokenDigest:credentialDigest(result.token)}});
  assert.ok(row.revokedAt);assert.equal(row.accessCredential,null);assert.equal(row.refreshCredential,null);assert.ok(logouts>0);
  assert.equal(await sessions.fromToken(result.token),undefined);await assert.rejects(identity.fresh(actor),fail('AUTH_REQUIRED'));
  assert.equal((await sessions.logout(result.token)).providerRevoked,null);
});
test('logout of an expired access credential refreshes its matching provider session after local revocation',async()=>{
  const result=await sessions.handoff(credentials()),row=await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{tokenDigest:credentialDigest(result.token)}});
  await fixture.runtime.client.accountSession.update({where:{id:row.id},data:{accessExpiresAt:new Date(Date.now()-1)}});
  const count=refreshes;assert.equal((await sessions.logout(result.token)).providerRevoked,true);assert.equal(refreshes-count,1);
  assert.equal((await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{id:row.id}})).refreshCredential,null);
});
test('isolated HTTPS account cookie policy uses __Host, Secure, HttpOnly and a root path, and rejects ambiguous cookie headers',()=>{
  const service=new AccountCookiesService({...configuration,security:{...configuration.security,origins:['https://example.test']}});
  const recorded:Array<{name:string;options:Record<string,unknown>}>=[],response={cookie:(name:string,_value:string,options:Record<string,unknown>)=>recorded.push({name,options}),
    clearCookie:(name:string,options:Record<string,unknown>)=>recorded.push({name,options})} as unknown as Response;
  service.set(response,randomBytes(32).toString('base64url'),new Date(Date.now()+60_000));service.clear(response);
  assert.equal(service.name,'__Host-orai_account');for(const row of recorded){assert.equal(row.name,service.name);assert.equal(row.options.secure,true);assert.equal(row.options.httpOnly,true);assert.equal(row.options.sameSite,'strict');assert.equal(row.options.path,'/');assert.equal('domain' in row.options,false);}
  assert.equal(service.read({headers:{cookie:service.name+'=short'}} as Request),undefined);
  assert.throws(()=>service.read({headers:{cookie:service.name+'=one; '+service.name+'=two'}} as Request),fail('FORBIDDEN'));
  assert.throws(()=>service.read({headers:{cookie:'x'.repeat(8193)}} as Request),fail('FORBIDDEN'));
});
test('provider failures are retryable without losing a session; revoked remote users and disabled business users lose access',async()=>{
  const result=await sessions.handoff(credentials()),row=await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{tokenDigest:credentialDigest(result.token)}});
  unavailable=true;try{await assert.rejects(sessions.fromToken(result.token),fail('SERVICE_UNAVAILABLE'));}finally{unavailable=false;}
  assert.equal((await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{id:row.id}})).revokedAt,null);assert.ok(await sessions.fromToken(result.token));
  revoked=true;try{assert.equal(await sessions.fromToken(result.token),undefined);}finally{revoked=false;}
  assert.equal((await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{id:row.id}})).refreshCredential,null);
  const disabled=await sessions.handoff(credentials(randomUUID()));await fixture.runtime.client.user.update({where:{id:disabled.account.id},data:{disabledAt:new Date()}});
  assert.equal(await sessions.fromToken(disabled.token),undefined);
});
test('tampered ciphertext, expired sessions and mismatched remote refresh identities cannot authenticate',async()=>{
  const result=await sessions.handoff(credentials()),row=await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{tokenDigest:credentialDigest(result.token)}});
  await fixture.runtime.client.accountSession.update({where:{id:row.id},data:{accessCredential:'v1.invalid'}});assert.equal(await sessions.fromToken(result.token),undefined);
  const expired=await sessions.handoff(credentials());await fixture.runtime.client.accountSession.updateMany({where:{tokenDigest:credentialDigest(expired.token)},data:{expiresAt:new Date(Date.now()-1)}});
  assert.equal(await sessions.fromToken(expired.token),undefined);
  const mismatch=await sessions.handoff(credentials()),stored=await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{tokenDigest:credentialDigest(mismatch.token)}});
  const cipher=new AccountTokenCipher(configuration.auth!.sessionEncryptionKey),refresh=cipher.open(stored.refreshCredential!,'DEMO:'+stored.id+':refresh');
  refreshClaims.set(refresh,credentials(randomUUID()));await fixture.runtime.client.accountSession.update({where:{id:stored.id},data:{accessExpiresAt:new Date(Date.now()-1)}});
  assert.equal(await sessions.fromToken(mismatch.token),undefined);
});
test('new handoffs rotate opaque cookies without extending a provider-session deadline, and revoked sessions cannot be reopened',async()=>{
  const input=credentials(),first=await sessions.handoff(input),row=await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{tokenDigest:credentialDigest(first.token)}});
  const cipher=new AccountTokenCipher(configuration.auth!.sessionEncryptionKey);
  const next={accessToken:cipher.open(row.accessCredential!,'DEMO:'+row.id+':access'),refreshToken:cipher.open(row.refreshCredential!,'DEMO:'+row.id+':refresh')};
  const second=await sessions.handoff(next);assert.equal(second.expiresAt.getTime(),first.expiresAt.getTime());assert.equal(await sessions.fromToken(first.token),undefined);assert.ok(await sessions.fromToken(second.token));
  const latest=await fixture.runtime.client.accountSession.findUniqueOrThrow({where:{id:row.id}}),afterLogout={accessToken:cipher.open(latest.accessCredential!,'DEMO:'+row.id+':access'),refreshToken:cipher.open(latest.refreshCredential!,'DEMO:'+row.id+':refresh')};
  await sessions.logout(second.token);await assert.rejects(sessions.handoff(afterLogout),fail('AUTH_REQUIRED'));
});
test('HTTP me and account context enforce cookie, Origin, CSRF, strict inputs and private no-store without exposing credentials',async()=>{
  const jar=new Map<string,string>();let csrf='';
  async function request(path:string,method='GET',body?:unknown,extra:Record<string,string>={}){
    const headers:Record<string,string>={cookie:[...jar].map(([k,v])=>k+'='+v).join(';'),origin:configuration.security.origins[0]!,...extra};
    if(method!=='GET'){headers['content-type']='application/json';headers['x-csrf-token']=csrf;}
    const response=await fetch(url+'/api'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    for(const cookie of response.headers.getSetCookie()){const first=cookie.split(';')[0]!,at=first.indexOf('=');jar.set(first.slice(0,at),first.slice(at+1));}
    return response;
  }
  assert.equal((await request('/me')).status,401);const context=await request('/account/context'),initial=await context.json();csrf=initial.csrfToken;
  assert.equal(initial.account,null);assert.equal(initial.configured,true);assert.equal(context.headers.get('cache-control'),'private, no-store');
  const input=credentials();assert.equal((await request('/account/session','POST',input,{origin:'https://other.example.test'})).status,403);
  assert.equal((await request('/account/session','POST',{...input,role:'admin'})).status,400);
  const response=await request('/account/session','POST',input);assert.equal(response.status,200);
  const cookie=response.headers.getSetCookie().find(value=>value.startsWith('orai_account='));assert.ok(cookie?.includes('HttpOnly'));assert.ok(cookie?.includes('SameSite=Strict'));assert.ok(cookie?.includes('Path=/'));
  const data=await response.json();assert.equal(data.account.role,'user');assert.equal(JSON.stringify(data).includes(input.accessToken),false);assert.equal('token' in data,false);
  assert.equal((await request('/me?userId='+randomUUID())).status,400);const me=await request('/me');assert.equal(me.status,200);assert.equal((await me.json()).id,data.account.id);
  verified=false;try{assert.equal((await (await request('/me')).json()).emailVerified,false);}finally{verified=true;}
  logoutFailure=true;try{const out=await request('/account/logout','POST',{});assert.equal(out.status,200);assert.equal((await out.json()).providerRevoked,false);}finally{logoutFailure=false;}
  assert.equal((await request('/me')).status,401);
});
test('account entitlement and report pages use only current verified ownership, preserve unavailable states and never merge anonymous fixtures',async()=>{
  const list=app.get(AccountEntitlementsService),empty=await sessions.fromToken((await sessions.handoff(credentials())).token);assert.ok(empty);
  assert.equal((await list.list(empty,{})).total,0);assert.equal((await list.reports(empty,{})).total,0);
  const owner=await sessions.fromToken((await sessions.handoff(credentials(DemoIdentityScenarios.verified.supabaseUserId))).token);assert.ok(owner);
  const page=await list.list(owner,{page:1,pageSize:1});assert.equal(page.total,1);assert.equal(page.items[0]!.id,demoId('entitlement-bound'));
  const reports=await list.reports(owner,{page:1,pageSize:1});assert.equal(reports.total,1);assert.equal(reports.items[0]!.entitlementId,page.items[0]!.id);
  const browser=new Browser((await sessions.handoff(credentials(DemoIdentityScenarios.verified.supabaseUserId))).token);await browser.bootstrap();
  assert.equal((await browser.request('/me/entitlements?page=1&pageSize=1')).body.total,1);
  assert.equal((await browser.request('/me/entitlements/'+page.items[0]!.id)).body.id,page.items[0]!.id);
  assert.equal((await browser.request('/me/reports')).body.total,1);
  assert.equal((await browser.request('/me/reports?userId='+empty.userId)).status,400);
  assert.equal('content' in reports.items[0]!,false);assert.equal('snapshot' in reports.items[0]!,false);
  assert.equal((await list.list(owner,{page:20})).items.length,0);assert.equal((await list.reports(owner,{page:20})).total,1);
  await assert.rejects(list.readMetadata(empty,page.items[0]!.id),fail('NOT_FOUND'));await assert.rejects(list.list(owner,{userId:empty.userId}),fail('VALIDATION_ERROR'));
  await assert.rejects(list.requireEntitlement({userId:owner.userId,scope:'DEMO',emailVerified:true} as any,page.items[0]!.id),fail('FORBIDDEN'));
  await fixture.owner.client.entitlement.update({where:{id:page.items[0]!.id},data:{status:'EXPIRED'}});
  try{assert.equal((await list.readMetadata(owner,page.items[0]!.id)).status,'expired');await assert.rejects(list.requireEntitlement(owner,page.items[0]!.id),fail('ENTITLEMENT_EXPIRED'));}
  finally{await fixture.owner.client.entitlement.update({where:{id:page.items[0]!.id},data:{status:'ACTIVE'}});}
  verified=false;try{const unverified=await sessions.fromToken((await sessions.handoff(credentials())).token);assert.ok(unverified);await assert.rejects(list.list(unverified,{}),fail('EMAIL_UNVERIFIED'));}
  finally{verified=true;}
});
test('runtime selects account or anonymous authorization by actual ownership, so login and provider outages do not absorb unbound products',async()=>{
  const owner=await sessions.handoff(credentials(DemoIdentityScenarios.verified.supabaseUserId)),other=await sessions.handoff(credentials());
  const anonymous=fixture.credentials.sessions.partial;assert.ok(anonymous);
  const cookie='orai_account='+owner.token+'; orai_session='+anonymous;
  const read=(path:string,headers:Record<string,string>={})=>fetch(url+'/api'+path,{headers:{cookie,origin:configuration.security.origins[0]!,...headers}});
  const bound=await read('/reports/'+demoId('report-bound'));assert.equal(bound.status,200);assert.equal((await bound.json()).id,demoId('report-bound'));
  assert.equal((await read('/attempts/'+demoId('attempt-bound')+'/questions')).status,200);
  assert.equal((await read('/attempts/'+demoId('attempt-partial')+'/questions')).status,200);
  unavailable=true;try{assert.equal((await read('/attempts/'+demoId('attempt-partial')+'/questions')).status,200);assert.equal((await read('/reports/'+demoId('report-bound'))).status,503);}finally{unavailable=false;}
  assert.equal((await read('/reports/'+demoId('report-bound'),{cookie:'orai_account='+other.token})).status,404);
  const context=await read('/account/context'),body=await context.json();
  const csrfCookie=context.headers.getSetCookie().find(value=>value.startsWith('orai_csrf='))?.split(';')[0];assert.ok(csrfCookie);
  const repeat=await fetch(url+'/api/attempts/'+demoId('attempt-bound')+'/submit',{method:'POST',headers:{cookie:cookie+'; '+csrfCookie,origin:configuration.security.origins[0]!,
    'content-type':'application/json','x-csrf-token':body.csrfToken},body:JSON.stringify({expectedRevision:0,requestId:randomUUID()})});
  assert.equal(repeat.status,200);assert.equal((await repeat.json()).id,demoId('report-bound'));
  assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:demoId('entitlement-bound')}})).reportsConsumed,1);
  await sessions.logout(owner.token);assert.equal((await read('/reports/'+demoId('report-bound'))).status,401);assert.equal((await read('/attempts/'+demoId('attempt-partial')+'/questions')).status,200);
});
test('binding requires confirmation, a verified account, a matching active anonymous grant and the corresponding code',async()=>{
  const first=await issued(),second=await issued(),browser=await logged();await browser.bootstrap();
  const claim=await browser.claim(first.code);assert.equal(claim.status,200);
  assert.equal((await browser.request('/me/entitlements/bind','POST',{code:first.code,requestId:randomUUID()})).status,400);
  assert.equal((await browser.bind(second.code)).status,409);
  const holder=await logged();await holder.bootstrap();assert.equal((await holder.bind(first.code)).status,401);
  verified=false;try{assert.equal((await browser.bind(first.code)).body.error.code,'EMAIL_UNVERIFIED');}finally{verified=true;}
  const unrelated=await holder.claim(second.code);assert.equal(unrelated.status,200);assert.equal((await holder.bind(first.code)).status,404);
  assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:claim.body.entitlement.id}})).ownership,'ANONYMOUS');
});
test('concurrent and repeated binding transfers the same attempt and statistics once, revokes all old grants and restores across account devices',async()=>{
  const batch=await issued(),owner=randomUUID(),first=await logged(owner),second=await logged(owner),old=new Browser();await first.bootstrap();await second.bootstrap();await old.bootstrap();
  const claim=await first.claim(batch.code);assert.equal(claim.status,200);assert.equal((await second.claim(batch.code)).status,200);assert.equal((await old.claim(batch.code)).status,200);
  const start=await first.request('/attempts','POST',{entitlementId:claim.body.entitlement.id,requestId:randomUUID()});assert.equal(start.status,200);
  const id=start.body.attemptId as string,save=await first.request('/attempts/'+id+'/answers/question-1','PUT',{optionId:'often',expectedRevision:0,requestId:randomUUID()});assert.equal(save.status,200);
  const before=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:claim.body.entitlement.id}}),counts=await fixture.runtime.client.questionStat.findMany({where:{productVersionId:before.productVersionId},orderBy:{questionId:'asc'}});
  const requestId=randomUUID(),results=await Promise.all([first.bind(batch.code,requestId),second.bind(batch.code,requestId)]);assert.equal(results.every(result=>result.status===200),true);
  assert.equal(new Set(results.map(result=>result.body.entitlement.id)).size,1);assert.equal((await first.bind(batch.code)).status,200);
  const after=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:before.id}});
  assert.equal(after.ownership,'ACCOUNT_BOUND');assert.equal(after.accessExpiresAt.getTime(),before.accessExpiresAt.getTime());assert.equal(after.reportsConsumed,before.reportsConsumed);assert.equal(after.productVersionId,before.productVersionId);
  assert.deepEqual(await fixture.runtime.client.questionStat.findMany({where:{productVersionId:before.productVersionId},orderBy:{questionId:'asc'}}),counts);
  assert.equal(await fixture.runtime.client.entitlementBinding.count({where:{entitlementId:before.id}}),1);
  assert.equal(await fixture.runtime.client.accessGrant.count({where:{entitlementId:before.id,revokedAt:null}}),0);
  assert.equal((await old.request('/attempts/'+id+'/questions')).status,401);assert.equal((await old.claim(batch.code)).body.error.code,'ACCOUNT_REQUIRED');
  const restored=await second.request('/attempts/'+id+'/questions');assert.equal(restored.status,200);assert.equal(restored.body.answers[0].optionId,'often');
  const foreign=await logged();await foreign.bootstrap();assert.equal((await foreign.bind(batch.code)).status,403);assert.equal((await foreign.request('/attempts/'+id+'/questions')).status,404);
});
test('two accounts racing to bind have one owner, and shared-browser multi-product bindings do not deadlock or discard other rights',async()=>{
  const batch=await issued(),first=await logged(),second=await logged();await first.bootstrap();await second.bootstrap();
  const claim=await first.claim(batch.code);await second.claim(batch.code);
  const results=await Promise.all([first.bind(batch.code),second.bind(batch.code)]);assert.deepEqual(results.map(result=>result.status).sort(),[200,403]);
  assert.equal(await fixture.runtime.client.entitlementBinding.count({where:{entitlementId:claim.body.entitlement.id}}),1);
  const owner=randomUUID(),multi=await logged(owner),a=await issued(),b=await issued(),c=await issued();await multi.bootstrap();
  await multi.claim(a.code);await multi.claim(b.code);const last=await multi.claim(c.code);
  assert.equal((await Promise.all([multi.bind(a.code),multi.bind(b.code)])).every(result=>result.status===200),true);
  const anonymous=await multi.request('/session/entitlements');assert.equal(anonymous.status,200);assert.equal(anonymous.body.total,1);assert.equal(anonymous.body.items[0].id,last.body.entitlement.id);
});
test('confirmed account redemption creates no anonymous grant; refund rejects every device while keeping ownership and usage',async()=>{
  const batch=await issued(),owner=randomUUID(),browser=await logged(owner),other=await logged(owner);await browser.bootstrap();await other.bootstrap();
  assert.equal((await browser.request('/me/redemptions/claim','POST',{code:batch.code,requestId:randomUUID()})).status,400);
  const requestId=randomUUID(),redeem=await browser.request('/me/redemptions/claim','POST',{code:batch.code,confirmed:true,requestId});assert.equal(redeem.status,200);
  const id=redeem.body.entitlement.id as string;assert.equal(redeem.body.entitlement.ownership,'account_bound');assert.equal(await fixture.runtime.client.accessGrant.count({where:{entitlementId:id}}),0);
  assert.equal((await other.request('/me/redemptions/claim','POST',{code:batch.code,confirmed:true,requestId:randomUUID()})).status,200);
  const otherCode=await issued();assert.equal((await browser.request('/me/redemptions/claim','POST',{code:otherCode.code,confirmed:true,requestId})).body.error.code,'IDEMPOTENCY_CONFLICT');
  const start=await browser.request('/attempts','POST',{entitlementId:id,requestId:randomUUID()});assert.equal(start.status,200);let revision=start.body.revision;
  for(const question of start.body.questions){const save=await browser.request('/attempts/'+start.body.attemptId+'/answers/'+question.id,'PUT',{optionId:'often',expectedRevision:revision,requestId:randomUUID()});assert.equal(save.status,200);revision=save.body.attemptRevision;}
  const submitted=await browser.request('/attempts/'+start.body.attemptId+'/submit','POST',{expectedRevision:revision,requestId:randomUUID()});assert.equal(submitted.status,200);
  assert.equal((await other.request('/reports/'+submitted.body.id)).status,200);
  const before=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id}});await batch.delivery.refundOrder(batch.authority,batch.orderId,{requestId:randomUUID()});
  const after=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id}});assert.equal(after.ownerUserId,before.ownerUserId);assert.equal(after.reportsConsumed,1);assert.equal(after.status,'REVOKED');
  assert.equal((await browser.request('/reports/'+submitted.body.id)).body.error.code,'ENTITLEMENT_REVOKED');assert.equal((await other.request('/reports/'+submitted.body.id)).status,410);
  assert.equal((await browser.request('/me/redemptions/claim','POST',{code:batch.code,confirmed:true,requestId})).body.error.code,'CODE_REVOKED');
});
test('a real binding INSERT permission failure rolls back ownership and grants; an identical retry succeeds after repair',async()=>{
  const batch=await issued(),browser=await logged();await browser.bootstrap();const claim=await browser.claim(batch.code);assert.equal(claim.status,200);
  const before=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:claim.body.entitlement.id}}),requestId=randomUUID();
  await fixture.owner.pool.query('REVOKE INSERT ON orai.entitlement_bindings FROM orai_app');
  try{assert.equal((await browser.bind(batch.code,requestId)).status,500);}
  finally{await fixture.owner.pool.query('GRANT INSERT ON orai.entitlement_bindings TO orai_app');}
  assert.deepEqual(await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:before.id}}),before);
  assert.equal(await fixture.runtime.client.accessGrant.count({where:{entitlementId:before.id,revokedAt:null}}),1);
  assert.equal((await browser.bind(batch.code,requestId)).status,200);
});
test('binding and refund races leave no active access, do not reassign an owner and retain usage',async()=>{
  const batch=await issued(),browser=await logged();await browser.bootstrap();const claim=await browser.claim(batch.code);assert.equal(claim.status,200);
  const [bound]=await Promise.all([browser.bind(batch.code),batch.delivery.refundOrder(batch.authority,batch.orderId,{requestId:randomUUID()})]);assert.ok([200,410].includes(bound.status));
  const row=await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:claim.body.entitlement.id}});assert.equal(row.status,'REVOKED');assert.equal(row.reportsConsumed,0);
  assert.equal(await fixture.runtime.client.accessGrant.count({where:{entitlementId:row.id,revokedAt:null}}),0);
  const start=await browser.request('/attempts','POST',{entitlementId:row.id,requestId:randomUUID()});assert.ok(start.status>=400);
  assert.equal((await browser.bind(batch.code)).body.error.code,'CODE_REVOKED');
});
test('account-owned expired reports stay unavailable, and account report deletion is permanent without changing consumption',async()=>{
  const browser=await logged();browser.cookies.set('orai_session',fixture.credentials.sessions['report-expired']!);await browser.bootstrap();
  const bound=await browser.bind(fixture.credentials.codes['report-expired']!);assert.equal(bound.status,200);
  assert.equal((await browser.request('/reports/'+demoId('report-report-expired'))).body.error.code,'REPORT_EXPIRED');
  assert.equal((await browser.request('/me/reports')).body.items[0].reportState,'expired');
  const owner=await logged(DemoIdentityScenarios.verified.supabaseUserId);await owner.bootstrap();const reportId=demoId('report-bound');
  const first=await owner.request('/reports/'+reportId,'DELETE',{requestId:randomUUID()});assert.equal(first.status,204);
  assert.equal((await owner.request('/reports/'+reportId)).body.error.code,'REPORT_DELETED');
  assert.equal((await owner.request('/reports/'+reportId,'DELETE',{requestId:randomUUID()})).status,204);
  assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:demoId('entitlement-bound')}})).reportsConsumed,1);
});
