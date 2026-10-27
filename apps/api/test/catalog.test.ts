import 'reflect-metadata';
import { reviewThreejsFixture } from './publication-fixture';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ProductDetailSchema, ProductPageSchema } from '@orai/contracts';
import { ProductConfigurationSchema } from '@orai/contracts/admin';
import { AppModule } from '../src/app.module';
import { APP_CONFIG, type AppConfiguration } from '../src/config/configuration';
import { configureApp } from '../src/common/configure-app';
import { ApiException } from '../src/common/http-errors';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { VersionsService } from '../src/catalog/versions.service';
import { RuntimeVersionService } from '../src/catalog/runtime-version.service';
import { Prisma } from '../src/generated/prisma/client';
import { createLocalFixture } from './local-fixture';
import { demoId, DemoIdentityScenarios, DemoProducts, demoPublicSample } from '../scripts/demo-fixtures';

const execute = promisify(execFile);
let fixture: Awaited<ReturnType<typeof createLocalFixture>>;
let app: INestApplication, production: INestApplication;
let url: string, productionUrl: string, directory: string;
let authority: CatalogAdminAccessService, access: CatalogAdminAccess, versions: VersionsService, runtimeVersions: RuntimeVersionService;
let version3: Awaited<ReturnType<VersionsService['importConfiguration']>>;
const partner = demoId('demo-partner'), liveId = randomUUID();
const privateMarker = 'PRIVATE_RESULT_TEMPLATE_FOR_T03';
const changedConfiguration = structuredClone(DemoProducts[0]!.configurations[1]!);
changedConfiguration.report.templates[0]!.explanation = privateMarker;

async function application(configuration: AppConfiguration) {
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG).useValue(configuration).compile();
  const instance = module.createNestApplication({ logger: false });
  configureApp(instance); await instance.listen(0, '127.0.0.1');
  return instance;
}

before(async () => {
  fixture = await createLocalFixture('t03');
  directory = await mkdtemp(join(tmpdir(), 'orai-t03-'));
  const publication = new Date('2026-07-01T10:00:00.000Z');
  for (const [slug, priceFen, durationMinutes, recommended, recommendationOrder] of [
    ['demo-partner', 990, 3, true, 2], ['demo-work', 1990, 2, true, 1], ['demo-social', 490, 1, false, 0],
  ] as const) await fixture.runtime.client.product.update({ where: { slug }, data: { priceFen, durationMinutes, recommended, recommendationOrder, publishedAt: publication } });
  await fixture.runtime.client.product.update({ where: { slug: 'demo-work' }, data: { description: 'Literal_100%\\Boundary · 字面搜索样本' } });
  const source = await fixture.runtime.client.product.findUniqueOrThrow({ where: { id: partner } });
  const { id, createdAt, updatedAt, ...fields } = source;
  await fixture.runtime.client.product.create({ data: { ...fields, id: liveId, slug: 'live-scope-fixture', name: 'LIVE 范围隔离样本', scope: 'LIVE',
    status: 'DRAFT', currentVersionId: null, publishedAt: null,
    publicSample: { ...demoPublicSample(changedConfiguration), isDemo: false } } });
  const liveVersion = await fixture.owner.client.productVersion.create({ data: { productId: liveId, scope: 'LIVE', number: 1,
    status: 'PUBLISHED', publishedAt: publication, configuration: changedConfiguration as Prisma.InputJsonValue } });
  await fixture.runtime.client.product.update({ where: { id: liveId }, data: { currentVersionId: liveVersion.id, status: 'PUBLISHED', publishedAt: publication } });
  await fixture.runtime.client.productTag.create({ data: { productId: liveId, tagId: demoId('tag-cooperation') } });
  app = await application(fixture.configuration); url = await app.getUrl();
  // Exercise production's scope policy against an isolated local test database;
  // this provider override is not a cloud/TLS or real Auth acceptance test.
  production = await application({ ...fixture.configuration, environment: 'production' }); productionUrl = await production.getUrl();
  authority = app.get(CatalogAdminAccessService); versions = app.get(VersionsService); runtimeVersions = app.get(RuntimeVersionService);
  access = await authority.authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.admin.id);
});

after(async () => {
  try { await app?.close(); await production?.close(); }
  finally { try { await fixture?.close(); } finally { if (directory) await rm(directory, { recursive: true, force: true }); } }
});

async function read(path: string, base = url) {
  const response = await fetch(base + path);
  return { response, body: await response.json() };
}

