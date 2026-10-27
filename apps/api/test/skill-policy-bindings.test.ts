import 'reflect-metadata';
import { reviewThreejsFixture } from './publication-fixture';
import { VersionsService } from '../src/catalog/versions.service';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AdminProductInputSchema, CreativeProfileSchema, ProductionPlanDocumentSchema, StyleSkillManifestSchema,
  withThreejsSkillPolicy, skillPurposes, emptyProductImplementationPlan } from '@orai/contracts/admin';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/config/configuration';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { CatalogAdminService } from '../src/operations/catalog-admin.service';
import { ContentService } from '../src/operations/content.service';
import { ProductionPlansService } from '../src/operations/production-plans.service';
import { SkillsService } from '../src/operations/skills.service';
import { SkillBindingsService } from '../src/operations/skill-bindings.service';
import { ProjectProductionService } from '../src/operations/project-production.service';
import { ExperienceAuthoringService } from '../src/operations/experience-authoring.service';
import { ApiException } from '../src/common/http-errors';
import { contentDigest } from '../src/operations/content-projections';
import { demoId, DemoIdentityScenarios, DemoProducts } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';

let fixture: Awaited<ReturnType<typeof createLocalFixture>>, app: INestApplication, access: CatalogAdminAccess;
before(async () => {
  fixture = await createLocalFixture('t13');
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG).useValue(fixture.configuration).compile();
  app = module.createNestApplication({ logger: false }); await app.init();
  access = await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.admin.id);
});
after(async () => { await app?.close(); await fixture?.close(); });
const rejected = (error: unknown) => error instanceof ApiException && ['VALIDATION_ERROR','CONFLICT','REVISION_CONFLICT','NOT_FOUND'].includes(error.code);
async function fresh(schemaVersion: 1 | 2 = 2) {
  const catalog = app.get(CatalogAdminService), original = await catalog.product(access, demoId('demo-partner'));
  const product = await catalog.create(access, { ...AdminProductInputSchema.strip().parse(original),
    slug: 'policy-' + randomUUID(), name: '商品政策隔离验收', requestId: randomUUID() });
  const profile = await app.get(ContentService).saveProfile(access, product.id, { expectedRevision: 0, requestId: randomUUID(),
    profile: CreativeProfileSchema.parse({ schemaVersion: 1, title: '隔离设定', audience: '自我观察者', situation: '一次日常交流',
      emotionalGoal: '被理解', understandingGoal: '看见表达习惯', takeaway: '一个具体行动', perspective: 'self', experienceForm: '3d',
      pace: '从容', world: '安静空间', language: '具体温和', visual: '紫色', sound: '安静', channels: ['manual'],
      deliverables: ['assessment','cover','video','copy'], reportPlan: { schemaVersion: 1, title: '观察', narrative: '理解与行动',
        presentation: 'standard', sections: [{ sectionId: 'next', title: '下一步', purpose: '具体建议' }] } }) });
  const modules = Object.entries(skillPurposes).map(([domain, purposes]) => {
    const kind = domain === 'assessment' ? 'assessment' : domain === 'cover' ? 'image' : domain === 'experience' ? 'scene_bundle' : domain;
    const structured = ['assessment','copy'].includes(domain);
    return { moduleKey: domain, title: domain, domain, required: true, purpose: '隔离方法绑定', dependsOn: [],
      target: { form: '3d', runtime: null }, methodPurposes: [...purposes], methodRetention: 'manifest_instructions_and_references',
      outputs: [{ outputKey: 'deliverable', label: '交付', kind, required: true,
        original: { storage: 'platform', representation: structured ? 'structured' : 'file' },
        files: structured ? [] : [{ fileKey: 'source', label: '原件', purpose: 'original', required: true,
          mimeTypes: [domain === 'cover' ? 'image/png' : domain === 'video' ? 'video/webm' : 'application/zip'], sourceUrl: null }] }] };
  });
  const document = ProductionPlanDocumentSchema.parse({ schemaVersion, title: '隔离商品规划', creativeProfileRevisionId: profile.id,
    selection: { basis: 'manual', rationale: '仅验证绑定合同', evidenceKeys: [] }, freshnessWindowHours: 24, evidence: [], modules,
    retention: 'platform_originals_and_exact_methods', ...(schemaVersion === 2 ? { productPlan: emptyProductImplementationPlan() } : {}) });
  const plan = await app.get(ProductionPlansService).save(access, product.id, { plan: document, expectedRevision: 0, requestId: randomUUID() });
  const versions = [];
  for (const domain of Object.keys(skillPurposes) as (keyof typeof skillPurposes)[]) {
    const manifest = withThreejsSkillPolicy(StyleSkillManifestSchema.parse({ schemaVersion: 1, domain, name: '全局专业方法',
      description: '可复用，不绑定某个商品', purposes: [...skillPurposes[domain]], styles: ['紫色'], supportedForms: ['3d'],
      inputs: [{ key: 'creative-profile', description: '共同设定', required: true }], outputs: [{ key: 'deliverable', description: '交付物' }],
      instructions: '用具体观察帮助理解，不贴诊断标签。', examples: [], references: [] }));
    let row = await app.get(SkillsService).create(access, domain, { slug: 'policy-method-' + randomUUID(), manifest, requestId: randomUUID() });
    for (const action of ['review','activate'] as const) row = await app.get(SkillsService).transition(access, domain, row.skillId, row.id, action,
      { expectedRevision: row.revision, requestId: randomUUID() });
    versions.push(row);
  }
  const bindings = versions.filter(version => version.manifest.domain !== 'experience').flatMap(version => version.manifest.purposes.map(purpose => ({
    purpose, skillVersionId: version.id, planModuleId: plan.modules.find(module => module.definition.domain === version.manifest.domain)!.id,
  })));
  return { product, profile, plan, versions, bindings };
}
const saveBody = (c: Awaited<ReturnType<typeof fresh>>) => ({ expectedRevision: 0, requestId: randomUUID(), note: '固定五用途与商品规划',
  productPlan: { revisionId: c.plan.id, digest: c.plan.digest }, bindings: c.bindings });

