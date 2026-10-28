import 'reflect-metadata';
import { readyPublicationPlan } from './publication-fixture';
import { currentSkillManifest, policyPlanDocument } from './skill-policy-fixture';
import { ProductionPlansService } from '../src/operations/production-plans.service';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Request } from 'express';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { CreativeProfileSchema, StyleSkillManifestSchema, ProductionPlanDocumentSchema, type ExperienceSaveSchema } from '@orai/contracts/admin';
import type { z } from 'zod';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/config/configuration';
import { configureApp } from '../src/common/configure-app';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { VersionsService } from '../src/catalog/versions.service';
import { RuntimeVersionService } from '../src/catalog/runtime-version.service';
import { DeliveryAdminService } from '../src/redemption/delivery-admin.service';
import { ProjectProductionService } from '../src/operations/project-production.service';
import { ExperienceAuthoringService } from '../src/operations/experience-authoring.service';
import { ContentService } from '../src/operations/content.service';
import { SkillsService } from '../src/operations/skills.service';
import { FilesService } from '../src/operations/files.service';
import { FileCleanupService } from '../src/operations/file-cleanup.service';
import { MachineCredentialsService } from '../src/operations/machine-credentials.service';
import { demoId, DemoIdentityScenarios, DemoProducts } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';
import { Prisma } from '../src/generated/prisma/client';

let fixture: Awaited<ReturnType<typeof createLocalFixture>>, app: INestApplication, base: string, directory: string, access: CatalogAdminAccess;
let experiences: ExperienceAuthoringService, versions: VersionsService, content: ContentService;
const productId = demoId('demo-partner');
const hash = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
const execute = promisify(execFile);
before(async () => {
  fixture = await createLocalFixture('t15'); directory = await mkdtemp(join(tmpdir(),'orai-t15b-'));
  const configuration = { ...fixture.configuration, assets: { driver: 'local' as const, directory, maxImageBytes:4194304,maxVideoBytes:104857600 },
    security: { ...fixture.configuration.security, readIpLimit:2000,writeIpLimit:2000,claimIpLimit:1000,claimCodeLimit:1000 } };
  const module = await Test.createTestingModule({ imports:[AppModule] }).overrideProvider(APP_CONFIG).useValue(configuration).compile();
  app=module.createNestApplication({logger:false});configureApp(app);await app.listen(0,'127.0.0.1');base=await app.getUrl();
  access=await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client,DemoIdentityScenarios.admin.id);
  experiences=app.get(ExperienceAuthoringService);versions=app.get(VersionsService);content=app.get(ContentService);
});
after(async()=>{await app?.close();await fixture?.close();if(directory)await rm(directory,{recursive:true,force:true});});
async function fresh(onlyCover = false, overrides: Partial<z.infer<typeof CreativeProfileSchema>> = {}, publishable = false) {
  const latest = await fixture.runtime.client.creativeProfileRevision.aggregate({where:{productId},_max:{number:true}});
  const profile = await content.saveProfile(access,productId,{expectedRevision:latest._max.number??0,requestId:randomUUID(),profile:CreativeProfileSchema.parse({
    schemaVersion:1,title:'相互理解',audience:'自我观察的成年人',situation:'日常沟通',emotionalGoal:'被理解与接纳',understandingGoal:'看见自己的协作节奏',takeaway:'一个具体的沟通行动',
    perspective:'self',experienceForm:'web',pace:'从容',world:'安静的花园',language:'温柔而具体',visual:'精密工具紫',sound:'无需音效',
    reportPlan:{schemaVersion:1,title:'协作观察',narrative:'以具体线索理解沟通节奏',presentation:'standard',sections:[{sectionId:'observations',title:'观察与建议',purpose:'帮助自我理解'}]},
    channels:['manual'],deliverables:onlyCover?['cover']:['assessment','cover','video','copy'],...overrides,
  })});
  const version=await versions.importConfiguration(access,productId,{configuration:DemoProducts[0]!.configurations[1],requestId:randomUUID()});
  const workspace=await experiences.workspace(access,productId,version.id,{profileId:profile.id});
  const currentPlan=await fixture.runtime.client.productionPlanRevision.aggregate({where:{productId},_max:{number:true}});
  const plan=await app.get(ProductionPlansService).save(access,productId,{plan:publishable?readyPublicationPlan(profile.id,profile.profile.experienceForm):policyPlanDocument(profile.id,profile.profile.experienceForm),
    expectedRevision:currentPlan._max.number??0,requestId:randomUUID()});
  const input:z.infer<typeof ExperienceSaveSchema>={manifest:workspace.defaultManifest,reportPlan:profile.profile.reportPlan,methods:[],note:'人工体验制作',
    productPlan:{revisionId:plan.id,digest:plan.digest},
    source:'manual',expectedRevision:0,expectedVersionRevision:version.revision,requestId:randomUUID()};
  if(publishable){input.manifest.renderer={key:'reflection-garden',version:1};input.manifest.report.renderer={key:'garden-notes',version:1};}
  return {version,profile,input};
}
async function saved(publishable=false) {const value=await fresh(false,{},publishable);return {...value,draft:await experiences.save(access,productId,value.version.id,value.input)};}
const draftBody=(value:Awaited<ReturnType<typeof saved>>)=>({manifest:value.draft.manifest,reportPlan:value.draft.reportPlan,methods:[],note:value.draft.note});
async function machine(variant: string, productIds=[productId], skillIds:string[]=[]) {
  return app.get(MachineCredentialsService).create(access,{name:'T15-B '+variant,domain:variant,
    productIds,skillIds,permissions:skillIds.length?['content:read','content:write','context:read','skills:read','skills:write']:['content:read','content:write','context:read'],
    expiresAt:new Date(Date.now()+3600000).toISOString(),requestId:randomUUID()});
}
async function call(token:string,operation:string,body:unknown={},domain='experience') {
  const response=await fetch(`${base}/api/machine/${domain}/tools/${operation}`,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)});
  return {status:response.status,body:await response.json()};
}
async function methods(supportedForms: ('web'|'3d')[] = ['web']) {
  const service=app.get(SkillsService);
  const created=await service.create(access,'experience',{slug:'experience-'+randomUUID(),requestId:randomUUID(),manifest:currentSkillManifest({
    schemaVersion:1,domain:'experience',name:'温柔花园体验方法',description:'同设定的场景与报告呈现',purposes:['scene_design','report_presentation'],
    styles:['温柔'],supportedForms,inputs:[{key:'creative-profile',description:'固定共同设定',required:true}],outputs:[{key:'experience',description:'已注册模板的结构化清单'}],
    instructions:'只使用已注册模板与脱敏选项；保留明确确认和同内容降级。',examples:[],references:[],
  })});
  const reviewed=await service.transition(access,'experience',created.skillId,created.id,'review',{expectedRevision:created.revision,requestId:randomUUID()});
  return service.transition(access,'experience',created.skillId,created.id,'activate',{expectedRevision:reviewed.revision,requestId:randomUUID()});
}

