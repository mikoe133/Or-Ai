import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { AuthFlow, AuthFlowError, authConfiguration, parseAuthCallback } from '../src/auth/core.js';
import { TransientAuthStorage } from '../src/auth/storage.js';
import { AccountApi } from '../src/auth/account-api.js';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
let server: Server, provider: string, clock = Date.now(), emailRequests = 0, passwordRequests = 0, exchanges = 0, handoffs = 0, updates = 0, logoutRequests = 0;
let emailFailure = false, badPassword = false, outage = false, invalidLink = false;
let signupRedirect = '', recoveryRedirect = '', challenge = '', recoveryChallenge = '';
const origin = 'http://localhost:5173', key = 'sb_publishable_' + 'p'.repeat(40), userId = randomUUID();
const user = { id: userId, email: 'fixture@example.test', aud: 'authenticated', role: 'authenticated',
  created_at: '2026-01-01T00:00:00Z', email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {} };
const account = { id: randomUUID(), emailVerified: true, role: 'user' as const };
const csrf = 'c'.repeat(100), sessionExpiresAt = new Date(Date.now() + 86400000).toISOString();
const fails = (code: string) => (error: unknown) => error instanceof AuthFlowError && error.code === code;
function session() {
  const encoded = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), session_id: randomUUID() })).toString('base64url');
  return { access_token: 'eyJhbGciOiJIUzI1NiJ9.' + encoded + '.fixture_signature', refresh_token: 'fixture_refresh_credential', expires_in: 3600, token_type: 'bearer', user };
}
before(async () => {
  server = createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json');
    response.setHeader('X-Supabase-Api-Version', '2024-01-01');
    let raw = ''; for await (const chunk of request) raw += String(chunk);
    const body = raw ? JSON.parse(raw) : {};
    if (outage) { response.statusCode = 503; response.end(JSON.stringify({ msg: 'fixture_private_detail' })); return; }
    if (request.url?.startsWith('/auth/v1/signup') || request.url?.startsWith('/auth/v1/recover') || request.url?.startsWith('/auth/v1/resend')) {
      emailRequests++;
      if (emailFailure) { response.statusCode = 429; response.end(JSON.stringify({ code: 'over_email_send_rate_limit', msg: 'fixture_private_detail' })); return; }
      const url = new URL(request.url, provider);
      if (url.pathname.endsWith('/signup')) { signupRedirect = url.searchParams.get('redirect_to')!; challenge = body.code_challenge; }
      if (url.pathname.endsWith('/resend')) { signupRedirect = url.searchParams.get('redirect_to')!; challenge = body.code_challenge; }
      if (url.pathname.endsWith('/recover')) { recoveryRedirect = url.searchParams.get('redirect_to')!; recoveryChallenge = body.code_challenge; }
      assert.equal(body.email === user.email, true);
      response.end(JSON.stringify(url.pathname.endsWith('/signup') ? { ...user, email_confirmed_at: null } : {})); return;
    }
    if (request.url === '/auth/v1/token?grant_type=password') {
      passwordRequests++;
      if (badPassword) { response.statusCode = 400; response.end(JSON.stringify({ code: 'invalid_credentials', msg: 'fixture_private_detail' })); return; }
      assert.equal(typeof body.password === 'string', true); response.end(JSON.stringify(session())); return;
    }
    if (request.url === '/auth/v1/token?grant_type=pkce') {
      exchanges++;
      if (invalidLink) { response.statusCode = 400; response.end(JSON.stringify({ code: 'otp_expired', msg: 'fixture_private_detail' })); return; }
      const expected = body.auth_code === 'recovery_code' ? recoveryChallenge : challenge;
      assert.equal(createHash('sha256').update(body.code_verifier).digest('base64url') === expected, true);
      response.end(JSON.stringify(session())); return;
    }
    if (request.url === '/auth/v1/user' && request.method === 'PUT') { updates++; assert.equal(typeof body.password === 'string', true); response.end(JSON.stringify(user)); return; }
    if (request.url === '/auth/v1/user') { response.end(JSON.stringify(user)); return; }
    if (request.url?.startsWith('/auth/v1/logout')) { logoutRequests++; response.statusCode = 204; response.end(); return; }
    if (request.url === '/api/account/context') { response.end(JSON.stringify({ configured: true, account: null, csrfToken: csrf, sessionExpiresAt: null })); return; }
    if (request.url === '/api/account/session') {
      handoffs++; assert.equal(request.headers['x-csrf-token'] === csrf, true);
      assert.equal(typeof body.accessToken === 'string', true); assert.equal(typeof body.refreshToken === 'string', true);
      response.end(JSON.stringify({ account, sessionExpiresAt })); return;
    }
    if (request.url === '/api/account/logout') { assert.deepEqual(body, {}); response.end(JSON.stringify({ providerRevoked: false })); return; }
    response.statusCode = 404; response.end('{}');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string'); provider = 'http://127.0.0.1:' + address.port;
});
after(() => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }));
function flow(storage = new MemoryStorage()) {
  const config = authConfiguration({ url: provider, publishableKey: key, appOrigin: origin, production: false }, origin)!;
  const api = new AccountApi((input, init) => fetch(new URL(String(input), provider), init));
  return { auth: new AuthFlow(config, api, storage, () => clock), storage, api };
}
const callbackUrl = (redirect: string, code: string) => { const url = new URL(redirect); url.searchParams.set('code', code); return url.href; };

