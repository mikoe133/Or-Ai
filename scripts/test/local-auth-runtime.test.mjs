import assert from 'node:assert/strict';
import { test } from 'node:test';

const implementation = await import('../local-auth-runtime.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return null;
  throw error;
});
function api() {
  assert.ok(implementation, 'The isolated Auth lifecycle implementation must exist');
  return implementation;
}
const config = { authOrigin: 'http://127.0.0.1:54321', mailOrigin: 'http://127.0.0.1:54324', siteOrigin: 'http://127.0.0.1:5173', enabled: true };
test('lifecycle commands always select the dedicated project and compose file', () => {
  const up = api().authComposeArguments('up');
  assert.deepEqual(up.slice(0, 5), ['compose', '--project-name', 'orai-auth-local', '--file', 'compose.auth.yml']);
  assert.deepEqual(up.slice(5), ['up', '--detach', '--build', '--wait', '--wait-timeout', '90']);
  assert.deepEqual(api().authComposeArguments('stop').slice(5), ['stop', '--timeout', '15']);
  assert.deepEqual(api().authComposeArguments('restart').slice(5), ['up', '--detach', '--force-recreate', '--no-build', '--wait', '--wait-timeout', '90']);
  assert.deepEqual(api().authComposeArguments('config').slice(5), ['config', '--quiet']);
  for (const command of ['down', 'down -v', 'rm', 'reset', 'exec', 'unknown']) assert.throws(() => api().authComposeArguments(command), /unsupported/i);
});
test('readiness requires healthy Auth and mail and reports no keys or responses', async () => {
  const seen = [];
  const result = await api().localAuthReadiness(config, async (url, init) => {
    seen.push(url); assert.ok(init.signal); return { ok: true };
  });
  assert.deepEqual(seen.sort(), ['http://127.0.0.1:54321/auth/v1/health', 'http://127.0.0.1:54324/readyz']);
  assert.deepEqual(result, { authReady: true, mailReady: true, ready: true, appConfigured: true,
    authOrigin: config.authOrigin, siteOrigin: config.siteOrigin, mailOrigin: config.mailOrigin });
});
test('readiness handles errors, bad responses and disabled application configuration', async () => {
  const failed = await api().localAuthReadiness(config, async url => {
    if (url.includes('54321')) throw new Error('sensitive upstream detail');
    return { ok: false };
  });
  assert.equal(failed.authReady, false); assert.equal(failed.mailReady, false); assert.equal(failed.ready, false);
  assert.doesNotMatch(JSON.stringify(failed), /sensitive/);
  const disabled = await api().localAuthReadiness({ ...config, enabled: false }, async () => ({ ok: true }));
  assert.equal(disabled.ready, false); assert.equal(disabled.appConfigured, false);
});
test('readiness refuses external targets before making network requests', async () => {
  let calls = 0;
  for (const origin of ['https://project.example.test', 'http://127.0.0.1:54321/other', 'http://user:pass@127.0.0.1:54321']) {
    await assert.rejects(() => api().localAuthReadiness({ ...config, authOrigin: origin }, async () => { calls++; return { ok: true }; }), /local|refused/i);
  }
  assert.equal(calls, 0);
});