test('experience drafts pin a profile, append immutable revisions, retry idempotently and reject stale writers',async()=>{
  const value=await fresh(),first=await experiences.save(access,productId,value.version.id,value.input);
  const retry=await experiences.save(access,productId,value.version.id,value.input);
  assert.deepEqual(retry,first);assert.equal(first.revision,1);assert.equal(first.source,'manual');
  const v=await fixture.runtime.client.productVersion.findUniqueOrThrow({where:{id:value.version.id}});
  assert.equal(v.creativeProfileRevisionId,value.profile.id);assert.equal(v.revision,1);
  await assert.rejects(experiences.save(access,productId,v.id,{...value.input,requestId:randomUUID()}));
  const next=await experiences.save(access,productId,v.id,{...value.input,expectedRevision:1,expectedVersionRevision:1,requestId:randomUUID(),note:'第二稿'});
  assert.equal(next.revision,2);assert.equal((await experiences.read(access,first.id)).note,'人工体验制作');
  await assert.rejects(fixture.owner.client.experienceAuthoringRevision.update({where:{id:first.id},data:{note:'overwrite'}}));
  await assert.rejects(experiences.read({actorUserId:access.actorUserId,scope:'DEMO'} as CatalogAdminAccess,first.id));
  const unsigned=await fetch(base+`/api/admin/experience-revisions/${first.id}`);assert.notEqual(unsigned.status,200);
});

test('capability discovery is opt-in, uses the version fixed profile and agrees across workspace and MCP without private scoring data',async()=>{
  const value=await saved(),other=await fresh(false,{experienceForm:'3d'});
  const old=await experiences.workspace(access,productId,value.version.id,{profileId:other.profile.id});
  assert.equal('capabilities' in old,false);
  const workspace=await experiences.workspace(access,productId,value.version.id,{profileId:other.profile.id,includeCapabilities:'true'});
  assert.equal(workspace.capabilities?.profileRevisionId,value.profile.id);
  assert.equal(workspace.capabilities?.profileBinding,'fixed');
  assert.equal(workspace.capabilities?.status,'compatible');
  assert.equal(workspace.capabilities?.selected?.renderer,'dom-choice@1');
  const issued=await machine('experience');
  const context=await call(issued.token!,'context_bundle_get',{productVersionId:value.version.id,includeCapabilities:true});
  assert.equal(context.status,200,JSON.stringify(context.body));
  assert.deepEqual(context.body.capabilities,workspace.capabilities);
  assert.equal('templates' in context.body.supported,false);
  const legacy=await call(issued.token!,'context_bundle_get',{productVersionId:value.version.id});
  assert.equal('capabilities' in legacy.body,false);
  const publicText=JSON.stringify(context.body.capabilities);
  for(const field of ['points','weight','bands','answers','snapshot','storageKey','configuration','templates'])
    assert.equal(publicText.includes('"'+field+'"'),false);
  const unbound=await experiences.workspace(access,productId,other.version.id,{includeCapabilities:true});
  assert.equal(unbound.capabilities?.status,'needs_profile');
  assert.equal(unbound.capabilities?.modules.content,'editable');
  await assert.rejects(experiences.workspace(access,productId,value.version.id,{includeCapabilities:'invalid'}));
});

test('planned product forms remain readable proposals and fail the same capability checks before review and publication',async()=>{
  for(const experienceForm of ['game','cards','2.5d'] as const) {
    const value=await fresh(false,{experienceForm});
    const draft=await experiences.save(access,productId,value.version.id,value.input);
    const workspace=await experiences.workspace(access,productId,value.version.id,{includeCapabilities:true});
    assert.equal(workspace.capabilities?.intentForm,experienceForm);
    assert.equal(workspace.capabilities?.status,'blocked');
    assert.equal(workspace.capabilities?.modules.content,'read_only');
    const check=await experiences.check(access,productId,value.version.id,{manifest:draft.manifest,reportPlan:draft.reportPlan,methods:[],note:draft.note});
    assert.equal(check.valid,false);
    assert.ok(workspace.capabilities!.issues.every(issue=>check.issues.includes(issue)));
    await assert.rejects(experiences.review(access,draft.id,{expectedRevision:1,requestId:randomUUID()}));
    await versions.review(access,productId,value.version.id,{requestId:randomUUID()});
    await assert.rejects(versions.publish(access,productId,value.version.id,{requestId:randomUUID()}));
    assert.equal(await fixture.runtime.client.experienceRelease.count({where:{productVersionId:value.version.id}}),0);
  }
});

