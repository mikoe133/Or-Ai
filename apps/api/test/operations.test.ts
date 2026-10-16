import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { APP_CONFIG, loadConfiguration } from '../src/config/configuration';
import { configureApp } from '../src/common/configure-app';
import { ApiException } from '../src/common/http-errors';
import { SupabaseAuthGateway, type SupabaseIdentity } from '../src/accounts/supabase-auth.gateway';
import { DemoIdentityScenarios, demoId } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';

let fixture: Awaited<ReturnType<typeof createLocalFixture>>, app: INestApplication, base: string, directory: string;
let configuration: ReturnType<typeof loadConfiguration>;
let admin: Browser;
const proofs = new Map<string, SupabaseIdentity>();
const refreshes = new Map<string, { accessToken: string; refreshToken: string }>();
const versionId = demoId('demo-partner-v2');
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

function credentials(owner: string = randomUUID(), verified = true) {
  const accessToken = randomBytes(60).toString('base64url'), refreshToken = randomBytes(40).toString('base64url');
  proofs.set(accessToken, { supabaseUserId: owner, supabaseSessionId: randomUUID(),
    expiresAt: new Date(Date.now() + 3_600_000), emailVerified: verified });
  refreshes.set(refreshToken, { accessToken, refreshToken });
  return { accessToken, refreshToken };
}

class Browser {
  readonly cookies = new Map<string, string>();
  csrf = '';
  headers(method = 'GET', extra: Record<string, string> = {}) {
    return { cookie: [...this.cookies].map(([k, v]) => k + '=' + v).join(';'),
      origin: configuration.security.origins[0]!, ...(method === 'GET' ? {} : {
        'content-type': 'application/json', 'x-csrf-token': this.csrf,
      }), ...extra };
  }
  async raw(path: string, method = 'GET', body?: string | Buffer, extra: Record<string, string> = {}) {
    const response = await fetch(base + (path.startsWith('/api/') ? path : '/api' + path), {
      method, headers: this.headers(method, extra), body: body as BodyInit | undefined,
    });
    for (const cookie of response.headers.getSetCookie()) {
      const value = cookie.split(';')[0]!, at = value.indexOf('=');
      this.cookies.set(value.slice(0, at), value.slice(at + 1));
    }
    return response;
  }
  async request(path: string, method = 'GET', input?: unknown, extra: Record<string, string> = {}) {
    const response = await this.raw(path, method, input === undefined ? undefined : JSON.stringify(input), extra);
    return { status: response.status, body: response.status === 204 ? null : await response.json(), headers: response.headers };
  }
  async bootstrap() {
    const context = await this.request('/account/context');
    assert.equal(context.status, 200); this.csrf = context.body.csrfToken;
    return this;
  }
  async login(owner: string = randomUUID(), verified = true) {
    await this.bootstrap();
    const response = await this.request('/account/session', 'POST', credentials(owner, verified));
    assert.equal(response.status, 200); return this;
  }
}

async function order(quantity = 1) {
  const response = await admin.request('/admin/orders', 'POST', { platform: 'manual',
    reference: 'demo:t07:' + randomUUID(), productVersionId: versionId, quantity, amountFen: 990,
    scope: 'demo', requestId: randomUUID() });
  assert.equal(response.status, 200); return response.body;
}
async function issue(quantity = 1) {
  const recorded = await order(quantity), requestId = randomUUID();
  const response = await admin.request('/admin/orders/' + recorded.id + '/issue', 'POST', { requestId });
  assert.equal(response.status, 200);
  return { recorded, requestId, response, code: response.body.deliveries[0]?.code as string };
}
async function uploaded(bytes = image, changes: Record<string, unknown> = {}) {
  const response = await admin.request('/admin/uploads', 'POST', { productVersionId: versionId, kind: 'cover',
    fileName: 'cover.png', mimeType: 'image/png', byteSize: bytes.length, checksum: sha(bytes), requestId: randomUUID(), ...changes });
  assert.equal(response.status, 200); return response.body;
}
async function asset(input: Record<string, unknown> = {}) {
  const response = await admin.request('/admin/assets', 'POST', { productVersionId: versionId,
    platform: 'xiaohongshu', kind: 'copy', variant: randomUUID(), status: 'draft',
    text: '演示：探索自己的相处节奏。', fileId: null, requestId: randomUUID(), ...input });
  assert.equal(response.status, 200); return response.body;
}

