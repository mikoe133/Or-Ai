import 'reflect-metadata';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { Request } from 'express';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AdminProductInputSchema, CreativeProfileSchema, ProductionPlanDocumentSchema, StyleSkillManifestSchema,
  skillPurposes, type StyleSkillManifest } from '@orai/contracts/admin';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/config/configuration';
import { configureApp } from '../src/common/configure-app';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { VersionsService } from '../src/catalog/versions.service';
import { CatalogAdminService } from '../src/operations/catalog-admin.service';
import { ContentService } from '../src/operations/content.service';
import { ProductionPlansService } from '../src/operations/production-plans.service';
import { ProjectProductionService } from '../src/operations/project-production.service';
import { SkillsService } from '../src/operations/skills.service';
import { SkillFilesService } from '../src/operations/skill-files.service';
import { SkillBindingsService } from '../src/operations/skill-bindings.service';
import { FilesService } from '../src/operations/files.service';
import { AssetStorage } from '../src/operations/asset-storage';
import { FileCleanupService } from '../src/operations/file-cleanup.service';
import { ExperienceAuthoringService } from '../src/operations/experience-authoring.service';
import { MachineCredentialsService } from '../src/operations/machine-credentials.service';
import { contentDigest } from '../src/operations/content-projections';
import { DemoIdentityScenarios, demoId } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';
import { Prisma } from '../src/generated/prisma/client';

let fixture: Awaited<ReturnType<typeof createLocalFixture>>, app: INestApplication, access: CatalogAdminAccess,
  service: ProjectProductionService, directory: string, base: string;
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aG1kAAAAASUVORK5CYII=', 'base64');
before(async () => {
  fixture = await createLocalFixture('t14'); directory = await mkdtemp(join(tmpdir(), 'orai-project-production-'));
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG).useValue({ ...fixture.configuration,
    assets: { ...fixture.configuration.assets, driver: 'local', directory } }).compile();
  app = module.createNestApplication({ logger: false }); configureApp(app); await app.listen(0, '127.0.0.1'); base = await app.getUrl();
  access = await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.admin.id);
  service = app.get(ProjectProductionService);
});
after(async () => { await app?.close(); await fixture?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });

