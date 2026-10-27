import 'reflect-metadata';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ExperienceManifestSchema, ExperienceSessionSchema, ReportPresentationSchema, supportsExperience } from '@orai/contracts/experience';
import { QuestionsResponseSchema, ReportResponseSchema } from '@orai/contracts/private';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/config/configuration';
import { configureApp } from '../src/common/configure-app';
import { Prisma } from '../src/generated/prisma/client';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { VersionsService } from '../src/catalog/versions.service';
import { experienceRelease } from '../src/catalog/experience-release';
import { DeliveryAdminService } from '../src/redemption/delivery-admin.service';
import { FileCleanupService } from '../src/operations/file-cleanup.service';
import { AssetStorage } from '../src/operations/asset-storage';
import { demoId, DemoIdentityScenarios, DemoProducts } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';

let fixture: Awaited<ReturnType<typeof createLocalFixture>>, app: INestApplication, base: string, directory: string;
let access: CatalogAdminAccess, delivery: DeliveryAdminService, versions: VersionsService;
before(async () => {
  fixture = await createLocalFixture('t15'); directory = await mkdtemp(join(tmpdir(), 'orai-t15-'));
  const configuration = { ...fixture.configuration, assets: { driver: 'local' as const, directory, maxImageBytes: 4194304, maxVideoBytes: 104857600 },
    security: { ...fixture.configuration.security, readIpLimit: 2000, writeIpLimit: 2000, claimIpLimit: 1000, claimCodeLimit: 1000 } };
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG).useValue(configuration).compile();
  app = module.createNestApplication({ logger: false }); configureApp(app); await app.listen(0, '127.0.0.1'); base = await app.getUrl();
  access = await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.admin.id);
  delivery = app.get(DeliveryAdminService); versions = app.get(VersionsService);
});
after(async () => { await app?.close(); await fixture?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });

class Browser {
  cookies = new Map<string, string>(); csrf = '';
  async request(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
    const response = await fetch(base + path, { method, headers: { origin: 'http://127.0.0.1:5173',
      cookie: [...this.cookies].map(([k, v]) => k + '=' + v).join('; '),
      ...(method === 'GET' ? {} : { 'content-type': 'application/json', 'x-csrf-token': this.csrf }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body) });
    for (const cookie of response.headers.getSetCookie()) {
      const [name, ...value] = cookie.split(';')[0]!.split('='); this.cookies.set(name!, value.join('='));
    }
    const json = response.headers.get('content-type')?.includes('application/json');
    return { response, body: json ? await response.json() : Buffer.from(await response.arrayBuffer()) };
  }
  save(id: string, questionId: string, optionId: string, revision: number, requestId = randomUUID()) {
    return this.request(`/api/attempts/${id}/answers/${questionId}`, 'PUT', { optionId, expectedRevision: revision, requestId });
  }
}
async function started(versionId = demoId('demo-partner-v2')) {
  const order = await delivery.recordOrder(access, { platform: 'manual', reference: 'demo:t15:' + randomUUID(), productVersionId: versionId,
    scope: 'demo', quantity: 1, amountFen: 0, requestId: randomUUID() });
  const issued = await delivery.issueOrder(access, order.id, { requestId: randomUUID() }), browser = new Browser();
  browser.csrf = (await browser.request('/api/session/context')).body.csrfToken;
  const claim = await browser.request('/api/redemptions/claim', 'POST', { code: issued.deliveries[0]!.code, requestId: randomUUID() });
  const result = await browser.request('/api/attempts', 'POST', { entitlementId: claim.body.entitlement.id, requestId: randomUUID() });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  return { browser, orderId: order.id, entitlementId: claim.body.entitlement.id as string, value: QuestionsResponseSchema.parse(result.body) };
}
async function finish(session: Awaited<ReturnType<typeof started>>) {
  let revision = session.value.revision;
  for (const q of session.value.questions) {
    const result = await session.browser.save(session.value.attemptId, q.id, 'often', revision++);
    assert.equal(result.response.status, 200);
  }
  const result = await session.browser.request(`/api/attempts/${session.value.attemptId}/submit`, 'POST', { expectedRevision: revision, requestId: randomUUID() });
  assert.equal(result.response.status, 200);
  return ReportResponseSchema.parse(result.body);
}
async function insertRelease(tx: Prisma.TransactionClient, versionId: string, manifest: unknown) {
  const id = randomUUID(), payload = JSON.stringify(manifest);
  await tx.$executeRaw(Prisma.sql`INSERT INTO orai.experience_releases(id,product_id,product_version_id,scope,manifest,digest)
    VALUES(${id}::uuid,${demoId('demo-partner')}::uuid,${versionId}::uuid,'DEMO',${payload}::jsonb,
      encode(sha256(convert_to((${payload}::jsonb)::text,'UTF8')),'hex'))`);
  return id;
}
async function draftManifest() {
  const old = await fixture.runtime.client.experienceRelease.findUniqueOrThrow({ where: { productVersionId: demoId('demo-partner-v2') } });
  const draft = await versions.importConfiguration(access, demoId('demo-partner'), { configuration: DemoProducts[0]!.configurations[1], requestId: randomUUID() });
  const manifest = ExperienceManifestSchema.parse(old.manifest);
  manifest.content.versionId = draft.id;
  return { draft, manifest };
}

test('legacy publications have immutable, private-rule-free DOM releases and fixed report presentation', async () => {
  const session = await started(), experience = ExperienceSessionSchema.parse(session.value.experience);
  assert.equal(supportsExperience(experience.release.manifest), true);
  assert.equal(experience.release.manifest.content.versionId, session.value.versionId);
  assert.deepEqual(experience.checkpoint, { schemaVersion: 1, revision: 0, lastConfirmedQuestionId: null, nextQuestionId: session.value.questions[0]!.id });
  const forbidden = new Set(['points', 'weight', 'bands', 'templates', 'configuration', 'storageKey']);
  function inspect(value: unknown) {
    if (Array.isArray(value)) { value.forEach(inspect); return; }
    if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) { assert.equal(forbidden.has(key), false, key); inspect(child); }
  }
  inspect(session.value);
  const row = await fixture.runtime.client.experienceRelease.findUniqueOrThrow({ where: { id: experience.release.id } });
  assert.throws(() => experienceRelease(row, DemoProducts[0]!.configurations[1]!, randomUUID()));
  await assert.rejects(fixture.owner.client.experienceRelease.update({ where: { id: experience.release.id }, data: { manifest: {} } }));
});

