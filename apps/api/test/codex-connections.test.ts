import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { CodexConnectionPlanSchema, CodexConnectionPreviewSchema, CodexConnectionIssuedSchema,
  codexDomainGrants, type CodexConnectionPlan } from '@orai/contracts/admin';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/config/configuration';
import { configureApp } from '../src/common/configure-app';
import { SupabaseAuthGateway, type SupabaseIdentity } from '../src/accounts/supabase-auth.gateway';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { CodexConnectionsService } from '../src/operations/codex-connections.service';
import { MachineProjectsService } from '../src/operations/machine-projects.service';
import { MachineCredentialsService } from '../src/operations/machine-credentials.service';
import { SkillsService } from '../src/operations/skills.service';
import { ApiException } from '../src/common/http-errors';
import { DemoIdentityScenarios } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';

let fixture: Awaited<ReturnType<typeof createLocalFixture>>, app: INestApplication, access: CatalogAdminAccess,
  service: CodexConnectionsService, admins: CatalogAdminAccessService, base: string, categoryId: string;
const proofs = new Map<string, SupabaseIdentity>(), refreshes = new Map<string, {accessToken:string;refreshToken:string}>();
const expires = (ms=3600_000) => new Date(Date.now()+ms).toISOString();
before(async () => {
  fixture=await createLocalFixture('t14');
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue({
    ...fixture.configuration, security:{...fixture.configuration.security,readIpLimit:3000,writeIpLimit:3000},
    auth:{url:'https://isolated.example.test',publishableKey:'sb_publishable_'+'p'.repeat(40),
      sessionEncryptionKey:randomBytes(32).toString('base64url'),sessionDays:30,requestTimeoutMs:1000},
  }).overrideProvider(SupabaseAuthGateway).useValue({
    verify:async(token:string)=>{const proof=proofs.get(token);if(!proof)throw new ApiException('AUTH_REQUIRED','Test identity missing',401);return proof;},
    refresh:async(token:string)=>{const value=refreshes.get(token);if(!value)throw new ApiException('AUTH_REQUIRED','Test identity missing',401);return {...value,identity:proofs.get(value.accessToken)};},
    logout:async()=>undefined,
  }).compile();
  app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');base=await app.getUrl();
  admins=app.get(CatalogAdminAccessService);access=await admins.authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);
  service=app.get(CodexConnectionsService);categoryId=(await fixture.runtime.client.category.findFirstOrThrow()).id;
});
after(async()=>{await app?.close();await fixture?.close();proofs.clear();refreshes.clear();});
function plan():CodexConnectionPlan{return CodexConnectionPlanSchema.parse({name:'隔离 Codex 连接',
  workspace:{kind:'new',categoryIds:[categoryId],maxProjects:12,maxMethodsPerProject:8,maxRunsPerProject:20},
  actions:{createProjects:true,useSkills:true,uploadDrafts:true},
  domains:['assessment','cover','video','copy'].map(domain=>({domain,readSkills:true,uploadDrafts:true,skillIds:[]})),expiresAt:expires()});}
async function intent(input=plan(),extra={}){const preview=await service.preview(access,input);return {plan:preview.plan,
  expectedDigest:preview.digest,confirmed:true as const,clientKey:randomUUID(),requestId:randomUUID(),...extra};}
async function issue(input=plan()) {const body=await intent(input);return {body,result:await service.create(access,body)};}
async function counts(){return {connections:await fixture.runtime.client.codexConnection.count(),workspaces:await fixture.runtime.client.machineProjectWorkspace.count(),credentials:await fixture.runtime.client.machineCredential.count()};}
async function code(promise:Promise<unknown>,expected:string){await assert.rejects(promise,(e:unknown)=>e instanceof ApiException&&e.code===expected);}

