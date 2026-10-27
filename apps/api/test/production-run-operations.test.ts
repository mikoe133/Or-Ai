import 'reflect-metadata';
import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Readable} from 'node:stream';
import type {Request} from 'express';
import {Test} from '@nestjs/testing';
import type {INestApplication} from '@nestjs/common';
import {AppModule} from '../src/app.module';
import {APP_CONFIG} from '../src/config/configuration';
import {configureApp} from '../src/common/configure-app';
import {SupabaseAuthGateway,type SupabaseIdentity} from '../src/accounts/supabase-auth.gateway';
import {CatalogAdminAccessService,type CatalogAdminAccess} from '../src/catalog/admin-access.service';
import {ProductionRunOperationsService} from '../src/operations/production-run-operations.service';
import {ProductionRunsService,PRODUCTION_RUN_CLOCK} from '../src/operations/production-runs.service';
import {ProductionPlansService} from '../src/operations/production-plans.service';
import {CodexConnectionsService} from '../src/operations/codex-connections.service';
import {SkillsService} from '../src/operations/skills.service';
import {SkillFilesService} from '../src/operations/skill-files.service';
import {ProjectMethodOperationsService} from '../src/operations/project-method-operations.service';
import {ApiException} from '../src/common/http-errors';
import {DemoIdentityScenarios} from '../scripts/demo-fixtures';
import {createLocalFixture} from './local-fixture';
import {runProject,runClaim,runEvent,recoverySelection,type RunProject} from './production-run-operations-fixture';
import {methodManifest,captureMethod} from './project-methods-fixture';
let fixture:Awaited<ReturnType<typeof createLocalFixture>>,app:INestApplication,access:CatalogAdminAccess,ops:ProductionRunOperationsService,runs:ProductionRunsService,directory:string,base:string,stamp=Date.now();
const proofs=new Map<string,SupabaseIdentity>(),refreshes=new Map<string,{accessToken:string;refreshToken:string}>();
before(async()=>{
 fixture=await createLocalFixture('t14');directory=await mkdtemp(join(tmpdir(),'orai-o3-operations-'));
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue({...fixture.configuration,
  assets:{...fixture.configuration.assets,driver:'local',directory},security:{...fixture.configuration.security,readIpLimit:3000,writeIpLimit:3000},
  auth:{url:'https://isolated.example.test',publishableKey:'sb_publishable_'+'p'.repeat(40),sessionEncryptionKey:randomBytes(32).toString('base64url'),sessionDays:30,requestTimeoutMs:1000},
 }).overrideProvider(PRODUCTION_RUN_CLOCK).useValue(()=>new Date(stamp)).overrideProvider(SupabaseAuthGateway).useValue({verify:async(token:string)=>{const p=proofs.get(token);assert.ok(p);return p;},
 refresh:async(token:string)=>{const v=refreshes.get(token);assert.ok(v);return {...v,identity:proofs.get(v.accessToken)};},logout:async()=>undefined}).compile();
 app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');base=await app.getUrl();
 access=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);ops=app.get(ProductionRunOperationsService);runs=app.get(ProductionRunsService);
});
beforeEach(()=>{stamp=Date.now();});
after(async()=>{await app?.close();await fixture?.close();if(directory)await rm(directory,{recursive:true,force:true});proofs.clear();refreshes.clear();});
const fresh=(limits:Record<string,unknown>={})=>runProject(app,fixture,access,limits);
async function valid(){const c=await fresh(),claim=await runClaim(c),attempt=await runEvent(c,claim);return {c,claim,attempt,selection:recoverySelection(c,attempt)};}
async function stopBody(c:RunProject){const p=await ops.stopPreview(access,c.run.id);assert.ok(p.ready);return {expectedDigest:p.digest!,reason:'人工停止本批接续，原作业另行核对。',consent:true as const,requestId:randomUUID()};}
async function rejects(p:Promise<unknown>,code?:string){await assert.rejects(p,e=>e instanceof ApiException&&(!code||e.code===code));}