before(async () => {
  fixture = await createLocalFixture('t07'); directory = await mkdtemp(join(tmpdir(), 'orai-t07-'));
  configuration = { ...loadConfiguration({ ...fixture.env, ASSET_STORAGE_DRIVER: 'local', ASSET_DIRECTORY: directory,
    ASSET_MAX_IMAGE_BYTES: '1024', ASSET_MAX_VIDEO_BYTES: '1048576' }),
    security: { ...fixture.configuration.security, readIpLimit: 2000, writeIpLimit: 2000, claimIpLimit: 1000 },
    auth: { url: 'https://isolated.example.test', publishableKey: 'sb_publishable_' + 'p'.repeat(40),
      sessionEncryptionKey: randomBytes(32).toString('base64url'), sessionDays: 30, requestTimeoutMs: 1000 } };
  // Isolated verified identity facts, never a production login bypass or cloud/email acceptance.
  const gateway = {
    verify: async (token: string) => {
      const proof = proofs.get(token);
      if (!proof) throw new ApiException('AUTH_REQUIRED', 'Invalid', 401);
      return proof;
    },
    refresh: async (token: string) => {
      const value = refreshes.get(token);
      if (!value) throw new ApiException('AUTH_REQUIRED', 'Invalid', 401);
      return { ...value, identity: proofs.get(value.accessToken)! };
    }, logout: async () => undefined,
  };
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG)
    .useValue(configuration).overrideProvider(SupabaseAuthGateway).useValue(gateway).compile();
  app = module.createNestApplication({ logger: false }); configureApp(app);
  await app.listen(0, '127.0.0.1'); base = await app.getUrl();
  admin = await new Browser().login(DemoIdentityScenarios.admin.supabaseUserId);
});
after(async () => { await app?.close(); await fixture?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });

test('all management reads require a current verified server-side administrator, never a role header', async () => {
  const visitor = await new Browser().bootstrap(), user = await new Browser().login();
  assert.equal((await visitor.request('/admin/overview')).status, 401);
  assert.equal((await user.request('/admin/overview', 'GET', undefined, { 'x-admin': 'true', 'x-user-role': 'ADMIN' })).status, 403);
  const unverified = await new Browser().login(DemoIdentityScenarios.admin.supabaseUserId, false);
  assert.equal((await unverified.request('/admin/overview')).status, 403);
  const response = await admin.request('/admin/overview'); assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.body.scope, 'demo');
});

test('management writes preserve Origin, CSRF, strict schemas and prohibit HTTP role escalation', async () => {
  const input = { slug: 't07-guard', name: '演示', sortOrder: 1, requestId: randomUUID() };
  assert.equal((await admin.request('/admin/categories', 'POST', input, { 'x-csrf-token': '' })).status, 403);
  assert.equal((await admin.request('/admin/categories', 'POST', input, { origin: 'https://other.example.test' })).status, 403);
  assert.equal((await admin.request('/admin/categories', 'POST', { ...input, role: 'ADMIN' })).status, 400);
  assert.equal((await admin.request('/admin/users/' + DemoIdentityScenarios.admin.id + '/role', 'POST', { role: 'ADMIN' })).status, 404);
});

test('categories and tags are audited, idempotent, paginated and use revision conflicts', async () => {
  for (const path of ['/admin/categories', '/admin/tags']) {
    const input = { slug: 't07-' + randomUUID().slice(0, 8), name: '测试分类', requestId: randomUUID(),
      ...(path.endsWith('categories') ? { sortOrder: 5 } : {}) };
    const created = await admin.request(path, 'POST', input); assert.equal(created.status, 200);
    assert.equal((await admin.request(path, 'POST', input)).body.id, created.body.id);
    assert.equal((await admin.request(path + '?page=1&pageSize=1')).body.items.length, 1);
    const patch = { name: '更新分类', expectedRevision: created.body.revision, requestId: randomUUID() };
    assert.equal((await admin.request(path + '/' + created.body.id, 'PATCH', patch)).status, 200);
    assert.equal((await admin.request(path + '/' + created.body.id, 'PATCH', { ...patch, requestId: randomUUID() })).status, 409);
    assert.equal(await fixture.runtime.client.adminAuditLog.count({ where: { entityId: created.body.id } }), 2);
  }
});