test('default publication requires authored Three.js while retaining legacy reads and authoring-only report proposals',async()=>{
  for(const experienceForm of ['3d','game'] as const) {
    const value=await fresh(false,{experienceForm});
    await fixture.runtime.client.productVersion.update({where:{id:value.version.id},data:{creativeProfileRevisionId:value.profile.id,revision:{increment:1}}});
    await versions.review(access,productId,value.version.id,{requestId:randomUUID()});
    await assert.rejects(versions.publish(access,productId,value.version.id,{requestId:randomUUID()}));
    assert.equal(await fixture.runtime.client.experienceRelease.count({where:{productVersionId:value.version.id}}),0);
  }
  const compatible=await fresh(),journal=await fresh(false,{reportPlan:{...compatible.profile.profile.reportPlan,presentation:'journal'}});
  await fixture.runtime.client.productVersion.update({where:{id:journal.version.id},data:{creativeProfileRevisionId:journal.profile.id,revision:{increment:1}}});
  await versions.review(access,productId,journal.version.id,{requestId:randomUUID()});
  await assert.rejects(versions.publish(access,productId,journal.version.id,{requestId:randomUUID()}));
  const old=await app.get(RuntimeVersionService).read(demoId('demo-partner-v2'));
  assert.equal(old.experience.manifest.report.renderer.key,'legacy-text');
  const capabilities=(await experiences.workspace(access,productId,journal.version.id,{includeCapabilities:true})).capabilities!;
  assert.equal(capabilities.modules.content,'editable');
  assert.equal(capabilities.modules.experience,'read_only');
});

test('unregistered renderer, incomplete mappings and incompatible report proposals remain drafts and cannot review',async()=>{
  for(const failure of ['renderer','mapping','report','profile']) {
    const value=await fresh(failure==='profile');
    if(failure==='renderer')value.input.manifest.renderer.key='unregistered-room';
    if(failure==='mapping')value.input.manifest.scenes[0]!.choices[0]!.optionId='unknown-option';
    if(failure==='report')value.input.reportPlan={...value.input.reportPlan,presentation:'map'};
    const draft=await experiences.save(access,productId,value.version.id,value.input);
    const check=await experiences.check(access,productId,value.version.id,{manifest:draft.manifest,reportPlan:draft.reportPlan,methods:[],note:draft.note});
    assert.equal(check.valid,false);
    await assert.rejects(experiences.review(access,draft.id,{expectedRevision:1,requestId:randomUUID()}));
  }
  const value=await saved();
  assert.equal((await experiences.check(access,productId,value.version.id,{...draftBody(value),manifest:{...value.draft.manifest,scriptUrl:'https://invalid.example/script.js'}})).valid,false);
});

test('archived experience methods can only retain their existing purpose under the same fixed creative profile',async()=>{
  const value=await fresh(),method=await methods();
  const choices=[{purpose:'scene_design' as const,skillVersionId:method.id},{purpose:'report_presentation' as const,skillVersionId:method.id}];
  const first=await experiences.save(access,productId,value.version.id,{...value.input,methods:choices});
  await app.get(SkillsService).transition(access,'experience',method.skillId,method.id,'archive',{expectedRevision:method.revision,requestId:randomUUID()});
  const kept=await experiences.save(access,productId,value.version.id,{...value.input,methods:choices,expectedRevision:1,expectedVersionRevision:1,requestId:randomUUID()});
  assert.equal(kept.methods[0]?.version.id,method.id);
  const other=await fresh();
  await fixture.owner.client.productVersion.update({where:{id:value.version.id},data:{creativeProfileRevisionId:other.profile.id,revision:{increment:1}}});
  const workspace=await experiences.workspace(access,productId,value.version.id,{});
  await assert.rejects(experiences.save(access,productId,value.version.id,{...value.input,manifest:workspace.defaultManifest,reportPlan:workspace.reportPlan,
    methods:choices,expectedRevision:2,expectedVersionRevision:workspace.versionRevision,requestId:randomUUID()}));
  assert.deepEqual((await experiences.read(access,first.id)).methods,first.methods);
});

