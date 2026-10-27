import 'reflect-metadata';
import { reviewThreejsFixture } from './publication-fixture';
import { CatalogAdminAccessService } from '../src/catalog/admin-access.service';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
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
import { runAdminCommand } from '../scripts/admin-command';
import { parseOrderCsv } from '../src/operations/orders-admin.service';

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
  const authority = await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.admin.id);
  await reviewThreejsFixture(app,fixture,authority,version.id);
  const reviewed = await admin.request('/admin/products/' + id + '/versions/' + version.id + '/review', 'POST', {
    expectedRevision: (await fixture.runtime.client.productVersion.findUniqueOrThrow({where:{id:version.id}})).revision, requestId: randomUUID() });
  assert.equal(reviewed.status, 200);
  assert.equal((await admin.request('/admin/products/' + id + '/versions/' + version.id + '/publish', 'POST', { expectedRevision: reviewed.body.revision, requestId: randomUUID() })).status, 200);
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

test('only the explicit local owner CLI can grant or revoke roles; retries retain one audit and existing sessions recheck roles', async () => {
  const input = credentials(), browser = await new Browser().bootstrap();
  await browser.request('/account/session', 'POST', input);
  const supabaseUserId = proofs.get(input.accessToken)!.supabaseUserId;
  const user = await fixture.owner.client.user.findUniqueOrThrow({ where: { supabaseUserId } });
  assert.equal((await browser.request('/admin/overview')).status, 403);
  await assert.rejects(fixture.runtime.client.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } }));
  const args = ['grant', '--supabase-user', supabaseUserId, '--request-id', randomUUID()];
  const granted = await runAdminCommand(args, fixture.env);
  assert.equal(granted.role, 'admin'); assert.equal(granted.userId, user.id);
  assert.deepEqual(await runAdminCommand(args, fixture.env), granted);
  assert.equal((await browser.request('/admin/overview')).status, 200);
  assert.equal(await fixture.runtime.client.adminAuditLog.count({ where: { entityId: user.id, action: 'administrator.grant' } }), 1);
  await runAdminCommand(['revoke', '--supabase-user', supabaseUserId, '--request-id', randomUUID()], fixture.env);
  assert.equal((await browser.request('/admin/overview')).status, 403);
  await assert.rejects(runAdminCommand(args, { ...fixture.env, APP_ENV: 'production' }));
  await assert.rejects(runAdminCommand(args, { ...fixture.env, DEMO_SEED_DATABASE: 'different' }));
  await assert.rejects(runAdminCommand(['grant', '--supabase-user', randomUUID(), '--request-id', randomUUID()], fixture.env));
});

test('a READY file stays private until explicitly selected as the current published product cover; archives remove public access', async () => {
  const pending = await uploaded();
  await (await admin.raw(pending.uploadPath, 'PUT', image, { 'content-type': 'application/octet-stream' })).arrayBuffer();
  await admin.request('/admin/uploads/' + pending.id + '/complete', 'POST', { requestId: randomUUID() });
  let cover = await asset({ kind: 'cover', text: null, fileId: pending.id });
  const publicPath = '/api/assets/' + cover.id + '/files/' + pending.id + '/content';
  assert.equal((await new Browser().raw(publicPath)).status, 404);
  const seed = await fixture.runtime.client.product.findUniqueOrThrow({ where: { slug: 'demo-partner' } });
  assert.equal((await admin.request('/admin/products/' + seed.id + '/cover', 'POST', {
    assetId: cover.id, expectedRevision: seed.revision, requestId: randomUUID() })).status, 409);
  cover = (await admin.request('/admin/assets/' + cover.id + '/review', 'POST', { expectedRevision: cover.revision, requestId: randomUUID() })).body;
  cover = (await admin.request('/admin/assets/' + cover.id + '/ready', 'POST', { expectedRevision: cover.revision, requestId: randomUUID() })).body;
  assert.equal((await new Browser().raw(publicPath)).status, 404);
  const selected = await admin.request('/admin/products/' + seed.id + '/cover', 'POST', {
    assetId: cover.id, expectedRevision: seed.revision, requestId: randomUUID() });
  assert.equal(selected.status, 200); assert.equal(selected.body.coverUrl, publicPath);
  const visitor = new Browser(), response = await visitor.raw(publicPath);
  assert.equal(response.status, 200); assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(sha(Buffer.from(await response.arrayBuffer())), sha(image));
  assert.equal((await visitor.raw(publicPath.replace(pending.id, randomUUID()))).status, 404);
  await admin.request('/admin/assets/' + cover.id + '/archive', 'POST', { expectedRevision: cover.revision, requestId: randomUUID() });
  assert.equal((await visitor.raw(publicPath)).status, 404);
});