async function fresh() {
  const original = await app.get(CatalogAdminService).product(access, demoId('demo-partner'));
  const product = await app.get(CatalogAdminService).create(access, { ...AdminProductInputSchema.strip().parse(original),
    slug: 'project-' + randomUUID(), name: '项目制作合成验收', requestId: randomUUID() });
  const source = await fixture.runtime.client.productVersion.findFirstOrThrow({ where: { productId: original.id, status: 'PUBLISHED' } });
  const version = await app.get(VersionsService).importConfiguration(access, product.id, { configuration: source.configuration, requestId: randomUUID() });
  const profile = await app.get(ContentService).saveProfile(access, product.id, { expectedRevision: 0, requestId: randomUUID(), profile: CreativeProfileSchema.parse({
    schemaVersion: 1, title: '合成项目设定', audience: '自我观察者', situation: '日常沟通', emotionalGoal: '被理解',
    understandingGoal: '观察相处节奏', takeaway: '一个具体行动', perspective: 'self', experienceForm: 'web', pace: '从容',
    world: '紫色纸本', language: '具体直接', visual: '紫色', sound: '安静', channels: ['manual'], deliverables: ['assessment','cover','copy','video'],
    reportPlan: { schemaVersion: 1, title: '观察报告', narrative: '观察与下一步', presentation: 'standard', sections: [{ sectionId: 'next', title: '下一步', purpose: '形成行动' }] },
  }) });
  const file = (fileKey: string, purpose: 'original' | 'preview', mimeTypes: string[]) => ({ fileKey, purpose, required: purpose === 'original', label: fileKey, mimeTypes, sourceUrl: null });
  const output = (outputKey: string, kind: string) => ({ outputKey, label: outputKey, required: true, kind,
    original: { storage: 'platform', representation: ['copy','assessment','report'].includes(kind) ? 'structured' : 'file' },
    files: kind === 'image' ? [file('source','original',['image/png']),file('preview','preview',['image/png'])]
      : kind === 'video' ? [file('source','original',['video/webm'])] : kind === 'web_bundle' ? [file('source','original',['application/zip'])] : [] });
  const module = (moduleKey: keyof typeof skillPurposes, outputs: ReturnType<typeof output>[], dependsOn: string[] = []) => ({ moduleKey,
    title: moduleKey, domain: moduleKey, required: true, purpose: '合成流程', dependsOn, target: { form: 'web', runtime: null as unknown },
    methodPurposes: [...skillPurposes[moduleKey]], methodRetention: 'manifest_instructions_and_references', outputs });
  const experience = module('experience',[output('web','web_bundle')]);
  experience.target.runtime = { renderer: { key: 'dom-choice', version: 1 }, reportRenderer: { key: 'legacy-text', version: 1 },
    inputSchema: 'single_choice_v1', engine: 'dimensions_v1', reportSchema: 'report_content_v1' };
  const plan = await app.get(ProductionPlansService).save(access, product.id, { expectedRevision: 0, requestId: randomUUID(), plan: ProductionPlanDocumentSchema.parse({
    schemaVersion: 1, title: '合成商品计划', creativeProfileRevisionId: profile.id, selection: { basis: 'manual', rationale: '隔离技术验收', evidenceKeys: [] },
    freshnessWindowHours: 24, evidence: [], modules: [module('copy',[output('copy','copy'),output('alternate','copy')]),
      module('cover',[output('cover','image'),output('illustration','image')]),module('video',[output('video','video')],['copy','cover']),
      module('assessment',[output('questions','assessment'),output('report','report')]),experience], retention: 'platform_originals_and_exact_methods',
  }) });
  return { product, version, profile, plan, module: (key: string) => plan.modules.find(row => row.moduleKey === key)! };
}
function manifest(domain: keyof typeof skillPurposes, instructions = '以具体观察给出理解与行动，不贴诊断标签。') {
  return StyleSkillManifestSchema.parse({ schemaVersion: 1, domain, name: '候选方法', description: '隔离项目候选方法',
    purposes: [...skillPurposes[domain]], styles: ['紫色纸本'], supportedForms: ['web'],
    inputs: [{ key: 'creative-profile', description: '固定创作设定', required: true }], outputs: [{ key: 'deliverable', description: '本模块产物' }],
    instructions, examples: [], references: [] });
}
const create = (domain: keyof typeof skillPurposes, value = manifest(domain)) => app.get(SkillsService).create(access, domain,
  { slug: 'candidate-' + randomUUID(), manifest: value, requestId: randomUUID() });
type Context = Awaited<ReturnType<typeof fresh>>;
type Source = Awaited<ReturnType<typeof create>>;
async function capture(context: Context, domain: keyof typeof skillPurposes, source: Source, purpose = skillPurposes[domain][0] as string) {
  const module = context.module(domain);
  return service.capture(access, module.id, { expectedModuleDigest: module.digest, purpose, sourceVersionId: source.id,
    expectedSourceRevision: source.revision, expectedSourceDigest: source.digest, requestId: randomUUID() });
}
async function copy(context: Context, text = '看见彼此不同的节奏') {
  return app.get(ContentService).saveAsset(access, { productVersionId: context.version.id, platform: 'manual', variant: randomUUID(), expectedRevision: 0,
    requestId: randomUUID(), fileId: null, authoring: { schemaVersion: 1, creativeProfileRevisionId: context.profile.id,
      content: { kind: 'copy', blocks: [{ blockId: 'hook', role: 'hook', text }] }, media: { localArchive: null, previewFileId: null }, inputs: [],
      production: { source: 'external_ai', batchKey: null, externalLabel: '合成外部制作', skillVersionId: null } } });
}
function production(context: Context, domain: string, methods: Awaited<ReturnType<typeof capture>>[], outputs: unknown[], expectedRevision = 0) {
  return { expectedModuleDigest: context.module(domain).digest, expectedRevision, requestId: randomUUID(),
    methods: methods.map(method => ({ snapshotId: method.id, digest: method.digest })), inputs: [], outputs,
    external: { client: 'isolated-external-client', runKey: 'run-' + randomUUID(), note: '仅来源申报，不表示平台执行',
      startedAt: '2026-10-21T08:00:00Z', finishedAt: '2026-10-21T08:01:00Z' } };
}
async function reference(source: Source) {
  const bytes = Buffer.from('项目旧方法的必要参考。\n'), files = app.get(SkillFilesService), domain = source.manifest.domain;
  const file = await files.prepare(access, domain, source.skillId, { fileName: 'reference.md', mimeType: 'text/markdown', byteSize: bytes.length, checksum: sha(bytes), requestId: randomUUID() });
  await files.upload(access, domain, source.skillId, file.id, Readable.from([bytes]) as unknown as Request);
  await files.complete(access, domain, source.skillId, file.id, { requestId: randomUUID() });
  const version = await app.get(SkillsService).save(access, domain, source.skillId, source.id, { expectedRevision: source.revision,
    requestId: randomUUID(), manifest: { ...source.manifest, instructions: source.manifest.instructions + '\n[必要参考](references/reference.md)',
      references: [{ path: 'references/reference.md', fileId: file.id }] } });
  return { version, file, bytes };
}
async function uploaded(context: Context) {
  const files = app.get(FilesService), file = await files.prepare(access, { productVersionId: context.version.id, kind: 'cover', fileName: 'source.png',
    mimeType: 'image/png', byteSize: png.length, checksum: sha(png), requestId: randomUUID() });
  await files.upload(access, file.id, Readable.from([png]) as unknown as Request);
  return files.complete(access, file.id, { requestId: randomUUID() });
}
async function bytes(stream: AsyncIterable<Uint8Array>) { const chunks = []; for await (const chunk of stream) chunks.push(Buffer.from(chunk)); return Buffer.concat(chunks); }

