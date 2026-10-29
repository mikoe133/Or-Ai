import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createManagedPool } from '../src/database/pool';
import { createDatabaseClient } from '../src/database/client';
import { loadConfiguration } from '../src/config/configuration';
import { assertLocalTarget, provisionLocalDatabase } from '../scripts/local-database';
import { seedDemo } from '../scripts/seed-demo';

const execute = promisify(execFile);

export async function createLocalFixture(label: string) {
  assert.match(label, /^t\d{2}$/);
  const target = assertLocalTarget(process.env);
  const name = 'orai_test_' + label + '_' + randomBytes(5).toString('hex');
  const maintenance = createManagedPool({ connectionString: target.migration.toString(), max: 1 });
  await maintenance.pool.query('CREATE DATABASE "' + name + '"');
  target.migration.pathname = '/' + name; target.runtime.pathname = '/' + name;
  const env = { ...process.env, APP_ENV: 'test', NODE_ENV: 'test', MIGRATION_DATABASE_URL: target.migration.toString(),
    DATABASE_URL: target.runtime.toString(), DEMO_SEED_DATABASE: name };
  const configuration = loadConfiguration(env);
  const owner = createDatabaseClient({ ...configuration, databaseUrl: target.migration.toString() });
  const runtime = createDatabaseClient(configuration);
  async function close() {
    try {
      await runtime.close(); await owner.close();
      const deadline = Date.now() + 5000;
      let remaining: { pid: number; usename: string | null }[];
      do {
        const snapshot = await maintenance.pool.query<{ pid: number; usename: string | null }>('SELECT pid, usename FROM pg_stat_activity WHERE datname=$1', [name]);
        remaining = snapshot.rows;
        if (!remaining.length) break;
        // Give PostgreSQL a bounded chance to finish session cleanup after clients close.
        await new Promise(resolve => setTimeout(resolve, 25));
      } while (Date.now() < deadline);
      assert.deepEqual(remaining, [], 'Fixture connections must physically disconnect before cleanup');
      await maintenance.pool.query('DROP DATABASE "' + name + '"');
    } finally { await maintenance.close(); }
  }
  try {
    await execute(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env, maxBuffer: 1_000_000 });
    await provisionLocalDatabase(env);
    const credentials = await seedDemo(env);
    return { name, env, configuration, owner, runtime, credentials, close };
  } catch (error) { await close(); throw error; }
}
