import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { readdirSync } from 'node:fs';
import type { Pool } from 'pg';
import { createDatabaseClient } from '../src/database/client';
import { createManagedPool } from '../src/database/pool';
import { loadConfiguration } from '../src/config/configuration';
import { assertLocalTarget, provisionLocalDatabase } from '../scripts/local-database';
import { seedDemo } from '../scripts/seed-demo';
import { demoId, DemoIdentityScenarios, DemoProducts, demoPublicSample } from '../scripts/demo-fixtures';
import { ProductConfigurationSchema } from '@orai/contracts/admin';
import { ReportContentSchema } from '@orai/contracts';
import { toPublicProduct } from '../src/catalog/projections';

const execute = promisify(execFile);
let admin: Pool;
let owner: Pool;
let adminConnection: ReturnType<typeof createManagedPool>;
let ownerConnection: ReturnType<typeof createManagedPool>;
let runtime: ReturnType<typeof createDatabaseClient>;
let env: NodeJS.ProcessEnv;
let name: string;
let created = false;
let generated: Awaited<ReturnType<typeof seedDemo>>;

before(async () => {
  const target = assertLocalTarget(process.env);
  name = 'orai_test_t02_' + randomBytes(5).toString('hex');
  adminConnection = createManagedPool({ connectionString: target.migration.toString(), max: 1 });
  admin = adminConnection.pool;
  await admin.query('CREATE DATABASE "' + name + '"');
  created = true;
  target.migration.pathname = '/' + name; target.runtime.pathname = '/' + name;
  env = { ...process.env, APP_ENV: 'test', NODE_ENV: 'test', MIGRATION_DATABASE_URL: target.migration.toString(),
    DATABASE_URL: target.runtime.toString(), DEMO_SEED_DATABASE: name };
  ownerConnection = createManagedPool({ connectionString: env.MIGRATION_DATABASE_URL, max: 1 });
  owner = ownerConnection.pool;
  await owner.query('CREATE SCHEMA auth');
  await owner.query('CREATE TABLE auth.identity_sentinel (id integer PRIMARY KEY)');
  await owner.query('INSERT INTO auth.identity_sentinel VALUES (1)');
  const empty = await owner.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'orai'");
  assert.equal(empty.rows[0].count, 0);
  await execute(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, maxBuffer: 1_000_000 });
  await provisionLocalDatabase(env);
  runtime = createDatabaseClient(loadConfiguration(env));
  generated = await seedDemo(env);
});

after(async () => {
  try {
    await runtime?.close();
    await ownerConnection?.close();
    if (created) {
      const remaining = await admin.query('SELECT pid, usename, state FROM pg_stat_activity WHERE datname=$1', [name]);
      assert.deepEqual(remaining.rows, [], 'All Prisma, seed and provisioning connections must close before database removal');
      await admin.query('DROP DATABASE "' + name + '"');
    }
  } finally { await adminConnection?.close(); }
});

async function rejectSql(sql: string, values: unknown[], code: string) {
  await assert.rejects(runtime.pool.query(sql, values), (error: { code?: string }) => error.code === code);
}

