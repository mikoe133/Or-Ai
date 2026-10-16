import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const marker = 'orai-auth-v1';
const applicationFields = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_APP_PUBLIC_ORIGIN'];
const managedFields = [...applicationFields, 'ORAI_LOCAL_AUTH_MANAGED', 'ORAI_LOCAL_AUTH_ENABLED', 'LOCAL_AUTH_PORT', 'LOCAL_MAIL_PORT', 'LOCAL_AUTH_DB_PASSWORD', 'LOCAL_AUTH_JWT_SECRET', 'LOCAL_AUTH_ANON_KEY'];
const refused = () => { throw new Error('Local Auth configuration refused; check local ownership, ports and retained keys. Values were not printed.'); };
function parse(text) {
  for (const key of managedFields) {
    if ([...text.matchAll(new RegExp('^\\s*(?:export\\s+)?' + key + '\\s*=', 'gm'))].length > 1) refused();
  }
  return parseEnv(text);
}
function localTarget(env) {
  try {
    const runtime = new URL(env.DATABASE_URL), owner = new URL(env.MIGRATION_DATABASE_URL);
    if (env.NODE_ENV === 'production' || !['development', 'test'].includes(env.APP_ENV) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(runtime.hostname) ||
      !['postgres:', 'postgresql:'].includes(runtime.protocol) || !['postgres:', 'postgresql:'].includes(owner.protocol) ||
      runtime.hostname !== owner.hostname || runtime.port !== owner.port || runtime.pathname !== owner.pathname ||
      !/^\/orai_(?:dev|test)(?:_[a-z0-9]+)*$/.test(runtime.pathname) || runtime.pathname !== '/' + env.POSTGRES_DB ||
      env.DEMO_SEED_DATABASE !== env.POSTGRES_DB || decodeURIComponent(runtime.username) !== 'orai_app' ||
      decodeURIComponent(owner.username) !== env.POSTGRES_USER || runtime.username === owner.username ||
      !runtime.password || !env.POSTGRES_PASSWORD || decodeURIComponent(owner.password) !== env.POSTGRES_PASSWORD ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(env.CSRF_SIGNING_KEY ?? '') ||
      !/^[A-Za-z0-9_-]{43}$/.test(env.AUTH_SESSION_ENCRYPTION_KEY ?? '') ||
      Buffer.from(env.AUTH_SESSION_ENCRYPTION_KEY, 'base64url').toString('base64url') !== env.AUTH_SESSION_ENCRYPTION_KEY) refused();
  } catch { refused(); }
}
function port(value, fallback) {
  const n = Number(value || fallback);
  if (!/^\d+$/.test(String(value || fallback)) || !Number.isInteger(n) || n < 1024 || n > 65535) refused();
  return n;
}
function topology(env) {
  localTarget(env);
  const authPort = port(env.LOCAL_AUTH_PORT, 54321), mailPort = port(env.LOCAL_MAIL_PORT, 54324), webPort = port(env.WEB_PORT, 5173);
  const ports = [authPort, mailPort, webPort, port(env.API_PORT, 4100), port(env.POSTGRES_PORT, 55432)];
  if (new Set(ports).size !== ports.length) refused();
  const siteOrigin = 'http://127.0.0.1:' + webPort;
  if (env.APP_PUBLIC_ORIGIN && !env.APP_PUBLIC_ORIGIN.split(',').map(s => s.trim()).includes(siteOrigin)) refused();
  return { authOrigin: 'http://127.0.0.1:' + authPort, mailOrigin: 'http://127.0.0.1:' + mailPort, siteOrigin,
    authPort, mailPort, webPort, composeProject: 'orai-auth-local' };
}
function sign(secret, value) { return createHmac('sha256', secret).update(value).digest('base64url'); }
function anonKey(secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iss: 'orai-auth-local', role: 'anon', iat: now, exp: now + 10 * 365 * 86400 })).toString('base64url');
  return header + '.' + payload + '.' + sign(secret, header + '.' + payload);
}
function durableKeys(env) {
  if (!/^[a-f0-9]{48}$/.test(env.LOCAL_AUTH_DB_PASSWORD ?? '') || !/^[A-Za-z0-9_-]{64}$/.test(env.LOCAL_AUTH_JWT_SECRET ?? '')) refused();
  try {
    const pieces = env.LOCAL_AUTH_ANON_KEY.split('.');
    const header = JSON.parse(Buffer.from(pieces[0], 'base64url')), payload = JSON.parse(Buffer.from(pieces[1], 'base64url'));
    const expected = Buffer.from(sign(env.LOCAL_AUTH_JWT_SECRET, pieces[0] + '.' + pieces[1]));
    const actual = Buffer.from(pieces[2] ?? '');
    if (pieces.length !== 3 || header.alg !== 'HS256' || payload.role !== 'anon' || payload.iss !== 'orai-auth-local' ||
      !Number.isInteger(payload.exp) || payload.exp <= Date.now() / 1000 || expected.length !== actual.length || !timingSafeEqual(expected, actual)) refused();
  } catch { refused(); }
}
function expectedApplication(env, config) {
  return { SUPABASE_URL: config.authOrigin, VITE_SUPABASE_URL: config.authOrigin,
    SUPABASE_PUBLISHABLE_KEY: env.LOCAL_AUTH_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY: env.LOCAL_AUTH_ANON_KEY,
    VITE_APP_PUBLIC_ORIGIN: config.siteOrigin };
}
function replaceFields(text, fields) {
  for (const [key, value] of Object.entries(fields)) {
    const pattern = new RegExp('^\\s*(?:export\\s+)?' + key + '\\s*=.*$', 'm');
    if (value === null) text = text.replace(new RegExp('^\\s*(?:export\\s+)?' + key + '\\s*=.*\\n?', 'm'), '');
    else if (pattern.test(text)) text = text.replace(pattern, key + '=' + value);
    else text = text.replace(/\n?$/, '\n') + key + '=' + value + '\n';
  }
  return text;
}