test('only public Auth settings and canonical allowed callback origins are accepted', () => {
  assert.equal(authConfiguration({ production: false }, origin), null);
  for (const settings of [{ url: provider }, { url: provider, publishableKey: 'sb_secret_private' }, { url: 'http://remote.test', publishableKey: key },
    { url: 'https://user:password@project.test', publishableKey: key }, { url: provider, publishableKey: key, appOrigin: 'https://other.test' },
    { url: 'https://project.test', publishableKey: key, production: true }]) assert.throws(() => authConfiguration(settings, origin), fails('CONFIGURATION'));
  assert.equal(authConfiguration({ url: 'https://project.test', publishableKey: key, production: true, appOrigin: 'https://shop.test' }, 'https://shop.test')?.appOrigin, 'https://shop.test');
});
test('session credentials stay in memory; only expiring PKCE data survives a new SDK instance', () => {
  const durable = new MemoryStorage(), first = new TransientAuthStorage(durable, 'project', 'instance-one', () => clock);
  first.setItem('instance-one', JSON.stringify(session())); first.setItem('instance-one-flow-abc-code-verifier', 'verifier');
  assert.equal([...durable.values.values()].some(value => value.includes('access_token')), false);
  const second = new TransientAuthStorage(durable, 'project', 'instance-two', () => clock);
  assert.equal(second.getItem('instance-two'), null); assert.equal(second.getItem('instance-two-flow-abc-code-verifier'), 'verifier');
  first.clearMemory(); assert.equal(first.getItem('instance-one'), null);
  clock += 3600001; assert.equal(second.getItem('instance-two-flow-abc-code-verifier'), null);
});
test('registration sends a PKCE verification email, limits repeated sends and does not create a business login', async () => {
  const { auth, storage } = flow(), before = handoffs;
  await auth.register(user.email, 'fixture_long_password');
  assert.equal(new URL(signupRedirect).origin, origin); assert.equal(new URL(signupRedirect).pathname, '/auth/callback');
  assert.equal(challenge.length, 43); assert.equal(handoffs, before);
  await assert.rejects(auth.resendVerification(user.email), fails('RATE_LIMITED'));
  assert.equal([...storage.values.values()].some(value => value.includes('refresh_token')), false);
});
test('password login hands transient credentials to the CSRF-protected account API without sending email or revoking the provider', async () => {
  const { auth, storage } = flow(), mailBefore = emailRequests, logoutsBefore = logoutRequests;
  assert.deepEqual((await auth.login(user.email, 'fixture_long_password')).account, account);
  assert.equal(emailRequests, mailBefore); assert.equal(logoutRequests, logoutsBefore);
  assert.equal([...storage.values.values()].some(value => value.includes('access_token')), false);
  assert.ok(passwordRequests > 0);
});
test('verification survives a page reload and callback execution is idempotent', async () => {
  const { auth, storage } = flow(); await auth.register(user.email, 'fixture_long_password');
  const second = flow(storage), callback = parseAuthCallback(callbackUrl(signupRedirect, 'verification_code'), origin), before = handoffs;
  const results = await Promise.all([second.auth.callback(callback), second.auth.callback(callback)]);
  assert.equal(results[0].kind, 'verified'); assert.equal(results[1].kind, 'verified'); assert.equal(handoffs - before, 1);
  assert.equal(storage.values.size, 0);
});
test('recovery verifies its own PKCE flow, waits for a new password and only then creates the business session', async () => {
  const first = flow(); await first.auth.forgotPassword(user.email);
  assert.equal(new URL(recoveryRedirect).pathname, '/auth/reset');
  const second = flow(first.storage), before = handoffs, updateBefore = updates;
  assert.equal((await second.auth.callback(parseAuthCallback(callbackUrl(recoveryRedirect, 'recovery_code'), origin))).kind, 'recovery');
  assert.equal(handoffs, before); assert.equal(second.auth.hasRecovery, true);
  assert.equal((await second.auth.resetPassword('fixture_new_password')).account.emailVerified, true);
  assert.equal(updates - updateBefore, 1); assert.equal(handoffs - before, 1); assert.equal(second.auth.hasRecovery, false);
  assert.equal(first.storage.values.size, 0);
});
test('callback URLs cannot supply foreign destinations, implicit credentials, invalid flow ids or arbitrary paths', () => {
  for (const url of ['https://other.test/auth/callback?code=a', origin + '/auth/callback?code=a&next=https://other.test',
    origin + '/auth/callback#access_token=fixture', origin + '/anything?code=a', origin + '/auth/reset?code=a&sb_flow_id=bad',
    origin + '/auth/callback?code=a&code=b', origin + '/auth/callback?error_description=fixture_private_detail']) assert.throws(() => parseAuthCallback(url, origin), fails('CALLBACK_INVALID'));
});
test('a signup confirmation cannot authorize password recovery; a missing verifier cannot hand off credentials', async () => {
  const first = flow(); await first.auth.register(user.email, 'fixture_long_password');
  const wrong = new URL(callbackUrl(signupRedirect, 'verification_code')); wrong.pathname = '/auth/reset';
  await assert.rejects(first.auth.callback(parseAuthCallback(wrong.href, origin)), fails('CALLBACK_INVALID'));
  const second = flow(); await assert.rejects(second.auth.callback(parseAuthCallback(callbackUrl(signupRedirect, 'verification_code'), origin)), fails('CALLBACK_INVALID'));
});
test('password and mail failures produce safe useful messages and cooldown without reflecting provider diagnostics', async () => {
  const { auth } = flow(); badPassword = true;
  try { await assert.rejects(auth.login(user.email, 'fixture_long_password'), error => fails('INVALID_CREDENTIALS')(error) && !String(error).includes('fixture_private_detail')); }
  finally { badPassword = false; }
  emailFailure = true;
  try { await assert.rejects(auth.forgotPassword(user.email), fails('RATE_LIMITED')); assert.ok(auth.mailCooldownSeconds > 0); }
  finally { emailFailure = false; }
  outage = true;
  try { await assert.rejects(auth.login(user.email, 'fixture_long_password'), fails('SERVICE_UNAVAILABLE')); }
  finally { outage = false; }
});
test('expired email callbacks and expired in-memory recovery require a new request', async () => {
  const first = flow(); await first.auth.register(user.email, 'fixture_long_password'); invalidLink = true;
  try { await assert.rejects(first.auth.callback(parseAuthCallback(callbackUrl(signupRedirect, 'verification_code'), origin)), fails('CALLBACK_INVALID')); }
  finally { invalidLink = false; }
  const second = flow(); await second.auth.forgotPassword(user.email);
  await second.auth.callback(parseAuthCallback(callbackUrl(recoveryRedirect, 'recovery_code'), origin)); clock += 600001;
  assert.equal(second.auth.hasRecovery, false); await assert.rejects(second.auth.resetPassword('fixture_new_password'), fails('CALLBACK_INVALID'));
});
test('local logout reports provider failure honestly and inputs are validated before network access', async () => {
  const { auth, api } = flow(); assert.deepEqual(await api.logout(), { providerRevoked: false });
  const before = passwordRequests + emailRequests;
  for (const [email, password] of [['not-email', 'fixture_long_password'], [user.email, 'short']]) await assert.rejects(auth.register(email!, password!), fails('INVALID_INPUT'));
  assert.equal(passwordRequests + emailRequests, before);
});