test('a new DRAFT method captures exact source instructions and references without global activation; identical capture is stable', async () => {
  const context = await fresh(), source = await create('copy'), ref = await reference(source), module = context.module('copy');
  const body = { expectedModuleDigest: module.digest, purpose: 'copywriting', sourceVersionId: ref.version.id,
    expectedSourceRevision: ref.version.revision, expectedSourceDigest: ref.version.digest, requestId: randomUUID() };
  const first = await service.capture(access, module.id, body);
  assert.equal(first.version.digest, ref.version.digest); assert.equal(first.version.manifest.instructions, ref.version.manifest.instructions);
  assert.equal(first.status, 'captured'); assert.equal(first.activationEffect, 'none');
  assert.deepEqual(await service.capture(access, module.id, body), first);
  assert.deepEqual(await service.capture(access, module.id, { ...body, requestId: randomUUID() }), first);
  await assert.rejects(service.capture(access, module.id, { ...body, expectedSourceDigest: 'f'.repeat(64) }));
  assert.equal((await fixture.runtime.client.styleSkillVersion.findUniqueOrThrow({ where: { id: source.id } })).status, 'DRAFT');
  assert.equal(await fixture.runtime.client.projectProductionRecord.count({ where: { productId: context.product.id } }), 0);
  assert.equal((await app.get(ProductionPlansService).inspection(access, context.plan.id)).modules[0]!.methods, 'captured');
  assert.equal((await fixture.runtime.client.product.findUniqueOrThrow({ where: { id: context.product.id } })).status, 'DRAFT');
});