async function page(query = '') {
  const { response, body } = await read('/api/products' + query);
  assert.equal(response.status, 200); return ProductPageSchema.parse(body);
}

async function reject(operation: Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) => error instanceof ApiException && error.code === code);
}

test('real catalog metadata, cards and details expose only current public fields', async () => {
  const categories = await read('/api/categories'); assert.equal(categories.response.status, 200);
  assert.deepEqual(categories.body.map((value: { slug: string }) => value.slug), ['relationships', 'work', 'self', 'life', 'fun']);
  const tags = await read('/api/tags'); assert.equal(tags.body.length, 4);
  const catalog = await page(); assert.equal(catalog.total, 3); assert.equal(catalog.items.length, 3);
  assert.equal(catalog.items.every(value => value.isDemo && value.price.isTestPrice), true);
  assert.equal('publicSample' in catalog.items[0]!, false); assert.equal('description' in catalog.items[0]!, false);
  const detail = await read('/api/products/demo-partner'); assert.equal(detail.response.status, 200);
  const product = ProductDetailSchema.parse(detail.body);
  assert.equal(detail.body.versionId, demoId('demo-partner-v2'));
  assert.equal(product.versionNumber, 2); assert.equal(product.questionCount, 6); assert.equal(product.purchaseUrl, null);
  assert.equal(product.publicSample.summary.includes('公开样例'), true);
  assert.equal(product.redemptionNotice.length > 0 && product.purchaseNotice.length > 0, true);
  const json = JSON.stringify({ catalog, product });
  for (const key of ['configuration', 'weight', 'points', 'templates', 'digest', 'tokenDigest', 'ownerUserId', privateMarker]) assert.equal(json.includes('"' + key + '"'), false);
  assert.equal(detail.response.headers.get('cache-control'), 'no-store');
});

test('combined filters, price/time boundaries and AND tags keep totals consistent', async () => {
  const combined = await page('?q=' + encodeURIComponent('协作') + '&category=relationships&tags=demo,cooperation&minPriceFen=990&maxPriceFen=990&minDurationMinutes=3&maxDurationMinutes=3&experienceType=score&pageSize=1');
  assert.equal(combined.total, 1); assert.equal(combined.items[0]?.slug, 'demo-partner');
  assert.deepEqual((await page('?maxPriceFen=500')).items.map(value => value.slug), ['demo-social']);
  assert.deepEqual((await page('?minDurationMinutes=3')).items.map(value => value.slug), ['demo-partner']);
  assert.deepEqual((await page('?maxDurationMinutes=1')).items.map(value => value.slug), ['demo-social']);
  assert.equal((await page('?experienceType=tendency')).total, 2);
  assert.equal((await page('?tags=demo,energy')).total, 1);
  assert.equal((await page('?tags=energy,cooperation')).total, 0);
  assert.equal((await page('?category=life')).total, 0);
  assert.equal((await page('?category=does-not-exist')).total, 0);
  assert.equal((await page('?q=' + encodeURIComponent('无匹配话题'))).total, 0);
  assert.equal((await page('?minPriceFen=3000')).total, 0);
  const beyond = await page('?category=relationships&page=2&pageSize=1');
  assert.equal(beyond.total, 1); assert.deepEqual(beyond.items, []);
});

test('latest and recommendation sorting are deterministic across page boundaries', async () => {
  const expected = DemoProducts.map(value => demoId(value.slug)).sort();
  const pages = [];
  for (let index = 1; index <= 3; index++) pages.push(await page('?sort=latest&page=' + index + '&pageSize=1'));
  assert.deepEqual(pages.map(value => value.items[0]!.id), expected);
  assert.equal(pages.every(value => value.total === 3), true);
  assert.deepEqual((await page('?sort=latest&page=1&pageSize=1')), pages[0]);
  assert.deepEqual((await page('?sort=recommended')).items.map(value => value.slug), ['demo-work', 'demo-partner', 'demo-social']);
});

test('keyword search treats wildcards literally and never searches private templates', async () => {
  for (const keyword of ['literal', '_', '%', '\\']) {
    assert.deepEqual((await page('?q=' + encodeURIComponent(keyword))).items.map(value => value.slug), ['demo-work']);
  }
  assert.equal((await page('?q=' + privateMarker)).total, 0);
  assert.equal((await page('?q=' + encodeURIComponent("' OR 1=1 --"))).total, 0);
});