export function readLocalAuthConfig(text, { requireEnabled = true } = {}) {
  const env = parse(text), config = topology(env);
  if (env.ORAI_LOCAL_AUTH_MANAGED !== marker || !['0', '1'].includes(env.ORAI_LOCAL_AUTH_ENABLED)) refused();
  durableKeys(env);
  const enabled = env.ORAI_LOCAL_AUTH_ENABLED === '1';
  if (enabled && applicationFields.some(key => env[key] !== expectedApplication(env, config)[key])) refused();
  if (requireEnabled && !enabled) throw new Error('Local Auth is disabled; run pnpm auth:setup before starting.');
  return { ...config, enabled };
}

export function planAuthEnvironment(text) {
  const env = parse(text), config = topology(env);
  const owned = env.ORAI_LOCAL_AUTH_MANAGED === marker;
  if (env.ORAI_LOCAL_AUTH_MANAGED && !owned) refused();
  if (owned) {
    readLocalAuthConfig(text, { requireEnabled: false });
    if (env.ORAI_LOCAL_AUTH_ENABLED === '0' && applicationFields.some(key => env[key] && !(key === 'VITE_APP_PUBLIC_ORIGIN' && env[key] === config.siteOrigin))) refused();
  } else {
    if (applicationFields.some(key => env[key] && !(key === 'VITE_APP_PUBLIC_ORIGIN' && env[key] === config.siteOrigin)) ||
      ['LOCAL_AUTH_DB_PASSWORD', 'LOCAL_AUTH_JWT_SECRET', 'LOCAL_AUTH_ANON_KEY', 'ORAI_LOCAL_AUTH_ENABLED'].some(key => env[key])) refused();
    env.LOCAL_AUTH_DB_PASSWORD = randomBytes(24).toString('hex');
    env.LOCAL_AUTH_JWT_SECRET = randomBytes(48).toString('base64url');
    env.LOCAL_AUTH_ANON_KEY = anonKey(env.LOCAL_AUTH_JWT_SECRET);
  }
  const next = replaceFields(text, { ORAI_LOCAL_AUTH_MANAGED: marker, ORAI_LOCAL_AUTH_ENABLED: '1',
    LOCAL_AUTH_PORT: String(config.authPort), LOCAL_MAIL_PORT: String(config.mailPort),
    LOCAL_AUTH_DB_PASSWORD: env.LOCAL_AUTH_DB_PASSWORD, LOCAL_AUTH_JWT_SECRET: env.LOCAL_AUTH_JWT_SECRET,
    LOCAL_AUTH_ANON_KEY: env.LOCAL_AUTH_ANON_KEY, ...expectedApplication(env, config) });
  return { text: next, config: readLocalAuthConfig(next) };
}

