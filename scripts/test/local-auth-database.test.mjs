import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { dockerArguments, loadLocalEnvironment, repositoryRoot } from '../runtime-config.mjs';

loadLocalEnvironment();
function query(sql) {
  const result = spawnSync('docker', [...dockerArguments(), 'compose', '--project-name', 'orai-auth-local', '--file', 'compose.auth.yml',
    'exec', '-T', 'auth-db', 'psql', '--username', 'auth_owner', '--dbname', 'orai_auth', '--tuples-only', '--no-align', '--command', sql],
  { cwd: repositoryRoot, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, 'The dedicated local Auth database must be running');
  return result.stdout.trim();
}
test('official Auth migration grant target exists without login or elevated privileges', () => {
  assert.equal(query("SELECT count(*) FROM pg_roles WHERE rolname='postgres' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls"), '1');
});
test('Auth migration owner has no cluster administration privileges', () => {
  assert.equal(query("SELECT count(*) FROM pg_roles WHERE rolname='supabase_auth_admin' AND rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls"), '1');
});
test('Auth cluster is dedicated and contains no business schema', () => {
  assert.equal(query("SELECT current_database()='orai_auth' AND NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='orai')"), 't');
});