test('version edits, reviews and publication reject stale revisions and idempotency payload changes', async () => {
  const seed = await fixture.runtime.client.product.findUniqueOrThrow({ where: { slug: 'demo-work' } });
  const configuration = (await fixture.runtime.client.productVersion.findUniqueOrThrow({ where: { id: seed.currentVersionId! } })).configuration;
  const imported = await admin.request('/admin/products/' + seed.id + '/versions', 'POST', { configuration, requestId: randomUUID() });
  const path = '/admin/products/' + seed.id + '/versions/' + imported.body.id;
  const input = { configuration, expectedRevision: imported.body.revision, requestId: randomUUID() };
  const edited = await admin.request(path, 'PUT', input); assert.equal(edited.status, 200);
  assert.equal((await admin.request(path, 'PUT', { ...input, expectedRevision: 99 })).status, 409);
  assert.equal((await admin.request(path + '/review', 'POST', { expectedRevision: input.expectedRevision, requestId: randomUUID() })).status, 409);
  const authority = await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.admin.id);
  await reviewThreejsFixture(app,fixture,authority,imported.body.id);
  const reviewed = await admin.request(path + '/review', 'POST', { expectedRevision:
    (await fixture.runtime.client.productVersion.findUniqueOrThrow({where:{id:imported.body.id}})).revision, requestId: randomUUID() });
  assert.equal(reviewed.status, 200); assert.ok(reviewed.body.revision > edited.body.revision);
  assert.equal((await admin.request(path + '/publish', 'POST', { expectedRevision: edited.body.revision, requestId: randomUUID() })).status, 409);
  assert.equal((await admin.request(path + '/publish', 'POST', { expectedRevision: reviewed.body.revision, requestId: randomUUID() })).status, 200);
  assert.equal((await admin.request('/admin/products/' + seed.id, 'PATCH', { name: '过期编辑', expectedRevision: seed.revision, requestId: randomUUID() })).status, 409);
  assert.ok((await admin.request('/admin/products/' + seed.id + '/versions?pageSize=1')).body.total >= 2);
});

test('cover selection on an unpublished product is a controlled conflict, not an internal database error', async () => {
  const product = await fixture.runtime.client.product.findUniqueOrThrow({ where: { slug: 'fixture-draft' } });
  const response = await admin.request('/admin/products/' + product.id + '/cover', 'POST', { assetId: randomUUID(), expectedRevision: product.revision, requestId: randomUUID() });
  assert.equal(response.status, 409);
});

test('CSV preview detects conflicting references within the same batch and preserves real import feedback', async () => {
  const csv = 'platform,reference,productVersionId,quantity,amountFen\n' + [1,2].map(quantity => 'manual,demo:csv-inner,' + versionId + ',' + quantity + ',990').join('\n');
  for (const dryRun of [true, false]) {
    const response = await admin.request('/admin/orders/import', 'POST', { csv, dryRun, requestId: randomUUID() });
    assert.equal(response.status, 200); assert.equal(response.body.accepted, 1); assert.equal(response.body.rejected, 1);
  }
});

