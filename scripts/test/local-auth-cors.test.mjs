import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { readLocalAuthConfig } from '../local-auth-config.mjs';
const config = readLocalAuthConfig(readFileSync(new URL('../../.env', import.meta.url), 'utf8'));
test('real browser preflight permits the local application SDK headers', async () => {
  const response = await fetch(config.authOrigin + '/auth/v1/signup', { method: 'OPTIONS', signal: AbortSignal.timeout(3000), headers: {
    origin: config.siteOrigin, 'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'apikey,authorization,content-type,x-client-info,x-supabase-api-version',
  } });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), config.siteOrigin);
  assert.match(response.headers.get('access-control-allow-headers') ?? '', /apikey/i);
});
test('gateway refuses a foreign web origin before it can call local Auth', async () => {
  const response = await fetch(config.authOrigin + '/auth/v1/settings', { signal: AbortSignal.timeout(3000), headers: { origin: 'https://unrelated.example.test' } });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});
