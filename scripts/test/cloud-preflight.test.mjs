import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadConfiguration } from '../../apps/api/dist/config/configuration.js';
import { inspectCloudConfiguration } from '../cloud-preflight-lib.mjs';
import { runPreflight } from '../cloud-preflight.mjs';

const fixture = () => ({
  NODE_ENV: 'production', APP_ENV: 'production', API_HOST: '0.0.0.0', API_PORT: '4100',
  APP_PUBLIC_ORIGIN: 'https://store.unit.test', VITE_APP_PUBLIC_ORIGIN: 'https://store.unit.test',
  CSRF_SIGNING_KEY: Buffer.alloc(32, 1).toString('base64url'),
  AUTH_SESSION_ENCRYPTION_KEY: Buffer.alloc(32, 2).toString('base64url'),
  DATABASE_URL: 'postgresql://orai_app.testref:synthetic-runtime-pass@unit.pooler.supabase.com:5432/postgres?schema=orai',
  MIGRATION_DATABASE_URL: 'postgresql://orai_owner.testref:synthetic-owner-pass@unit.pooler.supabase.com:5432/postgres?schema=orai',
  DATABASE_SSL_MODE: 'verify-full', DATABASE_POOL_MAX: '5', ASSET_STORAGE_DRIVER: 'disabled',
  SUPABASE_URL: 'https://auth.unit.test', VITE_SUPABASE_URL: 'https://auth.unit.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_' + 'x'.repeat(24),
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_' + 'x'.repeat(24),
});
const inspect = env => inspectCloudConfiguration(env, loadConfiguration);
const has = (report, code) => report.issues.some(item => item.code === code);
const invalid = (env, code) => { const result = inspect(env); assert.equal(result.configurationValid, false); assert.ok(has(result, code), code); return result; };
const withInventory = async (env, action) => {
  const directory = mkdtempSync(join(tmpdir(), 'orai-cloud-preflight-'));
  const file = join(directory, 'inventory.env');
  writeFileSync(file, Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n'), { mode: 0o600 });
  try { return await action(file); } finally { rmSync(directory, { recursive: true, force: true }); }
};

test('valid offline production configuration cannot pass cloud deployment gaps', () => {
  const result = inspect(fixture());
  assert.equal(result.configurationValid, true);
  assert.equal(result.deployable, false);
  assert.equal(result.actualCloudValidationPassed, false);
  assert.equal(result.cloudConnectionsMade, 0);
  assert.equal(result.databaseConnectionsMade, 0);
  assert.ok(has(result, 'PERSISTENT_ASSET_STORAGE_NOT_CONFIGURED'));
  assert.ok(has(result, 'VPS_ROUTE_TLS_AND_RUNTIME_NOT_VERIFIED'));
});

test('implemented R2/VPS adapters are distinguished from real deployment and provider validation',()=>{
  const result=inspect({...fixture(),ASSET_STORAGE_DRIVER:'r2',R2_ACCOUNT_ID:'a'.repeat(32),R2_BUCKET:'orai-private',
    R2_ACCESS_KEY_ID:'b'.repeat(32),R2_SECRET_ACCESS_KEY:'c'.repeat(64),UPLOAD_INGRESS_BODY_BYTES:'90000000',
    UPLOAD_REQUEST_ENVELOPE_BYTES:'0',ASSET_UPLOAD_TIMEOUT_MS:'360000'});
  assert.equal(has(result,'PERSISTENT_ASSET_ADAPTER_NOT_IMPLEMENTED'),false);
  assert.equal(has(result,'WORKER_CONTAINER_ROUTING_NOT_IMPLEMENTED'),false);
  assert.equal(result.configurationValid,true);assert.equal(result.deployable,false);
  assert.equal(result.cloudConnectionsMade,0);assert.equal(result.secretsIncluded,false);
});

test('production sample is incomplete and never silently uses local .env credentials', async () => {
  const sample = await runPreflight(['--env-file', new URL('../../.env.production.example', import.meta.url)]);
  assert.equal(sample.exitCode, 1);
  assert.ok(has(sample.report, 'PLACEHOLDER_NOT_REPLACED'));
  await withInventory({}, async file => {
    const result = await runPreflight(['--env-file', file]);
    assert.equal(result.exitCode, 1);
    assert.ok(has(result.report, 'REQUIRED_VALUE_MISSING'));
  });
});

test('frontend and API origins require the same single public HTTPS origin', () => {
  for (const value of ['http://store.unit.test', 'https://127.0.0.1', 'https://localhost.', 'https://store.unit.test/path', 'https://store.unit.test?secret=x', 'https://store.unit.test,https://other.unit.test']) {
    invalid({ ...fixture(), APP_PUBLIC_ORIGIN: value }, 'FRONTEND_ORIGIN_MISMATCH_OR_INVALID');
  }
  invalid({ ...fixture(), VITE_APP_PUBLIC_ORIGIN: 'https://other.unit.test' }, 'FRONTEND_ORIGIN_MISMATCH_OR_INVALID');
});

test('frontend Auth project/key and public publishable key type are checked against API configuration', () => {
  invalid({ ...fixture(), VITE_SUPABASE_URL: 'https://other-auth.unit.test' }, 'AUTH_PROJECT_MISMATCH_OR_INVALID');
  invalid({ ...fixture(), VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_' + 'z'.repeat(24) }, 'PUBLIC_AUTH_KEY_MISMATCH');
  for (const key of ['sb_secret_' + 's'.repeat(24), 'a.' + Buffer.from('{"role":"service_role"}').toString('base64url') + '.b']) {
    invalid({ ...fixture(), SUPABASE_PUBLISHABLE_KEY: key, VITE_SUPABASE_PUBLISHABLE_KEY: key }, 'API_PRODUCTION_CONFIGURATION_REJECTED');
  }
});

test('all unexpected VITE fields are refused without reflecting secret-bearing names or values', () => {
  const secret = 'SYNTHETIC_SECRET_MUST_NOT_APPEAR';
  for (const field of ['VITE_DATABASE_URL', 'VITE_AUTH_SESSION_ENCRYPTION_KEY', 'VITE_' + secret]) {
    const result = invalid({ ...fixture(), [field]: secret }, 'UNKNOWN_FRONTEND_FIELD_FORBIDDEN');
    assert.ok(!JSON.stringify(result).includes(secret));
    assert.deepEqual(result.issues.find(item => item.code === 'UNKNOWN_FRONTEND_FIELD_FORBIDDEN').fields, ['VITE_*']);
  }
});

test('verified TLS has one source of truth for both database connections', () => {
  invalid({ ...fixture(), DATABASE_SSL_MODE: 'disable' }, 'VERIFIED_DATABASE_TLS_REQUIRED');
  for (const field of ['DATABASE_URL', 'MIGRATION_DATABASE_URL']) {
    invalid({ ...fixture(), [field]: fixture()[field] + '&sslmode=require' }, 'URL_TLS_OPTIONS_FORBIDDEN');
  }
});

test('runtime and migration roles/passwords stay separate and target the same Session Pooler database', () => {
  invalid({ ...fixture(), DATABASE_URL: fixture().MIGRATION_DATABASE_URL }, 'DISTINCT_RESTRICTED_RUNTIME_ROLE_REQUIRED');
  invalid({ ...fixture(), DATABASE_URL: fixture().DATABASE_URL.replace('orai_app', 'postgres') }, 'DISTINCT_RESTRICTED_RUNTIME_ROLE_REQUIRED');
  invalid({ ...fixture(), DATABASE_URL: fixture().DATABASE_URL.replace('synthetic-runtime-pass', 'synthetic-owner-pass') }, 'DISTINCT_RESTRICTED_RUNTIME_ROLE_REQUIRED');
  invalid({ ...fixture(), MIGRATION_DATABASE_URL: fixture().MIGRATION_DATABASE_URL.replace('/postgres?', '/other?') }, 'DATABASE_TARGET_MISMATCH');
  invalid({ ...fixture(), DATABASE_URL: fixture().DATABASE_URL.replace(':5432/', ':6543/') }, 'SESSION_POOLER_PORT_REQUIRED');
});

test('local databases, wrong schema and unsafe database URL schemes fail before any connection', () => {
  for (const value of ['postgresql://app:pass@127.0.0.1:55432/local?schema=orai', 'https://db.unit.test/postgres', 'not a URL']) {
    invalid({ ...fixture(), DATABASE_URL: value }, 'DATABASE_URL_INVALID_OR_LOCAL');
  }
  invalid({ ...fixture(), DATABASE_URL: fixture().DATABASE_URL.replace('schema=orai', 'schema=public') }, 'DATABASE_SCHEMA_OPTIONS_INVALID');
  invalid({ ...fixture(), DATABASE_URL: fixture().DATABASE_URL + '&schema=public' }, 'DATABASE_SCHEMA_OPTIONS_INVALID');
});

test('real API loader rejects production local storage and incomplete R2 configuration', () => {
  for (const driver of ['local', 'r2']) invalid({ ...fixture(), ASSET_STORAGE_DRIVER: driver }, 'API_PRODUCTION_CONFIGURATION_REJECTED');
  assert.equal(inspect(fixture()).deployable, false);
});

test('distinct stable keys, bounded proxy trust and absence of local auth overrides are required', () => {
  invalid({ ...fixture(), CSRF_SIGNING_KEY: fixture().AUTH_SESSION_ENCRYPTION_KEY }, 'DISTINCT_STABLE_KEYS_REQUIRED');
  invalid({ ...fixture(), TRUST_PROXY_CIDRS: '0.0.0.0/0' }, 'UNBOUNDED_PROXY_TRUST_FORBIDDEN');
  invalid({ ...fixture(), LOCAL_AUTH_ENABLED: '1' }, 'LOCAL_DEVELOPMENT_SETTINGS_FORBIDDEN');
});

test('unexpected loader errors cannot expose thrown credentials or stack traces', () => {
  const secret = 'SYNTHETIC_THROWN_PASSWORD';
  const result = inspectCloudConfiguration(fixture(), () => { throw new Error(secret); });
  assert.equal(result.configurationValid, false);
  assert.ok(!JSON.stringify(result).includes(secret));
  assert.ok(has(result, 'API_PRODUCTION_CONFIGURATION_REJECTED'));
});

test('CLI uses exit 2 for valid format with known gaps and prints no input secrets', async () => {
  await withInventory(fixture(), async file => {
    const child = spawnSync(process.execPath, ['scripts/cloud-preflight.mjs', '--env-file', file], { encoding: 'utf8' });
    assert.equal(child.status, 2);
    assert.equal(child.stderr, '');
    const report = JSON.parse(child.stdout);
    assert.equal(report.configurationValid, true);
    assert.equal(report.deployable, false);
    for (const field of ['DATABASE_URL', 'MIGRATION_DATABASE_URL', 'CSRF_SIGNING_KEY', 'AUTH_SESSION_ENCRYPTION_KEY', 'SUPABASE_PUBLISHABLE_KEY']) assert.ok(!child.stdout.includes(fixture()[field]));
  });
});

test('unreadable input paths and invalid arguments produce fixed errors without echoing them', async () => {
  const sentinel = 'SYNTHETIC_PATH_SECRET';
  for (const args of [[], ['--token', sentinel], ['--env-file', '/missing/' + sentinel]]) {
    const result = await runPreflight(args);
    assert.equal(result.exitCode, 1);
    assert.ok(!JSON.stringify(result).includes(sentinel));
  }
});