test('CSV parser handles reordered headers, escaped quotes and newlines, rejects malformed or unbounded data', async () => {
  const header = 'platform,reference,productVersionId,quantity,amountFen';
  const parsed = parseOrderCsv('quantity,reference,amountFen,platform,productVersionId\r\n1,"demo:a""b\nc",990,manual,' + versionId);
  assert.equal(parsed[0]?.values?.reference, 'demo:a"b\nc');
  for (const csv of ['', header, header + '\nmanual,"unfinished', header + '\nmanual,"done"x,x,1,1', header + '\nmanual,un"quoted,x,1,1',
    header + '\n' + 'x'.repeat(20_001), header + '\n' + 'a,b,c,d,e\n'.repeat(501), header + '\na,b,c,d,e,f,g,h']) {
    assert.throws(() => parseOrderCsv(csv), error => error instanceof ApiException && error.code === 'VALIDATION_ERROR');
  }
  const large = header + '\n' + ('manual,demo:' + 'x'.repeat(260) + ',' + versionId + ',1,990\n').repeat(500);
  assert.ok(large.length > 100_000);
  const response = await admin.request('/admin/orders/import', 'POST', { csv: large, dryRun: true, requestId: randomUUID() });
  assert.equal(response.status, 200); assert.equal(response.body.rejected, 500);
  const mismatched = await admin.request('/admin/orders/import', 'POST', { csv: header + '\nmanual,only-two', dryRun: false, requestId: randomUUID() });
  assert.equal(mismatched.body.rows[0].code, 'VALIDATION_ERROR');
});

test('CSV concurrent retries and distinct batches deduplicate identical platform references; duplicate metadata conflicts', async () => {
  const reference = 'demo:csv-race:' + randomUUID(), csv = 'platform,reference,productVersionId,quantity,amountFen\nmanual,' + reference + ',' + versionId + ',1,990';
  const requestId = randomUUID();
  const results = await Promise.all([requestId, requestId, randomUUID()].map(id => admin.request('/admin/orders/import', 'POST', { csv, requestId: id, dryRun: false })));
  assert.equal(results.every(result => result.status === 200 && result.body.accepted === 1), true);
  assert.equal(new Set(results.map(result => result.body.rows[0].orderId)).size, 1);
  const conflict = await admin.request('/admin/orders/import', 'POST', { csv: csv.replace(',1,990', ',2,990'), requestId: randomUUID(), dryRun: true });
  assert.equal(conflict.body.rejected, 1);
  const list = await admin.request('/admin/orders?platform=manual&status=pending&reference=' + reference + '&pageSize=1');
  assert.equal(list.body.total, 1); assert.equal(list.body.items.length, 1);
  const normalized = await admin.request('/admin/orders/import', 'POST', { csv: csv.replace(versionId, versionId.toUpperCase()), requestId: randomUUID(), dryRun: true });
  assert.equal(normalized.body.accepted, 1); assert.equal(normalized.body.rejected, 0);
});

test('actual JPEG, WebP, WebM and MP4 bytes pass verification and support authorized video ranges', async () => {
  for (const [fileName, mimeType, kind] of [['cover.jpg','image/jpeg','cover'],['cover.webp','image/webp','cover'],['preview.webm','video/webm','video'],['preview.mp4','video/mp4','video']]) {
    const bytes = await readFile('test/fixtures/' + fileName);
    const prepared = await uploaded(bytes, { fileName, mimeType, kind });
    assert.equal((await admin.request('/admin/uploads/' + prepared.id + '/complete', 'POST', { requestId: randomUUID() })).status, 409);
    const sent = await admin.raw(prepared.uploadPath, 'PUT', bytes, { 'content-type': 'application/octet-stream' });
    assert.equal(sent.status, 200); await sent.arrayBuffer();
    const complete = await admin.request('/admin/uploads/' + prepared.id + '/complete', 'POST', { requestId: randomUUID() });
    assert.equal(complete.body.status, 'available');
    assert.equal((await admin.request('/admin/uploads/' + prepared.id + '/complete', 'POST', { requestId: randomUUID() })).status, 200);
    const value = await asset({ kind, text: null, fileId: prepared.id });
    assert.equal((await admin.request('/admin/assets/' + value.id)).body.checksum, sha(bytes));
    for (const [range, length] of [['bytes=-8',8],['bytes=8-',bytes.length-8]]) {
      const response = await admin.raw(complete.body.downloadPath, 'GET', undefined, { range: String(range) });
      assert.equal(response.status, 206); assert.equal((await response.arrayBuffer()).byteLength, length);
    }
    for (const range of ['bytes=2-1','bytes=-0','bytes=999999-','bytes=0-1,4-5','bytes=-','invalid']) {
      const response = await admin.raw(complete.body.downloadPath, 'GET', undefined, { range });
      assert.equal(response.status, 416); await response.arrayBuffer();
    }
  }
});

