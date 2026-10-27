import { isIP } from 'node:net';

const requiredFields = [
  'NODE_ENV', 'APP_ENV', 'API_HOST', 'API_PORT', 'APP_PUBLIC_ORIGIN', 'CSRF_SIGNING_KEY',
  'DATABASE_URL', 'MIGRATION_DATABASE_URL', 'DATABASE_SSL_MODE', 'DATABASE_POOL_MAX',
  'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'AUTH_SESSION_ENCRYPTION_KEY',
  'VITE_APP_PUBLIC_ORIGIN', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'ASSET_STORAGE_DRIVER',
];
const frontendFields = ['VITE_APP_PUBLIC_ORIGIN', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
const placeholder = /REPLACE_WITH|PROJECT_REF|CHANGE_ME|CHANGEME|YOUR_PROJECT|YOUR_PASSWORD|REGION\.pooler/i;
const broadProxy = new Set(['0.0.0.0/0', '::/0']);
const localHost = value => {
  const host = value.toLowerCase().replace(/\.$/, '');
  return !host.includes('.') || /(^|\.)(localhost|local|internal)$/.test(host) || isIP(host.replace(/^\[|\]$/g, '')) !== 0;
};
const parseUrl = value => { try { return new URL(value); } catch { return null; } };
const publicOrigin = value => {
  const url = parseUrl(value);
  return url && url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' &&
    !url.search && !url.hash && !url.port && !localHost(url.hostname) ? url.origin : null;
};
const databaseUrl = value => {
  const url = parseUrl(value);
  if (!url || !['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || localHost(url.hostname) ||
    !url.pathname.slice(1) || !url.username || !url.password || url.hash) return null;
  try { decodeURIComponent(url.username); decodeURIComponent(url.password); } catch { return null; }
  return url;
};

// Deliberately synchronous: no database, provider SDK, shell or network is used.
// All output strings and field names come from this module, never input values/errors.
export function inspectCloudConfiguration(env, loadConfiguration) {
  const issues = [];
  const issue = (code, fields, kind = 'configuration') => issues.push({ kind, code, fields });
  for (const field of requiredFields) {
    if (typeof env[field] !== 'string' || !env[field].trim()) issue('REQUIRED_VALUE_MISSING', [field]);
    else if (placeholder.test(env[field])) issue('PLACEHOLDER_NOT_REPLACED', [field]);
  }
  if (env.NODE_ENV !== 'production' || env.APP_ENV !== 'production') issue('PRODUCTION_ENV_REQUIRED', ['NODE_ENV', 'APP_ENV']);
  if (env.API_HOST !== '0.0.0.0') issue('CONTAINER_HOST_REQUIRED', ['API_HOST']);
  if (env.API_PORT !== '4100') issue('CONTAINER_PORT_MISMATCH', ['API_PORT']);
  if (env.DATABASE_SSL_MODE !== 'verify-full') issue('VERIFIED_DATABASE_TLS_REQUIRED', ['DATABASE_SSL_MODE']);
  const origin = publicOrigin(env.APP_PUBLIC_ORIGIN);
  const frontendOrigin = publicOrigin(env.VITE_APP_PUBLIC_ORIGIN);
  if (!origin || !frontendOrigin || origin !== frontendOrigin) issue('FRONTEND_ORIGIN_MISMATCH_OR_INVALID', ['APP_PUBLIC_ORIGIN', 'VITE_APP_PUBLIC_ORIGIN']);
  const authOrigin = publicOrigin(env.SUPABASE_URL);
  const frontendAuth = publicOrigin(env.VITE_SUPABASE_URL);
  if (!authOrigin || !frontendAuth || authOrigin !== frontendAuth) issue('AUTH_PROJECT_MISMATCH_OR_INVALID', ['SUPABASE_URL', 'VITE_SUPABASE_URL']);
  if (env.SUPABASE_PUBLISHABLE_KEY !== env.VITE_SUPABASE_PUBLISHABLE_KEY) issue('PUBLIC_AUTH_KEY_MISMATCH', ['SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY']);
  if (Object.keys(env).some(key => key.startsWith('VITE_') && !frontendFields.includes(key))) issue('UNKNOWN_FRONTEND_FIELD_FORBIDDEN', ['VITE_*']);
  const runtime = databaseUrl(env.DATABASE_URL), migration = databaseUrl(env.MIGRATION_DATABASE_URL);
  if (!runtime) issue('DATABASE_URL_INVALID_OR_LOCAL', ['DATABASE_URL']);
  if (!migration) issue('DATABASE_URL_INVALID_OR_LOCAL', ['MIGRATION_DATABASE_URL']);
  for (const [field, url] of [['DATABASE_URL', runtime], ['MIGRATION_DATABASE_URL', migration]]) {
    if (!url) continue;
    if (['sslmode', 'sslcert', 'sslkey', 'sslrootcert'].some(key => url.searchParams.has(key))) issue('URL_TLS_OPTIONS_FORBIDDEN', [field]);
    if (url.searchParams.getAll('schema').length !== 1 || url.searchParams.get('schema') !== 'orai' || [...url.searchParams.keys()].some(key => key !== 'schema')) issue('DATABASE_SCHEMA_OPTIONS_INVALID', [field]);
    if (url.hostname.endsWith('.pooler.supabase.com') && url.port !== '5432') issue('SESSION_POOLER_PORT_REQUIRED', [field]);
  }
  if (runtime && migration) {
    const runtimeRole = decodeURIComponent(runtime.username).split('.')[0];
    const migrationRole = decodeURIComponent(migration.username).split('.')[0];
    if (runtimeRole === migrationRole || /^(postgres|root|admin|administrator|supabase_admin|orai|orai_owner|owner)$/i.test(runtimeRole) ||
      decodeURIComponent(runtime.password) === decodeURIComponent(migration.password)) issue('DISTINCT_RESTRICTED_RUNTIME_ROLE_REQUIRED', ['DATABASE_URL', 'MIGRATION_DATABASE_URL']);
    if (runtime.hostname !== migration.hostname || (runtime.port || '5432') !== (migration.port || '5432') || runtime.pathname !== migration.pathname) issue('DATABASE_TARGET_MISMATCH', ['DATABASE_URL', 'MIGRATION_DATABASE_URL']);
  }
  if (env.CSRF_SIGNING_KEY && env.CSRF_SIGNING_KEY === env.AUTH_SESSION_ENCRYPTION_KEY) issue('DISTINCT_STABLE_KEYS_REQUIRED', ['CSRF_SIGNING_KEY', 'AUTH_SESSION_ENCRYPTION_KEY']);
  if ((env.TRUST_PROXY_CIDRS ?? '').split(',').some(value => broadProxy.has(value.trim()))) issue('UNBOUNDED_PROXY_TRUST_FORBIDDEN', ['TRUST_PROXY_CIDRS']);
  if (env.DEMO_SEED_DATABASE || Object.keys(env).some(key => key.startsWith('LOCAL_AUTH_') && env[key])) issue('LOCAL_DEVELOPMENT_SETTINGS_FORBIDDEN', ['LOCAL_AUTH_*', 'DEMO_SEED_DATABASE']);
  try {
    const config = loadConfiguration(env);
    if (config.environment !== 'production' || !config.auth || !config.databaseSsl) issue('API_PRODUCTION_CONFIGURATION_REJECTED', []);
  } catch {
    // loadConfiguration currently emits safe field errors. Do not depend on that
    // remaining true: no thrown error message/stack is copied into this report.
    issue('API_PRODUCTION_CONFIGURATION_REJECTED', []);
  }
  const configurationValid = !issues.length;
  issue('PERSISTENT_ASSET_ADAPTER_NOT_IMPLEMENTED', ['ASSET_STORAGE_DRIVER'], 'code_gap');
  issue('WORKER_CONTAINER_ROUTING_NOT_IMPLEMENTED', [], 'code_gap');
  issue('CLOUD_SCHEMA_ROLE_BOOTSTRAP_NOT_VERIFIED', ['DATABASE_URL', 'MIGRATION_DATABASE_URL'], 'external_validation');
  issue('CLOUD_AUTH_MAIL_DNS_AND_PROXY_NOT_VERIFIED', [], 'external_validation');
  issue('STORAGE_RESTART_BACKUP_AND_DEVICE_FLOWS_NOT_VERIFIED', [], 'external_validation');
  return { scope: 'offline_production_configuration_only', configurationValid, deployable: false,
    issues, cloudConnectionsMade: 0, databaseConnectionsMade: 0, secretsIncluded: false,
    callbacks: ['/auth/callback', '/auth/reset'], actualCloudValidationPassed: false };
}