test('a new Skill set cannot bind reusable methods without the actual fixed product plan input', async () => {
  const c = await fresh();
  await assert.rejects(app.get(SkillBindingsService).save(access, c.profile.id, { expectedRevision: 0, requestId: randomUUID(), note: '缺实际规划',
    bindings: c.bindings.map(({ planModuleId: _module, ...choice }) => choice) }), rejected);
  assert.equal(await fixture.runtime.client.creativeSkillSet.count({ where: { productId: c.product.id } }), 0);
});

test('new bindings retain plan, module, form, purpose and exact method while rejecting wrong or stale inputs', async () => {
  const c = await fresh(), service = app.get(SkillBindingsService), body = saveBody(c);
  const value = await service.save(access, c.profile.id, body);
  for (const binding of value.bindings) {
    const input = (binding as unknown as { productPlanInput: { schemaVersion: number; planRevisionId: string; planDigest: string; planModuleId: string; moduleDigest: string; form: string } }).productPlanInput;
    const module = c.plan.modules.find(module => module.id === c.bindings.find(choice => choice.purpose === binding.purpose)!.planModuleId)!;
    assert.deepEqual(input, { schemaVersion: 1, planRevisionId: c.plan.id, planDigest: c.plan.digest, planModuleId: module.id,
      moduleDigest: module.digest, form: '3d' });
  }
  assert.deepEqual(await service.save(access, c.profile.id, body), value);
  const contextInput = { creativeProfileRevisionId:c.profile.id,domain:'copy',skillSetId:value.id,inputs:[] };
  assert.equal((await app.get(ContentService).context(access,contextInput)).skillVersions.length,1);
  const other = await fresh();
  for (const change of [
    { productPlan: { revisionId: c.plan.id, digest: '0'.repeat(64) } },
    { productPlan: { revisionId: randomUUID(), digest: c.plan.digest } },
    { productPlan: { revisionId: other.plan.id, digest: other.plan.digest } },
    { bindings: c.bindings.map((choice, index) => index ? choice : { ...choice, planModuleId: c.plan.modules.find(module => module.definition.domain === 'experience')!.id }) },
  ]) await assert.rejects(service.save(access, c.profile.id, { ...body, expectedRevision: 1, requestId: randomUUID(), ...change }), rejected);
  const next = await app.get(ProductionPlansService).save(access, c.product.id, { plan: c.plan.plan, expectedRevision: 1, requestId: randomUUID() });
  assert.notEqual(next.id, c.plan.id);
  await assert.rejects(service.save(access, c.profile.id, { ...body, expectedRevision: 1, requestId: randomUUID() }), rejected);
  await assert.rejects(app.get(ContentService).context(access,contextInput),rejected);
  assert.deepEqual(await service.read(access, value.id), value, 'Historical reads keep the exact earlier plan input');
});