test('interrupted declarations and corrupt uploaded files never become available or leave misleading completion status', async () => {
  const short = await uploaded(image, { byteSize: image.length - 1 });
  const rejected = await admin.raw(short.uploadPath, 'PUT', image, { 'content-type': 'application/octet-stream' });
  assert.equal(rejected.status, 400); await rejected.arrayBuffer();
  assert.equal((await admin.request('/admin/uploads/' + short.id)).body.status, 'failed');
  assert.equal((await readdir(directory)).includes(short.id + '.blob'), false);
  const pending = await uploaded();
  await (await admin.raw(pending.uploadPath, 'PUT', image, { 'content-type': 'application/octet-stream' })).arrayBuffer();
  const corrupt = Buffer.from(image); corrupt[40] = corrupt[40]! ^ 1;
  await writeFile(join(directory, pending.id + '.blob'), corrupt);
  assert.equal((await admin.request('/admin/uploads/' + pending.id + '/complete', 'POST', { requestId: randomUUID() })).status, 400);
  assert.equal((await admin.request('/admin/uploads/' + pending.id)).body.status, 'failed');
  assert.equal((await readdir(directory)).includes(pending.id + '.blob'), false);
});

test('upload retries preserve status, enforce the binary-only boundary, and reject unsupported extensions or purposes', async () => {
  const request = { productVersionId: versionId, kind: 'cover', fileName: '封面.png', mimeType: 'image/png', byteSize: image.length, checksum: sha(image), requestId: randomUUID() };
  const prepared = await admin.request('/admin/uploads', 'POST', request);
  assert.equal((await admin.request('/admin/uploads', 'POST', request)).body.id, prepared.body.id);
  assert.equal((await admin.request('/admin/uploads', 'POST', { ...request, fileName: 'new.png' })).status, 409);
  for (const change of [{ fileName: 'bad.txt' }, { kind: 'video' }, { productVersionId: randomUUID() }, { fileName: 'bad\r\n.png' }]) {
    assert.ok([400,404].includes((await admin.request('/admin/uploads', 'POST', { ...request, ...change, requestId: randomUUID() })).status));
  }
  assert.equal((await admin.request(prepared.body.uploadPath, 'PUT', {})).status, 400);
  assert.equal((await admin.raw(prepared.body.uploadPath, 'PUT', image, { 'content-type': 'application/octet-stream', 'x-csrf-token': '' })).status, 403);
  const content = await admin.raw(prepared.body.uploadPath, 'PUT', image, { 'content-type': 'application/octet-stream' });
  assert.equal(content.status, 200); await content.arrayBuffer();
  const repeated = await admin.raw(prepared.body.uploadPath, 'PUT', image, { 'content-type': 'application/octet-stream' });
  assert.equal(repeated.status, 409); await repeated.arrayBuffer();
  await admin.request('/admin/uploads/' + prepared.body.id + '/complete', 'POST', { requestId: randomUUID() });
  assert.equal((await admin.request('/admin/uploads', 'POST', request)).body.status, 'available');
});