test('operating projection separates never-started, active leases, expired leases and the last external receipt',async()=>{
 const {c,attempt}=await valid();let dto=await ops.read(access,c.run.id),video=dto.modules.find(m=>m.domain==='video')!;
 assert.equal(video.condition,'lease_active');assert.equal(video.lastReportedState,'uploading');assert.equal(dto.modules.find(m=>m.domain==='cover')!.condition,'not_started');
 stamp+=11_000;dto=await ops.read(access,c.run.id);video=dto.modules.find(m=>m.domain==='video')!;assert.equal(video.condition,'lease_expired');assert.equal(video.lastReportedState,'uploading');assert.equal(video.job?.jobId,attempt.job?.jobId);assert.equal(dto.usage.unknownCost,true);assert.equal(dto.platformExecuted,false);
});
test('missing inputs are diagnosed from current fixed content rather than guessed from a waiting label',async()=>{
 const c=await fresh(),claim=await runClaim(c,'cover',{methods:[],inputs:[]}),dto=await ops.read(access,c.run.id),cover=dto.modules.find(m=>m.domain==='cover')!;
 assert.equal(claim.nextAction,'prepare_inputs');assert.equal(cover.condition,'missing_inputs');assert.ok(cover.missingInputs.includes('missing_methods'));
});
test('stopping preserves saved outcomes even when the latest attempt failed and old successes are no longer the latest row',async()=>{
 const c=await fresh(),a=await runClaim(c,'assessment'),g=c.grants.get('assessment')!;
 await runs.execute(g.access,g.token,'module_attempt_complete',{attemptId:a.attempt.id,leaseToken:a.leaseToken,expectedRevision:0,requestId:randomUUID(),recordId:c.inputRecord.record.id,expectedRecordDigest:c.inputRecord.record.digest});
 const b=await runClaim(c,'assessment',{retryOfAttemptId:a.attempt.id});await runEvent(c,b,'failed',{job:null});
 const before=await ops.read(access,c.run.id),saved=before.modules.find(m=>m.domain==='assessment')!.savedRecords;assert.equal(saved.length,1);
 const after=await ops.stop(access,c.run.id,await stopBody(c));assert.ok(after.run.cancelledAt);assert.deepEqual(after.modules.find(m=>m.domain==='assessment')!.savedRecords,saved);
 assert.equal(await fixture.runtime.client.projectProductionRecord.count({where:{id:c.inputRecord.record.id}}),1);assert.equal(await fixture.runtime.client.externalAttemptEvent.count({where:{attemptId:a.attempt.id}}),2);
});
test('stop preview is read-only and a changed receipt requires a new impact confirmation',async()=>{
 const {c,claim}=await valid(),before=await fixture.runtime.client.adminAuditLog.count(),body=await stopBody(c);
 assert.equal(await fixture.runtime.client.adminAuditLog.count(),before);
 const latest=await runs.attemptAdmin(access,claim.attempt.id);await runEvent(c,{...claim,attempt:latest},'uploading');
 await rejects(ops.stop(access,c.run.id,body),'REVISION_CONFLICT');assert.equal((await ops.read(access,c.run.id)).run.cancelledAt,null);
});
test('the same successful stop request recovers one cancellation and one audit without extending or recreating a run',async()=>{
 const c=await fresh(),body=await stopBody(c),first=await ops.stop(access,c.run.id,body),second=await ops.stop(access,c.run.id,body);
 assert.equal(first.run.cancelledAt,second.run.cancelledAt);assert.equal(await fixture.runtime.client.adminAuditLog.count({where:{requestId:body.requestId}}),1);
 await rejects(ops.stop(access,c.run.id,{...body,reason:'不同原因'}),'IDEMPOTENCY_CONFLICT');
});
test('an actual SQL stop failure rolls back cancellation, idempotency and audit before an original-request retry',async()=>{
 const c=await fresh(),body=await stopBody(c);
 await fixture.owner.client.$executeRawUnsafe("CREATE FUNCTION orai.o3_stop_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic stop failure'; END $$");
 await fixture.owner.client.$executeRawUnsafe('CREATE TRIGGER o3_stop_fault BEFORE UPDATE ON orai.external_production_runs FOR EACH ROW EXECUTE FUNCTION orai.o3_stop_fault()');
 try{await assert.rejects(ops.stop(access,c.run.id,body));assert.equal((await ops.read(access,c.run.id)).run.cancelledAt,null);assert.equal(await fixture.runtime.client.adminAuditLog.count({where:{requestId:body.requestId}}),0);assert.equal(await fixture.runtime.client.idempotentRequest.count({where:{requestId:body.requestId}}),0);}
 finally{await fixture.owner.client.$executeRawUnsafe('DROP TRIGGER o3_stop_fault ON orai.external_production_runs');await fixture.owner.client.$executeRawUnsafe('DROP FUNCTION orai.o3_stop_fault()');}
 assert.ok((await ops.stop(access,c.run.id,body)).run.cancelledAt);
});
test('stop and machine receipt writers serialize on the same run and never accept a late receipt after cancellation',async()=>{
 const {c,claim}=await valid(),latest=await runs.attemptAdmin(access,claim.attempt.id),body=await stopBody(c);
 const [stopped,event]=await Promise.allSettled([ops.stop(access,c.run.id,body),runEvent(c,{...claim,attempt:latest},'uploading')]);
 if(stopped.status==='fulfilled'){assert.ok(stopped.value.run.cancelledAt);assert.equal(event.status,'rejected');}else{assert.equal(event.status,'fulfilled');assert.equal((await ops.read(access,c.run.id)).run.cancelledAt,null);}
});
test('other workspace owners can read within scope but cannot stop a run or use its connection for recovery',async()=>{
 const {c,attempt,selection}=await valid(),user=await fixture.owner.client.user.create({data:{scope:'DEMO',role:'ADMIN',supabaseUserId:randomUUID()}}),other=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,user.id);
 assert.equal((await ops.read(other,c.run.id)).canStop,false);await rejects(ops.stop(other,c.run.id,await stopBody(c)),'CONFLICT');
 const p=await ops.recoveryPreview(other,attempt.id,selection);assert.equal(p.ready,false);assert.ok(p.issues.some(i=>i.code==='WORKSPACE_NOT_OWNED'));
});
test('unknown jobs and active claims export only inspection with exact original inputs and no identity proof or business writes',async()=>{
 const {c,attempt,selection}=await valid(),before={attempts:await fixture.runtime.client.externalProductionAttempt.count(),events:await fixture.runtime.client.externalAttemptEvent.count(),audit:await fixture.runtime.client.adminAuditLog.count()};
 const p=await ops.recoveryPreview(access,attempt.id,selection);assert.equal(p.ready,true,JSON.stringify(p.issues));assert.equal(p.manifest?.action,'inspect_original_job');assert.equal(p.manifest?.retryOfAttemptId,null);
 const exported=await ops.recoveryExport(access,attempt.id,{selection,expectedDigest:p.digest}),text=JSON.stringify(exported);
 for(const forbidden of ['leaseToken"','tokenDigest','storageKey','downloadPath','machineCredentialId'])assert.ok(!text.includes(forbidden),forbidden);
 assert.ok(!text.includes('project_draft_save'));assert.equal(exported.manifest.executionStarted,false);assert.equal(exported.manifest.fixed.inputs.length,2);assert.equal(exported.manifest.originalJob?.jobId,attempt.job?.jobId);
 assert.deepEqual({attempts:await fixture.runtime.client.externalProductionAttempt.count(),events:await fixture.runtime.client.externalAttemptEvent.count(),audit:await fixture.runtime.client.adminAuditLog.count()},before);
});
test('reported terminal failures permit explicit retry instructions while a live unreported attempt remains inspection-only',async()=>{
 const c=await fresh(),a=await runClaim(c),selection=recoverySelection(c,a.attempt);let p=await ops.recoveryPreview(access,a.attempt.id,selection);
 assert.equal(p.manifest?.action,'inspect_current_attempt');const failed=await runEvent(c,a,'failed',{job:{provider:'synthetic-render',jobId:'sample-job-024',terminal:true}});
 p=await ops.recoveryPreview(access,failed.id,recoverySelection(c,failed));assert.equal(p.ready,true,JSON.stringify(p.issues));assert.equal(p.manifest?.action,'explicit_retry');assert.equal(p.manifest?.retryOfAttemptId,failed.id);
});
test('old generations and records from another module cannot become current recovery inputs, with bounded history and fragment pagination',async()=>{
 const {c,attempt,selection}=await valid();stamp+=11_000;const next=await runClaim(c,'video',{retryOfAttemptId:attempt.id,resumeJobId:attempt.job!.jobId,clientKey:'new-client'});
 const history=await ops.history(access,c.run.id,{planModuleId:c.module('video').id,pageSize:1});assert.equal(history.total,2);assert.equal(history.items[0]?.id,next.attempt.id);assert.equal((await ops.history(access,c.run.id,{planModuleId:c.module('video').id,page:2,pageSize:1})).items[0]?.id,attempt.id);
 assert.equal((await ops.recoveryPreview(access,attempt.id,selection)).ready,false);
 const fragments=await ops.recoveryInputs(access,next.attempt.id,{recordId:c.inputRecord.record.id,pageSize:1,page:2});assert.equal(fragments.items.length,1);assert.ok(!JSON.stringify(fragments).includes('scoring'));
 await rejects(ops.recoveryInputs(access,next.attempt.id,{recordId:randomUUID()}),'FORBIDDEN');
 const foreign=await fresh();await rejects(ops.history(access,c.run.id,{planModuleId:foreign.module('video').id}),'NOT_FOUND');
});
test('new plan heads preserve original-job inspection without silently replacing the fixed historical methods or inputs',async()=>{
 const {c,attempt,selection}=await valid();await app.get(ProductionPlansService).save(access,c.boot.productId,{plan:{...c.plan.plan,title:'新的计划'},expectedRevision:c.plan.revision,requestId:randomUUID()});
 const p=await ops.recoveryPreview(access,attempt.id,selection);assert.equal(p.ready,true,JSON.stringify(p.issues));assert.equal(p.manifest?.action,'inspect_original_job');assert.equal(p.manifest?.fixed.planRevisionId,c.plan.id);assert.equal(p.manifest?.fixed.methods[0]?.id,c.methods.get('video')![0]!.snapshotId);
});
test('run and stage expiry, known budget caps and cancellation block recovery without reviving or widening limits',async()=>{
 for(const kind of ['run','stage','cost','stop']){
  stamp=Date.now();const c=await fresh(kind==='run'?{maxDurationSeconds:60}:kind==='stage'?{stageLimits:{S5:{maxAttempts:5,maxConcurrency:6,maxDurationSeconds:60,maxReportedCostFen:null,maxReportedTokens:null}}}:kind==='cost'?{maxReportedCostFen:0}:{});
  if(kind==='cost'){const dto=await ops.read(access,c.run.id);assert.ok(dto.modules.find(m=>m.domain==='video')!.blockers.some(i=>i.code==='RUN_COST'));continue;}
  const a=await runClaim(c),attempt=await runEvent(c,a);if(kind==='stop')await ops.stop(access,c.run.id,await stopBody(c));else stamp+=61_000;
  const p=await ops.recoveryPreview(access,attempt.id,recoverySelection(c,attempt));assert.equal(p.ready,false,kind);assert.equal(p.manifest,null);
 }
});
test('exports recheck receipt revisions and revoked connections instead of trusting a previously prepared handoff',async()=>{
 const {c,claim,attempt,selection}=await valid(),p=await ops.recoveryPreview(access,attempt.id,selection);assert.ok(p.ready);
 await runEvent(c,{...claim,attempt},'uploading');await rejects(ops.recoveryExport(access,attempt.id,{selection,expectedDigest:p.digest}),'REVISION_CONFLICT');
 const latest=await runs.attemptAdmin(access,attempt.id),selection2=recoverySelection(c,latest),p2=await ops.recoveryPreview(access,attempt.id,selection2);assert.ok(p2.ready);
 await app.get(CodexConnectionsService).revoke(access,c.recoveryConnection.id,{requestId:randomUUID()});await rejects(ops.recoveryExport(access,attempt.id,{selection:selection2,expectedDigest:p2.digest}),'CONFLICT');
});
test('foreign workspace connections, missing fragments and private whole-assessment locators cannot produce recovery instructions',async()=>{
 const {c,attempt,selection}=await valid(),other=await fresh();
 for(const body of [{...selection,connectionId:other.recoveryConnection.id},{...selection,inputs:[]},{...selection,inputs:[{revisionId:c.inputRecord.draft.revisionId,digest:c.inputRecord.draft.digest,locator:{kind:'whole'}}]}])assert.equal((await ops.recoveryPreview(access,attempt.id,body)).ready,false);
});
test('real method attachment bytes are verified again before recovery export',async()=>{
 const c=await fresh(),skills=app.get(SkillsService),files=app.get(SkillFilesService),source=await skills.create(access,'video',{slug:'o3-attachment-'+randomUUID(),manifest:methodManifest('video'),requestId:randomUUID()}),bytes=Buffer.from('original video guidance\n'),checksum=createHash('sha256').update(bytes).digest('hex');
 const file=await files.prepare(access,'video',source.skillId,{fileName:'guide.md',mimeType:'text/markdown',byteSize:bytes.length,checksum,requestId:randomUUID()});
 await files.upload(access,'video',source.skillId,file.id,Readable.from([bytes]) as unknown as Request);await files.complete(access,'video',source.skillId,file.id,{requestId:randomUUID()});
 const version=await skills.save(access,'video',source.skillId,source.id,{expectedRevision:source.revision,manifest:{...source.manifest,references:[{path:'guide.md',fileId:file.id}]},requestId:randomUUID()});
 const snapshot=await app.get(ProjectMethodOperationsService).capture(access,c.module('video').id,{purpose:'video_production',expectedModuleDigest:c.module('video').digest,sourceVersionId:version.id,expectedSourceRevision:version.revision,expectedSourceDigest:version.digest,requestId:randomUUID()});
 c.methods.set('video',[{snapshotId:snapshot.id,digest:snapshot.digest}]);const a=await runClaim(c),attempt=await runEvent(c,a),selection=recoverySelection(c,attempt),p=await ops.recoveryPreview(access,attempt.id,selection);assert.ok(p.ready,JSON.stringify(p.issues));
 const stored=await fixture.owner.client.skillReferenceFile.findUniqueOrThrow({where:{id:file.id}});await writeFile(join(directory,stored.storageKey),Buffer.alloc(bytes.length,65));await rejects(ops.recoveryExport(access,attempt.id,{selection,expectedDigest:p.digest}),'CONFLICT');
});
test('attempt and reported-budget limits prevent new recovery instructions without increasing the original policy',async()=>{
 for(const limits of [{maxAttemptsPerModule:1},{maxReportedCostFen:10}]){stamp=Date.now();const c=await fresh(limits),a=await runClaim(c),attempt=await runEvent(c,a,'uploading',{reportedCostFen:10});
  const p=await ops.recoveryPreview(access,attempt.id,recoverySelection(c,attempt));assert.equal(p.ready,false);assert.equal(p.manifest,null);assert.deepEqual((await ops.read(access,c.run.id)).run.limits,c.run.limits);}
});
test('required upstream original media bytes are rechecked on recovery export after an initially valid preview',async()=>{
 const c=await runProject(app,fixture,access,{},true),a=await runClaim(c),attempt=await runEvent(c,a),selection=recoverySelection(c,attempt),p=await ops.recoveryPreview(access,attempt.id,selection);
 assert.ok(p.ready,JSON.stringify(p.issues));assert.equal(p.manifest?.fixed.originals.length,1);const file=await fixture.owner.client.assetFile.findUniqueOrThrow({where:{id:c.coverFileId!}});
 await writeFile(join(directory,file.storageKey),Buffer.alloc(file.byteSize,65));await rejects(ops.recoveryExport(access,attempt.id,{selection,expectedDigest:p.digest}),'CONFLICT');
});
test('recovery preserves an existing same-purpose multi-method combination without relaxing the O2 new-selection rule',async()=>{
 const c=await fresh();for(let i=0;i<2;i++){const m=await captureMethod(c,'video');c.methods.get('video')!.push({snapshotId:m.snapshot.id,digest:m.snapshot.digest});}
 const a=await runClaim(c),attempt=await runEvent(c,a),selection=recoverySelection(c,attempt),p=await ops.recoveryPreview(access,attempt.id,selection);
 assert.equal(p.ready,true,JSON.stringify(p.issues));assert.equal(p.manifest?.fixed.methods.length,3);assert.deepEqual(new Set(p.manifest!.fixed.methods.map(m=>m.id)),new Set(attempt.methods.map(m=>m.snapshotId)));
 const exported=await ops.recoveryExport(access,attempt.id,{selection,expectedDigest:p.digest});assert.equal(exported.manifest.fixed.methods.length,3);assert.equal(await fixture.runtime.client.externalProductionAttempt.count({where:{runId:c.run.id}}),1);
});
class Browser{cookies=new Map<string,string>();csrf='';async request(path:string,method='GET',body?:unknown,headers:Record<string,string>={}){const response=await fetch(base+'/api'+path,{method,headers:{origin:fixture.configuration.security.origins[0]!,cookie:[...this.cookies].map(([k,v])=>k+'='+v).join(';'),...(body?{'content-type':'application/json'}:{}),...(method==='GET'?{}:{'x-csrf-token':this.csrf}),...headers},body:body?JSON.stringify(body):undefined});
 for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0]!,at=pair.indexOf('=');this.cookies.set(pair.slice(0,at),pair.slice(at+1));}return {status:response.status,body:await response.json(),headers:response.headers};}
 async login(operator=true){this.csrf=(await this.request('/account/context')).body.csrfToken;const accessToken=randomBytes(50).toString('base64url'),refreshToken=randomBytes(40).toString('base64url');proofs.set(accessToken,{supabaseUserId:operator?DemoIdentityScenarios.admin.supabaseUserId:randomUUID(),supabaseSessionId:randomUUID(),emailVerified:true,expiresAt:new Date(Date.now()+3600_000)});refreshes.set(refreshToken,{accessToken,refreshToken});assert.equal((await this.request('/account/session','POST',{accessToken,refreshToken})).status,200);return this;}}
test('HTTP operating endpoints retain Cookie, Origin, CSRF, strict schemas and ordinary-account denial',async()=>{
 const {c,attempt,selection}=await valid(),admin=await new Browser().login(),ordinary=await new Browser().login(false),anonymous=new Browser(),root='/admin/production-runs/'+c.run.id;
 assert.equal((await anonymous.request(root+'/operations')).status,401);assert.equal((await ordinary.request(root+'/operations')).status,403);
 const dto=await admin.request(root+'/operations');assert.equal(dto.status,200);assert.equal(dto.headers.get('cache-control'),'private, no-store');
 assert.equal((await admin.request(root+'/stop/preview','POST',{}, {'x-csrf-token':''})).status,403);assert.equal((await admin.request(root+'/stop/preview','POST',{}, {origin:'https://evil.invalid'})).status,403);
 assert.equal((await admin.request(root+'/stop/preview','POST',{role:'ADMIN'})).status,400);
 const p=await admin.request('/admin/production-attempts/'+attempt.id+'/recovery/preview','POST',selection);assert.equal(p.status,200);assert.equal(p.body.ready,true);
 await rejects(ops.read(c.grants.get('video')!.access,c.run.id),'FORBIDDEN');
});