test('draft changes create new snapshots while old outputs retain the original instructions and downloadable removed references', async () => {
  const context = await fresh(), source = await create('copy'), ref = await reference(source), oldMethod = await capture(context,'copy',ref.version);
  const oldOutput = await copy(context), first = await service.save(access,context.module('copy').id,production(context,'copy',[oldMethod],
    [{ kind: 'content_revision', outputKey: 'copy', revisionId: oldOutput.id, digest: oldOutput.digest }]));
  const changed = await app.get(SkillsService).save(access,'copy',source.skillId,source.id,{ expectedRevision: ref.version.revision,
    manifest: { ...source.manifest, instructions: '改用新的外部制作指令。' }, requestId: randomUUID() });
  const newMethod = await capture(context,'copy',changed), newOutput = await copy(context,'试着先表达自己的需要');
  const second = await service.save(access,context.module('copy').id,production(context,'copy',[newMethod],
    [{ kind: 'content_revision', outputKey: 'copy', revisionId: newOutput.id, digest: newOutput.digest }],1));
  assert.notEqual(newMethod.id,oldMethod.id); assert.notEqual(newMethod.digest,oldMethod.digest); assert.equal(second.revision,2);
  assert.deepEqual(await service.read(access,first.id),first); assert.deepEqual(await service.readMethod(access,oldMethod.id),oldMethod);
  assert.equal((await service.read(access,first.id)).methods[0]!.snapshotId,oldMethod.id);
  assert.deepEqual(await bytes((await service.methodFile(access,oldMethod.id,ref.file.id)).stream),ref.bytes);
  await assert.rejects(service.methodFile(access,newMethod.id,ref.file.id));
  assert.equal(first.platformExecuted,false); assert.equal(first.archiveReady,false); assert.equal(first.status,'saved_outputs');
  await app.get(SkillsService).transition(access,'copy',source.skillId,source.id,'archive',{expectedRevision:changed.revision,requestId:randomUUID()});
  assert.deepEqual(await service.readMethod(access,oldMethod.id),oldMethod);
  const file = await fixture.runtime.client.skillReferenceFile.findUniqueOrThrow({where:{id:ref.file.id}});
  await writeFile(join(directory,file.storageKey),Buffer.alloc(ref.bytes.length,120));
  await assert.rejects(service.save(access,context.module('copy').id,production(context,'copy',[oldMethod],
    [{kind:'content_revision',outputKey:'copy',revisionId:oldOutput.id,digest:oldOutput.digest}],2)));
});

test('one module can select several methods and outputs, and the same library source can be reused in another project', async () => {
  const context = await fresh(), other = await fresh(), source = await create('copy');
  const a = await capture(context,'copy',source), b = await capture(context,'copy',await create('copy',manifest('copy','另一套方法指令。'))), shared = await capture(other,'copy',source);
  const first = await copy(context), second = await copy(context,'第二种文案'), record = await service.save(access,context.module('copy').id,
    production(context,'copy',[a,b],[{ kind:'content_revision',outputKey:'copy',revisionId:first.id,digest:first.digest },
      { kind:'content_revision',outputKey:'alternate',revisionId:second.id,digest:second.digest }]));
  assert.equal(record.methods.length,2); assert.equal(record.outputs.length,2); assert.notEqual(a.id,shared.id);
  assert.equal(a.version.id,shared.version.id); assert.equal(a.version.digest,shared.version.digest);
  assert.equal((await service.listMethods(access,context.module('copy').id,{})).total,2);
  assert.equal((await service.list(access,context.module('copy').id,{})).total,1);
  const otherOutput = await copy(other);
  await assert.rejects(service.save(access,other.module('copy').id,production(other,'copy',[a],
    [{kind:'content_revision',outputKey:'copy',revisionId:otherOutput.id,digest:otherOutput.digest}])));
});

test('wrong domain, purpose, form, changed source revision and missing or corrupt references refuse capture', async () => {
  const context = await fresh(), source = await create('copy'), cover = await create('cover'), incompatible = await create('copy', { ...manifest('copy'), supportedForms:['3d'] });
  await assert.rejects(capture(context,'copy',cover)); await assert.rejects(capture(context,'copy',source,'report_writing'));
  await assert.rejects(capture(context,'copy',incompatible));
  const changed = await app.get(SkillsService).save(access,'copy',source.skillId,source.id,{ expectedRevision:source.revision,
    manifest:{...source.manifest,instructions:'新修订指令。'},requestId:randomUUID() });
  await assert.rejects(capture(context,'copy',source));
  await assert.rejects(app.get(SkillsService).save(access,'copy',source.skillId,source.id,{ expectedRevision:changed.revision,
    manifest:{...changed.manifest,instructions:'[缺失参考](references/missing.md)'},requestId:randomUUID() }));
  const ref = await reference(changed), row = await fixture.runtime.client.skillReferenceFile.findUniqueOrThrow({ where:{id:ref.file.id} });
  await writeFile(join(directory,row.storageKey),Buffer.alloc(ref.bytes.length,120));
  await assert.rejects(capture(context,'copy',ref.version));
  assert.equal(await fixture.runtime.client.projectMethodSnapshot.count({where:{productId:context.product.id}}),0);
});

