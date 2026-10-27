import 'reflect-metadata';
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Readable} from 'node:stream';
import type {Request} from 'express';
import {Test} from '@nestjs/testing';
import type {INestApplication} from '@nestjs/common';
import {ProjectHandoffSelectionSchema,ProjectHandoffManifestSchema,ProjectMethodCaptureSchema} from '@orai/contracts/admin';
import {AppModule} from '../src/app.module';
import {APP_CONFIG} from '../src/config/configuration';
import {configureApp} from '../src/common/configure-app';
import {SupabaseAuthGateway,type SupabaseIdentity} from '../src/accounts/supabase-auth.gateway';
import {CatalogAdminAccessService,type CatalogAdminAccess} from '../src/catalog/admin-access.service';
import {ProjectMethodOperationsService} from '../src/operations/project-method-operations.service';
import {SkillsService} from '../src/operations/skills.service';
import {MachineProjectsService} from '../src/operations/machine-projects.service';
import {MachineCredentialsService} from '../src/operations/machine-credentials.service';
import {CodexConnectionsService} from '../src/operations/codex-connections.service';
import {ProductionPlansService} from '../src/operations/production-plans.service';
import {ProjectProductionService} from '../src/operations/project-production.service';
import {SkillFilesService} from '../src/operations/skill-files.service';
import {FilesService} from '../src/operations/files.service';
import {ApiException} from '../src/common/http-errors';
import {DemoIdentityScenarios} from '../scripts/demo-fixtures';
import {createLocalFixture} from './local-fixture';
import {methodProject,captureMethod,assessmentInput,methodManifest,type MethodProject} from './project-methods-fixture';

let fixture:Awaited<ReturnType<typeof createLocalFixture>>,app:INestApplication,access:CatalogAdminAccess,service:ProjectMethodOperationsService,directory:string,base:string;
const proofs=new Map<string,SupabaseIdentity>(),refreshes=new Map<string,{accessToken:string;refreshToken:string}>();
before(async()=>{
 fixture=await createLocalFixture('t14');directory=await mkdtemp(join(tmpdir(),'orai-o2-methods-'));
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue({...fixture.configuration,
  assets:{...fixture.configuration.assets,driver:'local',directory},security:{...fixture.configuration.security,readIpLimit:3000,writeIpLimit:3000},
  auth:{url:'https://isolated.example.test',publishableKey:'sb_publishable_'+'p'.repeat(40),sessionEncryptionKey:randomBytes(32).toString('base64url'),sessionDays:30,requestTimeoutMs:1000},
 }).overrideProvider(SupabaseAuthGateway).useValue({verify:async(token:string)=>{const p=proofs.get(token);assert.ok(p);return p;},
  refresh:async(token:string)=>{const v=refreshes.get(token);assert.ok(v);return {...v,identity:proofs.get(v.accessToken)};},logout:async()=>undefined}).compile();
 app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');base=await app.getUrl();
 access=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);service=app.get(ProjectMethodOperationsService);
});
after(async()=>{await app?.close();await fixture?.close();if(directory)await rm(directory,{recursive:true,force:true});proofs.clear();refreshes.clear();});
const fresh=(files=false)=>methodProject(app,fixture,access,files);
async function valid(){const c=await fresh(),method=await captureMethod(c,'copy'),input=await assessmentInput(c);return {c,method,input,
 selection:ProjectHandoffSelectionSchema.parse({expectedModuleDigest:c.module('copy').digest,connectionId:c.connection.id,methods:[{snapshotId:method.snapshot.id,digest:method.snapshot.digest}],
 records:[{recordId:input.record.id,digest:input.record.digest}],inputs:input.questions.slice(0,2).map(q=>({revisionId:input.draft.revisionId,digest:input.draft.digest,locator:{kind:'question',questionId:q.id}}))})};}
async function rejected(p:Promise<unknown>,code?:string){await assert.rejects(p,e=>e instanceof ApiException&&(!code||e.code===code));}

