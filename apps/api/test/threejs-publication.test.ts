import 'reflect-metadata';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { CreativeProfileSchema } from '@orai/contracts/admin';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/config/configuration';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { VersionsService } from '../src/catalog/versions.service';
import { ExperienceAuthoringService } from '../src/operations/experience-authoring.service';
import { ContentService } from '../src/operations/content.service';
import { ProductionPlansService } from '../src/operations/production-plans.service';
import { demoId, DemoIdentityScenarios, DemoProducts } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';
import { policyPlanDocument } from './skill-policy-fixture';
import { readyPublicationPlan, reviewThreejsFixture } from './publication-fixture';
import { ProjectProductionService } from '../src/operations/project-production.service';
import { SkillsService } from '../src/operations/skills.service';
import { currentSkillManifest } from './skill-policy-fixture';
import { RuntimeVersionService } from '../src/catalog/runtime-version.service';
import { methodProject, methodManifest } from './project-methods-fixture';
import { MachineProjectsService } from '../src/operations/machine-projects.service';

let fixture: Awaited<ReturnType<typeof createLocalFixture>>, app: INestApplication, directory: string, access: CatalogAdminAccess;
let versions: VersionsService, experiences: ExperienceAuthoringService;
const productId = demoId('demo-partner');
before(async () => {
  fixture = await createLocalFixture('t16'); directory = await mkdtemp(join(tmpdir(), 'orai-publication-'));
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG).useValue({
    ...fixture.configuration, assets: { driver: 'local', directory, maxImageBytes: 4194304, maxVideoBytes: 104857600 },
  }).compile();
  app = module.createNestApplication({ logger: false }); await app.init();
  access = await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.admin.id);
  versions = app.get(VersionsService); experiences = app.get(ExperienceAuthoringService);
});
after(async () => { await app?.close(); await fixture?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });

async function fresh(form: 'web' | '3d' = '3d') {
  const latest = await fixture.runtime.client.creativeProfileRevision.aggregate({ where: { productId }, _max: { number: true } });
  const profile = await app.get(ContentService).saveProfile(access, productId, { expectedRevision: latest._max.number ?? 0, requestId: randomUUID(),
    profile: CreativeProfileSchema.parse({ schemaVersion: 1, title: '隔离发布政策样例', audience: '自我观察的成年人', situation: '日常沟通',
      emotionalGoal: '被理解', understandingGoal: '看见表达习惯', takeaway: '一个具体行动', perspective: 'self', experienceForm: form,
      pace: '从容', world: '安静花园', language: '具体温和', visual: '克制紫色', sound: '安静', channels: ['manual'],
      deliverables: ['assessment', 'cover', 'video', 'copy'], reportPlan: { schemaVersion: 1, title: '观察与下一步', narrative: '开放建议',
        presentation: 'standard', sections: [{ sectionId: 'next', title: '下一步', purpose: '具体行动' }] } }) });
  const version = await versions.importConfiguration(access, productId, { configuration: DemoProducts[0]!.configurations[1], requestId: randomUUID() });
  const workspace = await experiences.workspace(access, productId, version.id, { profileId: profile.id });
  return { profile, version, workspace };
}

test('new default publications cannot bypass Three.js policy by omitting the experience and fixed product plan', async () => {
  const value = await fresh();
  await versions.review(access, productId, value.version.id, { requestId: randomUUID() });
  await assert.rejects(versions.publish(access, productId, value.version.id, { requestId: randomUUID() }),
    (error: unknown) => (error as { code: string }).code === 'INVALID_CONFIGURATION');
  assert.equal((await fixture.runtime.client.productVersion.findUniqueOrThrow({ where: { id: value.version.id } })).status, 'REVIEWED');
  assert.equal(await fixture.runtime.client.experienceRelease.count({ where: { productVersionId: value.version.id } }), 0);
});

test('a reviewed DOM manifest cannot be used as a new normal product or as its Three.js fallback', async () => {
  const value = await fresh('web');
  const draft = await experiences.save(access, productId, value.version.id, { manifest: value.workspace.defaultManifest,
    reportPlan: value.profile.profile.reportPlan, methods: [], note: '仅用于隔离拒绝检查', source: 'manual',
    expectedRevision: 0, expectedVersionRevision: value.version.revision, requestId: randomUUID() });
  await assert.rejects(experiences.review(access, draft.id, { expectedRevision: draft.revision, requestId: randomUUID() }),
    (error: unknown) => (error as { code: string }).code === 'INVALID_CONFIGURATION');
});