test('publication requires the latest reviewed matching experience and captures its exact release without changing old versions',async()=>{
  const legacy=await app.get(RuntimeVersionService).read(demoId('demo-partner-v2'));
  const value=await saved(true);await versions.review(access,productId,value.version.id,{requestId:randomUUID()});
  await assert.rejects(versions.publish(access,productId,value.version.id,{requestId:randomUUID()}));
  const reviewed=await experiences.review(access,value.draft.id,{expectedRevision:1,requestId:randomUUID()});
  const tampered=JSON.stringify({...reviewed.manifest,theme:{key:'different-theme',revision:1}});
  await assert.rejects(fixture.owner.client.$executeRaw(Prisma.sql`INSERT INTO orai.experience_releases(id,product_id,product_version_id,scope,creative_profile_revision_id,authoring_revision_id,manifest,digest)
    VALUES(${randomUUID()}::uuid,${productId}::uuid,${value.version.id}::uuid,'DEMO',${value.profile.id}::uuid,${reviewed.id}::uuid,${tampered}::jsonb,
      encode(sha256(convert_to((${tampered}::jsonb)::text,'UTF8')),'hex'))`));
  await versions.publish(access,productId,value.version.id,{requestId:randomUUID()});
  const release=await fixture.runtime.client.experienceRelease.findUniqueOrThrow({where:{productVersionId:value.version.id}});
  assert.equal(release.authoringRevisionId,reviewed.id);assert.deepEqual(release.manifest,reviewed.manifest);
  assert.deepEqual((await app.get(RuntimeVersionService).read(legacy.id)).experience,legacy.experience);
  await assert.rejects(experiences.save(access,productId,value.version.id,{...value.input,expectedRevision:2,expectedVersionRevision:3,requestId:randomUUID()}));
});

test('quiet room and field notes retain compatible authoring and previews but cannot become a new normal product',async()=>{
  const value=await fresh();
  value.input.manifest.renderer={key:'quiet-room',version:1};
  value.input.manifest.report.renderer={key:'field-notes',version:1};
  const draft=await experiences.save(access,productId,value.version.id,value.input);
  assert.equal((await experiences.check(access,productId,value.version.id,{manifest:draft.manifest,reportPlan:draft.reportPlan,methods:[],note:draft.note})).valid,true);
  const preview=await experiences.preview(access,draft.id,{answers:DemoProducts[0]!.configurations[1]!.questions.map(question=>({questionId:question.id,optionId:'often'}))});
  assert.equal(preview.report.totalScore,100);assert.equal(preview.presentation.renderer.key,'field-notes');
  await assert.rejects(experiences.review(access,draft.id,{expectedRevision:1,requestId:randomUUID()}));
  await versions.review(access,productId,value.version.id,{requestId:randomUUID()});
  await assert.rejects(versions.publish(access,productId,value.version.id,{requestId:randomUUID()}));
  const runtime=await app.get(RuntimeVersionService).read(demoId('demo-partner-v2'));
  assert.equal(runtime.experience.manifest.renderer.key,'dom-choice');
  assert.equal(runtime.experience.manifest.report.renderer.key,'legacy-text');
  assert.deepEqual(runtime.configuration,DemoProducts[0]!.configurations[1]);
});

test('content edits invalidate reviewed experience; preview uses sample answers and never creates usage or statistics',async()=>{
  const value=await saved(true);
  const before={attempts:await fixture.runtime.client.attempt.count(),reports:await fixture.runtime.client.report.count(),events:await fixture.runtime.client.event.count()};
  const config=DemoProducts[0]!.configurations[1]!;
  const preview=await experiences.preview(access,value.draft.id,{answers:config.questions.map(q=>({questionId:q.id,optionId:'often'}))});
  assert.equal(preview.isPreview,true);assert.equal(preview.report.totalScore,100);
  assert.deepEqual({attempts:await fixture.runtime.client.attempt.count(),reports:await fixture.runtime.client.report.count(),events:await fixture.runtime.client.event.count()},before);
  await experiences.review(access,value.draft.id,{expectedRevision:1,requestId:randomUUID()});
  const changed=structuredClone(config);changed.questions[0]!.text+=' 更新';
  const replaced=await versions.replaceDraft(access,productId,value.version.id,{configuration:changed,expectedRevision:1,requestId:randomUUID()});
  await versions.review(access,productId,value.version.id,{requestId:randomUUID()});
  await assert.rejects(versions.publish(access,productId,value.version.id,{requestId:randomUUID()}));
  await assert.rejects(experiences.preview(access,value.draft.id,{answers:changed.questions.map(q=>({questionId:q.id,optionId:'often'}))}));
  assert.ok(replaced.revision>1);
});

test('dedicated experience pictures verify actual bytes and protect even historical draft resources from cleanup',async()=>{
  const value=await fresh(),bytes=await readFile(join(__dirname,'../../test/fixtures/cover.jpg')),files=app.get(FilesService);
  const file=await files.prepare(access,{productVersionId:value.version.id,kind:'experience',fileName:'scene.jpg',mimeType:'image/jpeg',byteSize:bytes.length,checksum:hash(bytes),requestId:randomUUID()});
  await files.upload(access,file.id,Readable.from([bytes]) as unknown as Request);
  const verified=await files.complete(access,file.id,{requestId:randomUUID()});assert.equal(verified.kind,'experience');assert.equal(verified.status,'available');
  value.input.manifest.resources=[{resourceId:'scene',fileId:file.id,purpose:'illustration',label:'花园场景',checksum:hash(bytes),byteSize:bytes.length,mimeType:'image/jpeg'}];
  const draft=await experiences.save(access,productId,value.version.id,value.input);
  assert.equal(await fixture.runtime.client.experienceAuthoringResource.count({where:{revisionId:draft.id}}),1);
  const other=await fresh();await assert.rejects(experiences.save(access,productId,other.version.id,{...other.input,manifest:{...other.input.manifest,resources:value.input.manifest.resources}}));
  await writeFile(join(directory,file.id+'.blob'),'tampered');
  await assert.rejects(experiences.review(access,draft.id,{expectedRevision:1,requestId:randomUUID()}));
  await writeFile(join(directory,file.id+'.blob'),bytes);
  assert.equal((await app.get(FileCleanupService).candidates(access,productId,{})).items.some((f:{id:string})=>f.id===file.id),false);
});