test('empty database migrations are complete and leave the auth schema untouched', async () => {
  const rows = await owner.query('SELECT count(*)::int AS count FROM orai._prisma_migrations WHERE finished_at IS NOT NULL');
  const migrations = readdirSync('prisma/migrations', { withFileTypes: true }).filter(entry => entry.isDirectory()).length;
  assert.equal(rows.rows[0].count, migrations);
  assert.equal((await owner.query('SELECT id FROM auth.identity_sentinel')).rows[0].id, 1);
  assert.equal((await owner.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'")).rows[0].count, 0);
});

test('repeat seed preserves every record, code digest, historical snapshot and aggregate count', async () => {
  async function state() {
    const tables = await owner.query<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_schema='orai' AND table_name <> '_prisma_migrations' ORDER BY table_name");
    const counts: Record<string, number> = {};
    for (const { table_name } of tables.rows) {
      assert.match(table_name, /^[a-z_]+$/);
      counts[table_name] = (await owner.query('SELECT count(*)::int AS count FROM orai."' + table_name + '"')).rows[0].count;
    }
    return { counts,
      codes: await runtime.client.redemptionCode.findMany({ select: { id: true, digest: true, status: true }, orderBy: { id: 'asc' } }),
      reports: await runtime.client.report.findMany({ select: { id: true, snapshot: true, deletedAt: true }, orderBy: { id: 'asc' } }),
      questions: await runtime.client.questionStat.findMany({ orderBy: [{ productVersionId: 'asc' }, { questionId: 'asc' }], select: { productVersionId: true, questionId: true, answerCount: true } }),
      results: await runtime.client.resultStat.findMany({ orderBy: { productVersionId: 'asc' }, select: { productVersionId: true, completedCount: true } }),
      grants: await runtime.client.accessGrant.findMany({ orderBy: [{ sessionId: 'asc' }, { entitlementId: 'asc' }] }),
    };
  }
  const first = await state();
  const repeat = await seedDemo(env);
  assert.deepEqual(repeat.codes, {}); assert.deepEqual(repeat.sessions, {});
  assert.deepEqual(await state(), first);
});

test('five categories, three products, state fixtures and both partner versions exist', async () => {
  assert.equal(await runtime.client.category.count(), 5);
  const main = await runtime.client.product.findMany({ where: { slug: { in: DemoProducts.map(product => product.slug) } } });
  assert.equal(main.length, 3); assert.equal(main.every(product => product.status === 'PUBLISHED' && product.scope === 'DEMO'), true);
  assert.equal(await runtime.client.product.count({ where: { category: { slug: { in: ['life', 'fun'] } } } }), 0);
  assert.equal((await runtime.client.product.findUniqueOrThrow({ where: { slug: 'fixture-draft' } })).status, 'DRAFT');
  assert.equal((await runtime.client.product.findUniqueOrThrow({ where: { slug: 'fixture-archived' } })).status, 'ARCHIVED');
  const versions = await runtime.client.productVersion.findMany({ where: { productId: demoId('demo-partner') }, orderBy: { number: 'asc' } });
  assert.equal(versions.length, 2); assert.notDeepEqual(versions[0]!.configuration, versions[1]!.configuration);
  assert.equal((await runtime.client.product.findUniqueOrThrow({ where: { slug: 'demo-work' } })).coverUrl, null);
});

test('public catalog DTOs are allowlisted and old reports keep their original version', async () => {
  const product = await runtime.client.product.findUniqueOrThrow({ where: { slug: 'demo-partner' },
    include: { category: true, tags: { include: { tag: true } }, currentVersion: true } });
  const withPrivateFields = { ...product, privateSentinel: 'PRIVATE_CONFIG_SENTINEL' };
  const publicProduct = toPublicProduct(withPrivateFields);
  assert.equal(publicProduct.versionNumber, 2); assert.equal(publicProduct.price.amountFen, 990); assert.equal(publicProduct.isDemo, true);
  const json = JSON.stringify(publicProduct);
  for (const key of ['configuration', 'weight', 'points', 'templates', 'retention', 'PRIVATE_CONFIG_SENTINEL']) assert.equal(json.includes(key), false);
  assert.equal(publicProduct.purchaseUrl, null);
  const report = await runtime.client.report.findUniqueOrThrow({ where: { id: demoId('report-population-0') } });
  assert.equal(report.productVersionId, demoId('demo-partner-v1'));
  assert.equal(ReportContentSchema.parse(report.snapshot).versionNumber, 1);
  await rejectSql("UPDATE orai.product_versions SET configuration = jsonb_set(configuration,'{report,disclaimer}','\"changed\"') WHERE id=$1::uuid", [report.productVersionId], 'P0001');
  await rejectSql('DELETE FROM orai.product_versions WHERE id=$1::uuid', [report.productVersionId], 'P0001');
  assert.deepEqual((await runtime.client.report.findUniqueOrThrow({ where: { id: report.id } })).snapshot, report.snapshot);
});

test('runtime role can perform business CRUD but cannot migrate, change roles or read auth data', async () => {
  const flags = await runtime.pool.query('SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname=current_user');
  assert.equal(Object.values(flags.rows[0]).some(Boolean), false);
  const createdUser = await runtime.client.user.create({ data: { supabaseUserId: randomUUID(), scope: 'DEMO' } });
  assert.equal(createdUser.role, 'USER');
  await rejectSql("INSERT INTO orai.users (id,supabase_user_id,scope,role,updated_at) VALUES ($1::uuid,$2::uuid,'DEMO','ADMIN',now())",
    [randomUUID(), randomUUID()], 'P0001');
  await rejectSql("UPDATE orai.users SET role='ADMIN' WHERE id=$1::uuid", [createdUser.id], '42501');
  await rejectSql('CREATE TABLE orai.unwanted (id int)', [], '42501');
  await rejectSql('SELECT * FROM orai._prisma_migrations', [], '42501');
  await rejectSql("UPDATE orai.environment_marker SET environment='PRODUCTION' WHERE id=1", [], '42501');
  await rejectSql('SELECT * FROM auth.identity_sentinel', [], '42501');
  await rejectSql("DELETE FROM orai.admin_audit_logs WHERE id=$1::uuid", [demoId('audit-seed')], '42501');
});

test('unique keys, nonnegative counts, integer money and cross-scope foreign keys are enforced by PostgreSQL', async () => {
  const partial = demoId('entitlement-partial'), version = demoId('demo-partner-v1');
  await rejectSql("INSERT INTO orai.orders (id,platform,reference,product_version_id,scope,amount_fen) VALUES ($1::uuid,'MANUAL','demo:partial',$2::uuid,'DEMO',990)", [randomUUID(), version], '23505');
  await rejectSql("INSERT INTO orai.attempts (id,entitlement_id,product_version_id,scope) VALUES ($1::uuid,$2::uuid,$3::uuid,'DEMO')", [randomUUID(), partial, version], '23505');
  await rejectSql("INSERT INTO orai.attempts (id,entitlement_id,product_version_id,scope,ordinal) VALUES ($1::uuid,$2::uuid,$3::uuid,'LIVE',2)", [randomUUID(), partial, version], '23503');
  await rejectSql('UPDATE orai.products SET price_fen=-1 WHERE id=$1::uuid', [demoId('demo-partner')], '23514');
  await rejectSql("UPDATE orai.question_stats SET answer_count=-1 WHERE product_version_id=$1::uuid AND question_id='question-1'", [version], '23514');
  await rejectSql("UPDATE orai.entitlements SET reports_consumed=2 WHERE id=$1::uuid", [partial], '23514');
});

test('batches, entitlement references and replacements preserve the original order and scope', async () => {
  await rejectSql("INSERT INTO orai.code_batches (id,order_id,scope) VALUES ($1::uuid,$2::uuid,'LIVE')",
    [randomUUID(), demoId('order-partial')], '23503');
  await rejectSql('UPDATE orai.redemption_codes SET entitlement_id=$1::uuid WHERE id=$2::uuid',
    [demoId('entitlement-partial'), demoId('code-pending')], '23503');
  await rejectSql('UPDATE orai.redemption_codes SET replaces_code_id=$1::uuid WHERE id=$2::uuid',
    [demoId('code-partial'), demoId('code-pending')], '23503');
  await rejectSql('UPDATE orai.redemption_codes SET replaces_code_id=id WHERE id=$1::uuid',
    [demoId('code-replacement-new')], '23514');
});

test('answer and conclusion fixtures use actual distinct denominators and isolate versions', async () => {
  const partner = demoId('demo-partner-v1');
  const answerTotal = await runtime.client.questionStat.findUniqueOrThrow({ where: { productVersionId_questionId: { productVersionId: partner, questionId: 'question-1' } } });
  const resultTotal = await runtime.client.resultStat.findUniqueOrThrow({ where: { productVersionId: partner } });
  assert.equal(answerTotal.answerCount, 22); assert.equal(resultTotal.completedCount, 21);
  assert.equal(answerTotal.answerCount - 1, 21); // Exclude the partial current attempt: still above the minimum.
  const options = await runtime.client.questionOptionStat.aggregate({ where: { productVersionId: partner, questionId: 'question-1' }, _sum: { count: true } });
  assert.equal(options._sum.count, answerTotal.answerCount);
  const types = await runtime.client.resultTypeStat.aggregate({ where: { productVersionId: partner }, _sum: { count: true } });
  assert.equal(types._sum.count, resultTotal.completedCount);
  assert.equal((await runtime.client.resultStat.findUniqueOrThrow({ where: { productVersionId: demoId('demo-partner-v2') } })).completedCount, 0);
  assert.equal((await runtime.client.questionStat.findUniqueOrThrow({ where: { productVersionId_questionId: { productVersionId: demoId('demo-partner-v2'), questionId: 'question-1' } } })).answerCount, 0);
  assert.ok((await runtime.client.resultStat.findUniqueOrThrow({ where: { productVersionId: demoId('demo-work-v1') } })).completedCount < 20);
  const actual = await runtime.pool.query("SELECT count(*)::int AS count FROM orai.attempt_answers a JOIN orai.attempts t ON t.id=a.attempt_id WHERE t.product_version_id=$1::uuid AND t.stats_valid AND a.question_id='question-1'", [partner]);
  assert.equal(actual.rows[0].count, answerTotal.answerCount);
});

test('codes and session credentials have high entropy and only their digests are persisted', async () => {
  const raw = generated.codes['unclaimed-ISSUED']!;
  assert.match(raw, /^[A-Za-z0-9_-]{43}$/);
  const row = await runtime.client.redemptionCode.findUniqueOrThrow({ where: { id: demoId('code-unclaimed-ISSUED') } });
  assert.equal(row.digest, createHash('sha256').update(raw).digest('hex')); assert.notEqual(row.digest, raw);
  const token = generated.sessions['multiple-products']!;
  const session = await runtime.client.accessSession.findUniqueOrThrow({ where: { id: demoId('session-multiple-products') }, include: { grants: true } });
  assert.equal(session.tokenDigest, createHash('sha256').update(token).digest('hex')); assert.equal(session.grants.length, 2);
  const fields = (await owner.query("SELECT column_name FROM information_schema.columns WHERE table_schema='orai' AND table_name='redemption_codes'")).rows.map(row => row.column_name);
  assert.equal(fields.includes('code'), false); assert.equal(fields.includes('plaintext'), false);
});

test('bound, refunded, expired, replaced, missing-dimension and deleted fixtures remain distinguishable', async () => {
  const bound = await runtime.client.entitlement.findUniqueOrThrow({ where: { id: demoId('entitlement-bound') }, include: { binding: true } });
  assert.equal(bound.ownerUserId, DemoIdentityScenarios.verified.id); assert.equal(bound.binding?.userId, bound.ownerUserId);
  await rejectSql("UPDATE orai.entitlements SET owner_user_id=$1::uuid WHERE id=$2::uuid", [DemoIdentityScenarios.other.id, bound.id], 'P0001');
  await rejectSql('DELETE FROM orai.entitlement_bindings WHERE entitlement_id=$1::uuid', [bound.id], 'P0001');
  await rejectSql("UPDATE orai.entitlements SET ownership='ACCOUNT_BOUND', owner_user_id=$1::uuid, bound_at=now() WHERE id=$2::uuid",
    [DemoIdentityScenarios.verified.id, demoId('entitlement-pending')], 'P0001');
  assert.equal((await runtime.client.entitlement.findUniqueOrThrow({ where: { id: demoId('entitlement-pending') } })).ownership, 'ANONYMOUS');
  await rejectSql('UPDATE orai.entitlements SET reports_consumed=0 WHERE id=$1::uuid', [bound.id], 'P0001');
  const replacement = await runtime.client.redemptionCode.findUniqueOrThrow({ where: { id: demoId('code-replacement-new') }, include: { replacesCode: true, entitlement: { include: { attempts: true } } } });
  assert.equal(replacement.replacesCode?.status, 'REVOKED'); assert.equal(replacement.entitlement?.reportsConsumed, 0);
  assert.equal(replacement.entitlement?.attempts.length, 1);
  const revoked = await runtime.client.accessGrant.findUniqueOrThrow({ where: { sessionId_entitlementId: { sessionId: demoId('session-reissued'), entitlementId: demoId('entitlement-reissued') } } });
  assert.ok(revoked.revokedAt);
  assert.equal((await runtime.client.entitlement.findUniqueOrThrow({ where: { id: demoId('entitlement-refunded') } })).status, 'REVOKED');
  const expired = await runtime.client.report.findUniqueOrThrow({ where: { id: demoId('report-report-expired') } });
  assert.ok(expired.expiresAt < new Date());
  const missing = await runtime.client.report.findUniqueOrThrow({ where: { id: demoId('report-not-applicable') } });
  assert.equal(ReportContentSchema.parse(missing.snapshot).totalScore, null);
  const deleted = await runtime.client.report.findUniqueOrThrow({ where: { id: demoId('report-deleted-report') } });
  assert.equal(deleted.snapshot, null); assert.ok(deleted.deletedAt);
  await rejectSql('UPDATE orai.reports SET snapshot=$1::jsonb, deleted_at=NULL WHERE id=$2::uuid',
    [JSON.stringify(missing.snapshot), deleted.id], 'P0001');
});

test('demo seeding refuses production flags, remote targets and a production-marked local database without writes', async () => {
  assert.throws(() => assertLocalTarget({ ...env, APP_ENV: 'production' }));
  assert.throws(() => assertLocalTarget({ ...env, NODE_ENV: 'production' }));
  assert.throws(() => assertLocalTarget({ ...env, DEMO_SEED_DATABASE: 'other_database' }));
  assert.throws(() => assertLocalTarget({ ...env, MIGRATION_DATABASE_URL: 'postgresql://owner@remote.example/orai_test' }));
  const count = await runtime.client.attempt.count();
  await owner.query("UPDATE orai.environment_marker SET environment='PRODUCTION' WHERE id=1");
  try { await assert.rejects(seedDemo(env), /refused/); assert.equal(await runtime.client.attempt.count(), count); }
  finally { await owner.query("UPDATE orai.environment_marker SET environment='TEST' WHERE id=1"); }
});

test('a different topic and question count can be added without changing the models or public DTO', async () => {
  const config = structuredClone(DemoProducts[0]!.configurations[0]!);
  config.dimensions = [config.dimensions[0]!];
  config.questions = [{ ...config.questions[0]!, text: '新的话题与题量。' }];
  const validated = ProductConfigurationSchema.parse(config);
  const original = await runtime.client.product.findUniqueOrThrow({ where: { slug: 'demo-partner' } });
  const id = randomUUID();
  const { id: ignored, createdAt, updatedAt, ...data } = original;
  await runtime.client.product.create({ data: { ...data, id, slug: 'new-topic', name: '新的话题', status: 'DRAFT',
    currentVersionId: null, publishedAt: null, publicSample: demoPublicSample(validated) } });
  // Restore this historical shape with owner authority. Runtime publication is
  // exercised through the current Three.js services in publication tests.
  const version = { id: randomUUID() };
  await owner.query(`INSERT INTO orai.product_versions(id,product_id,scope,number,status,configuration,published_at)
    VALUES($1,$2,'DEMO',1,'PUBLISHED',$3::jsonb,now())`, [version.id, id, JSON.stringify(validated)]);
  await runtime.client.product.update({ where: { id }, data: { currentVersionId: version.id, status: 'PUBLISHED', publishedAt: new Date() } });
  const row = await runtime.client.product.findUniqueOrThrow({ where: { id }, include: { category: true, tags: { include: { tag: true } }, currentVersion: true } });
  assert.equal(toPublicProduct(row).questionCount, 1);
});