test('pending animation and interaction remain drafts and cannot be treated as reviewed Three.js delivery', async () => {
  const value = await fresh();
  const current = await fixture.runtime.client.productionPlanRevision.aggregate({ where: { productId }, _max: { number: true } });
  const plan = await app.get(ProductionPlansService).save(access, productId, { plan: policyPlanDocument(value.profile.id, '3d'),
    expectedRevision: current._max.number ?? 0, requestId: randomUUID() });
  const draft = await experiences.save(access, productId, value.version.id, { manifest: value.workspace.defaultManifest,
    reportPlan: value.profile.profile.reportPlan, methods: [], productPlan: { revisionId: plan.id, digest: plan.digest },
    note: '动画和交互仍待规划', source: 'manual', expectedRevision: 0, expectedVersionRevision: value.version.revision, requestId: randomUUID() });
  await assert.rejects(experiences.review(access, draft.id, { expectedRevision: draft.revision, requestId: randomUUID() }),
    (error: unknown) => (error as { code: string }).code === 'INVALID_CONFIGURATION');
  assert.equal((await experiences.read(access, draft.id)).status, 'draft');
});

test('a complete manual Three.js draft retains its exact plan through review and publication', async () => {
  const value = await fresh(), result = await reviewThreejsFixture(app, fixture, access, value.version.id);
  const input = (result.draft as unknown as { productPlanInput: { planRevisionId: string; planDigest: string } }).productPlanInput;
  assert.equal(input.planRevisionId, result.plan.id); assert.equal(input.planDigest, result.plan.digest);
  assert.deepEqual((result.reviewed as unknown as { productPlanInput: unknown }).productPlanInput, input);
  await versions.review(access, productId, value.version.id, { requestId: randomUUID() });
  await versions.publish(access, productId, value.version.id, { requestId: randomUUID() });
  const release = await fixture.runtime.client.experienceRelease.findUniqueOrThrow({ where: { productVersionId: value.version.id } });
  assert.equal(release.authoringRevisionId, result.reviewed.id);
  assert.equal((await app.get(RuntimeVersionService).read(value.version.id)).experience.manifest.renderer.key, 'reflection-garden');
});

test('project production accepts registered 3d authoring and retains it separately from the required original package', async () => {
  const value = await fresh();
  const current = await fixture.runtime.client.productionPlanRevision.aggregate({ where: { productId }, _max: { number: true } });
  const plan = await app.get(ProductionPlansService).save(access, productId, { plan: readyPublicationPlan(value.profile.id),
    expectedRevision: current._max.number ?? 0, requestId: randomUUID() });
  const module = plan.modules.find(item => item.definition.domain === 'experience')!, productions = app.get(ProjectProductionService);
  const source = await app.get(SkillsService).create(access, 'experience', { slug: 'threejs-method-' + randomUUID(), requestId: randomUUID(),
    manifest: currentSkillManifest({ domain: 'experience', name: '隔离场景方法', description: '实际规划和注册模板校验',
      purposes: ['scene_design', 'report_presentation'], styles: ['克制紫色'], supportedForms: ['3d'],
      inputs: [{ key: 'creative-profile', description: '固定共同创作设定', required: true }],
      outputs: [{ key: 'scene', description: '场景和报告清单' }], instructions: '按固定规划使用已注册模板，保留确认、恢复和故障回退。', examples: [], references: [] }) });
  const methods = [];
  for (const purpose of ['scene_design', 'report_presentation']) methods.push(await productions.capture(access, module.id, {
    expectedModuleDigest: module.digest, purpose, sourceVersionId: source.id, expectedSourceRevision: source.revision,
    expectedSourceDigest: source.digest, requestId: randomUUID() }));
  const draft = await experiences.save(access, productId, value.version.id, { manifest: value.workspace.defaultManifest,
    reportPlan: value.profile.profile.reportPlan, methods: [], productPlan: { revisionId: plan.id, digest: plan.digest },
    note: '只登记制作稿，原件另交', source: 'manual', expectedRevision: 0, expectedVersionRevision: value.version.revision, requestId: randomUUID() });
  const record = await productions.save(access, module.id, { expectedModuleDigest: module.digest, expectedRevision: 0, requestId: randomUUID(),
    methods: methods.map(method => ({ snapshotId: method.id, digest: method.digest })), inputs: [],
    outputs: [{ kind: 'experience_revision', outputKey: module.definition.outputs[0]!.outputKey, revisionId: draft.id, digest: draft.digest }],
    external: { client: 'isolated-test-fixture', runKey: 'fixture-' + randomUUID(), note: '原件尚未登记', startedAt: new Date().toISOString(), finishedAt: new Date().toISOString() } });
  assert.equal(record.outputs[0]!.purpose, 'authoring'); assert.equal(record.outputs[0]!.fileId, null);
  assert.equal(record.archiveReady, false);
});