test('only confirmed answers advance the persisted checkpoint; retry and conflict retain the fixed release', async () => {
  const session = await started(), id = session.value.attemptId, requestId = randomUUID();
  const first = await session.browser.save(id, 'question-1', 'often', 0, requestId);
  assert.equal(first.response.status, 200);
  assert.deepEqual(first.body.checkpoint, { schemaVersion: 1, revision: 1, lastConfirmedQuestionId: 'question-1', nextQuestionId: 'question-2' });
  assert.equal((await session.browser.save(id, 'question-1', 'often', 0, requestId)).response.status, 200);
  assert.equal((await session.browser.save(id, 'question-2', 'rarely', 0)).response.status, 409);
  const restored = QuestionsResponseSchema.parse((await session.browser.request(`/api/attempts/${id}/questions`)).body);
  assert.deepEqual(restored.experience?.release, session.value.experience?.release);
  assert.deepEqual(restored.experience?.checkpoint, first.body.checkpoint);
  const row = await fixture.runtime.client.attempt.findUniqueOrThrow({ where: { id } });
  assert.deepEqual(row.runtimeCheckpoint, { schemaVersion: 1, revision: 1, lastConfirmedQuestionId: 'question-1' });
  assert.equal(await fixture.runtime.client.attemptAnswer.count({ where: { attemptId: id } }), 1);
  assert.equal((await session.browser.request(`/api/attempts/${id}/answers/question-2`, 'PUT',
    { optionId: 'often', expectedRevision: 1, requestId: randomUUID(), score: 100, checkpoint: {} })).response.status, 400);
});

test('two compatible presentations produce identical server results and report retries consume one credit', async () => {
  const normal = await started(), simplified = await started();
  const first = await finish(normal), second = await finish(simplified);
  assert.deepEqual(second.content, first.content);
  const presentation = ReportPresentationSchema.parse(first.presentation);
  assert.equal(presentation.releaseId, normal.value.experience?.release.id);
  assert.deepEqual(presentation.theme, normal.value.experience?.release.manifest.theme);
  assert.equal(presentation.renderer.key, 'legacy-text');
  const retry = await normal.browser.request(`/api/attempts/${normal.value.attemptId}/submit`, 'POST', { expectedRevision: 0, requestId: randomUUID() });
  assert.equal(retry.body.id, first.id);
  assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({ where: { id: normal.entitlementId } })).reportsConsumed, 1);
  await assert.rejects(fixture.owner.client.report.update({ where: { id: first.id }, data: { presentation: {} } }));
});

