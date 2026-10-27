import 'reflect-metadata';
import { currentSkillManifest } from './skill-policy-fixture';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Request } from 'express';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { CreativeProfileSchema, ProductionPlanRevisionSchema, MachineProjectResultSchema,
  MachineProjectMethodSnapshotSchema, MachineProjectDraftResultSchema, MachineProjectProductionRecordSchema,
  skillPurposes, StyleSkillManifestSchema, MachineProjectContextSchema, emptyProductImplementationPlan } from '@orai/contracts/admin';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/config/configuration';
import { configureApp } from '../src/common/configure-app';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { CatalogAdminService } from '../src/operations/catalog-admin.service';
import { MachineCredentialsService } from '../src/operations/machine-credentials.service';
import { MachineProjectsService } from '../src/operations/machine-projects.service';
import { MachineUploadService } from '../src/operations/machine-upload.service';
import { ProductionPlansService } from '../src/operations/production-plans.service';
import { ProjectProductionService } from '../src/operations/project-production.service';
import { SkillsService } from '../src/operations/skills.service';
import { contentDigest } from '../src/operations/content-projections';
import { defaultExperience } from '../src/catalog/experience-authoring';
import { demoId, DemoIdentityScenarios } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';
import { Prisma } from '../src/generated/prisma/client';

let fixture: Awaited<ReturnType<typeof createLocalFixture>>, app: INestApplication, access: CatalogAdminAccess,
  service: MachineProjectsService, admins: CatalogAdminAccessService, base: string, directory: string;
