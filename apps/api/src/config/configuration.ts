import { randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { resolve } from 'node:path';

export const APP_CONFIG = Symbol('APP_CONFIG');

export interface SecurityConfiguration {
  origins: string[];
  csrfSigningKey: string;
  trustedProxyCidrs: string[];
  sessionDays: number;
  csrfTtlSeconds: number;
  claimIpLimit: number;
  claimCodeLimit: number;
  readIpLimit: number;
  writeIpLimit: number;
  claimWindowSeconds: number;
}

export interface AppConfiguration {
  environment: 'development' | 'test' | 'production';
  port: number;
  host: '127.0.0.1' | '0.0.0.0';
  databaseUrl: string;
  databasePoolMax: number;
  databaseSsl: boolean;
  security: SecurityConfiguration;
  auth: AuthConfiguration | null;
  assets?: AssetConfiguration;
}

export interface AssetConfiguration {
  driver: 'local' | 'r2' | 'disabled'; directory: string; maxImageBytes: number; maxVideoBytes: number;
  r2?: { accountId: string; endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string;
    spoolDirectory: string; spoolMaxBytes: number; spoolMaxFiles: number; requestTimeoutMs: number };
}

function r2Configuration(env: NodeJS.ProcessEnv): NonNullable<AssetConfiguration['r2']> {
  for (const [name, pattern] of Object.entries({ R2_ACCOUNT_ID: /^[a-f0-9]{32}$/, R2_BUCKET: /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/,
    R2_ACCESS_KEY_ID: /^[a-fA-F0-9]{32}$/, R2_SECRET_ACCESS_KEY: /^[a-fA-F0-9]{64}$/ })) {
    if (!pattern.test(env[name] ?? '')) throw new Error('Missing or invalid configuration: ' + name);
  }
  return { accountId: env.R2_ACCOUNT_ID!, endpoint: 'https://' + env.R2_ACCOUNT_ID! + '.r2.cloudflarestorage.com',
    bucket: env.R2_BUCKET!, accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    spoolDirectory: resolve(env.ASSET_SPOOL_DIRECTORY ?? '/tmp/orai-objects'),
    spoolMaxBytes: integer(env.ASSET_SPOOL_MAX_BYTES, 256 * 1024 * 1024, 1024 * 1024 * 1024, 'ASSET_SPOOL_MAX_BYTES'),
    spoolMaxFiles: integer(env.ASSET_SPOOL_MAX_FILES, 2, 10, 'ASSET_SPOOL_MAX_FILES'),
    requestTimeoutMs: integer(env.R2_REQUEST_TIMEOUT_MS, 120000, 600000, 'R2_REQUEST_TIMEOUT_MS') };
}

export interface AuthConfiguration {
  url: string;
  publishableKey: string;
  sessionEncryptionKey: string;
  sessionDays: number;
  requestTimeoutMs: number;
}

function integer(value: string | undefined, fallback: number, max: number, key: string): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new Error(`Invalid configuration: ${key}`);
  }
  return parsed;
}