test('3D choices keep the fixed release through restore/conflict, produce the DOM score, consume once and lose access on refund', async () => {
  const normal=await finish(await started()),{draft,manifest}=await draftManifest();
  manifest.renderer={key:'reflection-garden',version:1};manifest.report.renderer={key:'garden-notes',version:1};
  await fixture.owner.client.$transaction(tx=>insertRelease(tx,draft.id,manifest));
  await versions.review(access,draft.productId,draft.id,{requestId:randomUUID()});
  await versions.publish(access,draft.productId,draft.id,{requestId:randomUUID()});
  const session=await started(draft.id),id=session.value.attemptId;
  assert.equal(session.value.experience?.release.manifest.renderer.key,'reflection-garden');
  const saved=await session.browser.save(id,'question-1','often',0);assert.equal(saved.response.status,200);
  assert.equal((await session.browser.save(id,'question-2','often',0)).response.status,409);
  const restored=QuestionsResponseSchema.parse((await session.browser.request(`/api/attempts/${id}/questions`)).body);
  assert.equal(restored.answers.length,1);assert.equal(restored.experience?.checkpoint.nextQuestionId,'question-2');
  assert.deepEqual(restored.experience?.release,session.value.experience?.release);session.value=restored;
  const report=await finish(session);
  assert.equal(report.content.totalScore,normal.content.totalScore);assert.deepEqual(report.content.dimensions,normal.content.dimensions);
  assert.equal(report.content.explanation,normal.content.explanation);assert.equal(report.content.suggestion,normal.content.suggestion);
  assert.equal(report.presentation?.renderer.key,'garden-notes');
  const retry=await session.browser.request(`/api/attempts/${id}/submit`,'POST',{expectedRevision:0,requestId:randomUUID()});
  assert.equal(retry.body.id,report.id);
  assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({where:{id:session.entitlementId}})).reportsConsumed,1);
  await delivery.refundOrder(access,session.orderId,{requestId:randomUUID()});
  assert.notEqual((await session.browser.request(`/api/attempts/${id}/questions`)).response.status,200);
  assert.notEqual((await session.browser.request(`/api/reports/${report.id}`)).response.status,200);
});

test('a completed attempt stays completed after raw answers are removed and retains its report and release', async () => {
  const session = await started(), report = await finish(session), id = session.value.attemptId;
  await fixture.owner.client.attemptAnswer.deleteMany({ where: { attemptId: id } });
  const restored = await session.browser.request(`/api/attempts/${id}/questions`);
  assert.equal(restored.response.status, 200);
  const questions = QuestionsResponseSchema.parse(restored.body);
  assert.equal(questions.status, 'completed');
  assert.deepEqual(questions.answers, []);
  assert.equal(questions.experience?.checkpoint.nextQuestionId, null);
  assert.deepEqual(questions.experience?.release, session.value.experience?.release);
  assert.deepEqual((await session.browser.request(`/api/reports/${report.id}`)).body, report);
  const retry = await session.browser.request(`/api/attempts/${id}/submit`, 'POST', { expectedRevision: 0, requestId: randomUUID() });
  assert.deepEqual(retry.body, report);
  assert.equal((await fixture.runtime.client.entitlement.findUniqueOrThrow({ where: { id: session.entitlementId } })).reportsConsumed, 1);
});

test('unregistered renderer or mapping cannot publish; the old publication and its release remain usable', async () => {
  const { draft, manifest } = await draftManifest();
  manifest.renderer.key = 'unknown-package';
  await fixture.owner.client.$transaction(tx => insertRelease(tx, draft.id, manifest));
  await versions.review(access, draft.productId, draft.id, { requestId: randomUUID() });
  await assert.rejects(versions.publish(access, draft.productId, draft.id, { requestId: randomUUID() }), (error: unknown) => (error as { code: string }).code === 'INVALID_CONFIGURATION');
  assert.equal((await fixture.runtime.client.productVersion.findUniqueOrThrow({ where: { id: draft.id } })).status, 'REVIEWED');
  const session = await started(); assert.equal(session.value.experience?.release.manifest.renderer.key, 'dom-choice');
  await assert.rejects(fixture.owner.client.attempt.update({ where: { id: session.value.attemptId }, data: { experienceReleaseId: randomUUID() } }));
});

