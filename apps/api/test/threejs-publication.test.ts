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