function authConfiguration(env: NodeJS.ProcessEnv, environment: string): AuthConfiguration | null {
  if (!env.SUPABASE_URL && !env.SUPABASE_PUBLISHABLE_KEY) return null;
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw new Error('Missing configuration: Supabase Auth');
  let url: URL;
  try { url = new URL(env.SUPABASE_URL); } catch { throw new Error('Invalid configuration: SUPABASE_URL'); }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
    url.protocol !== 'https:' && !(environment !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('Invalid configuration: SUPABASE_URL');
  }
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  let validKey = /^sb_publishable_[A-Za-z0-9_-]{20,160}$/.test(key);
  if (!validKey && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    try { validKey = JSON.parse(Buffer.from(key.split('.')[1]!, 'base64url').toString()).role === 'anon'; } catch { /* Reject malformed legacy keys. */ }
  }
  if (!validKey) throw new Error('Invalid configuration: SUPABASE_PUBLISHABLE_KEY');
  if (!env.AUTH_SESSION_ENCRYPTION_KEY || !/^[A-Za-z0-9_-]{43}$/.test(env.AUTH_SESSION_ENCRYPTION_KEY) ||
    Buffer.from(env.AUTH_SESSION_ENCRYPTION_KEY, 'base64url').length !== 32 ||
    Buffer.from(env.AUTH_SESSION_ENCRYPTION_KEY, 'base64url').toString('base64url') !== env.AUTH_SESSION_ENCRYPTION_KEY) {
    throw new Error('Missing or invalid configuration: AUTH_SESSION_ENCRYPTION_KEY');
  }
  return { url: url.origin, publishableKey: key, sessionEncryptionKey: env.AUTH_SESSION_ENCRYPTION_KEY,
    sessionDays: integer(env.ACCOUNT_SESSION_DAYS, 30, 90, 'ACCOUNT_SESSION_DAYS'),
    requestTimeoutMs: integer(env.AUTH_REQUEST_TIMEOUT_MS, 8000, 30000, 'AUTH_REQUEST_TIMEOUT_MS') };
}

function securityConfiguration(env: NodeJS.ProcessEnv, environment: string, apiPort: number): SecurityConfiguration {
  const production = environment === 'production';
  if (production && !env.APP_PUBLIC_ORIGIN) throw new Error('Missing configuration: APP_PUBLIC_ORIGIN');
  const webPort = integer(env.WEB_PORT, 5173, 65535, 'WEB_PORT');
  const origins = env.APP_PUBLIC_ORIGIN ? env.APP_PUBLIC_ORIGIN.split(',').map(value => value.trim())
    : ['http://127.0.0.1:' + webPort, 'http://localhost:' + webPort, 'http://127.0.0.1:' + apiPort, 'http://localhost:' + apiPort];
  if (origins.length > 10) throw new Error('Invalid configuration: APP_PUBLIC_ORIGIN');
  const canonical = origins.map(value => {
    let origin: URL;
    try { origin = new URL(value); } catch { throw new Error('Invalid configuration: APP_PUBLIC_ORIGIN'); }
    if (!['http:', 'https:'].includes(origin.protocol) || (production && origin.protocol !== 'https:') ||
      origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Invalid configuration: APP_PUBLIC_ORIGIN');
    if (!production && origin.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)) throw new Error('Invalid configuration: APP_PUBLIC_ORIGIN');
    return origin.origin;
  });
  if (canonical.some(value => value.startsWith('https://')) && canonical.some(value => value.startsWith('http://'))) throw new Error('Invalid configuration: APP_PUBLIC_ORIGIN');
  if (production && !env.CSRF_SIGNING_KEY) throw new Error('Missing configuration: CSRF_SIGNING_KEY');
  const csrfSigningKey = env.CSRF_SIGNING_KEY || randomBytes(32).toString('base64url');
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(csrfSigningKey)) throw new Error('Invalid configuration: CSRF_SIGNING_KEY');
  const trustedProxyCidrs = (env.TRUST_PROXY_CIDRS ?? '').split(',').map(value => value.trim()).filter(Boolean);
  if (trustedProxyCidrs.length > 20 || trustedProxyCidrs.some(value => {
    const parts = value.split('/'); const family = isIP(parts[0] ?? '');
    return !family || parts.length > 2 || (parts.length === 2 && (!/^\d+$/.test(parts[1]!) || Number(parts[1]) > (family === 4 ? 32 : 128)));
  })) throw new Error('Invalid configuration: TRUST_PROXY_CIDRS');
  return { origins: [...new Set(canonical)], csrfSigningKey, trustedProxyCidrs,
    sessionDays: integer(env.ANONYMOUS_SESSION_DAYS, 30, 3650, 'ANONYMOUS_SESSION_DAYS'),
    csrfTtlSeconds: integer(env.CSRF_TTL_SECONDS, 3600, 86400, 'CSRF_TTL_SECONDS'),
    claimIpLimit: integer(env.REDEMPTION_IP_LIMIT, 30, 1000, 'REDEMPTION_IP_LIMIT'),
    claimCodeLimit: integer(env.REDEMPTION_CODE_LIMIT, 20, 1000, 'REDEMPTION_CODE_LIMIT'),
    readIpLimit: integer(env.ANONYMOUS_READ_IP_LIMIT, 120, 2000, 'ANONYMOUS_READ_IP_LIMIT'),
    writeIpLimit: integer(env.ANONYMOUS_WRITE_IP_LIMIT, 120, 2000, 'ANONYMOUS_WRITE_IP_LIMIT'),
    claimWindowSeconds: integer(env.REDEMPTION_WINDOW_SECONDS, 900, 3600, 'REDEMPTION_WINDOW_SECONDS') };
}