test('candidate projection filters exact purpose/scope and excludes another project candidate, with bounded pagination',async()=>{
 const c=await fresh(),shared=await captureMethod(c,'copy'),projects=app.get(MachineProjectsService);
 const own=await projects.execute(c.machine.get('copy')!,'project_method_create',{productId:c.boot.productId,methodKey:'own',manifest:methodManifest('copy'),requestId:randomUUID()}) as {skillId:string};
 const other=await fresh();const foreign=await projects.execute(other.machine.get('copy')!,'project_method_create',{productId:other.boot.productId,methodKey:'foreign',manifest:methodManifest('copy'),requestId:randomUUID()}) as {skillId:string};
 const page=await service.candidates(access,c.module('copy').id,{purpose:'copywriting',pageSize:20});
 assert.ok(page.items.some(s=>s.skillId===shared.source.skillId&&s.origin==='shared'));
 assert.ok(page.items.some(s=>s.skillId===own.skillId&&s.origin==='project'));
 assert.equal(page.items.some(s=>s.skillId===foreign.skillId),false);
 const small=await service.candidates(access,c.module('copy').id,{purpose:'copywriting',pageSize:1});assert.equal(small.items.length,1);assert.ok(small.total>=2);
 await rejected(service.candidates(access,c.module('copy').id,{purpose:'report_writing'}),'VALIDATION_ERROR');
 await rejected(service.candidates({...access,scope:'LIVE'},c.module('copy').id,{purpose:'copywriting'}));
});
test('archived and incompatible source forms remain explained but cannot be newly captured',async()=>{
 const c=await fresh(),skills=app.get(SkillsService),created=await skills.create(access,'copy',{slug:'forms-'+randomUUID(),manifest:{...methodManifest('copy'),supportedForms:['game','3d']},requestId:randomUUID()});
 const page=await service.candidates(access,c.module('copy').id,{purpose:'copywriting'});assert.equal(page.items.find(s=>s.versionId===created.id)?.compatible,false);
 await rejected(service.capture(access,c.module('copy').id,{expectedModuleDigest:c.module('copy').digest,purpose:'copywriting',sourceVersionId:created.id,expectedSourceRevision:created.revision,expectedSourceDigest:created.digest,requestId:randomUUID()}),'VALIDATION_ERROR');
 const original=await captureMethod(c,'copy'),archived=await skills.transition(access,'copy',original.source.skillId,original.source.id,'archive',{expectedRevision:original.source.revision,requestId:randomUUID()});
 assert.equal((await service.candidates(access,c.module('copy').id,{purpose:'copywriting',status:'archived'})).items.find(s=>s.versionId===archived.id)?.compatible,false);
 await rejected(service.capture(access,c.module('copy').id,{...original.body,expectedSourceRevision:archived.revision,expectedSourceDigest:archived.digest,requestId:randomUUID()}));
 assert.equal((await app.get(ProjectProductionService).readMethod(access,original.snapshot.id)).id,original.snapshot.id);
});
test('capture is immutable, exact and idempotent; product customization never rewrites the shared base',async()=>{
 const c=await fresh(),first=await captureMethod(c,'copy'),source=await fixture.runtime.client.styleSkillVersion.findUniqueOrThrow({where:{id:first.source.id}});
 const again=await service.capture(access,c.module('copy').id,first.body);assert.equal(again.id,first.snapshot.id);
 const same=await service.capture(access,c.module('copy').id,{...first.body,requestId:randomUUID()});assert.equal(same.id,first.snapshot.id);
 const changed=await service.capture(access,c.module('copy').id,{...first.body,customization:{...first.body.customization,instructions:'保留本商品的新要求。'},requestId:randomUUID()});assert.notEqual(changed.id,first.snapshot.id);
 assert.deepEqual(await fixture.runtime.client.styleSkillVersion.findUniqueOrThrow({where:{id:first.source.id}}),source);
 assert.equal((await app.get(ProjectProductionService).readMethod(access,first.snapshot.id)).customization?.instructions,first.body.customization.instructions);
 assert.equal(await fixture.runtime.client.creativeSkillSet.count({where:{productId:c.boot.productId}}),0);
 assert.equal(ProjectMethodCaptureSchema.safeParse({...first.body,customization:{parameters:{invalid_key:'x'},instructions:''}}).success,false);
});
test('source changes and cross-project candidate capture are rejected without partial snapshots',async()=>{
 const c=await fresh(),base=await captureMethod(c,'copy'),skills=app.get(SkillsService);
 await skills.save(access,'copy',base.source.skillId,base.source.id,{expectedRevision:base.source.revision,manifest:{...base.source.manifest,instructions:base.source.manifest.instructions+'\n新版基础正文'},requestId:randomUUID()});
 const before=await fixture.runtime.client.projectMethodSnapshot.count();await rejected(service.capture(access,c.module('copy').id,{...base.body,requestId:randomUUID()}),'REVISION_CONFLICT');
 const other=await fresh(),created=await app.get(MachineProjectsService).execute(other.machine.get('copy')!,'project_method_create',{productId:other.boot.productId,methodKey:'private',manifest:methodManifest('copy'),requestId:randomUUID()}) as {skillId:string;versionId:string};
 const version=await skills.readVersion(access,'copy',created.skillId,created.versionId);
 await rejected(service.capture(access,c.module('copy').id,{...base.body,sourceVersionId:version.id,expectedSourceRevision:version.revision,expectedSourceDigest:version.digest,requestId:randomUUID()}),'FORBIDDEN');
 assert.equal(await fixture.runtime.client.projectMethodSnapshot.count(),before);
});
test('a genuine insert fault rolls back capture and the original intent retries successfully',async()=>{
 const c=await fresh(),created=await app.get(SkillsService).create(access,'copy',{slug:'fault-'+randomUUID(),manifest:methodManifest('copy'),requestId:randomUUID()}),body={expectedModuleDigest:c.module('copy').digest,purpose:'copywriting',sourceVersionId:created.id,expectedSourceRevision:created.revision,expectedSourceDigest:created.digest,requestId:randomUUID()};
 const before=await fixture.runtime.client.projectMethodSnapshot.count();
 await fixture.owner.client.$executeRawUnsafe("CREATE FUNCTION orai.o2_capture_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'isolated insert fault'; END $$");
 await fixture.owner.client.$executeRawUnsafe('CREATE TRIGGER o2_capture_fault BEFORE INSERT ON orai.project_method_snapshots FOR EACH ROW EXECUTE FUNCTION orai.o2_capture_fault()');
 try{await assert.rejects(service.capture(access,c.module('copy').id,body));assert.equal(await fixture.runtime.client.projectMethodSnapshot.count(),before);}
 finally{await fixture.owner.client.$executeRawUnsafe('DROP TRIGGER o2_capture_fault ON orai.project_method_snapshots');await fixture.owner.client.$executeRawUnsafe('DROP FUNCTION orai.o2_capture_fault()');}
 assert.ok((await service.capture(access,c.module('copy').id,body)).id);
});
test('historical plan operations are refused and a known successful capture can still recover its original result',async()=>{
 const c=await fresh(),first=await captureMethod(c,'copy');await app.get(ProductionPlansService).save(access,c.boot.productId,{plan:c.plan.plan,expectedRevision:c.plan.revision,requestId:randomUUID()});
 await rejected(service.candidates(access,c.module('copy').id,{purpose:'copywriting'}),'REVISION_CONFLICT');
 await rejected(service.capture(access,c.module('copy').id,{...first.body,requestId:randomUUID()}),'REVISION_CONFLICT');
 assert.equal((await service.capture(access,c.module('copy').id,first.body)).id,first.snapshot.id);
});
test('concurrent plan revision and capture serialize without overwriting either history',async()=>{
 const c=await fresh(),source=await app.get(SkillsService).create(access,'copy',{slug:'race-'+randomUUID(),manifest:methodManifest('copy'),requestId:randomUUID()}),body={expectedModuleDigest:c.module('copy').digest,purpose:'copywriting',sourceVersionId:source.id,expectedSourceRevision:source.revision,expectedSourceDigest:source.digest,requestId:randomUUID()};
 const [capture,plan]=await Promise.allSettled([service.capture(access,c.module('copy').id,body),app.get(ProductionPlansService).save(access,c.boot.productId,{plan:c.plan.plan,expectedRevision:c.plan.revision,requestId:randomUUID()})]);
 assert.equal(plan.status,'fulfilled');if(capture.status==='rejected')assert.ok(capture.reason instanceof ApiException&&capture.reason.code==='REVISION_CONFLICT');
 else assert.equal(capture.value.planModuleId,c.module('copy').id);
 await rejected(service.capture(access,c.module('copy').id,{...body,requestId:randomUUID()}),'REVISION_CONFLICT');
 assert.equal(await fixture.runtime.client.productionPlanRevision.count({where:{productId:c.boot.productId}}),2);
 assert.ok(await fixture.runtime.client.projectMethodSnapshot.count({where:{planModuleId:c.module('copy').id}})<=1);
});
test('handoff options page through actual dependency records and expose explicit minimal question fragments',async()=>{
 const {c,input}=await valid();const options=await service.inputOptions(access,c.module('copy').id,{dependencyId:c.module('assessment').id,recordId:input.record.id,pageSize:1});
 assert.equal(options.fragments.items.length,1);assert.ok(options.fragments.total>1);assert.equal(options.fileOnly,false);
 const fragment=options.fragments.items[0]!;assert.equal(fragment.locator.kind,'question');assert.equal('configuration' in fragment.content,false);assert.equal('scoring' in fragment.content,false);
 assert.ok(!('report' in fragment.content));await rejected(service.inputOptions(access,c.module('copy').id,{dependencyId:c.module('cover').id}),'NOT_FOUND');
});
test('handoff is read-only, pins exact methods, inputs and profile, and exports no credentials or internal file URLs',async()=>{
 const {c,selection}=await valid(),before={methods:await fixture.runtime.client.projectMethodSnapshot.count(),records:await fixture.runtime.client.projectProductionRecord.count(),runs:await fixture.runtime.client.externalProductionRun.count()};
 const preview=await service.preview(access,c.module('copy').id,selection);assert.equal(preview.ready,true,JSON.stringify(preview.issues));
 const exported=await service.export(access,c.module('copy').id,{selection,expectedDigest:preview.digest});ProjectHandoffManifestSchema.parse(exported.manifest);
 assert.equal(exported.manifest.methods[0]!.id,selection.methods[0]!.snapshotId);assert.equal(exported.manifest.inputs.length,2);
  assert.equal(exported.manifest.productName,(await fixture.runtime.client.product.findUniqueOrThrow({where:{id:c.boot.productId}})).name);
 const text=JSON.stringify(exported);for(const banned of ['orai_mcp_','tokenDigest','storageKey','downloadPath','machineCredentialId','account_sessions'])assert.ok(!text.includes(banned),banned);
 assert.equal(exported.manifest.executionStarted,false);assert.equal(exported.manifest.credentialIncluded,false);
 assert.deepEqual({methods:await fixture.runtime.client.projectMethodSnapshot.count(),records:await fixture.runtime.client.projectProductionRecord.count(),runs:await fixture.runtime.client.externalProductionRun.count()},before);
 await rejected(service.export(access,c.module('copy').id,{selection,expectedDigest:'0'.repeat(64)}),'REVISION_CONFLICT');
});
test('missing purposes, duplicate methods, absent fragments, foreign records and private whole assessments block handoff',async()=>{
 const {c,selection}=await valid();for(const altered of [{...selection,methods:[]},{...selection,methods:[...selection.methods,...selection.methods]},{...selection,records:[]},{...selection,inputs:[]},{...selection,inputs:[{...selection.inputs[0]!,locator:{kind:'whole' as const}}]}]){
  assert.equal((await service.preview(access,c.module('copy').id,altered)).ready,false);
 }
 const other=await valid();assert.equal((await service.preview(access,c.module('copy').id,{...selection,records:other.selection.records,inputs:other.selection.inputs})).ready,false);
});
test('a partial upstream record cannot substitute for all required structured originals',async()=>{
 const c=await fresh(),method=await captureMethod(c,'copy'),input=await assessmentInput(c,true);
 const p=await service.preview(access,c.module('copy').id,{expectedModuleDigest:c.module('copy').digest,connectionId:c.connection.id,methods:[{snapshotId:method.snapshot.id,digest:method.snapshot.digest}],records:[{recordId:input.record.id,digest:input.record.digest}],inputs:[]});
 assert.equal(p.ready,false);assert.ok(p.issues.some(i=>i.message.includes('必需原件')));
});
test('a revoked, narrowed, foreign-owner or foreign-workspace connection cannot authorize a handoff',async()=>{
 const {c,selection}=await valid(),other=await fresh();assert.equal((await service.preview(access,c.module('copy').id,{...selection,connectionId:other.connection.id})).ready,false);
 const admin=await fixture.owner.client.user.create({data:{scope:'DEMO',role:'ADMIN',supabaseUserId:randomUUID()}}),otherAccess=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,admin.id);
 assert.equal((await service.preview(otherAccess,c.module('copy').id,selection)).ready,false);
 await rejected(service.candidates(c.machine.get('copy')!,c.module('copy').id,{purpose:'copywriting'}),'FORBIDDEN');
 const plans=app.get(CodexConnectionsService),plan={name:'只读方法的隔离连接',workspace:{kind:'existing',id:c.connection.workspace.id},actions:{createProjects:false,useSkills:true,uploadDrafts:false},
  domains:[{domain:'copy',readSkills:true,uploadDrafts:false,skillIds:[]}],expiresAt:c.connection.expiresAt};
 const preview=await plans.preview(access,plan),narrow=await plans.create(access,{plan:preview.plan,expectedDigest:preview.digest,confirmed:true,clientKey:randomUUID(),requestId:randomUUID()});
 assert.equal((await service.preview(access,c.module('copy').id,{...selection,connectionId:narrow.connection.id})).ready,false);
 const credential=c.connection.credentials.find(c=>c.domain==='copy')!;await app.get(MachineCredentialsService).revoke(access,credential.id,{requestId:randomUUID()});
 assert.equal((await service.preview(access,c.module('copy').id,selection)).ready,false);
 await rejected(service.candidates(c.machine.get('copy')!,c.module('copy').id,{purpose:'copywriting'}),'AUTH_REQUIRED');
});
test('expiry and revocation are checked again when exporting an earlier valid preview',async t=>{
 const {c,selection}=await valid(),p=await service.preview(access,c.module('copy').id,selection);assert.equal(p.ready,true);
 await app.get(CodexConnectionsService).revoke(access,c.connection.id,{requestId:randomUUID()});
 await rejected(service.export(access,c.module('copy').id,{selection,expectedDigest:p.digest}),'CONFLICT');
 const freshContext=await valid();t.mock.timers.enable({apis:['Date'],now:Date.now()+3*3600_000});
 try{const newAccess=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);assert.equal((await service.preview(newAccess,freshContext.c.module('copy').id,freshContext.selection)).ready,false);}
 finally{t.mock.timers.reset();}
});
test('real reference bytes are checked on capture and later handoff without changing old snapshots',async()=>{
 const c=await fresh(),skills=app.get(SkillsService),files=app.get(SkillFilesService),source=await skills.create(access,'copy',{slug:'reference-'+randomUUID(),manifest:methodManifest('copy'),requestId:randomUUID()});
 const bytes=Buffer.from('隔离方法的参考文本。\n'),checksum=createHash('sha256').update(bytes).digest('hex');
 const file=await files.prepare(access,'copy',source.skillId,{fileName:'guide.md',mimeType:'text/markdown',byteSize:bytes.length,checksum,requestId:randomUUID()});
 await files.upload(access,'copy',source.skillId,file.id,Readable.from([bytes]) as unknown as Request);await files.complete(access,'copy',source.skillId,file.id,{requestId:randomUUID()});
 const updated=await skills.save(access,'copy',source.skillId,source.id,{expectedRevision:source.revision,manifest:{...source.manifest,references:[{path:'guide.md',fileId:file.id}]},requestId:randomUUID()});
 const body={expectedModuleDigest:c.module('copy').digest,purpose:'copywriting',sourceVersionId:updated.id,expectedSourceRevision:updated.revision,expectedSourceDigest:updated.digest,requestId:randomUUID()},snapshot=await service.capture(access,c.module('copy').id,body);
 const stored=await fixture.owner.client.skillReferenceFile.findUniqueOrThrow({where:{id:file.id}});await writeFile(join(directory,stored.storageKey),Buffer.alloc(bytes.length,65));
 await rejected(service.capture(access,c.module('copy').id,{...body,customization:{parameters:{},instructions:'另一版'},requestId:randomUUID()}));
 const input=await assessmentInput(c);assert.equal((await service.preview(access,c.module('copy').id,{expectedModuleDigest:c.module('copy').digest,connectionId:c.connection.id,methods:[{snapshotId:snapshot.id,digest:snapshot.digest}],records:[{recordId:input.record.id,digest:input.record.digest}],inputs:[]})).ready,false);
 assert.equal((await app.get(ProjectProductionService).readMethod(access,snapshot.id)).id,snapshot.id);
});
test('required upstream media is revalidated from actual original bytes before preview and export',async()=>{
 const c=await fresh(true),copy=await captureMethod(c,'copy'),cover=await captureMethod(c,'cover'),input=await assessmentInput(c),files=app.get(FilesService);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1kAAAAASUVORK5CYII=','base64'),checksum=createHash('sha256').update(png).digest('hex');
 const upload=await files.prepare(access,{productVersionId:input.draft.productVersionId,kind:'cover',fileName:'source.png',mimeType:'image/png',byteSize:png.length,checksum,requestId:randomUUID()});
 await files.upload(access,upload.id,Readable.from([png]) as unknown as Request);const file=await files.complete(access,upload.id,{requestId:randomUUID()});
 const record=await app.get(ProjectProductionService).save(access,c.module('cover').id,{expectedModuleDigest:c.module('cover').digest,expectedRevision:0,requestId:randomUUID(),
  methods:[{snapshotId:cover.snapshot.id,digest:cover.snapshot.digest}],inputs:[],outputs:[{kind:'file',outputKey:'cover',fileKey:'source',fileId:file.id,checksum}],
  external:{client:'isolated-test-fixture',runKey:'media-'+randomUUID(),note:'原件校验样例',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()}});
 const selection={expectedModuleDigest:c.module('copy').digest,connectionId:c.connection.id,methods:[{snapshotId:copy.snapshot.id,digest:copy.snapshot.digest}],
  records:[{recordId:input.record.id,digest:input.record.digest},{recordId:record.id,digest:record.digest}],inputs:input.questions.slice(0,2).map(q=>({revisionId:input.draft.revisionId,digest:input.draft.digest,locator:{kind:'question',questionId:q.id}}))};
 const p=await service.preview(access,c.module('copy').id,selection);assert.equal(p.ready,true,JSON.stringify(p.issues));assert.equal(p.manifest?.originals.length,1);
 const stored=await fixture.owner.client.assetFile.findUniqueOrThrow({where:{id:file.id}});await writeFile(join(directory,stored.storageKey),Buffer.alloc(png.length,65));
 assert.equal((await service.preview(access,c.module('copy').id,selection)).ready,false);
 await rejected(service.export(access,c.module('copy').id,{selection,expectedDigest:p.digest}),'CONFLICT');
});