test('products, recommendation, version import/review/publication and immutable history share the existing services', async () => {
  const seed = await fixture.runtime.client.product.findUniqueOrThrow({ where: { slug: 'demo-partner' } });
  const input = { slug: 'demo-t07-' + randomUUID().slice(0, 8), name: '演示商品', hook: '看看自己的节奏', summary: '测试说明',
    description: '仅用于本地测试', categoryId: seed.categoryId, tagIds: [], priceFen: 990, durationMinutes: 3,
    experienceType: 'score', themeKey: 'gentle', coverUrl: null, scope: 'demo', recommended: false,
    publicSample: seed.publicSample, purchaseUrl: null, purchaseNotice: '演示内容', redemptionNotice: '使用示例码', requestId: randomUUID() };
  const created = await admin.request('/admin/products', 'POST', input); assert.equal(created.status, 200);
  const id = created.body.id;
  assert.equal((await admin.request('/admin/products?query=demo-t07&pageSize=1')).body.items.length, 1);
  const changed = await admin.request('/admin/products/' + id, 'PATCH', { recommended: true,
    expectedRevision: created.body.revision, requestId: randomUUID() }); assert.equal(changed.status, 200);
  const config = (await fixture.runtime.client.productVersion.findUniqueOrThrow({ where: { id: versionId } })).configuration;
  const imported = await admin.request('/admin/products/' + id + '/versions', 'POST', { configuration: config, requestId: randomUUID() });
  assert.equal(imported.status, 200);
  const version = imported.body;
  assert.equal((await admin.request('/admin/products/' + id + '/versions/' + version.id + '/preview')).body.isPreview, true);
  assert.equal((await admin.request('/admin/products/' + id + '/versions/' + version.id + '/review', 'POST', { requestId: randomUUID() })).status, 200);
  assert.equal((await admin.request('/admin/products/' + id + '/versions/' + version.id + '/publish', 'POST', { requestId: randomUUID() })).status, 200);
  assert.equal((await admin.request('/products/' + input.slug)).status, 200);
  assert.equal((await admin.request('/admin/products/' + id + '/versions/' + version.id, 'PUT', {
    configuration: config, expectedRevision: version.revision, requestId: randomUUID() })).status, 409);
  assert.equal((await admin.request('/admin/products/' + id + '/archive', 'POST', { requestId: randomUUID() })).status, 200);
  assert.equal((await admin.request('/products/' + input.slug)).status, 404);
  assert.equal((await admin.request('/admin/products/' + id + '/versions/' + version.id + '/preview')).status, 200);
});

test('order import deduplicates references and only the first issue response can export complete codes', async () => {
  const recorded = await order(2), requestId = randomUUID();
  const results = await Promise.all([0, 1].map(() => admin.request('/admin/orders/' + recorded.id + '/issue', 'POST', { requestId })));
  assert.equal(results.every(result => result.status === 200), true);
  assert.equal(results.filter(result => result.body.deliveryAvailable).length, 1);
  assert.equal(results.reduce((n, result) => n + result.body.deliveries.length, 0), 2);
  assert.equal(results.every(result => result.headers.get('cache-control') === 'private, no-store'), true);
  assert.equal(results.some(result => result.headers.get('content-disposition')?.includes('attachment')), true);
  const detail = await admin.request('/admin/orders/' + recorded.id);
  assert.equal(detail.status, 200); assert.equal(detail.body.codes.length, 2);
  assert.equal(JSON.stringify(detail.body).includes('digest'), false);
  assert.equal(detail.body.codes.every((value: Record<string, unknown>) => !('code' in value)), true);
  assert.equal((await admin.request('/admin/orders/' + recorded.id + '/issue', 'POST', { requestId: randomUUID() })).status, 409);
});

test('CSV supports quoted fields, dry-run, per-row failures, stable retries and different-content conflicts', async () => {
  const reference = 'demo:csv,' + randomUUID();
  const csv = '\uFEFFplatform,reference,productVersionId,quantity,amountFen\r\nmanual,"' + reference + '",' + versionId + ',1,990\r\nmanual,demo:bad,' + versionId + ',0,990\r\n';
  const requestId = randomUUID();
  const preview = await admin.request('/admin/orders/import', 'POST', { csv, requestId, dryRun: true });
  assert.equal(preview.status, 200); assert.equal(preview.body.accepted, 1); assert.equal(preview.body.rejected, 1);
  assert.equal(await fixture.runtime.client.order.count({ where: { reference } }), 0);
  const first = await admin.request('/admin/orders/import', 'POST', { csv, requestId, dryRun: false });
  assert.equal(first.status, 200); assert.equal(first.body.accepted, 1); assert.equal(first.body.rejected, 1);
  assert.equal((await admin.request('/admin/orders/import', 'POST', { csv, requestId, dryRun: false })).body.rows[0].orderId, first.body.rows[0].orderId);
  assert.equal(await fixture.runtime.client.order.count({ where: { reference } }), 1);
  assert.equal((await admin.request('/admin/orders/import', 'POST', { csv: csv.replace(',1,990', ',2,990'), requestId, dryRun: false })).status, 409);
  assert.equal((await admin.request('/admin/orders/import', 'POST', { csv: 'platform,reference\n"unterminated', requestId: randomUUID(), dryRun: false })).status, 400);
});