test('invalid queries and unknown/private routes use stable errors without leaking rules', async () => {
  for (const query of ['?page=0', '?pageSize=51', '?page=1.5', '?sort=hot', '?scope=live', '?include=configuration',
    '?minPriceFen=100&maxPriceFen=99', '?minDurationMinutes=5&maxDurationMinutes=1', '?tags[]=demo', '?q[$ne]=x']) {
    const { response, body } = await read('/api/products' + query);
    assert.equal(response.status, 400, query); assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.equal(body.error.requestId, response.headers.get('x-request-id'));
  }
  for (const path of ['/api/products/fixture-draft', '/api/products/fixture-archived', '/api/products/missing-product',
    '/api/products/demo-partner/versions/1']) {
    const { response, body } = await read(path);
    assert.equal(response.status, 404); assert.equal(body.error.code, 'NOT_FOUND'); assert.equal(JSON.stringify(body).includes('configuration'), false);
  }
  const privatePreview = await read('/api/admin/products/' + partner + '/versions/' + demoId('demo-partner-v1') + '/preview');
  assert.equal(privatePreview.response.status, 401); assert.equal(privatePreview.body.error.code, 'AUTH_REQUIRED');
  assert.equal(JSON.stringify(privatePreview.body).includes('configuration'), false);
  assert.equal((await read('/api/products/demo_partner')).response.status, 400);
  assert.equal((await read('/api/products/demo-partner?version=1')).response.status, 400);
  assert.equal((await read('/api/categories?scope=live')).response.status, 400);
});

test('production policy excludes demo goods and demo-only tags even when callers know the slug', async () => {
  const result = await read('/api/products', productionUrl); assert.equal(result.response.status, 200);
  assert.equal(result.body.total, 1); assert.equal(result.body.items[0].id, liveId); assert.equal(result.body.items[0].isDemo, false);
  assert.equal((await read('/api/products/demo-partner', productionUrl)).response.status, 404);
  assert.equal((await read('/api/products/live-scope-fixture')).response.status, 404);
  const tags = await read('/api/tags', productionUrl); assert.deepEqual(tags.body.map((value: { slug: string }) => value.slug), ['cooperation']);
  await fixture.runtime.client.product.update({ where: { id: liveId }, data: { status: 'ARCHIVED' } });
  try {
    const empty = await read('/api/products', productionUrl); assert.equal(empty.body.total, 0); assert.deepEqual(empty.body.items, []);
    assert.deepEqual((await read('/api/tags', productionUrl)).body, []);
  } finally { await fixture.runtime.client.product.update({ where: { id: liveId }, data: { status: 'PUBLISHED' } }); }
});

test('owner credentials, fresh administrator role and opaque access are all required for private preview', async () => {
  await reject(authority.authorizeLocalOwner(fixture.runtime.client, DemoIdentityScenarios.admin.id), 'FORBIDDEN');
  await reject(authority.authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.verified.id), 'FORBIDDEN');
  await reject(production.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.admin.id), 'FORBIDDEN');
  const forged = { actorUserId: DemoIdentityScenarios.admin.id, scope: 'DEMO' } as CatalogAdminAccess;
  await reject(versions.preview(forged, partner, demoId('demo-partner-v1')), 'FORBIDDEN');
  await fixture.runtime.client.user.update({ where: { id: access.actorUserId }, data: { disabledAt: new Date() } });
  try { await reject(versions.preview(access, partner, demoId('demo-partner-v1')), 'FORBIDDEN'); }
  finally { await fixture.runtime.client.user.update({ where: { id: access.actorUserId }, data: { disabledAt: null } }); }
  await fixture.owner.client.environmentMarker.update({ where: { id: 1 }, data: { environment: 'PRODUCTION' } });
  try { await reject(versions.preview(access, partner, demoId('demo-partner-v1')), 'FORBIDDEN'); }
  finally { await fixture.owner.client.environmentMarker.update({ where: { id: 1 }, data: { environment: 'TEST' } }); }
});

test('invalid configuration is rejected before creating a version or an audit record', async () => {
  const invalid = structuredClone(changedConfiguration); invalid.bands[1]!.min = 39;
  const beforeCount = await fixture.runtime.client.productVersion.count({ where: { productId: partner } });
  const audits = await fixture.runtime.client.adminAuditLog.count();
  const validation = await versions.validate(access, invalid); assert.equal(validation.valid, false); assert.ok(validation.issues.length);
  await reject(versions.importConfiguration(access, partner, { configuration: invalid, requestId: randomUUID() }), 'INVALID_CONFIGURATION');
  assert.equal(await fixture.runtime.client.productVersion.count({ where: { productId: partner } }), beforeCount);
  assert.equal(await fixture.runtime.client.adminAuditLog.count(), audits);
});

