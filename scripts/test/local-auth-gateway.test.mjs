import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { dockerArguments, loadLocalEnvironment } from '../runtime-config.mjs';
loadLocalEnvironment();
test('gateway starts with a read-only root filesystem and an unprivileged user', () => {
  const result = spawnSync('docker', [...dockerArguments(), 'run', '--rm', '--network', 'orai-auth-local_auth-internal',
    '--read-only', '--tmpfs', '/tmp', '--user', '101:101', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    'orai-local-auth-gateway:nginx1.28.3', '-t'], { encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, 'nginx configuration must work under the actual local container restrictions');
});