function regularFile(path, optional = false) {
  try { if (!lstatSync(path).isFile()) throw new Error('Private configuration must be a regular file, never a symlink.'); }
  catch (error) { if (!(optional && error.code === 'ENOENT')) throw error; }
}
function atomicPrivateWrite(path, text) {
  regularFile(path, true);
  const temporary = path + '.' + randomBytes(8).toString('hex') + '.tmp';
  writeFileSync(temporary, text, { flag: 'wx', mode: 0o600 });
  renameSync(temporary, path);
  chmodSync(path, 0o600);
}
function identity(env) { return createHash('sha256').update(env.LOCAL_AUTH_JWT_SECRET + ':' + env.LOCAL_AUTH_DB_PASSWORD).digest('hex'); }
function restoreRecord(path, env, config) {
  regularFile(path, true);
  if (!existsSync(path)) throw new Error('Private Auth restore record is missing; recover it from the local backup without rotating keys.');
  let state;
  try {
    state = JSON.parse(readFileSync(path, 'utf8'));
    if (state.version !== 1 || state.identity !== identity(env) || Object.keys(state.original).length !== applicationFields.length ||
      applicationFields.some(key => !(key in state.original) || ![null, '', ...(key === 'VITE_APP_PUBLIC_ORIGIN' ? [config.siteOrigin] : [])].includes(state.original[key]))) throw new Error();
  } catch { throw new Error('Private Auth restore record refused; recover the matching local backup.'); }
  chmodSync(path, 0o600);
  return state;
}
export function configureLocalAuth(envPath, statePath) {
  regularFile(envPath); regularFile(statePath, true);
  const current = readFileSync(envPath, 'utf8'), before = parse(current), result = planAuthEnvironment(current), after = parse(result.text);
  if (before.ORAI_LOCAL_AUTH_MANAGED) restoreRecord(statePath, after, result.config);
  else {
    if (existsSync(statePath)) throw new Error('Unexpected Auth restore record; inspect it before setting up a new environment.');
    atomicPrivateWrite(statePath, JSON.stringify({ version: 1, identity: identity(after),
      original: Object.fromEntries(applicationFields.map(key => [key, before[key] ?? null])) }, null, 2) + '\n');
  }
  if (result.text !== current) atomicPrivateWrite(envPath, result.text);
  else chmodSync(envPath, 0o600);
  return result.config;
}
export function disableLocalAuth(envPath, statePath) {
  regularFile(envPath);
  const current = readFileSync(envPath, 'utf8'), config = readLocalAuthConfig(current, { requireEnabled: false }), env = parse(current);
  const state = restoreRecord(statePath, env, config);
  if (!config.enabled) {
    if (applicationFields.some(key => (env[key] ?? null) !== state.original[key])) refused();
    return config;
  }
  atomicPrivateWrite(envPath, replaceFields(current, { ...state.original, ORAI_LOCAL_AUTH_ENABLED: '0' }));
  return { ...config, enabled: false };
}
