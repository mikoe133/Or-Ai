import 'reflect-metadata';
import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Readable} from 'node:stream';
import type {Request} from 'express';
import {SkillFilesService} from '../src/operations/skill-files.service';
import {ProjectMethodOperationsService} from '../src/operations/project-method-operations.service';
import {Test} from '@nestjs/testing';
import type {INestApplication} from '@nestjs/common';
import {emptyExternalRunConfiguration,ExternalRunConfigurationDocumentSchema,externalConfigurationTimeCandidates,ExternalConfigurationManifestSchema} from '@orai/contracts/admin';
import {AppModule} from '../src/app.module';
import {APP_CONFIG} from '../src/config/configuration';
import {configureApp} from '../src/common/configure-app';
import {SupabaseAuthGateway,type SupabaseIdentity} from '../src/accounts/supabase-auth.gateway';
import {CatalogAdminAccessService,type CatalogAdminAccess} from '../src/catalog/admin-access.service';
import {ApiException} from '../src/common/http-errors';
import {DemoIdentityScenarios} from '../scripts/demo-fixtures';
import {createLocalFixture} from './local-fixture';
import {ExternalRunConfigurationsService,EXTERNAL_CONFIGURATION_CLOCK} from '../src/operations/external-run-configurations.service';
import {ProductionPlansService} from '../src/operations/production-plans.service';
import {CodexConnectionsService} from '../src/operations/codex-connections.service';
import {SkillsService} from '../src/operations/skills.service';
import {configurationProject,copyConfiguration} from './external-run-configuration-fixture';
import {methodProject,assessmentInput,methodManifest} from './project-methods-fixture';

