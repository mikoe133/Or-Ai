import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLocalAuthConfig } from '../local-auth-config.mjs';
import { dockerArguments, loadLocalEnvironment, repositoryRoot } from '../runtime-config.mjs';
loadLocalEnvironment();
test('operator restart follows readiness dependencies and preserves the actual Auth and mail volumes', async () => {
  const envPath = join(repositoryRoot, '.env'), text = readFileSync(envPath, 'utf8'), config = readLocalAuthConfig(text);
  const fingerprint = value => createHash('sha256').update(value).digest('hex');
  const authUsers = () => {
    const result = spawnSync('docker', [...dockerArguments(), 'compose', '--project-name', 'orai-auth-local', '--file', 'compose.auth.yml', 'exec', '-T', 'auth-db',
      'psql', '-U', 'auth_owner', '-d', 'orai_auth', '-tAc', 'SELECT count(*) FROM auth.users'], { cwd: repositoryRoot, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0); return result.stdout.trim();
  };
  const users = authUsers(), messages = (await (await fetch(config.mailOrigin + '/api/v1/messages')).json()).total;
  const restart = spawnSync(process.execPath, ['scripts/local-auth.mjs', 'restart'], { cwd: repositoryRoot, encoding: 'utf8', timeout: 150000, maxBuffer: 2_000_000 });
  writeFileSync(join(repositoryRoot, '.local/auth/restart-test.log'), restart.stdout + restart.stderr, { mode: 0o600 });
  assert.equal(restart.status, 0, 'The actual operator restart must wait for database/Auth/mail health');
  assert.equal((await fetch(config.authOrigin + '/auth/v1/health')).status, 200);
  assert.equal(authUsers(), users);
  assert.equal((await (await fetch(config.mailOrigin + '/api/v1/messages')).json()).total, messages);
  assert.equal(fingerprint(readFileSync(envPath)), fingerprint(text));
});