test('real image originals have exact bytes and remain protected even when no legacy content revision references the file', async () => {
  const context = await fresh(), method = await capture(context,'cover',await create('cover')), storage = app.get(AssetStorage);
  const fileId = randomUUID(), inspection = await (async () => { await storage.receive(fileId+'.blob',Readable.from([png]),
    {byteSize:png.length,mimeType:'image/png',checksum:sha(png)}); return storage.inspect(fileId+'.blob',png.length); })();
  const file = await fixture.owner.client.assetFile.create({data:{id:fileId,productVersionId:context.version.id,scope:'DEMO',ownerUserId:access.actorUserId,
    kind:'COVER',originalName:'historical-original.png',mimeType:'image/png',byteSize:png.length,checksum:sha(png),storageKey:fileId+'.blob',
    width:inspection.width,height:inspection.height,status:'AVAILABLE',verifiedAt:new Date(),expiresAt:new Date(Date.now()-1000)}});
  const before = await app.get(FileCleanupService).candidates(access,context.product.id,{}); assert.ok(before.items.some(row=>row.id===file.id));
  const record = await service.save(access,context.module('cover').id,production(context,'cover',[method],[
    {kind:'file',outputKey:'cover',fileKey:'source',fileId:file.id,checksum:file.checksum},
    {kind:'file',outputKey:'illustration',fileKey:'source',fileId:file.id,checksum:file.checksum}]));
  assert.equal(record.outputs.length,2); assert.deepEqual(await bytes((await service.outputFile(access,record.id,record.outputs[0]!.id)).stream),png);
  assert.ok(!(await app.get(FileCleanupService).candidates(access,context.product.id,{})).items.some(row=>row.id===file.id));
  await assert.rejects(fixture.owner.client.assetFile.update({where:{id:file.id},data:{status:'DELETING'}}));
  assert.equal((await app.get(ProductionPlansService).inspection(access,context.plan.id)).modules[1]!.originals,'recorded_not_revalidated');
});

test('saving methods, scripts, missing files or the wrong project/profile is never a completed production record', async () => {
  const context = await fresh(), other = await fresh(), method = await capture(context,'copy',await create('copy')), output = await copy(other);
  await assert.rejects(service.save(access,context.module('copy').id,production(context,'copy',[method],[])));
  await assert.rejects(service.save(access,context.module('copy').id,production(context,'copy',[method],[{kind:'content_revision',outputKey:'copy',revisionId:output.id,digest:output.digest}])));
  const own = await copy(context);
  await assert.rejects(service.save(access,context.module('copy').id,production(context,'copy',[method],[{kind:'content_revision',outputKey:'copy',revisionId:own.id,digest:'f'.repeat(64)}])));
  const foreignProfile = await app.get(ContentService).saveProfile(access,context.product.id,{expectedRevision:1,requestId:randomUUID(),profile:{...context.profile.profile,title:'另一修订设定'}});
  const drifted = await copy({...context,profile:foreignProfile});
  await assert.rejects(service.save(access,context.module('copy').id,production(context,'copy',[method],[{kind:'content_revision',outputKey:'copy',revisionId:drifted.id,digest:drifted.digest}])));
  const video = await capture(context,'video',await create('video'));
  const script = await app.get(ContentService).saveAsset(access,{productVersionId:context.version.id,platform:'manual',variant:randomUUID(),expectedRevision:0,requestId:randomUUID(),
    authoring:{schemaVersion:1,creativeProfileRevisionId:context.profile.id,content:{kind:'script',scenes:[{sceneId:'intro',startMs:0,endMs:1000,text:'只有分镜，没有视频'}]},
      media:{localArchive:null,previewFileId:null},inputs:[],production:{source:'external_ai',skillVersionId:null}}});
  await assert.rejects(service.save(access,context.module('video').id,production(context,'video',[video],[{kind:'content_revision',outputKey:'video',revisionId:script.id,digest:script.digest}])));
  const cover = await capture(context,'cover',await create('cover')), file = await uploaded(other);
  await assert.rejects(service.save(access,context.module('cover').id,production(context,'cover',[cover],[{kind:'file',outputKey:'cover',fileKey:'source',fileId:file.id,checksum:file.checksum}])));
  assert.equal(await fixture.runtime.client.projectProductionRecord.count({where:{productId:context.product.id}}),0);
});