test('HTTP replacement keeps entitlement and report consumption; refund immediately removes anonymous runtime access', async () => {
  const issued = await issue(), buyer = await new Browser().bootstrap();
  const claim = await buyer.request('/redemptions/claim', 'POST', { code: issued.code, requestId: randomUUID() });
  assert.equal(claim.status, 200); const entitlementId = claim.body.entitlement.id;
  const started = await buyer.request('/attempts', 'POST', { entitlementId, requestId: randomUUID() });
  assert.equal(started.status, 200); const attemptId = started.body.id ?? started.body.attemptId;
  const questions = await buyer.request('/attempts/' + attemptId + '/questions'); assert.equal(questions.status, 200);
  const oldCodeId = issued.response.body.receipt.codeIds[0];
  const replaced = await admin.request('/admin/codes/' + oldCodeId + '/replace', 'POST', { requestId: randomUUID() });
  assert.equal(replaced.status, 200);
  assert.equal((await buyer.request('/attempts/' + attemptId + '/questions')).status, 401);
  assert.equal((await buyer.request('/redemptions/recover', 'POST', { code: replaced.body.deliveries[0].code, requestId: randomUUID() })).body.entitlement.id, entitlementId);
  assert.equal((await admin.request('/admin/orders/' + issued.recorded.id + '/refund', 'POST', { requestId: randomUUID() })).status, 200);
  assert.notEqual((await buyer.request('/attempts/' + attemptId + '/questions')).status, 200);
  const row = await fixture.runtime.client.entitlement.findUniqueOrThrow({ where: { id: entitlementId } });
  assert.equal(row.status, 'REVOKED'); assert.equal(row.reportsConsumed, 0);
});

test('asset text uses optimistic revisions and explicit review/ready transitions', async () => {
  const created = await asset();
  const updates = await Promise.all(['甲', '乙'].map(text => admin.request('/admin/assets/' + created.id, 'PATCH', {
    text, expectedRevision: created.revision, requestId: randomUUID() })));
  assert.deepEqual(updates.map(value => value.status).sort(), [200, 409]);
  const current = updates.find(value => value.status === 200)!.body;
  const reviewed = await admin.request('/admin/assets/' + created.id + '/review', 'POST', { expectedRevision: current.revision, requestId: randomUUID() });
  assert.equal(reviewed.status, 200);
  const ready = await admin.request('/admin/assets/' + created.id + '/ready', 'POST', { expectedRevision: reviewed.body.revision, requestId: randomUUID() });
  assert.equal(ready.status, 200); assert.equal(ready.body.status, 'ready');
  assert.equal((await admin.request('/admin/assets?kind=copy&pageSize=1')).body.items.length, 1);
});

test('media is uploaded in a bounded stream, verified, linked by file ID and downloaded under authorization', async () => {
  const prepared = await uploaded(); assert.equal(prepared.status, 'pending');
  const cover = await asset({ kind: 'cover', text: null });
  assert.equal((await admin.request('/admin/assets/' + cover.id + '/review', 'POST', { expectedRevision: cover.revision, requestId: randomUUID() })).status, 409);
  const stored = await admin.raw(prepared.uploadPath, 'PUT', image, { 'content-type': 'application/octet-stream' });
  assert.equal(stored.status, 200); await stored.arrayBuffer();
  const completed = await admin.request('/admin/uploads/' + prepared.id + '/complete', 'POST', { requestId: randomUUID() });
  assert.equal(completed.status, 200); assert.equal(completed.body.status, 'available');
  const linked = await admin.request('/admin/assets/' + cover.id, 'PATCH', { fileId: prepared.id, expectedRevision: cover.revision, requestId: randomUUID() });
  assert.equal(linked.status, 200); assert.equal(linked.body.mimeType, 'image/png');
  assert.equal('storageKey' in linked.body, false);
  const response = await admin.raw('/admin/files/' + prepared.id + '/content');
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(sha(Buffer.from(await response.arrayBuffer())), sha(image));
  const range = await admin.raw('/admin/files/' + prepared.id + '/content', 'GET', undefined, { range: 'bytes=0-7' });
  assert.equal(range.status, 206); assert.equal((await range.arrayBuffer()).byteLength, 8);
  assert.equal((await new Browser().raw('/admin/files/' + prepared.id + '/content')).status, 401);
});