let fixture:Awaited<ReturnType<typeof createLocalFixture>>,app:INestApplication,access:CatalogAdminAccess,service:ExternalRunConfigurationsService,directory:string,base:string,stamp=Date.now();
const proofs=new Map<string,SupabaseIdentity>(),refreshes=new Map<string,{accessToken:string;refreshToken:string}>();
before(async()=>{
 fixture=await createLocalFixture('t14');directory=await mkdtemp(join(tmpdir(),'orai-o4-configuration-'));
 const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(APP_CONFIG).useValue({...fixture.configuration,assets:{...fixture.configuration.assets,driver:'local',directory},
  security:{...fixture.configuration.security,readIpLimit:3000,writeIpLimit:3000},auth:{url:'https://isolated.example.test',publishableKey:'sb_publishable_'+'p'.repeat(40),sessionEncryptionKey:randomBytes(32).toString('base64url'),sessionDays:30,requestTimeoutMs:1000},
 }).overrideProvider(EXTERNAL_CONFIGURATION_CLOCK).useValue(()=>new Date(stamp)).overrideProvider(SupabaseAuthGateway).useValue({verify:async(token:string)=>{const p=proofs.get(token);assert.ok(p);return p;},refresh:async(token:string)=>{const v=refreshes.get(token);assert.ok(v);return {...v,identity:proofs.get(v.accessToken)};},logout:async()=>undefined}).compile();
 app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');base=await app.getUrl();access=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);service=app.get(ExternalRunConfigurationsService);
});
after(async()=>{await app?.close();await fixture?.close();if(directory)await rm(directory,{recursive:true,force:true});proofs.clear();refreshes.clear();});
const fresh=()=>{stamp=Date.now();return configurationProject(app,fixture,access);};
const saveNew=(document:unknown,extra={})=>service.create(access,{document,clientKey:randomUUID(),requestId:randomUUID(),...extra});
const selection=(config:Awaited<ReturnType<typeof saveNew>>)=>({revisionId:config.revision.id,expectedDigest:config.revision.digest});
async function rejected(value:Promise<unknown>,code?:string){await assert.rejects(value,e=>e instanceof ApiException&&(!code||e.code===code));}
test('incomplete drafts persist with no suggested client, time, quantity, tool or execution and survive service reads',async()=>{
 const c=await methodProject(app,fixture,access),d=emptyExternalRunConfiguration(c.connection.workspace.id),config=await saveNew(d),loaded=await service.read(access,config.id);
 assert.deepEqual(loaded.revision.document,d);assert.equal(loaded.enabled,false);assert.equal(loaded.revision.document.timing.quantity,null);assert.equal(loaded.revision.document.client.kind,null);
 const check=await service.validate(access,config.id,selection(config));assert.equal(check.readyForReview,false);assert.equal(check.externalReadiness,'not_verified');assert.ok(check.issues.length>5);
});
test('complete fixed methods and waiting dependencies are genuinely checked without creating runs, attempts or granting access',async()=>{
 const c=await fresh(),before=await fixture.runtime.client.externalProductionRun.count(),config=await saveNew(c.document),check=await service.validate(access,config.id,selection(config));
 assert.equal(check.readyForReview,true,JSON.stringify(check.issues));assert.equal(check.scopeSummary.methodCount,4);assert.equal(check.scopeSummary.waitingDependencies,1);assert.equal(check.externalReadiness,'not_verified');assert.equal(await fixture.runtime.client.externalProductionRun.count(),before);
});
test('create idempotency and business identity reuse one configuration while changed intent is rejected',async()=>{
 const c=await fresh(),body={document:c.document,clientKey:randomUUID(),requestId:randomUUID()},a=await service.create(access,body),again=await service.create(access,body),keyRetry=await service.create(access,{...body,requestId:randomUUID()});
 assert.equal(a.id,again.id);assert.equal(a.id,keyRetry.id);assert.equal(await fixture.runtime.client.externalRunConfigurationRevision.count({where:{configurationId:a.id}}),1);
 await rejected(service.create(access,{...body,document:{...c.document,name:'另一份意图'},requestId:randomUUID()}),'IDEMPOTENCY_CONFLICT');
});
test('saved changes append immutable history, preserve earlier values and recover the same successful request',async()=>{
 const c=await fresh(),first=await saveNew(c.document),body={document:{...c.document,name:'调整后的草稿'},expectedRevision:1,requestId:randomUUID()},next=await service.save(access,first.id,body);
 assert.equal(next.currentRevision,2);assert.equal((await service.save(access,first.id,body)).revision.id,next.revision.id);assert.equal((await service.read(access,first.id,first.revision.id)).revision.document.name,c.document.name);
 const history=await service.history(access,first.id,{page:1,pageSize:1});assert.equal(history.total,2);assert.equal(history.items[0]!.revision,2);
 await assert.rejects(fixture.owner.client.$executeRawUnsafe('UPDATE orai.external_run_configuration_revisions SET digest=$1 WHERE id=$2::uuid','a'.repeat(64),first.revision.id));
});
test('concurrent revisions serialize and cannot overwrite or create a broken frontier',async()=>{
 const c=await fresh(),config=await saveNew(c.document),responses=await Promise.allSettled(['甲','乙'].map(name=>service.save(access,config.id,{document:{...c.document,name},expectedRevision:1,requestId:randomUUID()})));
 assert.equal(responses.filter(r=>r.status==='fulfilled').length,1);assert.equal((await service.read(access,config.id)).currentRevision,2);assert.equal(await fixture.runtime.client.externalRunConfigurationRevision.count({where:{configurationId:config.id}}),2);
});
test('an actual revision insert fault rolls back the parent, audit and idempotency; original request retries once',async()=>{
 const c=await fresh(),config=await saveNew(c.document),body={document:{...c.document,name:'故障后恢复'},expectedRevision:1,requestId:randomUUID()};
 await fixture.owner.client.$executeRawUnsafe("CREATE FUNCTION orai.o4_insert_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'isolated insert fault'; END $$");
 await fixture.owner.client.$executeRawUnsafe('CREATE TRIGGER o4_insert_fault BEFORE INSERT ON orai.external_run_configuration_revisions FOR EACH ROW EXECUTE FUNCTION orai.o4_insert_fault()');
 try{await assert.rejects(service.save(access,config.id,body));assert.equal((await service.read(access,config.id)).currentRevision,1);assert.equal(await fixture.runtime.client.adminAuditLog.count({where:{requestId:body.requestId}}),0);}
 finally{await fixture.owner.client.$executeRawUnsafe('DROP TRIGGER o4_insert_fault ON orai.external_run_configuration_revisions');await fixture.owner.client.$executeRawUnsafe('DROP FUNCTION orai.o4_insert_fault()');}
 assert.equal((await service.save(access,config.id,body)).currentRevision,2);
});
test('workspace, connection, plan, module and method references cannot cross their precise owner or project',async()=>{
 const a=await fresh(),b=await fresh();await rejected(saveNew({...a.document,connectionId:b.connection.id}),'FORBIDDEN');
 await rejected(saveNew({...a.document,target:{...a.document.target,productId:b.boot.productId}}));
 const invalid=copyConfiguration(a.document);invalid.modules[0]!.methods=b.document.modules[0]!.methods;await rejected(saveNew(invalid),'FORBIDDEN');
 const saved=await saveNew(a.document);await rejected(service.save(access,saved.id,{document:{...a.document,workspaceId:b.connection.workspace.id},expectedRevision:1,requestId:randomUUID()}),'FORBIDDEN');
 await rejected(service.read({...access,actorUserId:DemoIdentityScenarios.verified.id},saved.id));await rejected(service.read({...access,scope:'LIVE'},saved.id));await rejected(service.read(a.machine.get('assessment')!,saved.id),'FORBIDDEN');
});
test('source URLs, credential-shaped input, unknown keys, widened limits and fabricated new-topic references are not silently accepted',async()=>{
 const c=await fresh();assert.equal(ExternalRunConfigurationDocumentSchema.safeParse({...c.document,enabled:true}).success,false);
 const bad=copyConfiguration(c.document);bad.sourcing.sources[0]!.url='https://name:secret@example.test/';assert.equal(ExternalRunConfigurationDocumentSchema.safeParse(bad).success,false);
 bad.sourcing.sources=[];bad.client.workingDirectory='/example/orai_mcp_'+'x'.repeat(43);assert.equal(ExternalRunConfigurationDocumentSchema.safeParse(bad).success,false);
 assert.equal(ExternalRunConfigurationDocumentSchema.safeParse({...c.document,limits:{...c.document.limits,maxConcurrency:9}}).success,false);
 assert.equal(ExternalRunConfigurationDocumentSchema.safeParse({...c.document,target:{...c.document.target,kind:'new_topics'}}).success,false);
});
test('known costs and explicit tools are required for review, while a zero declared amount is never proof of free execution',async()=>{
 const c=await fresh(),d=copyConfiguration(c.document);d.tools[0]!.cost='unknown';d.tools[0]!.maxCostFen=0;d.tools[1]!.approval='unconfirmed';const config=await saveNew(d),v=await service.validate(access,config.id,selection(config));
 assert.equal(v.readyForReview,false);assert.ok(v.issues.some(i=>i.code==='TOOL_COST'));assert.ok(v.issues.some(i=>i.code==='TOOL_PERMISSION'));
 const exported=await service.export(access,config.id,{...selection(config),expectedValidationDigest:v.digest,consent:true,includeWorkingDirectory:false,format:'json'});assert.equal(exported.manifest.reviewMode,'incomplete_review');assert.deepEqual(exported.manifest.handoffInstructions,[]);
});
test('stage limits never expand totals and multiple roles need explicit same-workspace connections',async()=>{
 const c=await fresh(),d=copyConfiguration(c.document);d.orchestration='multiple';d.limits.stageLimits=[{stage:'S3',maxAttempts:10,maxConcurrency:2,maxDurationSeconds:7200,maxReportedCostFen:2000}];
 const config=await saveNew(d),v=await service.validate(access,config.id,selection(config));assert.ok(v.issues.some(i=>i.code==='STAGE_LIMITS'));assert.ok(v.issues.some(i=>i.code==='ROLE_CONNECTION'));
});
test('invalid, duplicate DST times, missing end dates and arrangements past connection expiry stay unready',async()=>{
 assert.equal(externalConfigurationTimeCandidates('2027-03-14','02:30','America/New_York').length,0);assert.equal(externalConfigurationTimeCandidates('2026-11-01','01:30','America/New_York').length,2);
 const c=await fresh(),d=copyConfiguration(c.document);d.timing={...d.timing,date:'2027-03-14',time:'02:30',timeZone:'America/New_York',kind:'daily',until:'2027-03-15'};
 const config=await saveNew(d),v=await service.validate(access,config.id,selection(config));assert.ok(v.issues.some(i=>i.code==='TIME_AMBIGUOUS'));assert.ok(v.issues.some(i=>i.code==='CONNECTION_TERM'));
 const invalid=copyConfiguration(c.document);invalid.timing.kind='daily';invalid.timing.until=null;const saved=await saveNew(invalid);assert.ok((await service.validate(access,saved.id,selection(saved))).issues.some(i=>i.code==='END_DATE_REQUIRED'));
});
test('new-topic preparation can persist only without fixed project records and remains incomplete',async()=>{
 const c=await fresh(),d=copyConfiguration(c.document);d.target={kind:'new_topics',productId:null,planRevisionId:null,planDigest:null};d.modules=[];const config=await saveNew(d),v=await service.validate(access,config.id,selection(config));assert.equal(v.readyForReview,false);assert.ok(v.issues.some(i=>i.code==='TOPIC_PREPARATION'));
});
test('the final recurring occurrence cannot extend past a connection even on the same UTC expiry date',async()=>{
 const c=await fresh(),document=copyConfiguration(c.document),expiry=new Date(c.connection.expiresAt),after=new Date(expiry.getTime()+3600000),previousDay=new Date(after.getTime()-86400000);
 stamp=previousDay.getTime()-3600000;document.timing={...document.timing,kind:'daily',date:previousDay.toISOString().slice(0,10),time:after.toISOString().slice(11,16),timeZone:'UTC',until:after.toISOString().slice(0,10)};
 const config=await saveNew(document),v=await service.validate(access,config.id,selection(config));assert.ok(v.issues.some(i=>i.code==='CONNECTION_TERM'));stamp=Date.now();
});
test('actual fixed dependency records need explicit minimal fragments and exclude private scoring from exported data',async()=>{
 const c=await fresh(),input=await assessmentInput(c),d=copyConfiguration(c.document),copy=d.modules.find(m=>m.planModuleId===c.module('copy').id)!;
 copy.dependencies=[{kind:'fixed',planModuleId:c.module('assessment').id,recordId:input.record.id,digest:input.record.digest,inputs:[]}];
 const config=await saveNew(d),v=await service.validate(access,config.id,selection(config));assert.ok(v.issues.some(i=>i.code==='MISSING_FRAGMENT'));
 const binding=copy.dependencies[0]!;if(binding.kind==='fixed')binding.inputs=input.questions.slice(0,2).map(q=>({revisionId:input.draft.revisionId,digest:input.draft.digest,locator:{kind:'question',questionId:q.id}}));
 const fixed=await service.save(access,config.id,{document:d,expectedRevision:1,requestId:randomUUID()}),check=await service.validate(access,fixed.id,selection(fixed));assert.equal(check.readyForReview,true,JSON.stringify(check.issues));
 const exported=await service.export(access,fixed.id,{...selection(fixed),expectedValidationDigest:check.digest,consent:true,includeWorkingDirectory:false,format:'json'});assert.equal(JSON.stringify(exported).includes('scoring'),false);assert.equal(exported.manifest.document.client.workingDirectory,null);
});
test('choosing an existing dependency without its record persists an honest incomplete choice with no fabricated identity',async()=>{
 const c=await fresh(),document=copyConfiguration(c.document);document.modules.find(m=>m.planModuleId===c.module('copy').id)!.dependencies=[{kind:'fixed',planModuleId:c.module('assessment').id,recordId:null,digest:null,inputs:[]}];
 const config=await saveNew(document),v=await service.validate(access,config.id,selection(config));assert.equal(v.readyForReview,false);assert.ok(v.issues.some(i=>i.code==='FIXED_RECORD_REQUIRED'));assert.equal((await service.read(access,config.id)).revision.document.modules.find(m=>m.planModuleId===c.module('copy').id)!.dependencies[0]!.kind,'fixed');
});
test('archived methods retain their exact snapshot, while a changed plan invalidates an already prepared export',async()=>{
 const c=await fresh(),config=await saveNew(c.document),v=await service.validate(access,config.id,selection(config));assert.equal(v.readyForReview,true);
 const method=await fixture.runtime.client.projectMethodSnapshot.findUniqueOrThrow({where:{id:c.document.modules[0]!.methods[0]!.snapshotId}}),version=await fixture.runtime.client.styleSkillVersion.findUniqueOrThrow({where:{id:method.sourceVersionId}});
 await app.get(SkillsService).transition(access,'assessment',version.skillId,version.id,'archive',{expectedRevision:version.revision,requestId:randomUUID()});
 assert.equal((await service.validate(access,config.id,selection(config))).readyForReview,true);
 await app.get(ProductionPlansService).save(access,c.boot.productId,{expectedRevision:c.plan.revision,plan:c.plan.plan,requestId:randomUUID()});
 await rejected(service.export(access,config.id,{...selection(config),expectedValidationDigest:v.digest,consent:true,includeWorkingDirectory:false,format:'json'}),'REVISION_CONFLICT');
 assert.equal((await service.read(access,config.id)).revision.document.target.planRevisionId,c.plan.id);
});
test('revocation is checked again at export and does not mutate saved history',async()=>{
 const c=await fresh(),config=await saveNew(c.document),v=await service.validate(access,config.id,selection(config));await app.get(CodexConnectionsService).revoke(access,c.connection.id,{requestId:randomUUID()});
 await rejected(service.export(access,config.id,{...selection(config),expectedValidationDigest:v.digest,consent:true,includeWorkingDirectory:false,format:'json'}),'REVISION_CONFLICT');assert.deepEqual((await service.read(access,config.id)).revision.document,c.document);
});
test('JSON and Markdown exports are read-only disabled review artifacts, with working directory only after explicit selection',async()=>{
 const c=await fresh(),config=await saveNew(c.document),v=await service.validate(access,config.id,selection(config)),before=await fixture.runtime.client.adminAuditLog.count();
 const exported=await service.export(access,config.id,{...selection(config),expectedValidationDigest:v.digest,consent:true,includeWorkingDirectory:false,format:'json'});ExternalConfigurationManifestSchema.parse(exported.manifest);assert.equal(exported.manifest.reviewMode,'review_only');assert.equal(exported.manifest.enabled,false);assert.equal(exported.manifest.credentialIncluded,false);assert.equal(exported.manifest.executionStarted,false);
 const md=await service.export(access,config.id,{...selection(config),expectedValidationDigest:v.digest,consent:true,includeWorkingDirectory:true,format:'markdown'});assert.ok(md.markdown?.startsWith('# 未启用'));assert.equal(md.manifest.document.client.workingDirectory,c.document.client.workingDirectory);assert.equal(await fixture.runtime.client.adminAuditLog.count(),before);
});
test('real fixed method attachment bytes are checked again before an export',async()=>{
 const c=await fresh(),skills=app.get(SkillsService),files=app.get(SkillFilesService),source=await skills.create(access,'copy',{slug:'o4-attachment-'+randomUUID(),manifest:methodManifest('copy'),requestId:randomUUID()}),bytes=Buffer.from('original fixed method guidance\n'),checksum=createHash('sha256').update(bytes).digest('hex');
 const file=await files.prepare(access,'copy',source.skillId,{fileName:'guide.md',mimeType:'text/markdown',byteSize:bytes.length,checksum,requestId:randomUUID()});
 await files.upload(access,'copy',source.skillId,file.id,Readable.from([bytes]) as unknown as Request);await files.complete(access,'copy',source.skillId,file.id,{requestId:randomUUID()});
 const version=await skills.save(access,'copy',source.skillId,source.id,{expectedRevision:source.revision,manifest:{...source.manifest,references:[{path:'guide.md',fileId:file.id}]},requestId:randomUUID()});
 const snapshot=await app.get(ProjectMethodOperationsService).capture(access,c.module('copy').id,{expectedModuleDigest:c.module('copy').digest,purpose:'copywriting',sourceVersionId:version.id,expectedSourceRevision:version.revision,expectedSourceDigest:version.digest,requestId:randomUUID()});
 const document=copyConfiguration(c.document);document.modules.find(m=>m.planModuleId===c.module('copy').id)!.methods=[{snapshotId:snapshot.id,digest:snapshot.digest,purpose:'copywriting'}];
 const config=await saveNew(document),v=await service.validate(access,config.id,selection(config));assert.equal(v.readyForReview,true,JSON.stringify(v.issues));
 const stored=await fixture.owner.client.skillReferenceFile.findUniqueOrThrow({where:{id:file.id}});await writeFile(join(directory,stored.storageKey),Buffer.alloc(bytes.length,65));
 await rejected(service.export(access,config.id,{...selection(config),expectedValidationDigest:v.digest,consent:true,includeWorkingDirectory:false,format:'json'}),'REVISION_CONFLICT');assert.equal((await service.read(access,config.id)).revision.digest,config.revision.digest);
});
test('other administrators cannot read configurations and runtime SQL cannot rewrite or delete their immutable revisions',async()=>{
 const c=await fresh(),config=await saveNew(c.document),user=await fixture.owner.client.user.create({data:{scope:'DEMO',role:'ADMIN',supabaseUserId:randomUUID()}}),other=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,user.id);
 await rejected(service.read(other,config.id),'NOT_FOUND');await rejected(service.history(other,config.id,{page:1,pageSize:20}),'NOT_FOUND');
 await assert.rejects(fixture.runtime.client.$executeRawUnsafe('DELETE FROM orai.external_run_configuration_revisions WHERE id=$1::uuid',config.revision.id));
 await assert.rejects(fixture.owner.client.$executeRawUnsafe('UPDATE orai.external_run_configurations SET current_revision=current_revision+2 WHERE id=$1::uuid',config.id));
 assert.equal((await service.read(access,config.id)).currentRevision,1);
});
test('evidence selection without fixed evidence remains unready rather than claiming source freshness was tested',async()=>{
 const c=await fresh(),d=copyConfiguration(c.document);d.sourcing.basis='evidence';const config=await saveNew(d),v=await service.validate(access,config.id,selection(config));assert.equal(v.readyForReview,false);assert.ok(v.issues.some(i=>i.code==='EVIDENCE_REQUIRED'));
});
test('partially declared sources persist as unknown and never inherit a suggested region or source address',async()=>{
 const c=await fresh(),document=copyConfiguration(c.document);document.sourcing.sources=[{key:'unconfirmed',region:null,language:null,name:null,url:null}];const config=await saveNew(document),v=await service.validate(access,config.id,selection(config));assert.equal(v.readyForReview,false);assert.ok(v.issues.some(i=>i.code==='SOURCE_FIELDS'));assert.equal((await service.read(access,config.id)).revision.document.sourcing.sources[0]!.region,null);
});
class Browser{cookies=new Map<string,string>();csrf='';async request(path:string,method='GET',body?:unknown,headers:Record<string,string>={}){const response=await fetch(base+'/api'+path,{method,headers:{origin:fixture.configuration.security.origins[0]!,cookie:[...this.cookies].map(([k,v])=>k+'='+v).join(';'),...(body?{'content-type':'application/json'}:{}),...(method==='GET'?{}:{'x-csrf-token':this.csrf}),...headers},body:body?JSON.stringify(body):undefined});
 for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0]!,at=pair.indexOf('=');this.cookies.set(pair.slice(0,at),pair.slice(at+1));}return {status:response.status,body:await response.json(),headers:response.headers};}
 async login(operator=true){this.csrf=(await this.request('/account/context')).body.csrfToken;const accessToken=randomBytes(50).toString('base64url'),refreshToken=randomBytes(40).toString('base64url');proofs.set(accessToken,{supabaseUserId:operator?DemoIdentityScenarios.admin.supabaseUserId:randomUUID(),supabaseSessionId:randomUUID(),emailVerified:true,expiresAt:new Date(Date.now()+3600_000)});refreshes.set(refreshToken,{accessToken,refreshToken});assert.equal((await this.request('/account/session','POST',{accessToken,refreshToken})).status,200);return this;}}
test('HTTP endpoints preserve administrator Cookie, Origin, CSRF, no-store and strict input boundaries',async()=>{
 const c=await fresh(),config=await saveNew(c.document),admin=await new Browser().login(),ordinary=await new Browser().login(false),anonymous=new Browser(),root='/admin/external-run-configurations';
 assert.equal((await anonymous.request(root)).status,401);assert.equal((await ordinary.request(root)).status,403);
 const result=await admin.request(root+'/'+config.id);assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');
 assert.equal((await admin.request(root+'/'+config.id+'/validate','POST',selection(config),{'x-csrf-token':''})).status,403);
 assert.equal((await admin.request(root+'/'+config.id+'/validate','POST',selection(config),{origin:'https://evil.invalid'})).status,403);
 assert.equal((await admin.request(root+'/'+config.id+'/validate','POST',{...selection(config),enabled:true})).status,400);
 const check=await admin.request(root+'/'+config.id+'/validate','POST',selection(config));assert.equal(check.status,200);assert.equal(check.body.readyForReview,true);
 const options=await admin.request(root+'/options?workspaceId='+c.connection.workspace.id);assert.equal(options.status,200);assert.ok(options.body.projects.items.some((p:{productId:string})=>p.productId===c.boot.productId));
});