test('all seven new project methods require a v2 product plan even when the reusable Skill is compliant', async () => {
  const c = await fresh(1), service = app.get(ProjectProductionService);
  for (const version of c.versions) for (const purpose of version.manifest.purposes) {
    const module = c.plan.modules.find(module => module.definition.domain === version.manifest.domain)!;
    await assert.rejects(service.capture(access, module.id, { expectedModuleDigest: module.digest, purpose, sourceVersionId: version.id,
      expectedSourceRevision: version.revision, expectedSourceDigest: version.digest, requestId: randomUUID() }), rejected);
  }
  assert.equal(await fixture.runtime.client.projectMethodSnapshot.count({ where: { productId: c.product.id } }), 0);
});

test('direct experience method bindings cannot omit the actual product plan input', async () => {
  const c = await fresh(), version = c.versions.find(version => version.manifest.domain === 'experience')!;
  await assert.rejects(fixture.runtime.client.$transaction(tx => app.get(ExperienceAuthoringService).methods(tx, access,
    [{ purpose: 'scene_design', skillVersionId: version.id }, { purpose: 'report_presentation', skillVersionId: version.id }], [], '3d')), rejected);
  const module = c.plan.modules.find(module=>module.definition.domain==='experience')!;
  const choices = [{purpose:'scene_design' as const,skillVersionId:version.id,planModuleId:module.id},
    {purpose:'report_presentation' as const,skillVersionId:version.id,planModuleId:module.id}];
  const bound = await fixture.runtime.client.$transaction(tx=>app.get(ExperienceAuthoringService).methods(tx,access,choices,[],'3d',
    {productId:c.product.id,profileId:c.profile.id,productPlan:{revisionId:c.plan.id,digest:c.plan.digest}}));
  assert.deepEqual(bound.map(binding=>binding.productPlanInput?.planModuleId),[module.id,module.id]);
  assert.deepEqual(bound.map(binding=>binding.purpose),['scene_design','report_presentation']);
});