class Browser{
 cookies=new Map<string,string>();csrf='';
 async request(path:string,method='GET',body?:unknown,headers:Record<string,string>={}){const response=await fetch(base+'/api'+path,{method,headers:{origin:fixture.configuration.security.origins[0]!,cookie:[...this.cookies].map(([k,v])=>k+'='+v).join(';'),...(body?{'content-type':'application/json'}:{}),...(method==='GET'?{}:{'x-csrf-token':this.csrf}),...headers},body:body?JSON.stringify(body):undefined});
  for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0]!,at=pair.indexOf('=');this.cookies.set(pair.slice(0,at),pair.slice(at+1));}return {status:response.status,body:await response.json(),headers:response.headers};}
 async login(operator=true){this.csrf=(await this.request('/account/context')).body.csrfToken;const accessToken=randomBytes(50).toString('base64url'),refreshToken=randomBytes(40).toString('base64url');proofs.set(accessToken,{supabaseUserId:operator?DemoIdentityScenarios.admin.supabaseUserId:randomUUID(),supabaseSessionId:randomUUID(),emailVerified:true,expiresAt:new Date(Date.now()+3600_000)});refreshes.set(refreshToken,{accessToken,refreshToken});assert.equal((await this.request('/account/session','POST',{accessToken,refreshToken})).status,200);return this;}
}
test('HTTP source/capture/handoff handlers retain strict Cookie, Origin, CSRF and ordinary-account boundaries',async()=>{
 const {c,selection}=await valid(),admin=await new Browser().login(),ordinary=await new Browser().login(false),anonymous=new Browser(),root='/admin/production-modules/'+c.module('copy').id;
 assert.equal((await anonymous.request(root+'/method-candidates?purpose=copywriting')).status,401);assert.equal((await ordinary.request(root+'/method-candidates?purpose=copywriting')).status,403);
 const candidates=await admin.request(root+'/method-candidates?purpose=copywriting');assert.equal(candidates.status,200);assert.equal(candidates.headers.get('cache-control'),'private, no-store');
 assert.equal((await admin.request(root+'/handoff/preview','POST',selection,{'x-csrf-token':''})).status,403);
 assert.equal((await admin.request(root+'/handoff/preview','POST',selection,{origin:'https://evil.invalid'})).status,403);
 assert.equal((await admin.request(root+'/handoff/preview','POST',{...selection,role:'ADMIN'})).status,400);
 const preview=await admin.request(root+'/handoff/preview','POST',selection);assert.equal(preview.status,200);assert.equal(preview.body.ready,true);
 assert.equal((await admin.request(root+'/handoff/export','POST',{selection,expectedDigest:preview.body.digest})).status,200);
});