test('verified experience resources have independent purpose, same-version binding, owned ranges and cleanup protection', async () => {
  const { draft, manifest } = await draftManifest(), fileId = randomUUID();
  const bytes = await readFile(join(__dirname, '../../test/fixtures/cover.jpg')), checksum = createHash('sha256').update(bytes).digest('hex');
  const storage = app.get(AssetStorage);
  await storage.receive(fileId + '.blob', (async function* () { yield bytes; })(), { byteSize: bytes.length, checksum, mimeType: 'image/jpeg' });
  const media = await storage.inspect(fileId + '.blob', bytes.length);
  await fixture.owner.client.assetFile.create({ data: { id: fileId, productVersionId: draft.id, scope: 'DEMO', ownerUserId: access.actorUserId,
    kind: 'COVER', originalName: 'scene.jpg', mimeType: 'image/jpeg', byteSize: bytes.length, checksum, storageKey: fileId + '.blob',
    status: 'AVAILABLE', expiresAt: new Date(Date.now() - 1000), verifiedAt: new Date(), width: media.width, height: media.height } });
  manifest.resources = [{ resourceId: 'scene-picture', fileId, purpose: 'illustration', label: '场景插画', checksum, byteSize: bytes.length, mimeType: 'image/jpeg' }];
  await fixture.owner.client.$transaction(async tx => {
    const releaseId = await insertRelease(tx, draft.id, manifest);
    await tx.experienceResource.create({ data: { releaseId, productVersionId: draft.id, scope: 'DEMO', resourceId: 'scene-picture', fileId,
      purpose: 'illustration', checksum, byteSize: bytes.length, mimeType: 'image/jpeg' } });
  });
  await versions.review(access, draft.productId, draft.id, { requestId: randomUUID() });
  await versions.publish(access, draft.productId, draft.id, { requestId: randomUUID() });
  const session = await started(draft.id), stranger = await started(), path = `/api/attempts/${session.value.attemptId}/resources/scene-picture`;
  const downloaded = await session.browser.request(path);
  assert.equal(downloaded.response.status, 200); assert.deepEqual(downloaded.body, bytes);
  assert.equal(downloaded.response.headers.get('cache-control'), 'private, no-store');
  const range = await session.browser.request(path, 'GET', undefined, { range: 'bytes=0-9' });
  assert.equal(range.response.status, 206); assert.deepEqual(range.body, bytes.subarray(0, 10));
  assert.equal((await stranger.browser.request(path)).response.status, 404);
  assert.equal((await session.browser.request(path.replace('scene-picture', 'other-file'))).response.status, 404);
  assert.equal((await app.get(FileCleanupService).candidates(access, draft.productId, {})).items.some((r: { id: string }) => r.id === fileId), false);
  const report = await finish(session);
  assert.deepEqual((await session.browser.request(`/api/reports/${report.id}/resources/scene-picture`)).body, bytes);
  await writeFile(join(directory, fileId + '.blob'), Buffer.from('tampered'));
  assert.notEqual((await session.browser.request(path)).response.status, 200);
  await writeFile(join(directory, fileId + '.blob'), bytes);
  await delivery.refundOrder(access, session.orderId, { requestId: randomUUID() });
  assert.ok([401, 410].includes((await session.browser.request(path)).response.status));
  assert.ok([401, 410].includes((await session.browser.request(`/api/reports/${report.id}/resources/scene-picture`)).response.status));
  const expired = new Browser();
  expired.cookies.set('orai_session', fixture.credentials.sessions['entitlement-expired']!);
  for (const [kind, id] of [['attempts', demoId('attempt-entitlement-expired')], ['reports', demoId('report-entitlement-expired')]]) {
    const denied = await expired.request(`/api/${kind}/${id}/resources/scene-picture`);
    assert.equal(denied.response.status, 410);
    assert.equal(denied.body.error.code, 'ENTITLEMENT_EXPIRED');
  }
});

test('resource purpose and manifest contracts reject executable URLs, private scores and unsupported resource/template combinations', () => {
  const legacy = { schemaVersion: 1, content: { versionId: randomUUID(), inputSchema: 'single_choice_v1', engine: 'dimensions_v1' },
    creativeProfileRevisionId: null, intent: null, renderer: { key: 'dom-choice', version: 1 }, fallback: { key: 'dom-choice', version: 1 },
    report: { contentSchema: 'report_content_v1', renderer: { key: 'legacy-text', version: 1 } }, theme: { key: 'legacy', revision: 1 },
    confirmation: 'explicit', recovery: 'server_confirmed_answers', scenes: [{ sceneId: 'a', questionId: 'a', checkpointId: 'a',
      choices: [{ objectId: 'x', optionId: 'x' }, { objectId: 'y', optionId: 'y' }] }], resources: [] };
  assert.equal(ExperienceManifestSchema.safeParse({ ...legacy, scriptUrl: 'https://arbitrary.invalid/module.js' }).success, false);
  assert.equal(ExperienceManifestSchema.safeParse({ ...legacy, points: [1, 2] }).success, false);
  assert.equal(ExperienceManifestSchema.safeParse({ ...legacy, confirmation: 'automatic' }).success, false);
  const unsupported = ExperienceManifestSchema.parse(legacy); unsupported.report.renderer.key = 'unregistered';
  assert.equal(supportsExperience(unsupported), false);
});