test('blocked or corrupt durable storage cannot send an unusable email or leak session credentials', async () => {
  const broken = new MemoryStorage(); broken.setItem = () => { throw new Error('fixture_private_detail'); };
  const { auth } = flow(broken), before = emailRequests;
  await assert.rejects(auth.register(user.email, 'fixture_long_password'), fails('STORAGE_UNAVAILABLE'));
  assert.equal(emailRequests, before);
  assert.equal((await auth.login(user.email, 'fixture_long_password')).account.emailVerified, true);
  const durable = new MemoryStorage(), storage = new TransientAuthStorage(durable, 'project', 'instance', () => clock);
  durable.setItem('orai-pkce-v1:project:-code-verifier', '{malformed'); assert.equal(storage.getItem('instance-code-verifier'), null);
  const unavailable = new TransientAuthStorage(null, 'project', 'instance', () => clock);
  assert.throws(() => unavailable.setItem('instance-code-verifier', 'value'), fails('STORAGE_UNAVAILABLE'));
});
test('the account API refreshes expired CSRF once, never blindly retries authorization or server failures', async () => {
  let contexts = 0, writes = 0, csrfInvalid = true;
  const errorResponse = (code: string, status: number) => Response.json({ error: { code, message: '请重试', requestId: 'fixture' } }, { status, headers: { 'Retry-After': '120' } });
  const api = new AccountApi(async (input, init) => {
    if (String(input).endsWith('/context')) { contexts++; assert.equal(init?.cache, 'no-store'); assert.equal(init?.credentials, 'same-origin'); return Response.json({ configured: true, account: null, csrfToken: csrf, sessionExpiresAt: null }); }
    writes++; if (csrfInvalid) { csrfInvalid = false; return errorResponse('CSRF_INVALID', 403); }
    return Response.json({ account, sessionExpiresAt });
  });
  await api.handoff('fixture_access', 'fixture_refresh'); assert.equal(contexts, 2); assert.equal(writes, 2);
  for (const code of ['AUTH_REQUIRED', 'RATE_LIMITED', 'SERVICE_UNAVAILABLE']) {
    let requests = 0;
    const failing = new AccountApi(async input => {
      if (String(input).endsWith('/context')) return Response.json({ configured: true, account: null, csrfToken: csrf, sessionExpiresAt: null });
      requests++; return errorResponse(code, code === 'RATE_LIMITED' ? 429 : 503);
    });
    await assert.rejects(failing.handoff('fixture_access', 'fixture_refresh'), fails(code)); assert.equal(requests, 1);
  }
});
test('network errors and malformed API responses return sanitized failures', async () => {
  for (const fetcher of [async () => { throw new Error('fixture_private_detail'); }, async () => new Response('invalid'),
    async () => Response.json({ unexpected: true }), async () => Response.json({ unexpected: true }, { status: 500 })]) {
    await assert.rejects(new AccountApi(fetcher).context(), error => fails('SERVICE_UNAVAILABLE')(error) && !String(error).includes('fixture_private_detail'));
  }
});
test('verification resend creates a new valid flow after cooldown and recovery handoff failure keeps the updated password outcome', async () => {
  const first = flow(); await first.auth.register(user.email, 'fixture_long_password'); clock += 60001;
  await first.auth.resendVerification(user.email);
  assert.equal((await flow(first.storage).auth.callback(parseAuthCallback(callbackUrl(signupRedirect, 'verification_code'), origin))).kind, 'verified');
  const second = flow(); await second.auth.forgotPassword(user.email);
  const original = second.api.handoff; second.api.handoff = async () => { throw new AuthFlowError('SERVICE_UNAVAILABLE', 'fixture'); };
  await second.auth.callback(parseAuthCallback(callbackUrl(recoveryRedirect, 'recovery_code'), origin));
  await assert.rejects(second.auth.resetPassword('fixture_new_password'), fails('LOGIN_REQUIRED')); assert.equal(second.auth.hasRecovery, false);
  second.api.handoff = original;
});
