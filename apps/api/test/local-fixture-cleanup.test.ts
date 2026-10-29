import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createManagedPool } from '../src/database/pool';
import { assertLocalTarget } from '../scripts/local-database';
import { createLocalFixture } from './local-fixture';

// The failed cleanup case intentionally keeps one TEST session alive. Release it
// and verify the exact database has no sessions before removing this test's data.
async function removeRemainingTestDatabase(name: string) {
  assert.match(name, /^orai_test_t18_[a-f0-9]+$/);
  const maintenance = createManagedPool({ connectionString: assertLocalTarget(process.env).migration.toString(), max: 1 });
  try {
    const deadline = Date.now() + 5000;
    let count = 0;
    do {
      const active = await maintenance.pool.query<{ count: number }>('SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=$1', [name]);
      count = active.rows[0]!.count;
      if (!count) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    } while (Date.now() < deadline);
    assert.equal(count, 0);
    const exists = await maintenance.pool.query('SELECT 1 FROM pg_database WHERE datname=$1', [name]);
    if (exists.rowCount) await maintenance.pool.query('DROP DATABASE "' + name + '"');
  } finally { await maintenance.close(); }
}

test('fixture cleanup waits for a real TEST connection to finish closing before dropping its database', async () => {
  const fixture = await createLocalFixture('t18');
  const held = createManagedPool({ connectionString: fixture.configuration.databaseUrl, max: 1 });
  let released = false;
  await held.pool.query('SELECT 1');
  const timer = setTimeout(() => { void held.close().then(() => { released = true; }); }, 150);
  try {
    await fixture.close();
    assert.equal(released, true, 'cleanup must wait, not force away the live session');
  } finally {
    clearTimeout(timer);
    await held.close();
    await removeRemainingTestDatabase(fixture.name);
  }
});

test('fixture cleanup still fails after its bounded wait when a real TEST connection stays open', async () => {
  const fixture = await createLocalFixture('t18');
  const held = createManagedPool({ connectionString: fixture.configuration.databaseUrl, max: 1 });
  await held.pool.query('SELECT 1');
  try {
    await assert.rejects(fixture.close(), /Fixture connections must physically disconnect before cleanup/);
    const alive = await held.pool.query<{ value: number }>('SELECT 1 AS value');
    assert.equal(alive.rows[0]!.value, 1, 'the cleanup must not terminate another live session');
  } finally {
    await held.close();
    await removeRemainingTestDatabase(fixture.name);
  }
});
