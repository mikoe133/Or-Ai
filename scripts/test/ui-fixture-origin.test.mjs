import assert from 'node:assert/strict';
import { test } from 'node:test';
import { uiFixtureOrigin } from '../../apps/web/e2e/ui-fixture-origin.mjs';

test('each UI fixture has a unique reserved loopback hostname, so host-only cookies cannot overwrite development or another fixture', () => {
  const first = new URL(uiFixtureOrigin(5187)), second = new URL(uiFixtureOrigin(5187));
  assert.equal(first.protocol, 'http:');
  assert.equal(first.port, '5187');
  assert.match(first.hostname, /^orai-cua-[0-9a-f-]{36}\.localhost$/);
  assert.notEqual(first.hostname, second.hostname);
  assert.equal(first.pathname, '/');
  assert.equal(first.username + first.password + first.search + first.hash, '');
});

test('a fixture cannot advertise an invalid or implicit port', () => {
  for (const port of [0, -1, 65536, 5187.5, NaN, '5187', null])
    assert.throws(() => uiFixtureOrigin(port), /Invalid UI fixture port/);
});
