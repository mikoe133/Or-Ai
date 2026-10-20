import 'reflect-metadata';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { CreativeProfileSchema, ContentAssetSaveSchema, LocalArchiveSchema } from '@orai/contracts/admin';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/config/configuration';
import { configureApp } from '../src/common/configure-app';
import { SupabaseAuthGateway, type SupabaseIdentity } from '../src/accounts/supabase-auth.gateway';
import { ApiException } from '../src/common/http-errors';
import { demoId, DemoIdentityScenarios } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';

let fixture: Awaited<ReturnType<typeof createLocalFixture>>, app: INestApplication, base: string, admin: Browser;
let directory: string;
const proofs = new Map<string, SupabaseIdentity>();
const refreshes = new Map<string, { accessToken: string; refreshToken: string }>();
const productId = demoId('demo-partner'), versionId = demoId('demo-partner-v2');
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const profileData = () => ({ schemaVersion: 1, title: '伴侣协作创作设定', audience: '想了解相处需要的成年人',
  situation: '一次轻松的自我观察', emotionalGoal: '感到被理解', understandingGoal: '理解自己的沟通需要',
  takeaway: '带走一个可以尝试的表达方式', perspective: 'single_person_relationship', experienceForm: 'web',
  pace: '逐题作答', world: '一座温柔的花园', language: '尊重与好奇', visual: '柔和紫绿', sound: '安静',
  reportPlan: { schemaVersion: 1, title: '花园观察札记', narrative: '基于作答给出解释与建议', presentation: 'journal',
    sections: [{ sectionId: 'summary', title: '我的观察', purpose: '说明倾向和下一步表达' }] },
  channels: ['manual'], deliverables: ['assessment', 'copy', 'cover', 'video'] });