test('concurrent duplicate imports create one draft and one audit, and mismatched replays fail', async () => {
  const requestId = randomUUID(), audits = await fixture.runtime.client.adminAuditLog.count();
  const [first, second] = await Promise.all([
    versions.importConfiguration(access, partner, { configuration: changedConfiguration, requestId }),
    versions.importConfiguration(access, partner, { configuration: changedConfiguration, requestId }),
  ]);
  assert.deepEqual(first, second); assert.equal(first.number, 3); assert.equal(first.status, 'draft'); version3 = first;
  assert.equal(await fixture.runtime.client.adminAuditLog.count(), audits + 1);
  const changed = structuredClone(changedConfiguration); changed.questions[0]!.text += '不同载荷';
  await reject(versions.importConfiguration(access, partner, { configuration: changed, requestId }), 'IDEMPOTENCY_CONFLICT');
  const preview = await versions.preview(access, partner, version3.id);
  assert.equal(preview.configuration.report.templates[0]!.explanation, privateMarker); assert.equal(preview.isPreview, true);
  assert.equal((await read('/api/products/demo-partner')).body.versionNumber, 2);
});

test('different concurrent imports allocate consecutive unique version numbers', async () => {
  const responses = await Promise.all([0, 1].map(() => versions.importConfiguration(access, partner, { configuration: changedConfiguration, requestId: randomUUID() })));
  assert.deepEqual(responses.map(value => value.number).sort(), [4, 5]);
  assert.notEqual(responses[0]!.id, responses[1]!.id);
});

test('editing a reviewed draft resets review and unreviewed versions cannot publish', async () => {
  await versions.review(access, partner, version3.id, { requestId: randomUUID() });
  await versions.replaceDraft(access, partner, version3.id, { configuration: changedConfiguration, requestId: randomUUID() });
  assert.equal((await fixture.runtime.client.productVersion.findUniqueOrThrow({ where: { id: version3.id } })).status, 'DRAFT');
  await reject(versions.publish(access, partner, version3.id, { requestId: randomUUID() }), 'CONFLICT');
  await versions.review(access, partner, version3.id, { requestId: randomUUID() });
});

test('publication revalidates configuration and metadata and rolls all state back on failure', async () => {
  const original = await fixture.runtime.client.product.findUniqueOrThrow({ where: { id: partner } });
  const beforeAudits = await fixture.runtime.client.adminAuditLog.count();
  await fixture.runtime.client.product.update({ where: { id: partner }, data: { publicSample: { ...demoPublicSample(changedConfiguration), isDemo: false } } });
  try { await reject(versions.publish(access, partner, version3.id, { requestId: randomUUID() }), 'INVALID_CONFIGURATION'); }
  finally { await fixture.runtime.client.product.update({ where: { id: partner }, data: { publicSample: original.publicSample as Prisma.InputJsonValue } }); }
  const invalid = structuredClone(changedConfiguration); invalid.questions[0]!.dimensionId = 'unknown-dimension';
  // Even deliberately corrupted owner fixtures retain a new history revision.
  await fixture.owner.client.productVersion.update({ where: { id: version3.id }, data: { configuration: invalid as Prisma.InputJsonValue, revision: { increment: 1 } } });
  try { await reject(versions.publish(access, partner, version3.id, { requestId: randomUUID() }), 'INVALID_CONFIGURATION'); }
  finally { await fixture.owner.client.productVersion.update({ where: { id: version3.id }, data: { configuration: changedConfiguration as Prisma.InputJsonValue, revision: { increment: 1 } } }); }
  assert.equal((await fixture.runtime.client.product.findUniqueOrThrow({ where: { id: partner } })).currentVersionId, original.currentVersionId);
  assert.equal((await fixture.runtime.client.productVersion.findUniqueOrThrow({ where: { id: version3.id } })).status, 'REVIEWED');
  assert.equal(await fixture.runtime.client.adminAuditLog.count(), beforeAudits);
});