export function loadConfiguration(env: NodeJS.ProcessEnv = process.env): AppConfiguration {
  const environment = env.APP_ENV ?? (env.NODE_ENV === 'production' ? 'production' : 'development');
  if (!['development', 'test', 'production'].includes(environment)) {
    throw new Error('Invalid configuration: APP_ENV');
  }
  const host = env.API_HOST ?? (environment === 'production' ? '0.0.0.0' : '127.0.0.1');
  if (!['127.0.0.1', '0.0.0.0'].includes(host)) throw new Error('Invalid configuration: API_HOST');
  if (!env.DATABASE_URL) throw new Error('Missing configuration: DATABASE_URL');

  let database: URL;
  try {
    database = new URL(env.DATABASE_URL);
  } catch {
    throw new Error('Invalid configuration: DATABASE_URL');
  }
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.hostname || !database.pathname.slice(1)) {
    throw new Error('Invalid configuration: DATABASE_URL');
  }
  const sslMode = env.DATABASE_SSL_MODE ?? (environment === 'production' ? 'verify-full' : 'disable');
  if (!['disable', 'verify-full'].includes(sslMode) || (environment === 'production' && sslMode !== 'verify-full')) {
    throw new Error('Invalid configuration: DATABASE_SSL_MODE');
  }
  // TLS policy has one source of truth, rather than conflicting driver URL options.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
    if (database.searchParams.has(key)) throw new Error('Configure database TLS with DATABASE_SSL_MODE');
  }

  const port = integer(env.API_PORT, 4100, 65535, 'API_PORT');
  const driver = env.ASSET_STORAGE_DRIVER ?? (environment === 'production' ? 'disabled' : 'local');
  if (!['local', 'r2', 'disabled'].includes(driver) || environment === 'production' && driver === 'local') throw new Error('Invalid configuration: ASSET_STORAGE_DRIVER');
  return {
    environment: environment as AppConfiguration['environment'],
    port,
    host: host as AppConfiguration['host'],
    databaseUrl: env.DATABASE_URL,
    databasePoolMax: integer(env.DATABASE_POOL_MAX, 5, 30, 'DATABASE_POOL_MAX'),
    databaseSsl: sslMode === 'verify-full',
    security: securityConfiguration(env, environment, port),
    auth: authConfiguration(env, environment),
    assets: { driver: driver as AssetConfiguration['driver'], directory: resolve(env.ASSET_DIRECTORY ?? '.local/assets'),
      maxImageBytes: integer(env.ASSET_MAX_IMAGE_BYTES, 10 * 1024 * 1024, 50 * 1024 * 1024, 'ASSET_MAX_IMAGE_BYTES'),
      maxVideoBytes: integer(env.ASSET_MAX_VIDEO_BYTES, 100 * 1024 * 1024, 512 * 1024 * 1024, 'ASSET_MAX_VIDEO_BYTES'),
      ...(driver === 'r2' ? { r2: r2Configuration(env) } : {}) },
  };
}