test('asset association checks file readiness, media purpose, version and text content; unknown IDs and stale actions remain controlled', async () => {
  const pending = await uploaded(), value = await asset({ kind: 'script', text: '' });
  assert.equal((await admin.request('/admin/assets/' + value.id + '/review', 'POST', { expectedRevision: value.revision, requestId: randomUUID() })).status, 409);
  assert.equal((await admin.request('/admin/assets/' + value.id, 'PATCH', { expectedRevision: value.revision, fileId: pending.id, requestId: randomUUID() })).status, 400);
  const response = await admin.request('/admin/assets', 'POST', { productVersionId: versionId, platform: 'manual', kind: 'cover', variant: randomUUID(), fileId: pending.id, requestId: randomUUID() });
  assert.equal(response.status, 409);
  const withText = await admin.request('/admin/assets', 'POST', { productVersionId: versionId, platform: 'manual', kind: 'cover', variant: randomUUID(), text: 'unexpected', requestId: randomUUID() });
  assert.equal(withText.status, 400);
  const cover = await asset({ kind: 'cover', text: null });
  assert.equal((await admin.request('/admin/assets/' + cover.id, 'PATCH', { text: 'wrong', expectedRevision: cover.revision, requestId: randomUUID() })).status, 400);
  assert.equal((await admin.request('/admin/assets/' + cover.id + '/ready', 'POST', { expectedRevision: cover.revision, requestId: randomUUID() })).status, 409);
  const filtered = await admin.request('/admin/assets?platform=xiaohongshu&status=draft&productVersionId=' + versionId);
  assert.ok(filtered.body.total >= 1);
  for (const path of ['/admin/assets/', '/admin/orders/', '/admin/products/', '/admin/uploads/']) {
    assert.equal((await admin.request(path + randomUUID())).status, 404);
    assert.equal((await admin.request(path + 'invalid-id')).status, 400);
  }
});

test('audit write failures roll back metadata and idempotency state; repaired identical requests commit once without secrets', async () => {
  const input = { slug: 't07-audit-' + randomUUID().slice(0,8), name: '演示', requestId: randomUUID() };
  await fixture.owner.pool.query('REVOKE INSERT ON orai.admin_audit_logs FROM orai_app');
  try { assert.equal((await admin.request('/admin/tags', 'POST', input)).status, 500); }
  finally { await fixture.owner.pool.query('GRANT INSERT ON orai.admin_audit_logs TO orai_app'); }
  assert.equal(await fixture.runtime.client.tag.count({ where: { slug: input.slug } }), 0);
  assert.equal(await fixture.runtime.client.idempotentRequest.count({ where: { requestId: input.requestId } }), 0);
  const created = await admin.request('/admin/tags', 'POST', input); assert.equal(created.status, 200);
  assert.equal((await admin.request('/admin/tags', 'POST', { ...input, requestId: randomUUID() })).status, 409);
  const audit = await admin.request('/admin/audit?pageSize=1');
  assert.equal(audit.status, 200); assert.equal(audit.body.items.length, 1);
  const issued = await issue();
  const stored = JSON.stringify(await fixture.runtime.client.idempotentRequest.findMany());
  const history = JSON.stringify((await admin.request('/admin/audit?pageSize=50')).body);
  assert.equal(stored.includes(issued.code), false); assert.equal(history.includes(issued.code), false);
});

test('view deduplication checks changed targets and campaigns; scope or unknown query fields cannot extend access', async () => {
  const browser = await new Browser().bootstrap(), requestId = randomUUID();
  const campaign = await fixture.runtime.client.campaign.create({ data: { code: 'demo-t07-' + randomUUID().slice(0,8), productVersionId: versionId, scope: 'DEMO', platform: 'MANUAL', title: '演示渠道' } });
  const input = { kind: 'view', productVersionId: versionId, campaignCode: campaign.code, requestId };
  const responses = await Promise.all([1,2].map(() => browser.request('/events', 'POST', input)));
  assert.deepEqual(responses.map(value => ({ status: value.status, code: value.body.error?.code })), [{ status: 200, code: undefined }, { status: 200, code: undefined }]);
  assert.equal((await browser.request('/events', 'POST', { ...input, campaignCode: undefined })).status, 409);
  assert.equal((await browser.request('/events', 'POST', { ...input, campaignCode: 'missing', requestId: randomUUID() })).status, 404);
  assert.equal((await browser.request('/events', 'POST', { ...input, productVersionId: randomUUID(), requestId: randomUUID() })).status, 404);
  for (const path of ['/admin/products','/admin/tags','/admin/categories','/admin/orders','/admin/assets','/admin/overview','/admin/audit']) {
    assert.equal((await admin.request(path + '?scope=live')).status, 400);
  }
});