test('native experience drafts retain their precise renderer and both candidate purposes, without claiming the original web package imported', async () => {
  const context = await fresh(), source = await create('experience'), scene = await capture(context,'experience',source,'scene_design');
  assert.equal((await app.get(ProductionPlansService).inspection(access,context.plan.id)).modules[4]!.methods,'partially_captured');
  const report = await capture(context,'experience',source,'report_presentation'), authoring = app.get(ExperienceAuthoringService);
  const workspace = await authoring.workspace(access,context.product.id,context.version.id,{profileId:context.profile.id});
  const draft = await authoring.save(access,context.product.id,context.version.id,{manifest:workspace.defaultManifest,reportPlan:workspace.reportPlan,
    methods:[],note:'实际保存的合成体验制作稿',source:'external_ai',expectedRevision:0,expectedVersionRevision:workspace.versionRevision,requestId:randomUUID()});
  const output = {kind:'experience_revision',outputKey:'web',revisionId:draft.id,digest:draft.digest};
  await assert.rejects(service.save(access,context.module('experience').id,production(context,'experience',[scene],[output])));
  const record = await service.save(access,context.module('experience').id,production(context,'experience',[scene,report],[output]));
  assert.equal(record.outputs[0]!.purpose,'authoring');assert.equal(record.outputs[0]!.fileId,null);assert.equal(record.archiveReady,false);
  const inspection = await app.get(ProductionPlansService).inspection(access,context.plan.id);
  assert.equal(inspection.modules[4]!.methods,'captured');assert.equal(inspection.modules[4]!.originals,'declared_not_imported');
});

test('the existing five-purpose combination still rejects DRAFT library sources despite their valid project snapshots', async () => {
  const context = await fresh(), bindings = [];
  for (const domain of ['assessment','cover','video','copy'] as const) {
    const source = await create(domain);
    for (const purpose of skillPurposes[domain]) {
      await capture(context,domain,source,purpose);
      bindings.push({purpose,skillVersionId:source.id});
    }
  }
  await assert.rejects(app.get(SkillBindingsService).save(access,context.profile.id,{expectedRevision:0,requestId:randomUUID(),
    note:'候选项目方法不应改变 ACTIVE 组合规则',bindings}));
  assert.equal(await fixture.runtime.client.creativeSkillSet.count({where:{productId:context.product.id}}),0);
});

test('dependency input records pin the same plan revision and exact digest instead of following a newer plan or another module', async () => {
  const original = await fresh(), source = await create('copy'), oldMethod = await capture(original,'copy',source), output = await copy(original);
  const oldRecord = await service.save(access,original.module('copy').id,production(original,'copy',[oldMethod],
    [{kind:'content_revision',outputKey:'copy',revisionId:output.id,digest:output.digest}]));
  const document = structuredClone(original.plan.plan), follow = {...document.modules[0]!,moduleKey:'follow-up',title:'下游文案',dependsOn:['copy']};
  document.modules.push(follow);
  const plan = await app.get(ProductionPlansService).save(access,original.product.id,{expectedRevision:1,requestId:randomUUID(),plan:document});
  const context = {...original,plan,module:(key:string)=>plan.modules.find(row=>row.moduleKey===key)!};
  const newMethod = await capture(context,'copy',source), parent = await service.save(access,context.module('copy').id,production(context,'copy',[newMethod],
    [{kind:'content_revision',outputKey:'copy',revisionId:output.id,digest:output.digest}]));
  const module = context.module('follow-up'), method = await service.capture(access,module.id,{expectedModuleDigest:module.digest,purpose:'copywriting',
    sourceVersionId:source.id,expectedSourceRevision:source.revision,expectedSourceDigest:source.digest,requestId:randomUUID()});
  const body = production(context,'follow-up',[method],[{kind:'content_revision',outputKey:'copy',revisionId:output.id,digest:output.digest}]);
  await assert.rejects(service.save(access,module.id,{...body,inputs:[{recordId:oldRecord.id,digest:oldRecord.digest}]}));
  await assert.rejects(service.save(access,module.id,{...body,inputs:[{recordId:parent.id,digest:'f'.repeat(64)}]}));
  const record = await service.save(access,module.id,{...body,inputs:[{recordId:parent.id,digest:parent.digest}]});
  assert.equal(record.inputs[0]!.recordId,parent.id);assert.equal(record.inputs[0]!.planModuleId,parent.planModuleId);
  assert.equal(record.planRevisionId,plan.id);assert.deepEqual(await service.read(access,oldRecord.id),oldRecord);
});

