import 'reflect-metadata';
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
import { demoId, DemoIdentityScenarios } from '../scripts/demo-fixtures';
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
  for (const change of [
    { productPlan: { revisionId: c.plan.id, digest: '0'.repeat(64) } },
    { productPlan: { revisionId: randomUUID(), digest: c.plan.digest } },
    { bindings: c.bindings.map((choice, index) => index ? choice : { ...choice, planModuleId: c.plan.modules.find(module => module.definition.domain === 'experience')!.id }) },
  ]) await assert.rejects(service.save(access, c.profile.id, { ...body, expectedRevision: 1, requestId: randomUUID(), ...change }), rejected);
  const next = await app.get(ProductionPlansService).save(access, c.product.id, { plan: c.plan.plan, expectedRevision: 1, requestId: randomUUID() });
  assert.notEqual(next.id, c.plan.id);
  await assert.rejects(service.save(access, c.profile.id, { ...body, expectedRevision: 1, requestId: randomUUID() }), rejected);
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
});