test('HTTP replacement and concurrent refund preserve a completed account-bound report, its owner and consumed credit', async () => {
  const issued = await issue(), buyer = await new Browser().login();
  const claimed = await buyer.request('/redemptions/claim', 'POST', { code: issued.code, requestId: randomUUID() });
  const entitlementId = claimed.body.entitlement.id;
  const started = await buyer.request('/attempts', 'POST', { entitlementId, requestId: randomUUID() });
  const attemptId = started.body.attemptId;
  const questions = (await buyer.request('/attempts/' + attemptId + '/questions')).body;
  let revision = questions.revision;
  for (const question of questions.questions) {
    const saved = await buyer.request('/attempts/' + attemptId + '/answers/' + question.id, 'PUT', { optionId: 'often', expectedRevision: revision, requestId: randomUUID() });
    assert.equal(saved.status, 200); revision = saved.body.attemptRevision;
  }
  const report = await buyer.request('/attempts/' + attemptId + '/submit', 'POST', { expectedRevision: revision, requestId: randomUUID() });
  assert.equal(report.status, 200);
  const bound = await buyer.request('/me/entitlements/bind', 'POST', { code: issued.code, confirmed: true, requestId: randomUUID() });
  assert.equal(bound.status, 200);
  const before = await fixture.runtime.client.entitlement.findUniqueOrThrow({ where: { id: entitlementId } });
  const snapshot = await fixture.runtime.client.report.findUniqueOrThrow({ where: { id: report.body.id } });
  const replaced = await admin.request('/admin/codes/' + issued.response.body.receipt.codeIds[0] + '/replace', 'POST', { requestId: randomUUID() });
  assert.equal(replaced.status, 200); assert.equal((await buyer.request('/reports/' + report.body.id)).status, 200);
  const requestId = randomUUID();
  const refunds = await Promise.all([1,2].map(() => admin.request('/admin/orders/' + issued.recorded.id + '/refund', 'POST', { requestId })));
  assert.equal(refunds.every(value => value.status === 200), true);
  assert.notEqual((await buyer.request('/reports/' + report.body.id)).status, 200);
  const after = await fixture.runtime.client.entitlement.findUniqueOrThrow({ where: { id: entitlementId } });
  assert.equal(after.ownerUserId, before.ownerUserId); assert.equal(after.ownership, 'ACCOUNT_BOUND'); assert.equal(after.reportsConsumed, 1);
  assert.deepEqual((await fixture.runtime.client.report.findUniqueOrThrow({ where: { id: snapshot.id } })).snapshot, snapshot.snapshot);
  assert.equal(await fixture.runtime.client.entitlementBinding.count({ where: { entitlementId } }), 1);
  assert.equal(await fixture.runtime.client.event.count({ where: { dedupeKey: 'refund:' + issued.recorded.id, kind: 'REFUND' } }), 1);
});