test('historical Skill sets and manifests remain readable but cannot authorize new bindings, contexts or project methods', async () => {
  const c = await fresh(), historical = [];
  for (const current of c.versions) {
    const { productPolicy: _policy, ...fields } = current.manifest as typeof current.manifest & {productPolicy?:unknown};
    const manifest = StyleSkillManifestSchema.parse({...fields,schemaVersion:1});
    const skill = await fixture.owner.client.styleSkill.create({data:{scope:'DEMO',domain:manifest.domain,slug:'legacy-policy-'+randomUUID(),
      name:manifest.name,description:manifest.description,styles:manifest.styles,purposes:manifest.purposes,supportedForms:manifest.supportedForms}});
    let version = await fixture.owner.client.styleSkillVersion.create({data:{skillId:skill.id,scope:'DEMO',number:1,
      manifest,digest:contentDigest(manifest),actorUserId:access.actorUserId}});
    for (const status of ['REVIEWED','ACTIVE'] as const) version = await fixture.owner.client.styleSkillVersion.update({where:{id:version.id},data:{status,revision:{increment:1}}});
    historical.push({version,manifest});
  }
  const bindings = historical.filter(item=>item.manifest.domain!=='experience').flatMap(({version,manifest})=>manifest.purposes.map(purpose=>({
    purpose,domain:manifest.domain,version:{id:version.id,skillId:version.skillId,number:version.number,digest:version.digest,manifest,files:[]},
  })));
  const stored = await fixture.owner.client.$transaction(async tx=>{
    const row = await tx.creativeSkillSet.create({data:{productId:c.product.id,scope:'DEMO',creativeProfileRevisionId:c.profile.id,number:1,
      digest:contentDigest({profileDigest:c.profile.digest,bindings}),note:'政策上线前已保存的固定组合'}});
    await tx.creativeSkillBinding.createMany({data:bindings.map(binding=>({skillSetId:row.id,productId:c.product.id,scope:'DEMO',
      purpose:binding.purpose,domain:binding.domain,skillId:binding.version.skillId,skillVersionId:binding.version.id,snapshot:binding}))});
    return row;
  });
  const service = app.get(SkillBindingsService), before = await service.read(access,stored.id);
  assert.ok(before.bindings.every(binding=>binding.productPlanInput===undefined&&binding.version.manifest.schemaVersion===1));
  assert.equal((await service.domain(access,stored.id,'assessment')).skillVersions.length,2);
  await assert.rejects(app.get(ContentService).context(access,{creativeProfileRevisionId:c.profile.id,domain:'copy',skillSetId:stored.id,inputs:[]}),rejected);
  await assert.rejects(service.save(access,c.profile.id,{...saveBody(c),expectedRevision:1,bindings:before.bindings.map(binding=>({
    purpose:binding.purpose,skillVersionId:binding.version.id,planModuleId:c.plan.modules.find(module=>module.definition.domain===binding.domain)!.id,
  }))}),rejected);
  for (const {version,manifest} of historical) for (const purpose of manifest.purposes) {
    const module = c.plan.modules.find(module=>module.definition.domain===manifest.domain)!;
    await assert.rejects(app.get(ProjectProductionService).capture(access,module.id,{expectedModuleDigest:module.digest,purpose,sourceVersionId:version.id,
      expectedSourceRevision:version.revision,expectedSourceDigest:version.digest,requestId:randomUUID()}),rejected);
    assert.deepEqual((await app.get(SkillsService).readVersion(access,manifest.domain,version.skillId,version.id)).manifest,manifest);
  }
  assert.deepEqual(await service.read(access,stored.id),before);
  // A historical content source is readable, but attaching a new compliant
  // experience must not make its old policy-free assessment methods publishable.
  const versions = app.get(VersionsService), version = await versions.importConfiguration(access,c.product.id,{
    configuration:DemoProducts[0]!.configurations[1],requestId:randomUUID()});
  await reviewThreejsFixture(app,fixture,access,version.id,{profileId:c.profile.id});
  const content = await fixture.runtime.client.contentRevision.findFirstOrThrow({where:{productVersionId:version.id,assetId:null},orderBy:{sourceRevision:'desc'}});
  const assessmentMethods = bindings.filter(binding=>binding.domain==='assessment');
  await fixture.owner.client.productionRecord.create({data:{productId:c.product.id,scope:'DEMO',outputRevisionId:content.id,
    creativeProfileRevisionId:c.profile.id,actorUserId:access.actorUserId,source:'manual',skillSetId:stored.id,
    skillVersionId:assessmentMethods[0]!.version.id,skillVersions:assessmentMethods,inputManifest:[]}});
  await versions.review(access,c.product.id,version.id,{requestId:randomUUID()});
  await assert.rejects(versions.publish(access,c.product.id,version.id,{requestId:randomUUID()}),
    (error:unknown)=>error instanceof ApiException&&error.code==='INVALID_CONFIGURATION');
  assert.deepEqual(await service.read(access,stored.id),before);
});
