import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, statSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

const implementation = await import('../local-auth-config.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
function api() {
  assert.ok(implementation, 'The safe local Auth configuration implementation must exist');
  return implementation;
}
const original = `# operator settings must survive\nAPP_ENV=development
POSTGRES_USER=orai
POSTGRES_PASSWORD=local-fixture-owner
POSTGRES_DB=orai_dev
POSTGRES_PORT=55432
DATABASE_URL=postgresql://orai_app:local-fixture-runtime@127.0.0.1:55432/orai_dev?schema=orai
MIGRATION_DATABASE_URL=postgresql://orai:local-fixture-owner@127.0.0.1:55432/orai_dev?schema=orai
DEMO_SEED_DATABASE=orai_dev
WEB_PORT=5173
API_PORT=4100
CSRF_SIGNING_KEY=${'c'.repeat(43)}
AUTH_SESSION_ENCRYPTION_KEY=${'e'.repeat(42)}A
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_PUBLIC_ORIGIN=
UNRELATED_SETTING=keep-me
`;
function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), 'orai-auth-config-'));
  const envPath = join(directory, '.env'), statePath = join(directory, 'auth-state.json');
  writeFileSync(envPath, original, { mode: 0o600 });
  try { return run({ directory, envPath, statePath }); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

test('setup creates an anon-only local configuration and preserves all business credentials', () => {
  const result = api().planAuthEnvironment(original), before = parseEnv(original), after = parseEnv(result.text);
  for (const key of Object.keys(before).filter(key => !key.startsWith('SUPABASE_') && !key.startsWith('VITE_'))) assert.equal(after[key], before[key]);
  assert.equal(after.SUPABASE_URL, 'http://127.0.0.1:54321');
  assert.equal(after.SUPABASE_URL, after.VITE_SUPABASE_URL);
  assert.equal(after.SUPABASE_PUBLISHABLE_KEY, after.VITE_SUPABASE_PUBLISHABLE_KEY);
  const claims = JSON.parse(Buffer.from(after.SUPABASE_PUBLISHABLE_KEY.split('.')[1], 'base64url'));
  assert.equal(claims.role, 'anon');
  assert.ok(claims.exp > Date.now() / 1000 + 86_400);
  assert.equal(result.config.siteOrigin, 'http://127.0.0.1:5173');
  assert.equal(result.config.mailOrigin, 'http://127.0.0.1:54324');
  assert.ok(result.text.startsWith('# operator settings must survive'));
});

test('repeated setup never rotates Auth keys or changes the file', () => {
  const first = api().planAuthEnvironment(original);
  const second = api().planAuthEnvironment(first.text);
  assert.equal(second.text, first.text);
  assert.deepEqual(second.config, first.config);
});

test('external or partly configured Auth is refused without exposing configuration', () => {
  for (const change of [
    ['SUPABASE_URL=', 'SUPABASE_URL=https://private-project.example.test'],
    ['VITE_SUPABASE_URL=', 'VITE_SUPABASE_URL=http://127.0.0.1:49999'],
    ['SUPABASE_PUBLISHABLE_KEY=', 'SUPABASE_PUBLISHABLE_KEY=private-key-never-log'],
    ['VITE_APP_PUBLIC_ORIGIN=', 'VITE_APP_PUBLIC_ORIGIN=https://private-site.example.test'],
  ]) {
    assert.throws(() => api().planAuthEnvironment(original.replace(...change)), error => {
      assert.doesNotMatch(error.message, /private-project|private-key|private-site/);
      return /refused|configuration/i.test(error.message);
    });
  }
});

test('production and non-owned business targets are refused', () => {
  for (const [from, to] of [
    ['APP_ENV=development', 'APP_ENV=production'],
    ['127.0.0.1:55432', 'db.example.test:55432'],
    ['DEMO_SEED_DATABASE=orai_dev', 'DEMO_SEED_DATABASE=another'],
    ['postgresql://orai_app:', 'postgresql://orai:'],
    ['MIGRATION_DATABASE_URL=postgresql://orai:', 'MIGRATION_DATABASE_URL=postgresql://someone:'],
    ['POSTGRES_PASSWORD=local-fixture-owner', 'POSTGRES_PASSWORD=not-the-owner'],
  ]) assert.throws(() => api().planAuthEnvironment(original.replace(from, to)), /refused|configuration/i);
  assert.throws(() => api().planAuthEnvironment(original + 'NODE_ENV=production\n'), /refused|configuration/i);
});

test('port conflicts, malformed ports and non-loopback site origins are refused', () => {
  for (const extra of ['LOCAL_AUTH_PORT=5173', 'LOCAL_MAIL_PORT=55432', 'LOCAL_AUTH_PORT=54324', 'LOCAL_AUTH_PORT=0', 'LOCAL_AUTH_PORT=65536', 'LOCAL_AUTH_PORT=54x', 'APP_PUBLIC_ORIGIN=https://external.example.test']) {
    assert.throws(() => api().planAuthEnvironment(original + extra + '\n'), /refused|configuration/i);
  }
  const result = api().planAuthEnvironment(original + 'LOCAL_AUTH_PORT=54325\nLOCAL_MAIL_PORT=54326\nWEB_PORT=5174\n');
  assert.equal(result.config.authOrigin, 'http://127.0.0.1:54325');
  assert.equal(result.config.mailOrigin, 'http://127.0.0.1:54326');
  assert.equal(result.config.siteOrigin, 'http://127.0.0.1:5174');
});

test('duplicate managed keys and corrupt ownership markers are refused', () => {
  assert.throws(() => api().planAuthEnvironment(original + 'SUPABASE_URL=\n'), /refused|configuration/i);
  assert.throws(() => api().planAuthEnvironment(original + 'ORAI_LOCAL_AUTH_MANAGED=someone-else\n'), /refused|configuration/i);
});

test('owned setup refuses missing or changed durable secrets and forged anon keys', () => {
  const first = api().planAuthEnvironment(original).text;
  for (const field of ['LOCAL_AUTH_DB_PASSWORD', 'LOCAL_AUTH_JWT_SECRET', 'LOCAL_AUTH_ANON_KEY', 'AUTH_SESSION_ENCRYPTION_KEY', 'CSRF_SIGNING_KEY']) {
    assert.throws(() => api().planAuthEnvironment(first.replace(new RegExp('^' + field + '=.*$', 'm'), field + '=')), /refused|configuration/i);
  }
  const key = parseEnv(first).LOCAL_AUTH_ANON_KEY;
  const pieces = key.split('.');
  pieces[1] = Buffer.from(JSON.stringify({ role: 'service_role', exp: 4_102_444_800 })).toString('base64url');
  assert.throws(() => api().planAuthEnvironment(first.replaceAll(key, pieces.join('.'))), /refused|configuration/i);
  const secret = parseEnv(first).LOCAL_AUTH_JWT_SECRET;
  assert.throws(() => api().planAuthEnvironment(first.replace(secret, 'z'.repeat(64))), /refused|configuration/i);
});

test('status validates enabled configuration and reports disabled state honestly', () => {
  const first = api().planAuthEnvironment(original).text;
  assert.equal(api().readLocalAuthConfig(first).enabled, true);
  assert.throws(() => api().readLocalAuthConfig(original), /refused|configuration/i);
  const changed = first.replace('SUPABASE_URL=http://127.0.0.1:54321', 'SUPABASE_URL=https://other.example.test');
  assert.throws(() => api().readLocalAuthConfig(changed), /refused|configuration/i);
});

test('setup writes a private restore record once and keeps .env private', () => fixture(({ envPath, statePath }) => {
  api().configureLocalAuth(envPath, statePath);
  const first = readFileSync(envPath, 'utf8'), state = readFileSync(statePath, 'utf8');
  api().configureLocalAuth(envPath, statePath);
  assert.equal(readFileSync(envPath, 'utf8'), first);
  assert.equal(readFileSync(statePath, 'utf8'), state);
  assert.equal(statSync(envPath).mode & 0o777, 0o600);
  assert.equal(statSync(statePath).mode & 0o777, 0o600);
}));

test('disable restores only owned application fields; re-enable retains all Auth data keys', () => fixture(({ envPath, statePath }) => {
  api().configureLocalAuth(envPath, statePath);
  const enabled = parseEnv(readFileSync(envPath, 'utf8'));
  writeFileSync(envPath, readFileSync(envPath, 'utf8').replace('UNRELATED_SETTING=keep-me', 'UNRELATED_SETTING=operator-edit'));
  api().disableLocalAuth(envPath, statePath);
  const disabled = parseEnv(readFileSync(envPath, 'utf8'));
  for (const key of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_APP_PUBLIC_ORIGIN']) assert.equal(disabled[key], '');
  assert.equal(disabled.UNRELATED_SETTING, 'operator-edit');
  assert.equal(api().readLocalAuthConfig(readFileSync(envPath, 'utf8'), { requireEnabled: false }).enabled, false);
  assert.throws(() => api().readLocalAuthConfig(readFileSync(envPath, 'utf8')), /disabled/i);
  const text = readFileSync(envPath, 'utf8');
  api().disableLocalAuth(envPath, statePath);
  assert.equal(readFileSync(envPath, 'utf8'), text);
  api().configureLocalAuth(envPath, statePath);
  const restored = parseEnv(readFileSync(envPath, 'utf8'));
  for (const key of ['LOCAL_AUTH_DB_PASSWORD', 'LOCAL_AUTH_JWT_SECRET', 'LOCAL_AUTH_ANON_KEY', 'AUTH_SESSION_ENCRYPTION_KEY', 'CSRF_SIGNING_KEY']) assert.equal(restored[key], enabled[key]);
}));

test('disable never overwrites an operator replacement for Auth', () => fixture(({ envPath, statePath }) => {
  api().configureLocalAuth(envPath, statePath);
  writeFileSync(envPath, readFileSync(envPath, 'utf8').replace('SUPABASE_URL=http://127.0.0.1:54321', 'SUPABASE_URL=https://custom.example.test'));
  const changed = readFileSync(envPath, 'utf8');
  assert.throws(() => api().disableLocalAuth(envPath, statePath), /refused|configuration/i);
  assert.equal(readFileSync(envPath, 'utf8'), changed);
}));

test('missing or foreign restore records do not silently reset an existing configuration', () => fixture(({ envPath, statePath }) => {
  const active = api().planAuthEnvironment(original).text;
  writeFileSync(envPath, active);
  assert.throws(() => api().configureLocalAuth(envPath, statePath), /record|restore/i);
  assert.throws(() => api().disableLocalAuth(envPath, statePath), /record|restore/i);
  writeFileSync(statePath, JSON.stringify({ version: 1, identity: 'wrong', original: {} }));
  assert.throws(() => api().disableLocalAuth(envPath, statePath), /record|restore/i);
  assert.equal(readFileSync(envPath, 'utf8'), active);
}));

test('setup and disable refuse symlinked private files', () => fixture(({ directory, envPath, statePath }) => {
  const link = join(directory, 'linked-env');
  symlinkSync(envPath, link);
  assert.throws(() => api().configureLocalAuth(link, statePath), /file|symlink/i);
  api().configureLocalAuth(envPath, statePath);
  const stateLink = join(directory, 'linked-state');
  symlinkSync(statePath, stateLink);
  assert.throws(() => api().disableLocalAuth(envPath, stateLink), /file|symlink/i);
}));