test('experience machine scopes expose no scoring or consumer records and bind trustworthy methods and source',async()=>{
  const value=await saved(),method=await methods(),issued=await machine('experience',[productId],[method.skillId]);
  const context=await call(issued.token!,'context_bundle_get',{productVersionId:value.version.id,skillVersionIds:[method.id],productPlan:value.input.productPlan});
  assert.equal(context.status,200,JSON.stringify(context.body));assert.equal(context.body.methods.length,2);
  assert.equal('templates' in context.body.supported,false);
  const capabilities=await call(issued.token!,'context_bundle_get',{productVersionId:value.version.id,skillVersionIds:[method.id],includeTemplates:true,productPlan:value.input.productPlan});
  assert.equal(capabilities.status,200);assert.ok(capabilities.body.supported.templates.some((template:{renderer:string;report:string;maxOptions:number})=>
    template.renderer==='quiet-room@1'&&template.report==='field-notes@1'&&template.maxOptions===4));
  const text=JSON.stringify(context.body);for(const field of ['points','weight','templates','bands','answers','snapshot','storageKey'])assert.equal(text.includes('"'+field+'"'),false);
  const body={...value.input,methods:[{purpose:'scene_design',skillVersionId:method.id},{purpose:'report_presentation',skillVersionId:method.id}],expectedRevision:1,expectedVersionRevision:1,requestId:randomUUID()};
  const {source:_source,...machineBody}=body;
  const first=await call(issued.token!,'draft_save',machineBody);assert.equal(first.status,200,JSON.stringify(first.body));
  assert.equal(first.body.source,'mcp');assert.equal(first.body.machineCredentialId,issued.credential.id);assert.equal(first.body.machineRequestId,body.requestId);
  assert.equal((await call(issued.token!,'draft_save',machineBody)).body.id,first.body.id);
  assert.equal((await call(issued.token!,'draft_save',{...machineBody,source:'manual'})).status,400);
  assert.equal((await call(issued.token!,'get',{revisionId:first.body.id})).status,200);
  assert.equal((await call(issued.token!,'context_bundle_get',{productVersionId:demoId('demo-money-v1'),skillVersionIds:[]})).status,403);
  const wrong=await machine('cover');assert.equal((await call(wrong.token!,'get',{revisionId:first.body.id})).status,403);
  const limited=await machine('experience');assert.equal((await call(limited.token!,'get',{revisionId:first.body.id})).status,403);
  const connection=await fetch(base+'/api/machine/experience/connection',{headers:{authorization:'Bearer '+limited.token!}});
  assert.equal(connection.status,200);
  assert.equal((await connection.json()).capabilities.includes('experience_validate'),false);
  await app.get(MachineCredentialsService).revoke(access,issued.credential.id,{requestId:randomUUID()});
  assert.equal((await call(issued.token!,'get',{revisionId:first.body.id})).status,401);
});

test('real MCP SDK can read context, upload an experience resource, save once and recover the same fixed draft',async()=>{
  const value=await saved(),method=await methods(),issued=await machine('experience',[productId],[method.skillId]);
  const picture=join(directory,'sdk-scene.jpg');await writeFile(picture,await readFile(join(__dirname,'../../test/fixtures/cover.jpg')));
  const result=await execute(process.execPath,[resolve(__dirname,'../../../../packages/mcp/test/real-experience-client.mjs')],{env:{...process.env,
    ORAI_MCP_API_URL:base,ORAI_MCP_TOKEN:issued.token!,ORAI_MCP_DOMAIN:'experience',ORAI_MCP_ALLOWED_ROOT:directory,
    ORAI_MCP_EXPERIENCE_SCENARIO_JSON:JSON.stringify({productVersionId:value.version.id,productPlan:value.input.productPlan,skillVersionId:method.id,expectedRevision:1,expectedVersionRevision:1,filePath:picture})},maxBuffer:1000000});
  assert.equal(result.stdout.includes(issued.token!),false);
  const checked=JSON.parse(result.stdout);assert.equal(checked.ok,true);assert.equal(checked.tools,36);
  const stored=await experiences.read(access,checked.revisionId);assert.equal(stored.source,'mcp');assert.equal(stored.manifest.resources.length,1);
  assert.equal(stored.machineCredentialId,issued.credential.id);
});