test('upload rejects path tricks, oversized declarations, bytes that mismatch MIME/hash and attachment injection', async () => {
  const request = { productVersionId: versionId, kind: 'cover', fileName: '../cover.png', mimeType: 'image/png',
    byteSize: image.length, checksum: sha(image), requestId: randomUUID() };
  assert.equal((await admin.request('/admin/uploads', 'POST', request)).status, 400);
  assert.equal((await admin.request('/admin/uploads', 'POST', { ...request, fileName: 'x.png', byteSize: 1025 })).status, 400);
  const wrong = await uploaded(Buffer.from('<html>not an image</html>'));
  const response = await admin.raw(wrong.uploadPath, 'PUT', Buffer.from('<html>not an image</html>'), { 'content-type': 'application/octet-stream' });
  assert.equal(response.status, 400); await response.arrayBuffer();
  const mismatched = await uploaded(image, { checksum: '0'.repeat(64) });
  const badHash = await admin.raw(mismatched.uploadPath, 'PUT', image, { 'content-type': 'application/octet-stream' });
  assert.equal(badHash.status, 400); await badHash.arrayBuffer();
  assert.equal((await admin.request('/admin/assets', 'POST', { productVersionId: versionId, platform: 'manual', kind: 'cover',
    variant: randomUUID(), status: 'ready', text: null, storageKey: '/etc/passwd', fileId: null, requestId: randomUUID() })).status, 400);
});

test('upload status and completion recheck the uploader, data range and expiration', async () => {
  const value = await uploaded();
  const otherCredentials = credentials();
  const other = await new Browser().bootstrap();
  await other.request('/account/session', 'POST', otherCredentials);
  const user = await fixture.owner.client.user.findUniqueOrThrow({ where: { supabaseUserId: proofs.get(otherCredentials.accessToken)!.supabaseUserId } });
  await fixture.owner.client.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  assert.equal((await other.request('/admin/uploads/' + value.id)).status, 404);
  await fixture.owner.client.$executeRawUnsafe('UPDATE orai.asset_files SET expires_at=now()-interval \'1 second\' WHERE id=$1::uuid', value.id);
  const expired = await admin.raw(value.uploadPath, 'PUT', image, { 'content-type': 'application/octet-stream' });
  assert.equal(expired.status, 410); await expired.arrayBuffer();
});

test('view events are bounded client observations; overview separates event sources from recorded order amounts', async () => {
  const browser = await new Browser().bootstrap(), input = { kind: 'view', productVersionId: versionId, requestId: randomUUID() };
  assert.equal((await browser.request('/events', 'POST', input)).status, 200);
  assert.equal((await browser.request('/events', 'POST', input)).status, 200);
  assert.equal((await browser.request('/events', 'POST', { ...input, kind: 'complete', requestId: randomUUID() })).status, 400);
  assert.equal((await browser.request('/events', 'POST', { ...input, source: 'manual', requestId: randomUUID() })).status, 400);
  const overview = await admin.request('/admin/overview'); assert.equal(overview.status, 200);
  assert.equal(Array.isArray(overview.body.events), true); assert.ok(overview.body.orders.recordedCount > 0);
  assert.equal(overview.body.orders.paymentVerified, false); assert.equal(overview.body.attribution, 'unconfirmed');
  assert.equal(overview.body.events.every((row: { source: string }) => row.source === 'demo'), true);
});

test('disabling an administrator invalidates an existing cookie and all management capabilities immediately', async () => {
  const input = credentials(), browser = await new Browser().bootstrap();
  await browser.request('/account/session', 'POST', input);
  const user = await fixture.owner.client.user.findUniqueOrThrow({ where: { supabaseUserId: proofs.get(input.accessToken)!.supabaseUserId } });
  await fixture.owner.client.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  assert.equal((await browser.request('/admin/overview')).status, 200);
  await fixture.owner.client.user.update({ where: { id: user.id }, data: { disabledAt: new Date() } });
  assert.equal((await browser.request('/admin/overview')).status, 401);
});
