import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createServer } from 'node:net';
import { dockerArguments, loadLocalEnvironment, repositoryRoot } from '../runtime-config.mjs';
import { readLocalAuthConfig } from '../local-auth-config.mjs';

const text = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
readLocalAuthConfig(text); loadLocalEnvironment();
async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
test('a separate empty Auth volume initializes with the pinned images and leaves the operator volumes intact', async () => {
  const project = 'orai-auth-verify-' + randomBytes(6).toString('hex');
  const authPort = await freePort(), mailPort = await freePort();
  assert.notEqual(authPort, mailPort);
  const env = { ...process.env, ...parseEnv(text), LOCAL_AUTH_PORT: String(authPort), LOCAL_MAIL_PORT: String(mailPort) };
  const prefix = [...dockerArguments(), 'compose', '--project-name', project, '--file', 'compose.auth.yml'];
  function compose(args) {
    return spawnSync('docker', [...prefix, ...args], { cwd: repositoryRoot, env, encoding: 'utf8', timeout: 150000, maxBuffer: 2_000_000 });
  }
  const before = compose(['ps', '--quiet', '--all']);
  assert.equal(before.status, 0); assert.equal(before.stdout.trim(), '');
  try {
    const up = compose(['up', '--detach', '--no-build', '--wait', '--wait-timeout', '90']);
    writeFileSync(new URL('../../.local/t06-o/fresh-stack.log', import.meta.url), up.stdout + up.stderr, { mode: 0o600 });
    assert.equal(up.status, 0, 'Fresh isolated Auth stack must initialize from the committed init scripts');
    assert.equal((await fetch('http://127.0.0.1:' + authPort + '/auth/v1/health')).status, 200);
    const settings = await (await fetch('http://127.0.0.1:' + authPort + '/auth/v1/settings')).json();
    assert.equal(settings.mailer_autoconfirm, false); assert.equal(settings.external.email, true);
    const target = compose(['exec', '-T', 'auth-db', 'psql', '-U', 'auth_owner', '-d', 'orai_auth', '-tAc', "SELECT current_database()='orai_auth' AND EXISTS(SELECT 1 FROM auth.schema_migrations) AND NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='orai')"]);
    assert.equal(target.status, 0); assert.equal(target.stdout.trim(), 't');
    const volumes = spawnSync('docker', [...dockerArguments(), 'volume', 'ls', '--filter', 'label=com.docker.compose.project=' + project, '--format', '{{.Name}}'], { encoding: 'utf8' });
    assert.equal(volumes.status, 0);
    const names = volumes.stdout.trim().split('\n');
    assert.equal(names.length, 2); assert.ok(names.every(name => name.startsWith(project + '_')));
  } finally {
    // Only this newly created random fixture project is disposable. The main
    // operator Auth project and the orai business project are never selected.
    const cleanup = compose(['down', '--volumes', '--timeout', '10']);
    assert.equal(cleanup.status, 0, 'The fresh fixture must clean up its own containers, networks and volumes');
  }
});