test('the 3D garden has an opt-in v2 declaration, form-specific methods and a real MCP authoring/publication chain',async()=>{
  const value=await fresh(false,{experienceForm:'3d'},true);
  assert.equal(value.input.manifest.renderer.key,'reflection-garden');
  assert.equal(value.input.manifest.report.renderer.key,'garden-notes');
  const first=await experiences.save(access,productId,value.version.id,value.input);
  const legacy=await experiences.workspace(access,productId,value.version.id,{includeCapabilities:true});
  assert.equal(legacy.capabilities?.schemaVersion,1);assert.equal(legacy.capabilities?.status,'blocked');
  assert.equal(legacy.capabilities?.registered.length,2);
  const current=await experiences.workspace(access,productId,value.version.id,{includeCapabilities:true,capabilityVersion:'2'});
  assert.equal(current.capabilities?.schemaVersion,2);assert.equal(current.capabilities?.status,'compatible');
  assert.equal(current.capabilities?.selected?.renderer,'reflection-garden@1');
  const wrong=await methods();
  // New method creation itself rejects a web-only declaration; the common
  // Three.js policy can no longer be bypassed to reach experience binding.
  await assert.rejects(app.get(SkillsService).create(access,'experience',{slug:'web-only-'+randomUUID(),requestId:randomUUID(),
    manifest:{...wrong.manifest,supportedForms:['web']}}));
  const method=await methods(['3d']),issued=await machine('experience',[productId],[method.skillId]);
  const picture=join(directory,'sdk-garden.jpg');await writeFile(picture,await readFile(join(__dirname,'../../test/fixtures/cover.jpg')));
  const result=await execute(process.execPath,[resolve(__dirname,'../../../../packages/mcp/test/real-experience-client.mjs')],{env:{...process.env,
    ORAI_MCP_API_URL:base,ORAI_MCP_TOKEN:issued.token!,ORAI_MCP_DOMAIN:'experience',ORAI_MCP_ALLOWED_ROOT:directory,
    ORAI_MCP_EXPERIENCE_SCENARIO_JSON:JSON.stringify({productVersionId:value.version.id,productPlan:value.input.productPlan,skillVersionId:method.id,expectedRevision:1,expectedVersionRevision:1,filePath:picture,renderer:'reflection-garden@1'})},maxBuffer:1000000});
  assert.equal(result.stdout.includes(issued.token!),false);const checked=JSON.parse(result.stdout);assert.equal(checked.ok,true);
  const saved=await experiences.read(access,checked.revisionId);assert.equal(saved.source,'mcp');assert.equal(saved.revision,2);
  assert.equal(saved.methods.length,2);assert.equal(saved.manifest.resources.length,1);
  const preview=await experiences.preview(access,saved.id,{answers:DemoProducts[0]!.configurations[1]!.questions.map(question=>({questionId:question.id,optionId:'often'}))});
  assert.equal(preview.report.totalScore,100);assert.equal(preview.presentation.renderer.key,'garden-notes');
  await experiences.review(access,saved.id,{expectedRevision:2,requestId:randomUUID()});
  await versions.review(access,productId,value.version.id,{requestId:randomUUID()});
  await versions.publish(access,productId,value.version.id,{requestId:randomUUID()});
  const published=await app.get(RuntimeVersionService).read(value.version.id);
  assert.deepEqual(published.experience.manifest,saved.manifest);assert.deepEqual(published.configuration,DemoProducts[0]!.configurations[1]);
  assert.equal((await experiences.read(access,first.id)).manifest.renderer.key,'reflection-garden');
});

async function syntheticGardenContext(form: 'web' | '3d' = '3d', preparationName = 'garden-observation') {
  const value = await fresh(false, { experienceForm: form });
  // Fix the profile through the real authoring service, then bind the A plan.
  await experiences.save(access, productId, value.version.id, value.input);
  const preparation = JSON.parse(await readFile(resolve(__dirname,
    '../../../../examples/threejs-products/technical-preparation/' + preparationName + '.json'), 'utf8'));
  const document = ProductionPlanDocumentSchema.parse({ ...preparation.plan, creativeProfileRevisionId: value.profile.id });
  for (const module of document.modules) module.target.form = form;
  const latest = await fixture.runtime.client.productionPlanRevision.aggregate({ where: { productId }, _max: { number: true } });
  const plan = await app.get(ProductionPlansService).save(access, productId, {
    plan: document, expectedRevision: latest._max.number ?? 0, requestId: randomUUID(),
  });
  const issued = await machine('experience');
  const module = plan.modules.find(item => item.moduleKey === 'scene')!;
  return { ...value, plan, issued, module, context: { productVersionId: value.version.id,
    productPlan: { revisionId: plan.id, digest: plan.digest }, planModuleId: module.id,
    includeCapabilities: true, capabilityVersion: 2 } };
}

test('synthetic A MCP context validates the exact plan even without selected methods', async () => {
  const value = await syntheticGardenContext();
  const forged = await call(value.issued.token!, 'context_bundle_get', {
    ...value.context, productPlan: { ...value.context.productPlan, digest: 'f'.repeat(64) },
  });
  assert.equal(forged.status, 409, 'a supplied plan digest must never be ignored when no methods are selected');
  const valid = await call(value.issued.token!, 'context_bundle_get', value.context);
  assert.equal(valid.status, 200, JSON.stringify(valid.body));
  assert.equal(valid.body.defaultManifest.renderer.key, 'reflection-garden');
  const wrongModule = await call(value.issued.token!, 'context_bundle_get', {
    ...value.context, planModuleId: value.plan.modules.find(item => item.moduleKey === 'cover')!.id,
  });
  assert.equal(wrongModule.status, 400);
  const missing = await call(value.issued.token!, 'context_bundle_get', {
    ...value.context, productPlan: { revisionId: randomUUID(), digest: value.plan.digest },
  });
  assert.equal(missing.status, 404);
});

test('synthetic A MCP context follows its fixed Three.js pair even when the profile form is web', async () => {
  const value = await syntheticGardenContext('web');
  const result = await call(value.issued.token!, 'context_bundle_get', value.context);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.defaultManifest.renderer.key, 'reflection-garden');
  assert.equal(result.body.defaultManifest.report.renderer.key, 'garden-notes');
  assert.equal(result.body.capabilities.selected.renderer, 'reflection-garden@1');
  // The draft is still planning-only; selecting a renderer cannot certify delivery.
  const draft = { manifest: result.body.defaultManifest, reportPlan: value.profile.profile.reportPlan,
    methods: [], productPlan: value.context.productPlan, planModuleId: value.module.id, note: '合成A规划检查' };
  const checked = await experiences.check(access, productId, value.version.id, draft);
  assert.equal(checked.valid, true);
  assert.equal(checked.publication?.eligibleForReview, false);
});