class Browser {
  cookies = new Map<string, string>(); csrf = '';
  async request(path: string, method = 'GET', body?: unknown, extra: Record<string, string> = {}) {
    const response = await fetch(base + '/api' + path, { method, headers: {
      cookie: [...this.cookies].map(([key, value]) => key + '=' + value).join(';'), origin: fixture.configuration.security.origins[0]!,
      ...(method === 'GET' ? {} : { 'content-type': 'application/json', 'x-csrf-token': this.csrf }), ...extra,
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const cookie of response.headers.getSetCookie()) { const item = cookie.split(';')[0]!, at = item.indexOf('='); this.cookies.set(item.slice(0, at), item.slice(at + 1)); }
    return { status: response.status, body: await response.json(), headers: response.headers };
  }
  async login(adminUser = true) {
    this.csrf = (await this.request('/account/context')).body.csrfToken;
    const accessToken = randomBytes(50).toString('base64url'), refreshToken = randomBytes(40).toString('base64url');
    proofs.set(accessToken, { supabaseUserId: adminUser ? DemoIdentityScenarios.admin.supabaseUserId : randomUUID(),
      supabaseSessionId: randomUUID(), emailVerified: true, expiresAt: new Date(Date.now() + 3_600_000) });
    refreshes.set(refreshToken, { accessToken, refreshToken });
    assert.equal((await this.request('/account/session', 'POST', { accessToken, refreshToken })).status, 200);
    return this;
  }
}
before(async () => {
  fixture = await createLocalFixture('t12');
  directory = await mkdtemp(join(tmpdir(), 'orai-t12-'));
  const configuration = { ...fixture.configuration,
    assets: { ...fixture.configuration.assets, driver: 'local' as const, directory },
    security: { ...fixture.configuration.security, readIpLimit: 3000, writeIpLimit: 3000 },
    auth: { url: 'https://isolated.example.test', publishableKey: 'sb_publishable_' + 'p'.repeat(40),
      sessionEncryptionKey: randomBytes(32).toString('base64url'), sessionDays: 30, requestTimeoutMs: 1000 } };
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG).useValue(configuration)
    .overrideProvider(SupabaseAuthGateway).useValue({ verify: async (token: string) => {
      const proof = proofs.get(token); if (!proof) throw new ApiException('AUTH_REQUIRED', 'Invalid', 401); return proof;
    }, refresh: async (token: string) => {
      const value = refreshes.get(token); if (!value) throw new ApiException('AUTH_REQUIRED', 'Invalid', 401);
      return { ...value, identity: proofs.get(value.accessToken)! };
    }, logout: async () => undefined }).compile();
  app = module.createNestApplication({ logger: false }); configureApp(app); await app.listen(0, '127.0.0.1'); base = await app.getUrl();
  admin = await new Browser().login();
});
after(async () => { await app?.close(); await fixture?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });

async function profile(target = productId) {
  const current = await admin.request('/admin/products/' + target + '/creative-profiles');
  assert.equal(current.status, 200);
  const response = await admin.request('/admin/products/' + target + '/creative-profiles', 'POST', {
    profile: profileData(), expectedRevision: current.body.items[0]?.revision ?? 0, requestId: randomUUID(),
  });
  assert.equal(response.status, 200, JSON.stringify(response.body)); return response.body;
}
async function assessment() {
  const response = await admin.request('/admin/content-revisions?productId=' + productId + '&domain=assessment');
  assert.equal(response.status, 200); return response.body.items.find((row: { productVersionId: string }) => row.productVersionId === versionId);
}
function authoring(profileId: string, content: unknown = { kind: 'copy', blocks: [{ blockId: 'hook', role: 'hook', text: '发现自己的相处节奏' }] }) {
  return { schemaVersion: 1, creativeProfileRevisionId: profileId, content,
    media: { localArchive: null, previewFileId: null }, inputs: [],
    production: { source: 'external_ai', batchKey: 'daily-example', externalLabel: 'isolated authoring test', skillVersionId: null } };
}
async function copy(profileId: string) {
  const response = await admin.request('/admin/content-assets', 'POST', { productVersionId: versionId, platform: 'manual',
    variant: randomUUID(), expectedRevision: 0, requestId: randomUUID(), fileId: null, authoring: authoring(profileId) });
  assert.equal(response.status, 200, JSON.stringify(response.body)); return response.body;
}

test('content contracts reject absolute paths, wrong media domains, duplicate stable IDs and runtime fields', () => {
  assert.equal(CreativeProfileSchema.safeParse(profileData()).success, true);
  assert.equal(CreativeProfileSchema.safeParse({ ...profileData(), reportPlan: { ...profileData().reportPlan, html: '<script />' } }).success, false);
  const archive = { archiveId: 'local-master', fileName: 'master.mp4', mimeType: 'video/mp4', byteSize: 9_000_000_000, checksum: sha('large local file') };
  assert.equal(LocalArchiveSchema.safeParse(archive).success, true);
  assert.equal(LocalArchiveSchema.safeParse({ ...archive, fileName: '/Users/private/master.mp4' }).success, false);
  assert.equal(LocalArchiveSchema.safeParse({ ...archive, localPath: '/Users/private' }).success, false);
  const input = { productVersionId: versionId, platform: 'manual', variant: 'a', expectedRevision: 0, requestId: randomUUID(),
    authoring: authoring(randomUUID(), { kind: 'copy', blocks: [
      { blockId: 'same', role: 'hook', text: 'a' }, { blockId: 'same', role: 'cta', text: 'b' },
    ] }) };
  assert.equal(ContentAssetSaveSchema.safeParse(input).success, false);
});

test('new content routes preserve current administrator, CSRF, Origin and no-store checks', async () => {
  const visitor = new Browser(), ordinary = await new Browser().login(false);
  assert.equal((await visitor.request('/admin/content-revisions')).status, 401);
  assert.equal((await ordinary.request('/admin/content-revisions')).status, 403);
  const input = { profile: profileData(), expectedRevision: 0, requestId: randomUUID() };
  const path = '/admin/products/' + productId + '/creative-profiles';
  assert.equal((await admin.request(path, 'POST', input, { 'x-csrf-token': '' })).status, 403);
  assert.equal((await admin.request(path, 'POST', input, { origin: 'https://untrusted.example.test' })).status, 403);
  const read = await admin.request('/admin/content-revisions'); assert.equal(read.status, 200);
  assert.equal(read.headers.get('cache-control'), 'private, no-store');
});

test('creative profiles append immutable revisions with idempotency and concurrent expected-revision checks', async () => {
  const first = await profile(), path = '/admin/products/' + productId + '/creative-profiles';
  const input = { profile: { ...profileData(), language: '新的温柔措辞' }, expectedRevision: first.revision, requestId: randomUUID() };
  const saved = await admin.request(path, 'POST', input); assert.equal(saved.status, 200);
  assert.equal((await admin.request(path, 'POST', input)).body.id, saved.body.id);
  assert.equal((await admin.request(path, 'POST', { ...input, profile: profileData() })).status, 409);
  const concurrent = await Promise.all(['甲', '乙'].map(language => admin.request(path, 'POST', {
    profile: { ...profileData(), language }, expectedRevision: saved.body.revision, requestId: randomUUID(),
  })));
  assert.deepEqual(concurrent.map(value => value.status).sort(), [200, 409]);
  const old = await admin.request('/admin/creative-profiles/' + first.id);
  assert.equal(old.body.profile.language, '尊重与好奇'); assert.equal(old.body.runtimeSupport, 'authoring_only');
});

test('legacy versions and assets have fixed snapshots, including changes through legacy routes', async () => {
  const initial = await assessment(); assert.ok(initial?.id);
  const created = await admin.request('/admin/assets', 'POST', { productVersionId: versionId, kind: 'copy', platform: 'manual',
    variant: randomUUID(), text: '旧版文案', requestId: randomUUID() }); assert.equal(created.status, 200);
  const history = await admin.request('/admin/content-revisions?assetId=' + created.body.id);
  assert.equal(history.body.items.length, 1); const old = history.body.items[0];
  assert.equal((await admin.request('/admin/assets/' + created.body.id, 'PATCH', { text: '新版文案', expectedRevision: 0, requestId: randomUUID() })).status, 200);
  assert.equal((await admin.request('/admin/content-revisions/' + old.id)).body.snapshot.text, '旧版文案');
  assert.equal((await admin.request('/admin/content-revisions?assetId=' + created.body.id)).body.items.length, 2);
});

test('structured drafts save stable blocks, explicit empty skill provenance and fixed production inputs', async () => {
  const brief = await profile(), saved = await copy(brief.id);
  assert.equal(saved.domain, 'copy'); assert.equal(saved.creativeProfileRevisionId, brief.id);
  const read = await admin.request('/admin/content-revisions/' + saved.id);
  assert.equal(read.body.snapshot.authoring.content.blocks[0].blockId, 'hook');
  assert.equal(read.body.production.source, 'external_ai'); assert.equal(read.body.production.skillVersionId, null);
  const list = await admin.request('/admin/production-records?productId=' + productId + '&batchKey=daily-example');
  assert.equal(list.status, 200); assert.equal(list.body.items.some((row: { outputRevisionId: string }) => row.outputRevisionId === saved.id), true);
});

test('local-only large masters remain distinct from uploaded previews and published deliveries', async () => {
  const brief = await profile();
  const details = authoring(brief.id, { kind: 'video', scenes: [{ sceneId: 'opening', startMs: 0, endMs: 5000, text: '看看自己的相处需要' }] });
  const response = await admin.request('/admin/content-assets', 'POST', { productVersionId: versionId, platform: 'manual',
    variant: randomUUID(), expectedRevision: 0, requestId: randomUUID(), authoring: { ...details, media: {
      previewFileId: null, localArchive: { archiveId: 'nas-original', fileName: 'master.mp4', mimeType: 'video/mp4',
        checksum: sha('local master'), byteSize: 9_000_000_000 },
    } } });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.deepEqual(response.body.storage, { localArchiveRegistered: true, previewUploaded: false, deliveryUploaded: false });
  assert.equal((await admin.request('/admin/assets/' + response.body.assetId + '/review', 'POST', { expectedRevision: 0, requestId: randomUUID() })).status, 409);
  assert.equal(await fixture.runtime.client.assetFile.count({ where: { originalName: 'master.mp4' } }), 0);
});

test('video input references resolve public question text and preserve source snapshots', async () => {
  const brief = await profile(), source = await assessment();
  const question = source.snapshot.configuration.questions[0];
  const details = authoring(brief.id, { kind: 'video', scenes: [{ sceneId: 'opening', startMs: 0, endMs: 5000, text: '缩写后的题目' }] });
  const input = { sourceRevisionId: source.id, sourceDigest: source.digest, locator: { kind: 'question', questionId: question.id },
    targetLocator: { kind: 'scene', sceneId: 'opening' }, role: 'question', mode: 'adapted', usedText: '缩写后的题目' };
  const saved = await admin.request('/admin/content-assets', 'POST', { productVersionId: versionId, platform: 'manual', variant: randomUUID(),
    expectedRevision: 0, requestId: randomUUID(), authoring: { ...details, inputs: [input] } });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  const references = await admin.request('/admin/content-references?sourceRevisionId=' + source.id);
  const reference = references.body.items.find((row: { targetRevisionId: string }) => row.targetRevisionId === saved.body.id);
  assert.equal(reference.sourceSnapshot.text, question.text); assert.equal(reference.usedText, '缩写后的题目');
  assert.equal(JSON.stringify(reference.sourceSnapshot).includes('points'), false);
  const context = await admin.request('/admin/content-contexts/resolve', 'POST', { creativeProfileRevisionId: brief.id, domain: 'video',
    inputs: [{ revisionId: source.id, digest: source.digest, locator: input.locator }] });
  assert.equal(context.status, 200); assert.equal(context.body.inputs[0].content.text, question.text);
  assert.equal(JSON.stringify(context.body.inputs).includes('templates'), false);
  assert.equal(JSON.stringify(context.body.inputs).includes('points'), false);
});

test('content saves deduplicate retries, reject changed request bodies and serialize concurrent revisions', async () => {
  const brief = await profile();
  const input = { productVersionId: versionId, platform: 'manual', variant: randomUUID(), expectedRevision: 0,
    requestId: randomUUID(), authoring: authoring(brief.id) };
  const first = await admin.request('/admin/content-assets', 'POST', input); assert.equal(first.status, 200);
  assert.equal((await admin.request('/admin/content-assets', 'POST', input)).body.id, first.body.id);
  assert.equal((await admin.request('/admin/content-assets', 'POST', { ...input, variant: randomUUID() })).status, 409);
  const updates = await Promise.all(['a', 'b'].map(text => admin.request('/admin/content-assets', 'POST', {
    ...input, assetId: first.body.assetId, requestId: randomUUID(),
    authoring: authoring(brief.id, { kind: 'copy', blocks: [{ blockId: 'hook', role: 'hook', text }] }),
  })));
  assert.deepEqual(updates.map(value => value.status).sort(), [200, 409]);
  assert.equal(await fixture.runtime.client.contentRevision.count({ where: { assetId: first.body.assetId } }), 2);
  assert.equal((await admin.request('/admin/content-revisions/' + first.body.id)).body.snapshot.authoring.content.blocks[0].text, '发现自己的相处节奏');
});

test('invalid inputs roll back draft, references, production and audit together', async () => {
  const brief = await profile(), source = await assessment();
  const common = { sourceRevisionId: source.id, sourceDigest: source.digest,
    locator: { kind: 'question', questionId: source.snapshot.configuration.questions[0].id },
    targetLocator: { kind: 'block', blockId: 'hook' }, role: 'question', mode: 'adapted', usedText: '发现自己的相处节奏' };
  for (const input of [ { ...common, sourceDigest: '0'.repeat(64) }, { ...common, locator: { kind: 'question', questionId: 'missing' } },
    { ...common, targetLocator: { kind: 'block', blockId: 'missing' } }, { ...common, mode: 'exact' }, { ...common, usedText: '未实际使用的内容' } ]) {
    const variant = randomUUID(), requestId = randomUUID();
    const response = await admin.request('/admin/content-assets', 'POST', { productVersionId: versionId, platform: 'manual', variant,
      expectedRevision: 0, requestId, authoring: { ...authoring(brief.id), inputs: [input] } });
    assert.equal(response.status, 409, JSON.stringify(response.body));
    assert.equal(await fixture.runtime.client.campaignAsset.count({ where: { variant } }), 0);
    assert.equal(await fixture.runtime.client.adminAuditLog.count({ where: { requestId } }), 0);
  }
});

test('cross-product, cross-profile and unknown media references are rejected', async () => {
  const brief = await profile(), otherBrief = await profile(), source = await copy(brief.id);
  const input = { sourceRevisionId: source.id, sourceDigest: source.digest, locator: { kind: 'block', blockId: 'hook' },
    targetLocator: { kind: 'block', blockId: 'hook' }, role: 'hook', mode: 'exact', usedText: '发现自己的相处节奏' };
  const body = { productVersionId: versionId, platform: 'manual', variant: randomUUID(), expectedRevision: 0, requestId: randomUUID(),
    authoring: { ...authoring(otherBrief.id), inputs: [input] } };
  assert.equal((await admin.request('/admin/content-assets', 'POST', body)).status, 409);
  const otherProduct = await profile(demoId('demo-work'));
  assert.equal((await admin.request('/admin/content-assets', 'POST', { ...body, requestId: randomUUID(), authoring: authoring(otherProduct.id) })).status, 404);
  assert.equal((await admin.request('/admin/content-assets', 'POST', { ...body, requestId: randomUUID(),
    authoring: { ...authoring(brief.id, { kind: 'cover', title: '封面', description: '花园' }),
      media: { localArchive: null, previewFileId: randomUUID() } } })).status, 409);
});

test('context projection requires explicit question positions for promotional domains', async () => {
  const brief = await profile(), source = await assessment();
  const request = { creativeProfileRevisionId: brief.id, domain: 'video', inputs: [{ revisionId: source.id, digest: source.digest, locator: { kind: 'whole' } }] };
  assert.equal((await admin.request('/admin/content-contexts/resolve', 'POST', request)).status, 400);
  const assessmentContext = await admin.request('/admin/content-contexts/resolve', 'POST', { ...request, domain: 'assessment' });
  assert.equal(assessmentContext.status, 200); assert.ok(assessmentContext.body.inputs[0].content.configuration.report.templates);
  assert.equal((await admin.request('/admin/content-contexts/resolve', 'POST', { ...request, scope: 'live' })).status, 400);
  const publicView = await new Browser().request('/products/demo-partner');
  assert.equal(publicView.status, 200);
  for (const field of ['creativeProfile', 'authoring', 'inputManifest', 'templates', 'skillVersionId'])
    assert.equal(JSON.stringify(publicView.body).includes('"' + field + '"'), false);
});

test('preview upload, verified delivery and local registration have separate states and retain historical file references', async () => {
  const brief = await profile(), bytes = await readFile('test/fixtures/preview.webm');
  const prepared = await admin.request('/admin/uploads', 'POST', { productVersionId: versionId, kind: 'video', fileName: 'preview.webm',
    mimeType: 'video/webm', byteSize: bytes.length, checksum: createHash('sha256').update(bytes).digest('hex'), requestId: randomUUID() });
  assert.equal(prepared.status, 200);
  const upload = await fetch(base + prepared.body.uploadPath, { method: 'PUT', headers: {
    cookie: [...admin.cookies].map(([key, value]) => key + '=' + value).join(';'), origin: fixture.configuration.security.origins[0]!,
    'content-type': 'application/octet-stream', 'x-csrf-token': admin.csrf,
  }, body: bytes }); assert.equal(upload.status, 200);
  assert.equal((await admin.request('/admin/uploads/' + prepared.body.id + '/complete', 'POST', { requestId: randomUUID() })).status, 200);
  const input = { productVersionId: versionId, platform: 'manual', variant: randomUUID(), expectedRevision: 0, requestId: randomUUID(),
    authoring: { ...authoring(brief.id, { kind: 'video', scenes: [{ sceneId: 'opening', startMs: 0, endMs: 1000, text: '视频预览' }] }),
      media: { previewFileId: prepared.body.id, localArchive: null } } };
  const preview = await admin.request('/admin/content-assets', 'POST', input); assert.equal(preview.status, 200);
  assert.deepEqual(preview.body.storage, { localArchiveRegistered: false, previewUploaded: true, deliveryUploaded: false });
  const delivery = await admin.request('/admin/content-assets', 'POST', { ...input, assetId: preview.body.assetId,
    fileId: prepared.body.id, requestId: randomUUID() }); assert.equal(delivery.status, 200);
  assert.equal(delivery.body.storage.deliveryUploaded, true);
  assert.equal((await admin.request('/admin/content-revisions/' + preview.body.id)).body.storage.deliveryUploaded, false);
  const cleared = await admin.request('/admin/content-assets', 'POST', { ...input, assetId: preview.body.assetId, expectedRevision: 1,
    fileId: null, requestId: randomUUID(), authoring: { ...input.authoring, media: { localArchive: null, previewFileId: null } } });
  assert.equal(cleared.status, 200); assert.equal(cleared.body.storage.previewUploaded, false);
  await assert.rejects(fixture.owner.pool.query('DELETE FROM orai.asset_files WHERE id=$1', [prepared.body.id]), (error: { code?: string }) => error.code === '23503');
});

test('legacy review and readiness preserve structured provenance without bypassing content edits', async () => {
  const brief = await profile(), saved = await copy(brief.id);
  await assert.rejects(fixture.owner.pool.query('UPDATE orai.campaign_assets SET text=$1,revision=revision+1 WHERE id=$2', ['绕过结构化修改', saved.assetId]),
    (error: { code?: string }) => error.code === '23514');
  assert.equal((await admin.request('/admin/assets/' + saved.assetId, 'PATCH', { text: '不应绕过结构化编辑', expectedRevision: 0, requestId: randomUUID() })).status, 409);
  const reviewed = await admin.request('/admin/assets/' + saved.assetId + '/review', 'POST', { expectedRevision: 0, requestId: randomUUID() });
  assert.equal(reviewed.status, 200);
  const history = await admin.request('/admin/content-revisions?assetId=' + saved.assetId);
  const latest = await admin.request('/admin/content-revisions/' + history.body.items[0].id);
  assert.equal(latest.body.production.source, 'external_ai');
  assert.equal(latest.body.production.creativeProfileRevisionId, brief.id);
});

test('assessment production records attach a fixed profile without altering configuration or private reports', async () => {
  const brief = await profile(), source = await assessment();
  const before = await fixture.runtime.client.report.findMany({ orderBy: { id: 'asc' }, select: { id: true, snapshot: true } });
  const input = { outputRevisionId: source.id, creativeProfileRevisionId: brief.id, requestId: randomUUID(), production: authoring(brief.id).production };
  const recorded = await admin.request('/admin/production-records', 'POST', input); assert.equal(recorded.status, 200);
  assert.equal((await admin.request('/admin/production-records', 'POST', input)).body.id, recorded.body.id);
  assert.equal(recorded.body.creativeProfileRevisionId, brief.id);
  assert.deepEqual(await fixture.runtime.client.report.findMany({ orderBy: { id: 'asc' }, select: { id: true, snapshot: true } }), before);
});

test('database history is append-only, scoped and rejects cyclic references', async () => {
  const brief = await profile(), a = await copy(brief.id), b = await copy(brief.id);
  for (const [table, key] of [['creative_profile_revisions', brief.id], ['content_revisions', a.id],
    ['production_records', (await admin.request('/admin/content-revisions/' + a.id)).body.production.id]]) {
    assert.ok(['creative_profile_revisions', 'content_revisions', 'production_records'].includes(table!));
    await assert.rejects(fixture.owner.pool.query('DELETE FROM orai.' + table + ' WHERE id=$1', [key]), (error: { code?: string }) => error.code === '23514');
  }
  const query = `INSERT INTO orai.content_references(id,product_id,scope,target_revision_id,source_revision_id,locator,locator_key,target_locator,target_locator_key,role,mode,source_digest,source_snapshot,used_text)
    VALUES($1,$2,'DEMO',$3,$4,'{"kind":"whole"}','whole','{"kind":"whole"}','whole','reference','adapted',$5,'{}','循环测试')`;
  await fixture.owner.pool.query(query, [randomUUID(), productId, a.id, b.id, b.digest]);
  await assert.rejects(fixture.owner.pool.query(query, [randomUUID(), productId, b.id, a.id, a.digest]), (error: { code?: string }) => error.code === '23514');
  await assert.rejects(fixture.runtime.pool.query('DELETE FROM orai.content_revisions WHERE id=$1', [a.id]), (error: { code?: string }) => error.code === '42501');
});

test('legacy draft replacement preserves the exact earlier configuration and stable question IDs', async () => {
  const configuration = (await assessment()).snapshot.configuration;
  const imported = await admin.request('/admin/products/' + productId + '/versions', 'POST', { configuration, requestId: randomUUID() });
  assert.equal(imported.status, 200);
  const history = await admin.request('/admin/content-revisions?productVersionId=' + imported.body.id);
  assert.equal(history.body.total, 1); const original = history.body.items[0];
  const updated = structuredClone(configuration); updated.questions[0].text += '（新稿）'; updated.questions.reverse();
  assert.equal((await admin.request('/admin/products/' + productId + '/versions/' + imported.body.id, 'PUT', {
    configuration: updated, expectedRevision: 0, requestId: randomUUID(),
  })).status, 200);
  assert.deepEqual((await admin.request('/admin/content-revisions/' + original.id)).body.snapshot.configuration, configuration);
  const next = await admin.request('/admin/content-revisions?productVersionId=' + imported.body.id);
  assert.equal(next.body.total, 2);
  assert.deepEqual(next.body.items[0].snapshot.configuration.questions.map((question: { id: string }) => question.id).sort(),
    configuration.questions.map((question: { id: string }) => question.id).sort());
});

test('status-only revisions copy references and provenance as fixed historical inputs', async () => {
  const brief = await profile(), source = await assessment(), text = '分镜中的题目节选';
  const details = authoring(brief.id, { kind: 'script', scenes: [{ sceneId: 'opening', startMs: 0, endMs: 1000, text }] });
  const saved = await admin.request('/admin/content-assets', 'POST', { productVersionId: versionId, platform: 'manual', variant: randomUUID(),
    expectedRevision: 0, requestId: randomUUID(), authoring: { ...details, inputs: [{ sourceRevisionId: source.id, sourceDigest: source.digest,
      locator: { kind: 'question', questionId: source.snapshot.configuration.questions[0].id }, targetLocator: { kind: 'scene', sceneId: 'opening' },
      role: 'question', mode: 'adapted', usedText: text }] } });
  assert.equal(saved.status, 200);
  assert.equal((await admin.request('/admin/assets/' + saved.body.assetId + '/review', 'POST', { expectedRevision: 0, requestId: randomUUID() })).status, 200);
  const history = await admin.request('/admin/content-revisions?assetId=' + saved.body.assetId);
  const reviewed = await admin.request('/admin/content-revisions/' + history.body.items[0].id);
  assert.equal(reviewed.body.inputs.length, 1); assert.equal(reviewed.body.inputs[0].sourceRevisionId, source.id);
  assert.equal(reviewed.body.production.inputManifest[0].revisionId, source.id);
  assert.equal((await admin.request('/admin/content-revisions/' + saved.body.id)).body.snapshot.status, 'draft');
});

test('fresh access checks reject disabled administrators without accepting caller-selected scopes', async () => {
  await fixture.owner.pool.query('UPDATE orai.users SET disabled_at=now() WHERE id=$1', [DemoIdentityScenarios.admin.id]);
  try { assert.notEqual((await admin.request('/admin/content-revisions')).status, 200); }
  finally { await fixture.owner.pool.query('UPDATE orai.users SET disabled_at=NULL WHERE id=$1', [DemoIdentityScenarios.admin.id]); admin = await new Browser().login(); }
  assert.equal((await admin.request('/admin/content-revisions?scope=live')).status, 400);
  assert.equal((await admin.request('/admin/content-revisions')).status, 200);
});

test('DEMO administrators cannot read LIVE profiles or revisions and database references enforce scope', async () => {
  const original = await fixture.owner.client.product.findUniqueOrThrow({ where: { id: productId } });
  const live = await fixture.owner.client.product.create({ data: { ...original, id: randomUUID(), slug: 'live-' + randomUUID(),
    scope: 'LIVE', status: 'DRAFT', currentVersionId: null, publicSample: JSON.parse(JSON.stringify(original.publicSample)) } });
  const version = await fixture.owner.client.productVersion.create({ data: { productId: live.id, scope: 'LIVE', number: 1,
    configuration: JSON.parse(JSON.stringify((await fixture.owner.client.productVersion.findUniqueOrThrow({ where: { id: versionId } })).configuration)) } });
  const revision = await fixture.owner.client.contentRevision.findFirstOrThrow({ where: { productVersionId: version.id } });
  const liveProfile = await fixture.owner.client.creativeProfileRevision.create({ data: { productId: live.id, scope: 'LIVE', number: 1,
    profile: profileData(), digest: sha('live profile') } });
  assert.equal((await admin.request('/admin/creative-profiles/' + liveProfile.id)).status, 404);
  assert.equal((await admin.request('/admin/content-revisions/' + revision.id)).status, 404);
  const brief = await profile(), target = await copy(brief.id);
  await assert.rejects(fixture.runtime.client.contentReference.create({ data: { productId, scope: 'DEMO',
    targetRevisionId: target.id, sourceRevisionId: revision.id, locator: { kind: 'whole' }, locatorKey: 'whole',
    targetLocator: { kind: 'whole' }, targetLocatorKey: 'whole', role: 'reference', mode: 'adapted',
    sourceDigest: revision.digest, sourceSnapshot: {}, usedText: '跨范围测试' } }));
});

test('legacy storage-key placeholders remain unavailable and do not become uploaded files during history capture', async () => {
  const asset = await fixture.owner.client.campaignAsset.create({ data: { productVersionId: versionId, scope: 'DEMO',
    platform: 'MANUAL', kind: 'VIDEO', variant: randomUUID(), mimeType: 'video/webm',
    byteSize: 32, checksum: sha('missing'), storageKey: 'legacy-missing-' + randomUUID() } });
  const history = await admin.request('/admin/content-revisions?assetId=' + asset.id);
  assert.equal(history.status, 200); assert.equal(history.body.items[0].storage.deliveryUploaded, false);
  assert.equal(history.body.items[0].snapshot.fileId, null);
  assert.equal(JSON.stringify(history.body).includes(asset.storageKey!), false);
});

test('workbench head queries filter the current draft after choosing latest, never resurrecting older matching status or profile', async () => {
  const brief = await profile(), saved = await copy(brief.id);
  await admin.request('/admin/assets/' + saved.assetId + '/review', 'POST', { expectedRevision: 0, requestId: randomUUID() });
  const query = '/admin/content-revisions?productId=' + productId + '&assetId=' + saved.assetId + '&current=true';
  const heads = await admin.request(query);
  assert.equal(heads.status, 200); assert.equal(heads.body.total, 1); assert.equal(heads.body.items[0].sourceRevision, 1);
  assert.equal((await admin.request(query + '&status=draft')).body.total, 0);
  assert.equal((await admin.request(query + '&status=reviewed&platform=manual&creativeProfileRevisionId=' + brief.id + '&style=' + encodeURIComponent('紫绿'))).body.total, 1);
  assert.equal((await admin.request(query + '&platform=douyin')).body.total, 0);
  assert.equal((await admin.request(query + '&style=' + encodeURIComponent('不存在的风格'))).body.total, 0);
  assert.equal((await admin.request('/admin/content-revisions?current=true')).status, 400);
  const another = await profile();
  const updated = await admin.request('/admin/content-assets', 'POST', { assetId: saved.assetId, productVersionId: versionId,
    platform: 'manual', variant: randomUUID(), expectedRevision: 1, requestId: randomUUID(), authoring: authoring(another.id) });
  assert.equal(updated.status, 200);
  assert.equal((await admin.request(query + '&creativeProfileRevisionId=' + brief.id)).body.total, 0);
  assert.equal((await admin.request(query + '&creativeProfileRevisionId=' + another.id)).body.total, 1);
  const old = await admin.request('/admin/content-revisions/' + saved.id);
  assert.equal(old.body.creativeProfileRevisionId, brief.id); assert.equal(old.body.snapshot.status, 'draft');
});

test('workbench details match strict private DTOs with normalized scopes and preserve fixed production inputs', async () => {
  const { ContentRevisionDetailSchema, ProductionRecordSchema } = await import('@orai/contracts/admin');
  const brief = await profile(), saved = await copy(brief.id);
  const detail = await admin.request('/admin/content-revisions/' + saved.id);
  assert.equal(ContentRevisionDetailSchema.safeParse(detail.body).success, true);
  assert.equal(detail.body.production.scope, 'demo'); assert.equal(detail.body.previewFile, null); assert.equal(detail.body.deliveryFile, null);
  const records = await admin.request('/admin/production-records?productId=' + productId);
  assert.ok(records.body.items.every((value: unknown) => ProductionRecordSchema.safeParse(value).success));
  const ordinary = await new Browser().login(false);
  assert.equal((await ordinary.request('/admin/content-revisions/' + saved.id)).status, 403);
});

test('verified geometry is persisted for real images and videos and cannot be rewritten after verification', async () => {
  for (const [fileName, mimeType, kind] of [['cover.jpg', 'image/jpeg', 'cover'], ['cover.webp', 'image/webp', 'cover'], ['preview.webm', 'video/webm', 'video'], ['preview.mp4', 'video/mp4', 'video']]) {
    const bytes = await readFile('test/fixtures/' + fileName);
    const prepared = await admin.request('/admin/uploads', 'POST', { productVersionId: versionId, kind, fileName, mimeType,
      byteSize: bytes.length, checksum: createHash('sha256').update(bytes).digest('hex'), requestId: randomUUID() });
    const response = await fetch(base + prepared.body.uploadPath, { method: 'PUT', headers: {
      cookie: [...admin.cookies].map(([key, value]) => key + '=' + value).join(';'), origin: fixture.configuration.security.origins[0]!,
      'content-type': 'application/octet-stream', 'x-csrf-token': admin.csrf,
    }, body: bytes }); assert.equal(response.status, 200); await response.arrayBuffer();
    const completed = await admin.request('/admin/uploads/' + prepared.body.id + '/complete', 'POST', { requestId: randomUUID() });
    assert.equal(completed.status, 200); assert.equal(completed.body.width, 16); assert.equal(completed.body.height, 16);
    assert.equal(completed.body.mimeType, mimeType);
    if (kind === 'video') assert.ok(completed.body.durationMs > 0); else assert.equal(completed.body.durationMs, null);
    assert.deepEqual((await admin.request('/admin/uploads/' + prepared.body.id)).body, completed.body);
    await assert.rejects(fixture.owner.pool.query('UPDATE orai.asset_files SET width=17 WHERE id=$1', [prepared.body.id]),
      (error: { message?: string }) => !!error.message?.includes('immutable'));
  }
});