test('knowing LIVE product, order, asset and file IDs cannot cross the development administrator scope', async () => {
  const seed = await fixture.runtime.client.product.findUniqueOrThrow({ where: { slug: 'demo-partner' } });
  const { id: _id, ...metadata } = seed;
  const product = await fixture.owner.client.product.create({ data: { ...metadata, slug: 't07-live-isolation', scope: 'LIVE',
    status: 'DRAFT', currentVersionId: null, publishedAt: null, coverUrl: null, publicSample: { ...seed.publicSample as object, isDemo: false } } });
  const source = await fixture.runtime.client.productVersion.findUniqueOrThrow({ where: { id: versionId } });
  const version = await fixture.owner.client.productVersion.create({ data: { productId: product.id, scope: 'LIVE', number: 1, configuration: source.configuration!, status: 'PUBLISHED', publishedAt: new Date() } });
  const user = await fixture.owner.client.user.create({ data: { supabaseUserId: randomUUID(), scope: 'LIVE' } });
  const fileId = randomUUID();
  await fixture.owner.client.assetFile.create({ data: { id: fileId, productVersionId: version.id, scope: 'LIVE', ownerUserId: user.id,
    kind: 'COVER', originalName: 'live.png', mimeType: 'image/png', byteSize: image.length, checksum: sha(image), storageKey: fileId + '.blob',
    status: 'AVAILABLE', verifiedAt: new Date(), expiresAt: new Date(Date.now() + 3_600_000) } });
  const cover = await fixture.owner.client.campaignAsset.create({ data: { productVersionId: version.id, scope: 'LIVE', platform: 'MANUAL', kind: 'COVER',
    variant: 'live-isolation', status: 'READY', fileId, storageKey: fileId + '.blob', mimeType: 'image/png', byteSize: image.length, checksum: sha(image) } });
  const coverUrl = '/api/assets/' + cover.id + '/files/' + fileId + '/content';
  await fixture.owner.client.product.update({ where: { id: product.id }, data: { status: 'PUBLISHED', currentVersionId: version.id, coverUrl, publishedAt: new Date() } });
  const order = await fixture.owner.client.order.create({ data: { platform: 'MANUAL', reference: 'live:t07', productVersionId: version.id, scope: 'LIVE', quantity: 1, amountFen: 990 } });
  for (const path of ['/admin/products/' + product.id, '/admin/orders/' + order.id, '/admin/assets/' + cover.id, '/admin/files/' + fileId + '/content', coverUrl]) {
    const response = await admin.raw(path); assert.equal(response.status, 404); await response.arrayBuffer();
  }
  assert.equal((await admin.request('/admin/assets?productVersionId=' + version.id)).body.total, 0);
  assert.equal((await admin.request('/admin/products?query=t07-live-isolation')).body.total, 0);
  assert.equal((await admin.request('/admin/orders/' + order.id + '/refund', 'POST', { requestId: randomUUID() })).status, 404);
  assert.equal((await admin.request('/admin/uploads', 'POST', { productVersionId: version.id, kind: 'cover', fileName: 'x.png', mimeType: 'image/png', byteSize: image.length, checksum: sha(image), requestId: randomUUID() })).status, 404);
  assert.equal((await admin.request('/admin/assets', 'POST', { productVersionId: versionId, kind: 'cover', platform: 'manual', variant: randomUUID(), fileId, requestId: randomUUID() })).status, 409);
  const visitor = await new Browser().bootstrap();
  assert.equal((await visitor.request('/events', 'POST', { kind: 'view', productVersionId: version.id, requestId: randomUUID() })).status, 404);
});

test('simultaneous upload preparations cannot exceed the per-administrator pending quota; expired status remains truthful', async () => {
  const active = await fixture.runtime.client.assetFile.count({ where: { ownerUserId: DemoIdentityScenarios.admin.id, scope: 'DEMO',
    status: { in: ['PENDING','VERIFYING','UPLOADED'] }, expiresAt: { gt: new Date() } } });
  const results = await Promise.all(Array.from({ length: 23 - active }, () => admin.request('/admin/uploads', 'POST', {
    productVersionId: versionId, kind: 'cover', fileName: 'x.png', mimeType: 'image/png', byteSize: image.length, checksum: sha(image), requestId: randomUUID() })));
  assert.equal(results.filter(value => value.status === 200).length, 20 - active);
  assert.equal(results.filter(value => value.status === 409).length, 3);
  const pending = results.find(value => value.status === 200)!.body;
  await fixture.owner.client.assetFile.update({ where: { id: pending.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await admin.request('/admin/uploads/' + pending.id)).body.status, 'expired');
  assert.equal((await admin.request('/admin/uploads/' + pending.id + '/complete', 'POST', { requestId: randomUUID() })).status, 410);
});