test('connection plans require explicit actions, bounded scope and matching Skill/upload permission without broad shared-library grants',()=>{
  const value=plan();
  assert.equal(CodexConnectionPlanSchema.safeParse({...value,actions:{createProjects:false,useSkills:false,uploadDrafts:false}}).success,false);
  assert.equal(CodexConnectionPlanSchema.safeParse({...value,actions:{createProjects:false,useSkills:false,uploadDrafts:true}}).success,false);
  assert.equal(CodexConnectionPlanSchema.safeParse({...value,domains:value.domains.filter(d=>d.domain!=='assessment')}).success,false);
  assert.equal(CodexConnectionPlanSchema.safeParse({...value,domains:[...value.domains,value.domains[0]]}).success,false);
  const grants=codexDomainGrants(value);assert.equal(grants.length,4);
  for(const g of grants){assert.equal(g.permissions.includes('skills:write'),false);if(g.domain!=='assessment')assert.equal(g.permissions.some(p=>p==='projects:write'||p==='projects:create'),false);}
});
test('preview is read-only and creation atomically saves a bounded workspace, durable connection and isolated domain credentials',async()=>{
  const before=await counts(),body=await intent();assert.deepEqual(await counts(),before);
  const result=CodexConnectionIssuedSchema.parse(await service.create(access,body));
  assert.equal(result.connection.status,'active');assert.equal(result.secrets.length,4);assert.equal(result.secretState,'issued_once');
  assert.equal((await counts()).connections,before.connections+1);assert.equal((await counts()).workspaces,before.workspaces+1);assert.equal((await counts()).credentials,before.credentials+4);
  assert.equal(result.connection.summary.canReview,false);assert.equal(result.connection.summary.canPublish,false);assert.equal(result.connection.summary.canReadConsumerData,false);
  assert.equal(result.connection.summary.sharedSkills.length,0);
  for(const secret of result.secrets){const row=await fixture.runtime.client.machineCredential.findUniqueOrThrow({where:{id:secret.credentialId}});
    assert.equal(row.codexConnectionId,result.connection.id);assert.equal(row.workspaceId,result.connection.workspace.id);
    assert.equal(row.tokenDigest,createHash('sha256').update(secret.token).digest('hex'));
    assert.equal((await admins.authorizeMachine(secret.token,secret.domain)).machineCredentialId,row.id);}
  const persisted=JSON.stringify(await fixture.owner.client.idempotentRequest.findMany({where:{requestId:body.requestId}}));
  assert.equal(result.secrets.some(s=>persisted.includes(s.token)),false);
  assert.equal(JSON.stringify(await service.read(access,result.connection.id)).includes('tokenDigest'),false);
});
test('identical requests and durable business keys recover one connection without replaying secrets or allowing changed input',async()=>{
  const {body,result}=await issue(),before=await counts();
  for(const requestId of [body.requestId,randomUUID()]){const again=await service.create(access,{...body,requestId});assert.equal(again.connection.id,result.connection.id);assert.equal(again.secrets.length,0);assert.equal(again.secretState,'not_recoverable');}
  assert.deepEqual(await counts(),before);
  await code(service.create(access,{...body,plan:{...body.plan,name:'changed'}}),'IDEMPOTENCY_CONFLICT');
  await code(service.create(access,{...body,plan:{...body.plan,name:'changed'},requestId:randomUUID()}),'IDEMPOTENCY_CONFLICT');
});
test('two competing requests for one business key commit only one credential set',async()=>{
  const body=await intent(),before=await counts();const results=await Promise.all([service.create(access,body),service.create(access,{...body,requestId:randomUUID()})]);
  assert.equal(results[0]!.connection.id,results[1]!.connection.id);assert.equal(results.reduce((n,r)=>n+r.secrets.length,0),4);
  assert.equal((await counts()).credentials,before.credentials+4);assert.equal((await counts()).connections,before.connections+1);
});
test('a post-commit read failure recovers the saved connection without repeating issuance or replaying its secret',async()=>{
  const body=await intent(),before=await counts(),read=service.read.bind(service);let fail=true;
  service.read=async(a,key)=>{if(fail){fail=false;throw new ApiException('INTERNAL_ERROR','Isolated post-commit read failure',503);}return read(a,key);};
  try{await code(service.create(access,body),'INTERNAL_ERROR');}finally{service.read=read;}
  assert.equal((await counts()).connections,before.connections+1);assert.equal((await counts()).credentials,before.credentials+4);
  const recovered=await service.create(access,body);assert.equal(recovered.secretState,'not_recoverable');assert.equal(recovered.secrets.length,0);
  assert.equal((await counts()).credentials,before.credentials+4);
});
test('a real intermediate credential insert failure rolls back the entire new connection and workspace',async()=>{
  const before=await counts(),body=await intent();
  await fixture.owner.client.$executeRawUnsafe("CREATE FUNCTION orai.test_codex_insert_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.codex_connection_id IS NOT NULL AND NEW.domain='video' THEN RAISE EXCEPTION 'isolated insertion fault'; END IF; RETURN NEW; END $$");
  await fixture.owner.client.$executeRawUnsafe('CREATE TRIGGER test_codex_insert_fault BEFORE INSERT ON orai.machine_credentials FOR EACH ROW EXECUTE FUNCTION orai.test_codex_insert_fault()');
  try{await assert.rejects(service.create(access,body));assert.deepEqual(await counts(),before);assert.equal(await fixture.runtime.client.idempotentRequest.count({where:{requestId:body.requestId}}),0);}
  finally{await fixture.owner.client.$executeRawUnsafe('DROP TRIGGER test_codex_insert_fault ON orai.machine_credentials');await fixture.owner.client.$executeRawUnsafe('DROP FUNCTION orai.test_codex_insert_fault()');}
  const retried=await service.create(access,body);assert.equal(retried.secrets.length,4);assert.equal((await counts()).connections,before.connections+1);
});
test('current workspace limits and sharing are previewed and rechecked, while the existing workspace remains unchanged',async()=>{
  const {result}=await issue(),workspace=result.connection.workspace,
    input={...plan(),workspace:{kind:'existing' as const,id:workspace.id},expiresAt:expires(1800_000)};
  const preview=CodexConnectionPreviewSchema.parse(await service.preview(access,input));
  assert.equal(preview.summary.maxProjects,12);assert.equal(preview.summary.existingProjectCount,0);
  const beforeWorkspace=JSON.stringify(await fixture.owner.client.machineProjectWorkspace.findUniqueOrThrow({where:{id:workspace.id}}));
  const linked=await service.create(access,await intent(input));assert.equal(linked.connection.workspace.id,workspace.id);
  assert.equal(JSON.stringify(await fixture.owner.client.machineProjectWorkspace.findUniqueOrThrow({where:{id:workspace.id}})),beforeWorkspace);
  await code(service.preview(access,{...input,expiresAt:expires(7200_000)}),'CONFLICT');
  const body=await intent(input);await app.get(MachineProjectsService).revokeWorkspace(access,workspace.id,{requestId:randomUUID()});
  await code(service.create(access,body),'CONFLICT');
  const inherited=await service.read(access,linked.connection.id);assert.equal(inherited.status,'disabled');assert.equal(inherited.unavailableReason,'workspace_revoked');
  assert.equal(inherited.credentials.every(c=>c.status==='disabled'&&c.unavailableReason==='workspace_revoked'),true);
});
test('stale summaries, bad expiry and foreign Skill selections cannot create or silently broaden a connection',async()=>{
  const body=await intent(),before=await counts();await code(service.create(access,{...body,expectedDigest:'0'.repeat(64)}),'REVISION_CONFLICT');
  await code(service.preview(access,{...plan(),expiresAt:expires(-1000)}),'VALIDATION_ERROR');
  await code(service.preview(access,{...plan(),expiresAt:expires(91*86400_000)}),'VALIDATION_ERROR');
  const input=plan();input.domains[0]!.skillIds=[randomUUID()];await code(service.preview(access,input),'FORBIDDEN');assert.deepEqual(await counts(),before);
});
test('explicit shared Skill selection is scoped to its domain and retained in the confirmed summary',async()=>{
  const shared=await app.get(SkillsService).create(access,'copy',{requestId:randomUUID(),slug:'test-'+randomUUID(),manifest:{schemaVersion:1,domain:'copy',name:'隔离共享方法',description:'仅测试授权',
    purposes:['copywriting'],styles:['紫色'],supportedForms:['web'],inputs:[{key:'creative-profile',description:'共同设定',required:true}],outputs:[{key:'copy',description:'文案'}],instructions:'用具体观察表达理解，不作诊断。',examples:[],references:[]}});
  const input=plan(),copy=input.domains.find(d=>d.domain==='copy')!;copy.skillIds=[shared.skillId];
  const {result}=await issue(input);assert.equal(result.connection.summary.sharedSkills[0]!.id,shared.skillId);
  assert.deepEqual(result.connection.credentials.find(c=>c.domain==='copy')!.skillIds,[shared.skillId]);
  input.domains.find(d=>d.domain==='cover')!.skillIds=[shared.skillId];await code(service.preview(access,input),'FORBIDDEN');
});
test('revoking one connection atomically disables its whole set without revoking another set sharing the workspace',async()=>{
  const {result}=await issue(),second=await issue({...plan(),workspace:{kind:'existing',id:result.connection.workspace.id},expiresAt:expires(1800_000)});
  const body={requestId:randomUUID()},revoked=await service.revoke(access,result.connection.id,body);
  assert.equal(revoked.status,'revoked');assert.equal(revoked.credentials.every(c=>c.status==='revoked'),true);
  assert.equal((await service.revoke(access,result.connection.id,body)).id,result.connection.id);
  for(const s of result.secrets)await code(admins.authorizeMachine(s.token,s.domain),'AUTH_REQUIRED');
  assert.equal((await service.read(access,second.result.connection.id)).status,'active');
});
test('a real revoke write fault cannot leave a partially revoked connection',async()=>{
  const {result}=await issue(),body={requestId:randomUUID()};
  await fixture.owner.client.$executeRawUnsafe("CREATE FUNCTION orai.test_codex_revoke_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'isolated revoke fault'; END $$");
  await fixture.owner.client.$executeRawUnsafe('CREATE TRIGGER test_codex_revoke_fault BEFORE UPDATE ON orai.codex_connections FOR EACH ROW EXECUTE FUNCTION orai.test_codex_revoke_fault()');
  try{await assert.rejects(service.revoke(access,result.connection.id,body));assert.equal((await service.read(access,result.connection.id)).credentials.every(c=>c.status==='active'),true);}
  finally{await fixture.owner.client.$executeRawUnsafe('DROP TRIGGER test_codex_revoke_fault ON orai.codex_connections');await fixture.owner.client.$executeRawUnsafe('DROP FUNCTION orai.test_codex_revoke_fault()');}
  assert.equal((await service.revoke(access,result.connection.id,body)).status,'revoked');
});
test('another administrator, mismatched scope and machine credentials cannot inspect or manage this private connection',async()=>{
  const {result}=await issue();const other=await fixture.owner.client.user.create({data:{scope:'DEMO',role:'ADMIN',supabaseUserId:randomUUID()}});
  const otherAccess=await admins.authorizeLocalOwner(fixture.owner.client,other.id);
  await code(service.read(otherAccess,result.connection.id),'NOT_FOUND');await code(service.revoke(otherAccess,result.connection.id,{requestId:randomUUID()}),'NOT_FOUND');
  assert.equal((await service.list(otherAccess,{})).items.length,0);
  await assert.rejects(service.read({...access,scope:'LIVE'},result.connection.id));
  const first=result.secrets[0]!,machine=await admins.authorizeMachine(first.token,first.domain);await code(service.list(machine,{}),'FORBIDDEN');
});
test('partial domain revocation is visible, and database grants and history cannot be rewritten',async()=>{
  const {result}=await issue();await app.get(MachineCredentialsService).revoke(access,result.connection.credentials[0]!.id,{requestId:randomUUID()});
  const partial=await service.read(access,result.connection.id);assert.equal(partial.status,'partial');assert.equal(partial.unavailableReason,'credential_unavailable');
  await assert.rejects(fixture.runtime.client.codexConnection.update({where:{id:result.connection.id},data:{document:{}}}));
  await assert.rejects(fixture.owner.client.codexConnection.delete({where:{id:result.connection.id}}));
  await assert.rejects(fixture.owner.client.codexConnection.update({where:{id:result.connection.id},data:{digest:'0'.repeat(64)}}));
});
test('elapsed connection and workspace deadlines disable access without rewriting their immutable history',async t=>{
  const {result}=await issue(),original=JSON.stringify(await fixture.owner.client.codexConnection.findUniqueOrThrow({where:{id:result.connection.id}}));
  t.mock.timers.enable({apis:['Date'],now:Date.now()+2*3600_000});
  try{
    const freshAccess=await admins.authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);
    const expired=await service.read(freshAccess,result.connection.id);assert.equal(expired.status,'expired');assert.equal(expired.workspace.status,'expired');
    assert.equal(expired.credentials.every(c=>c.status==='disabled'&&c.unavailableReason==='workspace_expired'),true);
    for(const secret of result.secrets)await code(admins.authorizeMachine(secret.token,secret.domain),'AUTH_REQUIRED');
    assert.equal(JSON.stringify(await fixture.owner.client.codexConnection.findUniqueOrThrow({where:{id:result.connection.id}})),original);
  }finally{t.mock.timers.reset();}
});