test('runtime SQL cannot bypass new-publication policy by switching status without a reviewed Three.js release', async () => {
  const value = await fresh();
  await versions.review(access, productId, value.version.id, { requestId: randomUUID() });
  await assert.rejects(fixture.runtime.client.productVersion.update({ where: { id: value.version.id },
    data: { status: 'PUBLISHED', publishedAt: new Date(), revision: { increment: 1 } } }));
  assert.equal(await fixture.runtime.client.experienceRelease.count({ where: { productVersionId: value.version.id } }), 0);
});

test('project MCP candidates preserve customized fixed methods through human review without requiring global Skill activation', async () => {
  const context = await methodProject(app, fixture, access), plans = app.get(ProductionPlansService), productions = app.get(ProjectProductionService);
  const plan = await plans.save(access, context.boot.productId, { plan: readyPublicationPlan(context.boot.creativeProfileRevisionId, 'web'),
    expectedRevision: context.plan.revision, requestId: randomUUID() });
  async function capture(domain: 'assessment' | 'experience') {
    const module = plan.modules.find(item => item.definition.domain === domain)!, methods = [];
    const source = await app.get(SkillsService).create(access, domain, { slug: 'project-fixed-' + randomUUID(), manifest: methodManifest(domain), requestId: randomUUID() });
    for (const purpose of module.definition.methodPurposes) methods.push(await productions.capture(access, module.id, {
      expectedModuleDigest: module.digest, purpose, sourceVersionId: source.id, expectedSourceRevision: source.revision,
      expectedSourceDigest: source.digest, customization: { parameters: { audience: '隔离样例' }, instructions: '保留具体观察与开放建议。' }, requestId: randomUUID() }));
    return { module, methods: methods.map(method => ({ snapshotId: method.id, digest: method.digest })) };
  }
  const assessment = await capture('assessment'), machine = app.get(MachineProjectsService);
  const content = await machine.execute(context.machine.get('assessment')!, 'project_draft_save', { planModuleId: assessment.module.id,
    expectedModuleDigest: assessment.module.digest, methods: assessment.methods, requestId: randomUUID(),
    payload: { kind: 'assessment', expectedRevision: 0, configuration: DemoProducts[0]!.configurations[1] } }) as { productVersionId: string };
  const experience = await capture('experience'), workspace = await experiences.workspace(access, context.boot.productId, content.productVersionId, {});
  const profile = await fixture.runtime.client.creativeProfileRevision.findUniqueOrThrow({ where: { id: context.boot.creativeProfileRevisionId } });
  const candidate = await machine.execute(context.machine.get('experience')!, 'project_draft_save', { planModuleId: experience.module.id,
    expectedModuleDigest: experience.module.digest, methods: experience.methods, requestId: randomUUID(), payload: { kind: 'experience',
      productVersionId: content.productVersionId, draft: { manifest: { ...workspace.defaultManifest, renderer: { key: 'reflection-garden', version: 1 },
        report: { contentSchema: 'report_content_v1', renderer: { key: 'garden-notes', version: 1 } } },
        reportPlan: CreativeProfileSchema.parse(profile.profile).reportPlan, productPlan: { revisionId: plan.id, digest: plan.digest },
        note: '项目方法无需启用到全局库', expectedRevision: 0, expectedVersionRevision: workspace.versionRevision } } }) as { revisionId: string; revision: number };
  const reviewed = await experiences.review(access, candidate.revisionId, { expectedRevision: candidate.revision, requestId: randomUUID() });
  assert.equal(reviewed.status, 'reviewed');
  assert.equal(reviewed.methods.length, 2);
  for (const binding of reviewed.methods) assert.equal((await fixture.runtime.client.styleSkillVersion.findUniqueOrThrow({ where: { id: binding.version.id } })).status, 'DRAFT');
});