before(async () => {
  fixture = await createLocalFixture('t14'); directory = await mkdtemp(join(tmpdir(), 'orai-project-mcp-'));
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG)
    .useValue({ ...fixture.configuration, assets: { ...fixture.configuration.assets, driver: 'local', directory } }).compile();
  app = module.createNestApplication({ logger: false }); configureApp(app); await app.listen(0, '127.0.0.1'); base = await app.getUrl();
  admins = app.get(CatalogAdminAccessService); access = await admins.authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.admin.id);
  service = app.get(MachineProjectsService);
});
after(async () => { await app?.close(); await fixture?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });
const permissions = ['content:read','content:write','skills:read','skills:write','context:read','projects:read','methods:create'];
async function grant(domain: keyof typeof skillPurposes, workspaceId: string, allowed = permissions) {
  const result = await app.get(MachineCredentialsService).create(access, { name: '隔离项目连接', domain, workspaceId,
    permissions: domain === 'assessment' && allowed === permissions ? [...allowed,'projects:write','projects:create'] : allowed,
    productIds: [], skillIds: [], expiresAt: new Date(Date.now() + 3600_000).toISOString(), requestId: randomUUID() });
  return { token: result.token!, id: result.credential.id, domain, access: await admins.authorizeMachine(result.token!, domain) };
}
type Grant = Awaited<ReturnType<typeof grant>>;
async function call(g: Grant, op: string, body: unknown, headers: Record<string,string> = {}) {
  return fetch(base + '/api/machine/' + g.domain + '/tools/' + op, { method: 'POST', headers: {
    authorization: 'Bearer ' + g.token, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
async function ok(g: Grant, op: string, body: unknown) {
  const response = await call(g, op, body), value = await response.json(); assert.equal(response.status, 200, JSON.stringify(value)); return value;
}
async function setup(maxProjects = 5, maxMethodsPerProject = 15) {
  const original = await app.get(CatalogAdminService).product(access, demoId('demo-partner'));
  const workspace = await service.createWorkspace(access, { name: '隔离授权工作区', categoryIds: [original.categoryId], maxProjects,
    maxMethodsPerProject, expiresAt: new Date(Date.now() + 7200_000).toISOString(), requestId: randomUUID() });
  const machine = await grant('assessment', workspace.id);
  const profile = CreativeProfileSchema.parse({ schemaVersion: 1, title: '合成共同设定', audience: '自我观察者', situation: '日常沟通',
    emotionalGoal: '被理解', understandingGoal: '观察相处节奏', takeaway: '一个具体行动', perspective: 'self', experienceForm: 'web',
    pace: '从容', world: '紫色纸本', language: '具体直接', visual: '紫色', sound: '安静', channels: ['manual'],
    deliverables: ['assessment','cover','copy','video'], reportPlan: { schemaVersion: 1, title: '观察报告', narrative: '观察与下一步',
      presentation: 'standard', sections: [{ sectionId: 'next', title: '下一步', purpose: '形成行动' }] } });
  const file = (mime: string) => ({ fileKey: 'source', purpose: 'original', required: true, label: '原文件', mimeTypes: [mime], sourceUrl: null });
  const output = (key: string, kind: string, mime?: string) => ({ outputKey: key, label: key, required: true, kind,
    original: { storage: 'platform', representation: mime ? 'file' : 'structured' }, files: mime ? [file(mime)] : [] });
  const module = (domain: keyof typeof skillPurposes, outputs: unknown[], dependsOn: string[] = []) => ({
    moduleKey: domain, title: domain, domain, required: true, purpose: '合成流程验收', dependsOn, target: { form: 'web', runtime: null as unknown },
    methodPurposes: [...skillPurposes[domain]], methodRetention: 'manifest_instructions_and_references', outputs });
  const experience = module('experience', [output('web','web_bundle','application/zip')], ['assessment']);
  experience.target.runtime = { renderer: { key: 'dom-choice', version: 1 }, reportRenderer: { key: 'legacy-text', version: 1 },
    inputSchema: 'single_choice_v1', engine: 'dimensions_v1', reportSchema: 'report_content_v1' };
  const { isDemo: _, ...publicSample } = original.publicSample;
  const body = { requestId: randomUUID(), projectKey: 'project-' + randomUUID(), product: { slug: 'project-' + randomUUID(), name: '隔离新选题',
    hook: '看见自己的节奏', summary: '新选题草稿', description: '技术验收用合成内容', categoryId: original.categoryId,
    priceFen: original.priceFen, durationMinutes: 5, experienceType: original.experienceType, themeKey: original.themeKey, publicSample }, profile,
    plan: { schemaVersion: 2, productPlan: emptyProductImplementationPlan(), title: '新选题计划', selection: { basis: 'manual', rationale: '隔离技术验收', evidenceKeys: [] },
      freshnessWindowHours: 24, evidence: [], modules: [module('assessment',[output('questions','assessment'),output('report','report')]),
        module('copy',[output('copy','copy')],['assessment']),module('cover',[output('cover','image','image/png')]),
        module('video',[output('video','video','video/webm')],['assessment','copy']),experience], retention: 'platform_originals_and_exact_methods' } };
  return { workspace, machine, body };
}
async function bootstrap(c: Awaited<ReturnType<typeof setup>>) {
  const project = MachineProjectResultSchema.parse(await ok(c.machine, 'project_bootstrap', c.body));
  const plan = ProductionPlanRevisionSchema.parse(await ok(c.machine, 'project_plan_get', { planRevisionId: project.planRevisionId }));
  return { ...c, project, plan, module: (domain: string) => plan.modules.find(m => m.definition.domain === domain)! };
}
type Context = Awaited<ReturnType<typeof bootstrap>>;
function manifest(domain: keyof typeof skillPurposes) {
  return currentSkillManifest({ schemaVersion: 1, domain, name: '候选专业方法', description: '本项目外部制作使用',
    purposes: [...skillPurposes[domain]], styles: ['紫色纸本'], supportedForms: ['web'],
    inputs: [{ key: 'creative-profile', description: '固定创作设定', required: true }], outputs: [{ key: 'deliverable', description: '模块产物' }],
    instructions: '通过具体观察形成理解与行动，不贴诊断标签。', examples: [], references: [] });
}
async function method(c: Context, g: Grant, key = 'method-' + randomUUID()) {
  const created = await ok(g,'project_method_create',{ productId: c.project.productId, methodKey: key,
    manifest: manifest(g.domain), requestId: randomUUID() });
  const version = await app.get(SkillsService).readVersion(access, g.domain, created.skillId, created.versionId);
  const module = c.module(g.domain), captured = [];
  for (const purpose of skillPurposes[g.domain]) captured.push(MachineProjectMethodSnapshotSchema.parse(await ok(g,'project_method_capture',{
    planModuleId: module.id, expectedModuleDigest: module.digest, sourceVersionId: version.id,
    expectedSourceRevision: version.revision, expectedSourceDigest: version.digest, purpose, requestId: randomUUID() })));
  return { created, version, captured, selections: captured.map(s => ({ snapshotId: s.id, digest: s.digest })) };
}
async function assessment(c: Context) {
  const methods = await method(c,c.machine), seeded = await fixture.runtime.client.productVersion.findFirstOrThrow({ where: { productId: demoId('demo-partner') } });
  const body = { planModuleId: c.module('assessment').id, expectedModuleDigest: c.module('assessment').digest,
    methods: methods.selections, requestId: randomUUID(), payload: { kind: 'assessment', expectedRevision: 0, configuration: seeded.configuration } };
  const draft = MachineProjectDraftResultSchema.parse(await ok(c.machine, 'project_draft_save', body)); return { draft, methods, body };
}
function production(c: Context, domain: string, methods: { snapshotId: string; digest: string }[], outputs: unknown[]) {
  return { planModuleId: c.module(domain).id, expectedModuleDigest: c.module(domain).digest, expectedRevision: 0, requestId: randomUUID(),
    methods, inputs: [], outputs, external: { client: 'isolated-client', runKey: 'run-' + randomUUID(), note: '外部制作声明',
      startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() } };
}

test('bounded bootstrap starts without product/profile/skills, persists one private project and restores its fixed IDs after retries', async () => {
  const c = await bootstrap(await setup()), again = await ok(c.machine,'project_bootstrap',c.body);
  assert.deepEqual(again,c.project); assert.equal(c.project.productVersionId,null);
  assert.deepEqual(await ok(c.machine,'project_bootstrap',{...c.body,requestId:randomUUID()}),c.project);
  const row = await fixture.runtime.client.product.findUniqueOrThrow({where:{id:c.project.productId}});
  assert.equal(row.status,'DRAFT'); assert.equal(row.currentVersionId,null); assert.equal(row.recommended,false); assert.equal(row.purchaseUrl,null);
  assert.equal(await fixture.runtime.client.productVersion.count({where:{productId:row.id}}),0);
  assert.equal(await fixture.runtime.client.productionPlanRevision.count({where:{productId:row.id}}),1);
  assert.equal((await ok(c.machine,'project_list',{})).items.length,1);
  assert.equal((await app.get(MachineUploadService).connection(c.machine.access)).capabilities.includes('project_bootstrap'),true);
  await assert.rejects(service.createWorkspace(c.machine.access,{...c.body}));
});
test('business keys reject changed payloads and other creators while the approved pool shares read access across domains', async () => {
  const c = await bootstrap(await setup()), other = await grant('assessment',c.workspace.id), copy = await grant('copy',c.workspace.id);
  assert.equal((await call(c.machine,'project_bootstrap',{...c.body,requestId:randomUUID(),product:{...c.body.product,name:'changed'}})).status,409);
  assert.equal((await call(other,'project_bootstrap',{...c.body,requestId:randomUUID()})).status,409);
  assert.equal((await ok(copy,'project_get',{productId:c.project.productId})).planRevisionId,c.plan.id);
  assert.equal((await call(copy,'project_bootstrap',c.body)).status,403);
  assert.equal((await call(copy,'project_plan_save',{productId:c.project.productId,plan:c.plan.plan,expectedRevision:1,requestId:randomUUID()})).status,403);
});
test('concurrent bootstrap respects quota and failed validation leaves no partial product or membership', async () => {
  const c = await setup(1), bad = {...c.body,plan:{...c.body.plan,modules:c.body.plan.modules.map(m=>({...m,dependsOn:[m.moduleKey]}))}};
  assert.equal((await call(c.machine,'project_bootstrap',bad)).status,400);
  const [a,b] = await Promise.all([call(c.machine,'project_bootstrap',c.body),call(c.machine,'project_bootstrap',{
    ...c.body,requestId:randomUUID(),projectKey:'other',product:{...c.body.product,slug:'other-'+randomUUID()}})]);
  assert.deepEqual([a.status,b.status].sort(),[200,409]);
  assert.equal(await fixture.runtime.client.machineProject.count({where:{workspaceId:c.workspace.id}}),1);
  assert.equal(await fixture.runtime.client.product.count({where:{slug:{in:[c.body.product.slug,'uncreated']}}})<=1,true);
});
test('cross workspace, mismatched exact plan targets, forged authority, Cookie and Origin do not grant access', async () => {
  const a = await bootstrap(await setup()), b = await bootstrap(await setup());
  assert.equal((await call(a.machine,'project_get',{productId:b.project.productId})).status,403);
  assert.equal((await call(a.machine,'project_plan_get',{planRevisionId:b.plan.id})).status,403);
  const scoped = await admins.restrictMachine(a.machine.access,{permission:'projects:read',target:{type:'project',planRevisionId:a.plan.id}});
  await assert.rejects(app.get(ProductionPlansService).read(scoped,b.plan.id));
  await assert.rejects(service.execute({actorUserId:access.actorUserId,scope:'DEMO'} as CatalogAdminAccess,'project_get',{productId:a.project.productId}));
  assert.equal((await call(a.machine,'project_get',{productId:a.project.productId},{origin:'http://localhost:5173'})).status,403);
  assert.equal((await call(a.machine,'project_get',{productId:a.project.productId},{cookie:'any=session'})).status,403);
  assert.equal((await call(a.machine,'project_get',{productId:a.project.productId,scope:'live'})).status,400);
});
test('legacy grants and workspace read grants cannot acquire finite creation rights implicitly', async () => {
  const c = await setup(), legacy = await app.get(MachineCredentialsService).create(access,{name:'预建流程',domain:'assessment',
    permissions:['content:read'],productIds:[demoId('demo-partner')],skillIds:[],expiresAt:new Date(Date.now()+3600_000).toISOString(),requestId:randomUUID()});
  const machine = {token:legacy.token!,domain:'assessment' as const,id:legacy.credential.id,access:await admins.authorizeMachine(legacy.token!,'assessment')};
  assert.equal((await call(machine,'project_bootstrap',c.body)).status,403);
  const reader = await grant('assessment',c.workspace.id,['projects:read']); assert.equal((await call(reader,'project_bootstrap',c.body)).status,403);
  await assert.rejects(app.get(MachineCredentialsService).create(access,{name:'未授权',domain:'assessment',permissions:['projects:create'],
    productIds:[],skillIds:[],expiresAt:new Date(Date.now()+3600_000).toISOString(),requestId:randomUUID()}));
});
test('project DRAFT methods are captured per purpose, saved as actual assessment content, and retain trusted machine provenance without global activation', async () => {
  const c = await bootstrap(await setup()), a = await assessment(c);
  assert.equal(a.methods.version.status,'draft'); assert.equal(a.draft.platformExecuted,false);
  assert.deepEqual(await ok(c.machine,'project_draft_save',a.body),a.draft);
  assert.equal(await fixture.runtime.client.projectCandidateDraft.count({where:{contentRevisionId:a.draft.revisionId}}),1);
  assert.equal((await ok(c.machine,'project_get',{productId:c.project.productId})).productVersionId,a.draft.productVersionId);
  const recordBody = production(c,'assessment',a.methods.selections,[{kind:'content_revision',outputKey:'questions',revisionId:a.draft.revisionId,digest:a.draft.digest},
    {kind:'content_revision',outputKey:'report',revisionId:a.draft.revisionId,digest:a.draft.digest}]);
  const record = MachineProjectProductionRecordSchema.parse(await ok(c.machine,'project_production_save',recordBody));
  assert.equal(record.source,'mcp'); assert.equal(record.machineCredentialId,c.machine.id); assert.equal(record.machineRequestId,recordBody.requestId);
  assert.equal(record.archiveReady,false); assert.equal(record.methods.length,2);
  assert.deepEqual(await ok(c.machine,'project_production_save',recordBody),record);
  assert.equal(await fixture.runtime.client.styleSkillVersion.count({where:{skillId:a.methods.created.skillId,status:'ACTIVE'}}),0);
});
test('cross domain methods, missing purpose, mismatched source digests and exact snapshot targets are rejected', async () => {
  const c = await bootstrap(await setup()), a = await assessment(c), cover = await grant('cover',c.workspace.id);
  assert.equal((await call(cover,'project_method_get',{snapshotId:a.methods.captured[0]!.id})).status,403);
  assert.equal((await call(c.machine,'project_draft_save',{...a.body,requestId:randomUUID(),methods:[a.methods.selections[0]]})).status,409);
  const input = {planModuleId:c.module('assessment').id,expectedModuleDigest:c.module('assessment').digest,purpose:'assessment_design',
    sourceVersionId:a.methods.version.id,expectedSourceRevision:0,expectedSourceDigest:'a'.repeat(64),requestId:randomUUID()};
  assert.equal((await call(c.machine,'project_method_capture',input)).status,409);
  const scoped = await admins.restrictMachine(c.machine.access,{permission:'projects:read',extraPermissions:['skills:read'],target:{type:'project',snapshotId:a.methods.captured[0]!.id}});
  await assert.rejects(app.get(ProjectProductionService).readMethod(scoped,a.methods.captured[1]!.id));
});
test('domain context pins one profile and explicit question fragments without exposing scoring or accepting mismatched digests', async () => {
  const c = await bootstrap(await setup()), a = await assessment(c), video = await grant('video',c.workspace.id);
  const native = await fixture.runtime.client.contentRevision.findUniqueOrThrow({where:{id:a.draft.revisionId}});
  const q = (native.snapshot as any).configuration.questions[0];
  const input = {planRevisionId:c.plan.id,inputs:[{revisionId:a.draft.revisionId,digest:a.draft.digest,locator:{kind:'question',questionId:q.id}}]};
  const context = MachineProjectContextSchema.parse(await ok(video,'project_context_get',input));
  assert.equal(context.creativeProfile.id,c.project.creativeProfileRevisionId); assert.equal(context.inputs[0]!.content.id,q.id);
  assert.equal(JSON.stringify(context).includes('weights'),false); assert.equal(JSON.stringify(context).includes('scoreRange'),false);
  assert.equal((await call(video,'project_context_get',{...input,inputs:[{...input.inputs[0],locator:{kind:'revision'}}]})).status,400);
  assert.equal((await call(video,'project_context_get',{...input,inputs:[{...input.inputs[0],digest:'0'.repeat(64)}]})).status,409);
});
test('real media upload uses server-added project IDs, remains private and can be declared as a verified original', async () => {
  const c = await bootstrap(await setup()), a = await assessment(c), cover = await grant('cover',c.workspace.id), methods = await method(c,cover);
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1kAAAAASUVORK5CYII=','base64');
  const uploads = app.get(MachineUploadService), prepared = await uploads.prepare(cover.access,cover.token,'cover',{
    requestId:randomUUID(),target:{type:'media',productVersionId:a.draft.productVersionId,kind:'cover'},fileName:'cover.png',
    mimeType:'image/png',byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex')});
  const stream = Readable.from([bytes]) as unknown as Request; stream.headers = {'content-type':'application/octet-stream','content-length':String(bytes.length)};
  await uploads.upload(cover.access,'cover',prepared.uploadId,prepared.ticket,stream);
  const file = await uploads.complete(cover.access,'cover',prepared.uploadId,prepared.ticket,{requestId:randomUUID()}); assert.equal(file.status,'available');
  const draft = await ok(cover,'project_draft_save',{planModuleId:c.module('cover').id,expectedModuleDigest:c.module('cover').digest,
    methods:methods.selections,requestId:randomUUID(),payload:{kind:'asset',draft:{productVersionId:a.draft.productVersionId,platform:'manual',variant:'main',
      expectedRevision:0,fileId:file.fileId,authoring:{schemaVersion:1,creativeProfileRevisionId:c.project.creativeProfileRevisionId,
        content:{kind:'cover',title:'看见自己',description:'合成封面'},media:{localArchive:null,previewFileId:null},inputs:[]}}}});
  const record = await ok(cover,'project_production_save',production(c,'cover',methods.selections,[{kind:'content_revision',outputKey:'cover',revisionId:draft.revisionId,digest:draft.digest}]));
  assert.equal(record.outputs[0].file.checksum,file.checksum); assert.equal(record.outputs[0].file.downloadPath,undefined);
  assert.equal((await fixture.runtime.client.product.findUniqueOrThrow({where:{id:c.project.productId}})).status,'DRAFT');
});
test('experience candidate methods save an exact native draft but do not substitute for the original web package', async () => {
  const c = await bootstrap(await setup()), a = await assessment(c), experience = await grant('experience',c.workspace.id), methods = await method(c,experience);
  const version = await fixture.runtime.client.productVersion.findUniqueOrThrow({where:{id:a.draft.productVersionId}}), profile = await fixture.runtime.client.creativeProfileRevision.findUniqueOrThrow({where:{id:c.project.creativeProfileRevisionId}});
  const draft = await ok(experience,'project_draft_save',{planModuleId:c.module('experience').id,expectedModuleDigest:c.module('experience').digest,
    methods:methods.selections,requestId:randomUUID(),payload:{kind:'experience',productVersionId:version.id,draft:{expectedRevision:0,expectedVersionRevision:version.revision,
      manifest:defaultExperience(version,c.body.product.themeKey,profile),reportPlan:c.body.profile.reportPlan,note:'候选体验草稿'}}});
  const row = await fixture.runtime.client.experienceAuthoringRevision.findUniqueOrThrow({where:{id:draft.revisionId}});
  assert.equal(row.projectPlanModuleId,c.module('experience').id); assert.equal(row.machineCredentialId,experience.id); assert.equal(row.status,'draft');
  const record = await ok(experience,'project_production_save',production(c,'experience',methods.selections,[{kind:'experience_revision',outputKey:'web',revisionId:draft.revisionId,digest:draft.digest}]));
  assert.equal(record.outputs[0].purpose,'authoring'); assert.equal(record.outputs[0].fileId,null); assert.equal(record.archiveReady,false);
});
test('revocation of a credential or shared workspace invalidates existing in-process grants and all follow-up calls', async () => {
  const c = await bootstrap(await setup()), cover = await grant('cover',c.workspace.id);
  await app.get(MachineCredentialsService).revoke(access,c.machine.id,{requestId:randomUUID()});
  await assert.rejects(service.execute(c.machine.access,'project_get',{productId:c.project.productId}));
  assert.equal((await call(c.machine,'project_get',{productId:c.project.productId})).status,401);
  await service.revokeWorkspace(access,c.workspace.id,{requestId:randomUUID()});
  await assert.rejects(service.execute(cover.access,'project_get',{productId:c.project.productId}));
  assert.equal((await call(cover,'project_get',{productId:c.project.productId})).status,403);
  assert.equal(await fixture.runtime.client.machineProject.count({where:{workspaceId:c.workspace.id}}),1);
});
test('database grants and immutable memberships prevent rewriting authorization or deleting project history', async () => {
  const c = await bootstrap(await setup()), a = await assessment(c);
  await assert.rejects(fixture.runtime.client.$executeRaw(Prisma.sql`UPDATE orai.machine_projects SET project_key='rewritten' WHERE product_id=${c.project.productId}::uuid`));
  await assert.rejects(fixture.runtime.client.$executeRaw(Prisma.sql`UPDATE orai.machine_credentials SET workspace_id=NULL WHERE id=${c.machine.id}::uuid`));
  await assert.rejects(fixture.runtime.client.projectCandidateDraft.deleteMany({where:{contentRevisionId:a.draft.revisionId}}));
  const audit = await fixture.runtime.client.machineCall.findMany({where:{credentialId:c.machine.id}});
  assert.ok(audit.some(call=>call.operation==='project_bootstrap'&&call.outcome==='success'));
  assert.equal(JSON.stringify(audit).includes(c.machine.token),false);
});
test('finite method quotas serialize concurrent domains, and different keys create real variants while retries retain identities', async () => {
  const c = await bootstrap(await setup(1,1)), copy = await grant('copy',c.workspace.id), cover = await grant('cover',c.workspace.id);
  const body = (g: Grant) => ({ productId:c.project.productId,methodKey:'first',manifest:manifest(g.domain),requestId:randomUUID() });
  const a = body(copy), b = body(cover), responses = await Promise.all([call(copy,'project_method_create',a),call(cover,'project_method_create',b)]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  const g = responses[0]!.status===200?copy:cover, first = await (responses[0]!.status===200?responses[0]!.json():responses[1]!.json());
  const retry = await ok(g,'project_method_create',{...(g===copy?a:b),requestId:randomUUID()}); assert.deepEqual(retry,first);
  assert.equal(await fixture.runtime.client.machineProjectSkill.count({where:{productId:c.project.productId}}),1);
  const roomy = await bootstrap(await setup()), one = await method(roomy,roomy.machine,'one'), two = await method(roomy,roomy.machine,'two');
  assert.notEqual(one.created.skillId,two.created.skillId);
});
test('candidate text references remain readable from their fixed snapshot after draft attachments are removed', async () => {
  const c = await bootstrap(await setup()), g = await grant('copy',c.workspace.id);
  const created = await ok(g,'project_method_create',{productId:c.project.productId,methodKey:'references',manifest:manifest('copy'),requestId:randomUUID()});
  const bytes = Buffer.from('先描述观察，再提出一个行动。','utf8'), uploads = app.get(MachineUploadService);
  const prepared = await uploads.prepare(g.access,g.token,'copy',{requestId:randomUUID(),target:{type:'skill_reference',skillId:created.skillId},
    fileName:'guide.md',mimeType:'text/markdown',byteSize:bytes.length,checksum:createHash('sha256').update(bytes).digest('hex')});
  const stream = Readable.from([bytes]) as unknown as Request; stream.headers={'content-type':'application/octet-stream','content-length':String(bytes.length)};
  await uploads.upload(g.access,'copy',prepared.uploadId,prepared.ticket,stream);
  const file = await uploads.complete(g.access,'copy',prepared.uploadId,prepared.ticket,{requestId:randomUUID()});
  const updated = await ok(g,'skill_draft_save',{skillId:created.skillId,versionId:created.versionId,expectedRevision:0,requestId:randomUUID(),
    manifest:{...manifest('copy'),references:[{path:'references/guide.md',fileId:file.fileId}]}});
  const module = c.module('copy'), captured = await ok(g,'project_method_capture',{planModuleId:module.id,expectedModuleDigest:module.digest,
    purpose:'copywriting',sourceVersionId:updated.id,expectedSourceRevision:updated.revision,expectedSourceDigest:updated.digest,requestId:randomUUID()});
  await ok(g,'skill_draft_save',{skillId:created.skillId,versionId:created.versionId,expectedRevision:updated.revision,requestId:randomUUID(),manifest:manifest('copy')});
  const text = await ok(g,'project_method_reference_get',{snapshotId:captured.id,fileId:file.fileId}); assert.equal(text.text,bytes.toString('utf8'));
  const fixed = await ok(g,'project_method_get',{snapshotId:captured.id}); assert.equal(fixed.version.files.length,1); assert.equal(fixed.version.files[0].file.downloadPath,undefined);
  assert.equal((await call(g,'project_method_reference_get',{snapshotId:captured.id,fileId:randomUUID()})).status,400);
});
test('all five official SDK clients discover and read exact v1 and v2 plans through real stdio transport after an admin save', async () => {
  const c = await bootstrap(await setup());
  const legacy=c.plan;
  c.plan=await app.get(ProductionPlansService).save(access,c.project.productId,{plan:{...legacy.plan,schemaVersion:2,productPlan:emptyProductImplementationPlan(legacy.id)},expectedRevision:1,requestId:randomUUID()});
  for (const domain of ['assessment','cover','video','copy','experience'] as const) {
    const g = domain==='assessment'?c.machine:await grant(domain,c.workspace.id);
    const methodInput = {productId:c.project.productId,methodKey:'sdk-'+domain,manifest:manifest(domain),requestId:randomUUID()};
    const {stdout,stderr} = await promisify(execFile)(process.execPath,['../../packages/mcp/test/real-project-client.mjs'],{env:{...process.env,
      ORAI_MCP_API_URL:base,ORAI_MCP_TOKEN:g.token,ORAI_MCP_DOMAIN:domain,ORAI_MCP_ALLOWED_ROOT:directory,
      ORAI_MCP_PROJECT_SCENARIO_JSON:JSON.stringify({calls:[{name:'project_get',input:{productId:c.project.productId}},
        {name:'project_plan_get',input:{planRevisionId:c.plan.id}},{name:'project_context_get',input:{planRevisionId:c.plan.id,inputs:[]}},
        {name:'project_method_create',input:methodInput},{name:'project_plan_get',input:{planRevisionId:legacy.id}}]})},maxBuffer:1_000_000});
    assert.equal(stderr,''); const result = JSON.parse(stdout); assert.equal(result.ok,true); assert.equal(result.domain,domain);
    assert.equal(result.results[0].data.productId,c.project.productId); assert.equal(result.results[2].data.creativeProfile.id,c.project.creativeProfileRevisionId);
    assert.ok(result.results[3].data.skillId);
    assert.deepEqual(result.results[1].data,c.plan);assert.deepEqual(result.results[4].data,legacy);
  }
});
test('MCP v2 writes use the same revision, recovery and permission rules as admin writes',async()=>{
  const c=await bootstrap(await setup()),plans=app.get(ProductionPlansService),productPlan=emptyProductImplementationPlan(c.plan.id),
    plan={...c.plan.plan,schemaVersion:2,productPlan},body={productId:c.project.productId,plan,expectedRevision:1,requestId:randomUUID()},
    saved=await ok(c.machine,'project_plan_save',body);
  assert.deepEqual(await ok(c.machine,'project_plan_save',body),saved);assert.deepEqual(await plans.read(access,saved.id),saved);
  assert.equal((await call(c.machine,'project_plan_save',{...body,plan:{...plan,title:'变更同一请求'}})).status,409);
  const writers=await Promise.all(['甲','乙'].map(title=>call(c.machine,'project_plan_save',{...body,expectedRevision:2,requestId:randomUUID(),plan:{...plan,title}})));
  assert.deepEqual(writers.map(response=>response.status).sort(),[200,409]);
  const copy=await grant('copy',c.workspace.id);assert.equal((await call(copy,'project_plan_save',{...body,expectedRevision:3,requestId:randomUUID()})).status,403);
  await app.get(MachineCredentialsService).revoke(access,c.machine.id,{requestId:randomUUID()});
  assert.equal((await call(c.machine,'project_plan_get',{planRevisionId:saved.id})).status,401);
  assert.deepEqual(await plans.read(access,c.plan.id),c.plan);
});
test('expired credentials, foreign owners, out-of-range categories and changed profile revisions do not expand the approved workspace', async () => {
  const c = await bootstrap(await setup()), oldToken = 'orai_mcp_' + Buffer.alloc(32,7).toString('base64url');
  await fixture.owner.client.machineCredential.create({data:{scope:'DEMO',ownerUserId:access.actorUserId,domain:'assessment',
    workspaceId:c.workspace.id,name:'隔离过期凭证',permissions:['projects:read'],productIds:[],skillIds:[],
    tokenDigest:createHash('sha256').update(oldToken).digest('hex'),createdAt:new Date(Date.now()-3600_000),expiresAt:new Date(Date.now()-1000)}});
  await assert.rejects(admins.authorizeMachine(oldToken,'assessment'));
  const unknownCategory = {...c.body,projectKey:'forbidden-category',requestId:randomUUID(),product:{...c.body.product,slug:'blocked-'+randomUUID(),categoryId:randomUUID()}};
  assert.equal((await call(c.machine,'project_bootstrap',unknownCategory)).status,403);
  const profile = await ok(c.machine,'project_profile_save',{productId:c.project.productId,profile:{...c.body.profile,visual:'更新紫色'},expectedRevision:1,requestId:randomUUID()});
  const planBody = {productId:c.project.productId,expectedRevision:1,requestId:randomUUID(),plan:{...c.plan.plan,creativeProfileRevisionId:profile.id,title:'新的固定计划'}};
  const newer = ProductionPlanRevisionSchema.parse(await ok(c.machine,'project_plan_save',planBody));
  assert.equal(newer.revision,2); assert.equal(newer.modules[0]!.moduleId,c.plan.modules[0]!.moduleId);
  assert.notEqual(newer.modules[0]!.id,c.plan.modules[0]!.id);
  const fixed = await ok(c.machine,'project_plan_get',{planRevisionId:c.plan.id}); assert.equal(fixed.creativeProfileRevisionId,c.project.creativeProfileRevisionId);
  assert.equal((await call(c.machine,'project_plan_save',{...planBody,requestId:randomUUID()})).status,409);
  assert.equal((await call(c.machine,'project_bootstrap',{...c.body,requestId:randomUUID(),productIds:[demoId('demo-partner')]})).status,400);
});
test('the same topic name can form a new product variant while an identical business-key retry still recovers its original project', async () => {
  const c = await bootstrap(await setup()),variantBody = {...c.body,projectKey:'variant-'+randomUUID(),requestId:randomUUID(),
    product:{...c.body.product,slug:'variant-'+randomUUID()}};
  const variant = MachineProjectResultSchema.parse(await ok(c.machine,'project_bootstrap',variantBody));
  assert.notEqual(variant.productId,c.project.productId);assert.notEqual(variant.planRevisionId,c.plan.id);
  const products = await fixture.runtime.client.product.findMany({where:{id:{in:[variant.productId,c.project.productId]}}});
  assert.equal(products.length,2);assert.ok(products.every(p=>p.name===c.body.product.name&&p.status==='DRAFT'));
  assert.deepEqual(await ok(c.machine,'project_bootstrap',{...variantBody,requestId:randomUUID()}),variant);
  assert.deepEqual(await ok(c.machine,'project_bootstrap',{...c.body,requestId:randomUUID()}),c.project);
  assert.equal(await fixture.runtime.client.machineProject.count({where:{workspaceId:c.workspace.id}}),2);
});