test('publishing switches the catalog once and cannot rewrite a published rule or report snapshot', async () => {
  const previousReport = await fixture.runtime.client.report.findUniqueOrThrow({ where: { id: demoId('report-population-0') } });
  await reviewThreejsFixture(app,fixture,access,version3.id);
  await versions.review(access,partner,version3.id,{requestId:randomUUID()});
  const requestId = randomUUID(), audits = await fixture.runtime.client.adminAuditLog.count();
  const [first, second] = await Promise.all([versions.publish(access, partner, version3.id, { requestId }), versions.publish(access, partner, version3.id, { requestId })]);
  assert.deepEqual(first, second); assert.equal(first.status, 'published'); assert.equal(await fixture.runtime.client.adminAuditLog.count(), audits + 1);
  await reject(versions.replaceDraft(access, partner, version3.id, { configuration: changedConfiguration, requestId: randomUUID() }), 'VERSION_IMMUTABLE');
  const detail = await read('/api/products/demo-partner'); assert.equal(detail.body.versionNumber, 3);
  assert.equal(JSON.stringify(detail.body).includes(privateMarker), false);
  assert.equal((await page('?q=' + privateMarker)).total, 0);
  const attempt = await fixture.runtime.client.attempt.findUniqueOrThrow({ where: { id: demoId('attempt-population-0') } });
  const oldVersion = await runtimeVersions.read(attempt.productVersionId); assert.equal(oldVersion.number, 1);
  assert.deepEqual(oldVersion.configuration, DemoProducts[0]!.configurations[0]);
  assert.deepEqual((await fixture.runtime.client.report.findUniqueOrThrow({ where: { id: previousReport.id } })).snapshot, previousReport.snapshot);
});

test('unlisting hides current sales but retains the old entitlement and runtime version', async () => {
  const entitlement = await fixture.runtime.client.entitlement.findUniqueOrThrow({ where: { id: demoId('entitlement-partial') } });
  const request = { requestId: randomUUID() };
  const archived = await versions.archive(access, partner, request); assert.equal(archived.status, 'archived');
  assert.deepEqual(await versions.archive(access, partner, request), archived);
  assert.equal((await read('/api/products/demo-partner')).response.status, 404);
  assert.equal((await page('?category=relationships')).total, 0);
  assert.deepEqual(await fixture.runtime.client.entitlement.findUniqueOrThrow({ where: { id: entitlement.id } }), entitlement);
  assert.equal((await runtimeVersions.read(entitlement.productVersionId)).number, 1);
  assert.equal((await versions.preview(access, partner, version3.id)).version.status, 'published');
});

test('the actual maintenance CLI validates, imports, previews, reviews, publishes and archives using owner authority', async () => {
  const file = join(directory, 'configuration.json');
  await writeFile(file, JSON.stringify(changedConfiguration), { mode: 0o600 });
  async function command(action: string, args: string[] = []) {
    const result = await execute(process.execPath, ['.test-build/scripts/catalog-cli.js', action, '--actor', DemoIdentityScenarios.admin.id,
      ...args], { env: fixture.env, maxBuffer: 1_000_000 });
    return JSON.parse(result.stdout);
  }
  assert.equal((await command('validate', ['--file', file])).valid, true);
  const imported = await command('import', ['--product', 'fixture-draft', '--file', file, '--request-id', randomUUID()]);
  assert.equal(imported.number, 2); assert.equal(imported.status, 'draft');
  assert.equal((await command('preview', ['--product', 'fixture-draft', '--version', '2'])).isPreview, true);
  assert.equal((await command('review', ['--product', 'fixture-draft', '--version', '2'])).status, 'reviewed');
  await assert.rejects(command('publish', ['--product', 'fixture-draft', '--version', '2']));
  await reviewThreejsFixture(app,fixture,access,imported.id);
  assert.equal((await command('review', ['--product', 'fixture-draft', '--version', '2'])).status, 'reviewed');
  assert.equal((await command('publish', ['--product', 'fixture-draft', '--version', '2'])).status, 'published');
  assert.equal((await read('/api/products/fixture-draft')).response.status, 200);
  assert.equal((await command('archive', ['--product', 'fixture-draft'])).status, 'archived');
  assert.equal((await read('/api/products/fixture-draft')).response.status, 404);
  await assert.rejects(execute(process.execPath, ['.test-build/scripts/catalog-cli.js', 'preview', '--actor', DemoIdentityScenarios.admin.id,
    '--product', 'demo-partner', '--version', '1'], { env: { ...fixture.env, MIGRATION_DATABASE_URL: fixture.env.DATABASE_URL }, maxBuffer: 1_000_000 }),
  (error: unknown) => {
    const result = error as { stdout: string; stderr: string };
    assert.equal(result.stdout.trim(), ''); assert.equal(result.stderr.includes('configuration'), false);
    assert.equal(result.stderr.includes(privateMarker), false); return true;
  });
});