test('idempotent retries, immutable history and concurrent writers cannot duplicate or overwrite one module production revision', async () => {
  const context = await fresh(), method = await capture(context,'copy',await create('copy')), output = await copy(context), module = context.module('copy');
  const body = production(context,'copy',[method],[{kind:'content_revision',outputKey:'copy',revisionId:output.id,digest:output.digest}]);
  const first = await service.save(access,module.id,body);assert.deepEqual(await service.save(access,module.id,body),first);
  await assert.rejects(service.save(access,module.id,{...body,external:{...body.external,note:'同请求换内容'}}));
  const results = await Promise.allSettled([1,2].map(()=>service.save(access,module.id,{...body,requestId:randomUUID(),expectedRevision:1})));
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.filter(result=>result.status==='rejected').length,1);
  await assert.rejects(fixture.owner.client.projectMethodSnapshot.update({where:{id:method.id},data:{digest:'f'.repeat(64)}}));
  await assert.rejects(fixture.owner.client.projectProductionRecord.update({where:{id:first.id},data:{document:{}}}));
  await assert.rejects(fixture.runtime.client.projectProductionRecord.delete({where:{id:first.id}}));
  await assert.rejects(fixture.owner.client.projectProductionOutput.update({where:{id:first.outputs[0]!.id},data:{digest:'f'.repeat(64)}}));
  assert.deepEqual(await service.read(access,first.id),first);
  const row = await fixture.owner.client.projectProductionRecord.findUniqueOrThrow({where:{id:first.id}});
  await assert.rejects(fixture.owner.client.projectProductionRecord.create({data:{planModuleId:module.id,productId:context.product.id,scope:'DEMO',number:3,
    document:row.document as Prisma.InputJsonValue,digest:row.digest,actorUserId:access.actorUserId}}));
  assert.equal(await fixture.runtime.client.projectProductionRecord.count({where:{productId:context.product.id}}),2);
});

test('real administrator/scope checks, forged access and legacy machine credentials cannot bypass the new project boundary', async () => {
  const context = await fresh(), source = await create('copy'), method = await capture(context,'copy',source);
  await assert.rejects(service.readMethod({actorUserId:access.actorUserId,scope:'DEMO'} as CatalogAdminAccess,method.id));
  await assert.rejects(service.readMethod(access,method.id,{scope:'live'}));
  const liveActor = await fixture.owner.client.user.create({data:{supabaseUserId:randomUUID(),scope:'LIVE',role:'USER'}});
  const liveSkill = await fixture.owner.client.styleSkill.create({data:{scope:'LIVE',domain:'copy',slug:'live-'+randomUUID(),name:'LIVE synthetic',description:'scope fixture',
    styles:['purple'],purposes:['copywriting'],supportedForms:['web']}});
  const liveSource = await fixture.owner.client.styleSkillVersion.create({data:{skillId:liveSkill.id,scope:'LIVE',number:1,manifest:manifest('copy'),digest:contentDigest(manifest('copy')),actorUserId:liveActor.id}});
  await assert.rejects(capture(context,'copy',{...source,id:liveSource.id}));
  const issued = await app.get(MachineCredentialsService).create(access,{name:'Legacy P2 boundary',domain:'copy',productIds:[context.product.id],skillIds:[source.skillId],
    permissions:['content:read','content:write','skills:read'],expiresAt:new Date(Date.now()+3600000).toISOString(),requestId:randomUUID()});
  const machine = await app.get(CatalogAdminAccessService).authorizeMachine(issued.token!,'copy');
  await assert.rejects(service.readMethod(machine,method.id));await assert.rejects(service.list(machine,context.module('copy').id,{}));
  await app.get(MachineCredentialsService).revoke(access,issued.credential.id,{requestId:randomUUID()});
  assert.equal((await fetch(base+'/api/admin/project-methods/'+method.id)).status,401);
  assert.equal((await fetch(base+'/api/project-methods/'+method.id)).status,404);
  await fixture.owner.client.user.update({where:{id:access.actorUserId},data:{role:'USER'}});
  try {await assert.rejects(service.readMethod(access,method.id));} finally {await fixture.owner.client.user.update({where:{id:access.actorUserId},data:{role:'ADMIN'}});}
});