async function syntheticTemplateLifecycle(atlas = false) {
  const value = await syntheticGardenContext('3d', atlas ? 'relationship-atlas' : 'garden-observation'), plans = app.get(ProductionPlansService);
  const rendererKey = atlas ? 'relationship-atlas-prototype' : 'reflection-garden';
  const reportKey = atlas ? 'atlas-notes-prototype' : 'garden-notes';
  const document = structuredClone(value.plan.plan);
  assert.equal(document.schemaVersion, 2);
  if (document.schemaVersion !== 2) throw new Error('Expected current A plan');
  document.productPlan.basedOnPlanRevisionId = value.plan.id;
  const implementation = {
    scene: 'apps/web/src/experience/garden-scene.ts', camera: 'apps/web/src/experience/garden-renderer.ts',
    interaction: 'apps/web/src/experience/reflection-garden.tsx', feedback: 'apps/web/src/experience/reflection-garden.tsx',
    confirmation: 'apps/web/src/experience/reflection-garden.tsx', recovery: 'apps/web/src/experience/host.tsx',
    report: 'apps/web/src/experience/garden-notes.tsx', accessibility: 'apps/web/src/experience/reflection-garden.tsx',
    fallback: 'apps/web/src/experience/host.tsx', resources: 'apps/web/src/experience/garden-scene.ts',
  };
  if (atlas) Object.assign(implementation, { scene: 'apps/web/src/experience/atlas-scene.ts',
    camera: 'apps/web/src/experience/atlas-scene.ts', interaction: 'apps/web/src/experience/relationship-atlas.tsx',
    feedback: 'apps/web/src/experience/relationship-atlas.tsx', confirmation: 'apps/web/src/experience/relationship-atlas.tsx',
    report: 'apps/web/src/experience/atlas-notes.tsx', accessibility: 'apps/web/src/experience/relationship-atlas.tsx',
    resources: 'apps/web/src/experience/atlas-scene.ts' });
  for (const [key, reference] of Object.entries(implementation)) Object.assign(
    document.productPlan.decisions[key as keyof typeof document.productPlan.decisions], {
      status: 'implemented', evidence: [{ kind: 'implementation', reference,
        summary: '合成技术演练引用仓库实际能力；不是性能、设备或正式商品验收' }],
    });
  const plan = await plans.save(access, productId, { plan: document, expectedRevision: value.plan.revision, requestId: randomUUID() });
  const method = await methods(['3d']), issued = await machine('experience', [productId], [method.skillId]);
  const selected = await call(issued.token!, 'context_bundle_get', { productVersionId: value.version.id,
    productPlan: { revisionId: plan.id, digest: plan.digest }, includeCapabilities: true, capabilityVersion: 2 });
  assert.equal(selected.status, 200, JSON.stringify(selected.body));
  assert.equal(selected.body.capabilities.status, 'compatible', 'the exact synthetic renderer/report pair must be implemented and registered');
  assert.equal(selected.body.capabilities.selected.renderer, rendererKey + '@1');
  const picture = join(directory, 'synthetic-a-reference.jpg');
  await writeFile(picture, await readFile(join(__dirname, '../../test/fixtures/cover.jpg')));
  const result = await execute(process.execPath, [resolve(__dirname, '../../../../packages/mcp/test/real-experience-client.mjs')], {
    env: { ...process.env, ORAI_MCP_API_URL: base, ORAI_MCP_TOKEN: issued.token!, ORAI_MCP_DOMAIN: 'experience', ORAI_MCP_ALLOWED_ROOT: directory,
      ORAI_MCP_EXPERIENCE_SCENARIO_JSON: JSON.stringify({ productVersionId: value.version.id,
        productPlan: { revisionId: plan.id, digest: plan.digest }, skillVersionId: method.id,
        expectedRevision: 1, expectedVersionRevision: 1, filePath: picture }) }, maxBuffer: 1000000,
  });
  const checked = JSON.parse(result.stdout), draft = await experiences.read(access, checked.revisionId);
  assert.equal(checked.ok, true);
  assert.equal(draft.manifest.renderer.key, rendererKey);
  assert.equal(draft.productPlanInput?.planRevisionId, plan.id);
  assert.equal(draft.productPlanInput?.planDigest, plan.digest);
  assert.equal(draft.methods.length, 2);
  for (const binding of draft.methods) assert.deepEqual(binding.productPlanInput, draft.productPlanInput);
  assert.equal(draft.manifest.resources[0]!.checksum, hash(await readFile(picture)));
  const production = app.get(ProjectProductionService), sceneModule = plan.modules.find(module => module.moduleKey === 'scene')!;
  const captured = [];
  for (const purpose of ['scene_design', 'report_presentation']) captured.push(await production.capture(access, sceneModule.id, {
    expectedModuleDigest: sceneModule.digest, purpose, sourceVersionId: method.id,
    expectedSourceRevision: method.revision, expectedSourceDigest: method.digest, requestId: randomUUID(),
  }));
  const now = new Date().toISOString();
  const record = await production.save(access, sceneModule.id, { expectedModuleDigest: sceneModule.digest, expectedRevision: 0,
    requestId: randomUUID(), methods: captured.map(snapshot => ({ snapshotId: snapshot.id, digest: snapshot.digest })), inputs: [],
    outputs: [{ kind: 'experience_revision', outputKey: 'scene-bundle', revisionId: draft.id, digest: draft.digest }],
    external: { client: 'synthetic-template-test', runKey: 'run-' + randomUUID(), note: '实际原生制作稿；没有导入ZIP原件', startedAt: now, finishedAt: now } });
  assert.equal(record.outputs[0]!.purpose, 'authoring');
  assert.equal(record.outputs[0]!.experienceRevisionId, draft.id);
  assert.equal(record.archiveReady, false);
  assert.deepEqual(await production.read(access, record.id), record);
  const sample = DemoProducts[0]!.configurations[1]!.questions.map(question => ({ questionId: question.id, optionId: 'often' }));
  const preview = await experiences.preview(access, draft.id, { answers: sample });
  assert.equal(preview.report.totalScore, 100);
  assert.equal(preview.presentation.renderer.key, reportKey);
  await experiences.review(access, draft.id, { expectedRevision: draft.revision, requestId: randomUUID() });
  await versions.review(access, productId, value.version.id, { requestId: randomUUID() });
  await versions.publish(access, productId, value.version.id, { requestId: randomUUID() });
  const runtime = await app.get(RuntimeVersionService).read(value.version.id);
  assert.deepEqual(runtime.experience.manifest, draft.manifest);

  const delivery = app.get(DeliveryAdminService), cookies = new Map<string, string>();
  let csrf = '';
  async function consumer(path: string, verb = 'GET', body?: unknown) {
    const response = await fetch(base + path, { method: verb, headers: { origin: 'http://127.0.0.1:5173',
      cookie: [...cookies].map(([key, entry]) => key + '=' + entry).join('; '),
      ...(verb === 'GET' ? {} : { 'content-type': 'application/json', 'x-csrf-token': csrf }) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    for (const entry of response.headers.getSetCookie()) {
      const [key, ...parts] = entry.split(';')[0]!.split('='); cookies.set(key!, parts.join('='));
    }
    return { status: response.status, body: await response.json() };
  }
  const order = await delivery.recordOrder(access, { platform: 'manual', reference: 'demo:synthetic-a:' + randomUUID(),
    productVersionId: value.version.id, scope: 'demo', quantity: 1, amountFen: 0, requestId: randomUUID() });
  const codes = await delivery.issueOrder(access, order.id, { requestId: randomUUID() });
  csrf = (await consumer('/api/session/context')).body.csrfToken;
  const claim = await consumer('/api/redemptions/claim', 'POST', { code: codes.deliveries[0]!.code, requestId: randomUUID() });
  assert.equal(claim.status, 200);
  const started = await consumer('/api/attempts', 'POST', { entitlementId: claim.body.entitlement.id, requestId: randomUUID() });
  assert.equal(started.status, 200);
  const attemptId = started.body.attemptId, release = started.body.experience.release, requestId = randomUUID();
  const first = { optionId: 'often', expectedRevision: 0, requestId };
  assert.equal((await consumer(`/api/attempts/${attemptId}/answers/question-1`, 'PUT', first)).status, 200);
  assert.equal((await consumer(`/api/attempts/${attemptId}/answers/question-1`, 'PUT', first)).status, 200);
  assert.equal((await consumer(`/api/attempts/${attemptId}/answers/question-2`, 'PUT', {
    optionId: 'often', expectedRevision: 0, requestId: randomUUID() })).status, 409);
  const restored = await consumer(`/api/attempts/${attemptId}/questions`);
  assert.equal(restored.body.answers.length, 1);
  assert.deepEqual(restored.body.experience.release, release);
  assert.equal(restored.body.experience.checkpoint.nextQuestionId, 'question-2');
  let revision = 1;
  for (const answer of sample.slice(1)) assert.equal((await consumer(`/api/attempts/${attemptId}/answers/${answer.questionId}`, 'PUT', {
    optionId: answer.optionId, expectedRevision: revision++, requestId: randomUUID() })).status, 200);
  const submit = await consumer(`/api/attempts/${attemptId}/submit`, 'POST', { expectedRevision: revision, requestId: randomUUID() });
  assert.equal(submit.status, 200);
  assert.deepEqual(submit.body.content, preview.report);
  assert.equal(submit.body.presentation.renderer.key, reportKey);
  assert.equal(submit.body.presentation.releaseId, release.id);
  const retry = await consumer(`/api/attempts/${attemptId}/submit`, 'POST', { expectedRevision: 0, requestId: randomUUID() });
  assert.equal(retry.body.id, submit.body.id);
  assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({ where: { id: claim.body.entitlement.id } })).reportsConsumed, 1);
  await delivery.refundOrder(access, order.id, { requestId: randomUUID() });
  assert.notEqual((await consumer(`/api/attempts/${attemptId}/questions`)).status, 200);
  assert.notEqual((await consumer(`/api/reports/${submit.body.id}`)).status, 200);
  const legacy = await app.get(RuntimeVersionService).read(demoId('demo-partner-v2'));
  assert.equal(legacy.experience.manifest.renderer.key, 'dom-choice');
}

test('synthetic A pins its actual plan and methods through SDK authoring, review, consumer restore, report and revocation',
  () => syntheticTemplateLifecycle());

test('synthetic B pins an independent atlas/report pair through SDK authoring and the consumer lifecycle',
  () => syntheticTemplateLifecycle(true));