class Browser {
  cookies=new Map<string,string>();csrf='';
  async request(path:string,method='GET',body?:unknown,headers:Record<string,string>={}){
    const response=await fetch(base+'/api'+path,{method,headers:{origin:fixture.configuration.security.origins[0]!,cookie:[...this.cookies].map(([k,v])=>k+'='+v).join(';'),
      ...(body?{'content-type':'application/json'}:{}),...(method==='GET'?{}:{'x-csrf-token':this.csrf}),...headers},body:body?JSON.stringify(body):undefined});
    for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0]!,at=pair.indexOf('=');this.cookies.set(pair.slice(0,at),pair.slice(at+1));}
    return {status:response.status,body:await response.json(),headers:response.headers};
  }
  async login(operator=true){this.csrf=(await this.request('/account/context')).body.csrfToken;const accessToken=randomBytes(50).toString('base64url'),refreshToken=randomBytes(40).toString('base64url');
    proofs.set(accessToken,{supabaseUserId:operator?DemoIdentityScenarios.admin.supabaseUserId:randomUUID(),supabaseSessionId:randomUUID(),emailVerified:true,expiresAt:new Date(Date.now()+3600_000)});
    refreshes.set(refreshToken,{accessToken,refreshToken});assert.equal((await this.request('/account/session','POST',{accessToken,refreshToken})).status,200);return this;}
}
test('HTTP handlers retain Cookie/Origin/CSRF and ordinary-account protections using only isolated test identity substitutes',async()=>{
  const admin=await new Browser().login(),ordinary=await new Browser().login(false),anonymous=new Browser();
  assert.equal((await anonymous.request('/admin/codex-connections')).status,401);assert.equal((await ordinary.request('/admin/codex-connections')).status,403);
  assert.equal((await admin.request('/admin/codex-connections/preview','POST',plan(),{'x-csrf-token':''})).status,403);
  assert.equal((await admin.request('/admin/codex-connections/preview','POST',plan(),{origin:'https://evil.invalid'})).status,403);
  const p=await admin.request('/admin/codex-connections/preview','POST',plan());assert.equal(p.status,200);assert.equal(p.headers.get('cache-control'),'private, no-store');
  const body={plan:p.body.plan,expectedDigest:p.body.digest,confirmed:true,clientKey:randomUUID(),requestId:randomUUID()},before=await counts();
  // Deliberately discard the first successful one-time response, then recover the same operation.
  assert.equal((await admin.request('/admin/codex-connections','POST',body)).status,200);
  const replay=await admin.request('/admin/codex-connections','POST',body);assert.equal(replay.status,200);assert.equal(replay.body.secretState,'not_recoverable');assert.equal(replay.body.secrets.length,0);
  assert.equal((await counts()).connections,before.connections+1);assert.equal((await admin.request('/admin/codex-connections/'+replay.body.connection.id)).status,200);
  assert.equal((await admin.request('/admin/codex-connections','POST',{...body,confirmed:false,requestId:randomUUID()})).status,400);
});
