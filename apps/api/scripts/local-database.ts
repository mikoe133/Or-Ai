import { createDatabaseClient } from '../src/database/client';
import { createManagedPool } from '../src/database/pool';
import { loadConfiguration } from '../src/config/configuration';

function databaseUrl(value: string | undefined) {
  try { if (value) return new URL(value); } catch { /* Sanitize configuration failures. */ }
  throw new Error('Missing or invalid local database configuration');
}

export function assertLocalTarget(env: NodeJS.ProcessEnv) {
  const migration = databaseUrl(env.MIGRATION_DATABASE_URL);
  const runtime = databaseUrl(env.DATABASE_URL);
  const name = migration.pathname.slice(1);
  if (env.NODE_ENV === 'production' || !['development', 'test'].includes(env.APP_ENV ?? '') ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(migration.hostname) ||
    !/^orai_(dev|test)(?:_[a-z0-9]+)*$/.test(name) || env.DEMO_SEED_DATABASE !== name ||
    migration.hostname !== runtime.hostname || migration.port !== runtime.port || migration.pathname !== runtime.pathname ||
    decodeURIComponent(runtime.username) !== 'orai_app' || runtime.username === migration.username) {
    throw new Error('Local database target refused; check environment, explicit database name and separate accounts');
  }
  return { migration, runtime, name };
}

export async function provisionLocalDatabase(env: NodeJS.ProcessEnv) {
  const { migration, runtime, name } = assertLocalTarget(env);
  const managed = createManagedPool({ connectionString: migration.toString(), max: 1, connectionTimeoutMillis: 2000 });
  const owner = managed.pool;
  try {
    const target = await owner.query<{ database: string }>('SELECT current_database() AS database');
    if (target.rows[0]?.database !== name) throw new Error('Local database identity mismatch');
    const previous = await owner.query<{ environment: string; database_name: string }>('SELECT environment, database_name FROM orai.environment_marker WHERE id = 1');
    if (previous.rows[0] && (previous.rows[0].environment === 'PRODUCTION' || previous.rows[0].database_name !== name)) {
      throw new Error('Local provisioning refused by database marker');
    }
    const roles = await owner.query<{ rolsuper: boolean; rolcreatedb: boolean; rolcreaterole: boolean; rolbypassrls: boolean }>(
      'SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname = $1', ['orai_app']);
    if (roles.rows[0]) {
      if (Object.values(roles.rows[0]).some(Boolean)) throw new Error('Existing runtime role has excessive privileges');
    } else {
      // PostgreSQL cannot bind identifiers/passwords in CREATE ROLE. Have the
      // server quote both; neither this SQL nor its result is ever logged.
      const statement = await owner.query<{ statement: string }>(
        "SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L', $1::text, $2::text) AS statement",
        ['orai_app', decodeURIComponent(runtime.password)]);
      await owner.query(statement.rows[0]!.statement);
    }
    await owner.query('BEGIN');
    try {
      await owner.query('GRANT USAGE ON SCHEMA orai TO orai_app');
      await owner.query('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA orai TO orai_app');
      await owner.query('REVOKE ALL ON orai._prisma_migrations, orai.environment_marker FROM orai_app');
      await owner.query('GRANT SELECT ON orai.environment_marker TO orai_app');
      await owner.query('REVOKE INSERT, UPDATE, DELETE ON orai.users FROM orai_app');
      await owner.query('GRANT INSERT (id, supabase_user_id, scope, role, disabled_at, created_at, updated_at), UPDATE (disabled_at, updated_at) ON orai.users TO orai_app');
      await owner.query('REVOKE UPDATE, DELETE ON orai.admin_audit_logs FROM orai_app');
      await owner.query('REVOKE DELETE ON orai.asset_files, orai.file_cleanup_plans FROM orai_app');
      await owner.query('REVOKE UPDATE, DELETE ON orai.creative_profile_revisions, orai.content_revisions, orai.content_references, orai.production_records, orai.content_review_records, orai.content_packages, orai.content_package_items FROM orai_app');
      await owner.query('INSERT INTO orai.environment_marker (id, environment, database_name) VALUES (1, $1::orai."DatabaseEnvironment", $2) ON CONFLICT (id) DO NOTHING',
        [env.APP_ENV === 'test' ? 'TEST' : 'DEVELOPMENT', name]);
      await owner.query('COMMIT');
    } catch (error) { await owner.query('ROLLBACK'); throw error; }
  } finally { await managed.close(); }
  // Existing roles are not silently reset; verify the supplied runtime credential.
  const application = createDatabaseClient(loadConfiguration(env));
  try { await application.client.$queryRawUnsafe('SELECT 1'); } finally { await application.close(); }
}

export async function assertDemoDatabase(env: NodeJS.ProcessEnv) {
  const target = assertLocalTarget(env);
  const connection = createDatabaseClient(loadConfiguration({ ...env, DATABASE_URL: target.migration.toString() }));
  try {
    const identity = await connection.client.$queryRawUnsafe<{ database: string }[]>('SELECT current_database() AS database');
    const marker = await connection.client.environmentMarker.findUnique({ where: { id: 1 } });
    if (identity[0]?.database !== target.name || !marker || marker.databaseName !== target.name ||
      marker.environment === 'PRODUCTION' || marker.environment !== (env.APP_ENV === 'test' ? 'TEST' : 'DEVELOPMENT')) {
      throw new Error('Demo seed refused by database identity or environment marker');
    }
    return { connection, marker };
  } catch (error) { await connection.close(); throw error; }
}
