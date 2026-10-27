// Real, loopback-only acceptance. No Auth provider override, seed identity,
// browser token injection, cloud resources, external SMTP or persisted JWTs.
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { chromium, expect as playwrightExpect, request } from 'playwright/test';
import { readLocalAuthConfig } from '../../../scripts/local-auth-config.mjs';
import { repositoryRoot as root } from '../../../scripts/runtime-config.mjs';

const raw = await readFile(join(root, '.env'), 'utf8'), env = parseEnv(raw), config = readLocalAuthConfig(raw);
const expect = playwrightExpect.configure({ timeout: 20000 });
const base = config.siteOrigin, output = join(root, '.local/t06-o/e2e');
await mkdir(output, { recursive: true, mode: 0o700 }); await chmod(output, 0o700);
const id = randomBytes(5).toString('hex');
const operator = { email: `operator-${id}@orai.test`, password: randomBytes(24).toString('base64url'), supabaseUserId: null, businessUserId: null };
const ordinary = { email: `reader-${id}@orai.test`, password: randomBytes(24).toString('base64url'), supabaseUserId: null, businessUserId: null };
const accounts = { siteOrigin: base, mailOrigin: config.mailOrigin, operator, ordinary };
const accountPath = join(root, '.local/auth/operator-account.json');
const privateSave = async () => { await writeFile(accountPath, JSON.stringify(accounts, null, 2) + '\n', { mode: 0o600 }); await chmod(accountPath, 0o600); };
await privateSave();
const require = createRequire(join(root, 'apps/api/package.json')), { Pool } = require('pg');
const database = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
let browser, phase = 'setup', page, adminId, operatorGranted = false, success = false;
const checks = [], consoleErrors = [], http = [];
async function passed(label) {
  checks.push(label); console.log('PASS ' + label);
  // This acceptance intentionally uses the real API defaults. Respect its
  // shared 60-second read budget instead of weakening limits or clearing it.
  const key = createHash('sha256').update('DEMO:anonymous-read-ip:127.0.0.1').digest('hex');
  const budget = (await database.query('SELECT hits,ceil(extract(epoch FROM window_ends_at-now()))::int AS remaining FROM orai.request_rate_buckets WHERE key_hash=$1', [key])).rows[0];
  if (budget?.hits >= Number(env.ANONYMOUS_READ_IP_LIMIT || 120) / 2 && budget.remaining > 0) {
    console.log('WAIT respecting the real API read rate window');
    await new Promise(resolve => setTimeout(resolve, Math.min(budget.remaining, 60) * 1000 + 100));
  }
}
function command(name, args = []) {
  const result = spawnSync('pnpm', [name, ...args], { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', timeout: 240000, maxBuffer: 2_000_000 });
  assert.equal(result.status, 0, `Local command ${name} must succeed; output withheld because it may contain private data`);
  return result.stdout;
}
function role(action, account, requestId = randomUUID()) {
  command('admin:manage', [action, '--supabase-user', account.supabaseUserId, '--request-id', requestId]);
  if (account === operator) operatorGranted = action === 'grant';
  return requestId;
}
async function context(client) {
  const response = await client.request.get(base + '/api/account/context');
  assert.equal(response.status(), 200, 'The real account context read must succeed');
  return response.json();
}
async function login(p, account, password = account.password) {
  await p.goto(base + '/auth/login');
  await p.getByLabel('邮箱', { exact: true }).fill(account.email);
  await p.getByLabel('密码', { exact: true }).fill(password);
  await p.getByRole('button', { name: '邮箱登录', exact: true }).click();
}
async function logout(p) {
  await p.goto(base + '/account');
  const done = p.waitForResponse(r => new URL(r.url()).pathname === '/api/account/logout' && r.request().method() === 'POST');
  await p.getByRole('button', { name: '退出账户', exact: true }).click();
  const response = await done;
  assert.equal(response.status(), 200); assert.equal((await response.json()).providerRevoked, true);
  await expect(p.getByText('当前未登录。', { exact: true })).toBeVisible();
}
async function mailLink(account, type) {
  let message;
  await expect.poll(async () => {
    const result = await (await fetch(config.mailOrigin + '/api/v1/search?query=' + encodeURIComponent('to:' + account.email), { signal: AbortSignal.timeout(3000) })).json();
    for (const item of result.messages ?? []) {
      const detail = await (await fetch(config.mailOrigin + '/api/v1/message/' + item.ID)).json();
      for (const match of (detail.HTML ?? '').matchAll(/href=["']([^"']+)["']/g)) {
        let url; try { url = new URL(match[1].replaceAll('&amp;', '&')); } catch { continue; }
        if (url.origin === config.authOrigin && url.pathname === '/auth/v1/verify' && url.searchParams.get('type') === type) { message = url.href; return true; }
      }
    }
    return false;
  }, { timeout: 15000, intervals: [200, 500, 1000], message: 'A real local verification email must arrive in Mailpit' }).toBe(true);
  return message;
}
async function register(p, account) {
  await p.goto(base + '/auth/register');
  await p.getByLabel('邮箱', { exact: true }).fill(account.email);
  await p.getByLabel('密码', { exact: true }).fill(account.password);
  await p.getByLabel('再次输入密码', { exact: true }).fill(account.password);
  const done = p.waitForResponse(r => new URL(r.url()).pathname === '/auth/v1/signup');
  await p.getByRole('button', { name: '注册邮箱账户', exact: true }).click();
  const response = await done, data = await response.json();
  assert.equal(response.status(), 200, 'Real local signup must succeed');
  const user = data.user ?? data;
  assert.ok(user.id); assert.equal(data.access_token ?? null, null);
  account.supabaseUserId = user.id; await privateSave();
  await expect(p.getByRole('status').filter({ hasText: '如果该邮箱可以注册' })).toBeVisible();
  return mailLink(account, 'signup');
}
async function verified(p, account, link) {
  await p.goto(link);
  await expect(p).toHaveURL(base + '/account');
  await expect(p.getByText('已登录，邮箱已验证。商品绑定需要逐项主动确认。', { exact: true })).toBeVisible();
  const current = await context(p.context());
  assert.equal(current.account?.emailVerified, true); assert.equal(current.account.role, 'user');
  account.businessUserId = current.account.id;
  const row = (await database.query('SELECT supabase_user_id FROM orai.users WHERE id=$1', [current.account.id])).rows[0];
  assert.equal(row.supabase_user_id, account.supabaseUserId);
  await privateSave();
  assert.equal(new URL(p.url()).search, ''); assert.equal(new URL(p.url()).hash, '');
}
async function storageSafe(p) {
  const values = await p.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)]);
  assert.equal(values.some(x => /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|access_token|refresh_token/.test(x)), false);
  const cookies = await p.context().cookies(base);
  const account = cookies.find(c => c.name.includes('account'));
  assert.ok(account?.httpOnly); assert.match(account.value, /^[A-Za-z0-9_-]{43}$/);
}
function stableKeys(text) {
  const values = parseEnv(text);
  return createHash('sha256').update(['POSTGRES_PASSWORD', 'DATABASE_URL', 'MIGRATION_DATABASE_URL', 'CSRF_SIGNING_KEY', 'AUTH_SESSION_ENCRYPTION_KEY', 'LOCAL_AUTH_DB_PASSWORD', 'LOCAL_AUTH_JWT_SECRET', 'LOCAL_AUTH_ANON_KEY'].map(k => values[k]).join('\0')).digest('hex');
}
try {
  const settings = await (await fetch(config.authOrigin + '/auth/v1/settings')).json();
  assert.equal(settings.external.email, true); assert.equal(settings.mailer_autoconfirm, false);
  assert.equal((await (await fetch(base + '/api/account/context')).json()).configured, true);
  browser = await chromium.launch({ headless: true, ...(process.env.ORAI_BROWSER_PATH ? { executablePath: process.env.ORAI_BROWSER_PATH }
    : process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
  const operatorContext = await browser.newContext({ baseURL: base, viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  operatorContext.setDefaultTimeout(15000); operatorContext.setDefaultNavigationTimeout(20000);
  page = await operatorContext.newPage(); page.on('pageerror', error => consoleErrors.push(error.name));
  page.on('response', response => { const path = new URL(response.url()).pathname; if (path.startsWith('/api/') || path.startsWith('/auth/v1/')) http.push({ phase, path, status: response.status() }); });

  phase = 'real signup requires Mailpit verification and rejects unverified login';
  const confirmation = await register(page, operator);
  await login(page, operator);
  await expect(page.getByRole('alert')).toHaveText('请先在邮件中验证邮箱，再登录。');
  assert.equal((await context(operatorContext)).account, null);
  await verified(page, operator, confirmation); await storageSafe(page); await passed(phase);

  phase = 'password login is real and wrong passwords have a useful failure state';
  await logout(page); await login(page, operator, randomBytes(24).toString('base64url'));
  await expect(page.getByRole('alert')).toHaveText('邮箱或密码不正确。');
  await login(page, operator); await expect(page).toHaveURL(base + '/account'); await storageSafe(page); await passed(phase);

  phase = 'ordinary authenticated users cannot read or write administrator resources';
  await page.goto(base + '/admin');
  await expect(page.getByRole('alert')).toHaveText('当前账户没有已验证的管理员权限。');
  assert.equal((await operatorContext.request.get(base + '/api/admin/overview')).status(), 403);
  const userCsrf = (await context(operatorContext)).csrfToken;
  assert.equal((await operatorContext.request.post(base + '/api/admin/orders', { headers: { origin: base, 'X-CSRF-Token': userCsrf }, data: {} })).status(), 403);
  await passed(phase);

  phase = 'existing owner CLI grants an actual Auth user and records one idempotent audit';
  const grantId = role('grant', operator); role('grant', operator, grantId);
  const grant = await database.query("SELECT count(*)::int AS count FROM orai.admin_audit_logs WHERE request_id=$1 AND action='administrator.grant'", [grantId]);
  assert.equal(grant.rows[0].count, 1);
  await page.reload(); await expect(page.getByRole('heading', { name: '运营概览', exact: true })).toBeVisible();
  assert.equal((await context(operatorContext)).account.role, 'admin');
  await page.screenshot({ path: join(output, 'admin-overview.png'), fullPage: true }); await passed(phase);

  phase = 'real administrator records an order and anonymous redemption stays usable';
  await page.goto(base + '/admin/orders'); await page.getByRole('button', { name: '人工录入', exact: true }).click();
  const selector = page.getByLabel('商品版本', { exact: true });
  await expect.poll(() => selector.locator('option').count()).toBeGreaterThan(1);
  const versionId = await selector.locator('option').evaluateAll(items => items.map(x => x.value).find(Boolean));
  assert.ok(versionId); await selector.selectOption(versionId);
  const reference = 'demo:t06-o:' + id;
  await page.getByLabel('订单引用', { exact: true }).fill(reference);
  await page.getByLabel('数量', { exact: true }).fill('1');
  await page.getByLabel('金额（分）', { exact: true }).fill('0');
  await page.getByRole('button', { name: '记录订单', exact: true }).click();
  await expect(page.getByRole('heading', { name: '订单详情', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '发码', exact: true }).click();
  await expect(page.getByLabel('本次交付内容')).toBeVisible();
  const delivery = JSON.parse(await page.getByLabel('本次交付内容').inputValue());
  const orderId = delivery.receipt.orderId, code = delivery.deliveries[0].code;
  await page.getByRole('button', { name: '隐藏本次交付', exact: true }).click();
  const anonymous = await browser.newContext({ baseURL: base, reducedMotion: 'reduce' }), anonymousPage = await anonymous.newPage();
  await anonymousPage.goto(base + '/redeem'); await anonymousPage.getByLabel('兑换码', { exact: true }).fill(code);
  await anonymousPage.getByRole('button', { name: '领取或恢复', exact: true }).click();
  await expect(anonymousPage).toHaveURL(base + '/apps');
  await expect(anonymousPage.getByRole('button', { name: '开始测试', exact: true })).toBeVisible();
  const anonymousEntitlements = await (await anonymous.request.get(base + '/api/session/entitlements')).json();
  assert.equal(anonymousEntitlements.items.length, 1); await passed(phase);

  phase = 'real administrator can save a version-linked copy draft and browse existing backoffice pages';
  await page.goto(base + '/admin/products'); await expect(page.getByRole('heading', { name: '商品与版本', exact: true })).toBeVisible();
  await page.goto(base + '/admin/assets'); await page.getByRole('button', { name: '新建素材', exact: true }).click();
  await page.getByLabel('素材类别', { exact: true }).selectOption('copy');
  await page.getByLabel('商品版本', { exact: true }).selectOption(versionId);
  await page.getByLabel('变体名', { exact: true }).fill('local-auth-' + id);
  await page.getByLabel('文字内容', { exact: true }).fill('本地认证验收演示：用一次轻松的提问，更了解自己的感受。');
  await page.getByRole('button', { name: '保存素材草稿', exact: true }).click();
  await expect(page.getByText('素材状态：draft', { exact: true })).toBeVisible();
  await page.screenshot({ path: join(output, 'admin-copy-draft.png'), fullPage: true }); await passed(phase);

  phase = 'revoking administrator access immediately blocks an already open write form';
  await page.goto(base + '/admin/orders'); await page.getByRole('button', { name: '人工录入', exact: true }).click(); await page.getByLabel('商品版本', { exact: true }).selectOption(versionId);
  await page.getByLabel('订单引用', { exact: true }).fill(reference + ':must-deny');
  const revokeId = role('revoke', operator);
  const denied = page.waitForResponse(r => new URL(r.url()).pathname === '/api/admin/orders' && r.request().method() === 'POST');
  await page.getByRole('button', { name: '记录订单', exact: true }).click(); assert.equal((await denied).status(), 403);
  await expect.poll(async () => (await page.getByRole('alert').allTextContents()).some(text => text.includes('管理员'))).toBe(true);
  assert.equal((await database.query('SELECT count(*)::int AS count FROM orai.orders WHERE reference=$1', [reference + ':must-deny'])).rows[0].count, 0);
  assert.equal((await database.query("SELECT count(*)::int AS count FROM orai.admin_audit_logs WHERE request_id=$1 AND action='administrator.revoke'", [revokeId])).rows[0].count, 1);
  await page.reload(); await expect(page.getByRole('alert')).toHaveText('当前账户没有已验证的管理员权限。'); await passed(phase);

  phase = 'logout immediately invalidates a copied old browser session';
  role('grant', operator); const oldState = await operatorContext.storageState();
  await logout(page);
  const stale = await request.newContext({ baseURL: base, storageState: oldState });
  assert.equal((await stale.get('/api/admin/overview')).status(), 401); await stale.dispose(); await passed(phase);

  phase = 'a second actual local account remains a non-administrator';
  const readerContext = await browser.newContext({ baseURL: base, reducedMotion: 'reduce' }), readerPage = await readerContext.newPage();
  const readerConfirmation = await register(readerPage, ordinary); await verified(readerPage, ordinary, readerConfirmation);
  await readerPage.goto(base + '/admin'); await expect(readerPage.getByRole('alert')).toHaveText('当前账户没有已验证的管理员权限。');
  assert.equal((await readerContext.request.get(base + '/api/admin/overview')).status(), 403);
  await logout(readerPage); await passed(phase);

  phase = 'Mailpit recovery updates the password; expired callbacks and the old password fail';
  await page.goto(base + '/auth/forgot'); await page.getByLabel('邮箱', { exact: true }).fill(operator.email);
  await page.getByRole('button', { name: '找回密码', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '如果该邮箱可以找回密码' })).toBeVisible();
  await expect(page.getByRole('button', { name: /秒后可再发送/ })).toBeDisabled();
  const recovery = await mailLink(operator, 'recovery'); await page.goto(recovery);
  await expect(page.getByLabel('新密码', { exact: true })).toBeVisible();
  assert.equal(new URL(page.url()).search, '');
  const oldPassword = operator.password, newPassword = randomBytes(24).toString('base64url');
  await page.getByLabel('新密码', { exact: true }).fill(newPassword);
  await page.getByLabel('再次输入新密码', { exact: true }).fill(newPassword);
  await page.getByRole('button', { name: '更新密码', exact: true }).click();
  await expect(page).toHaveURL(base + '/account'); operator.password = newPassword; await privateSave();
  await logout(page); await login(page, operator, oldPassword); await expect(page.getByRole('alert')).toHaveText('邮箱或密码不正确。');
  await login(page, operator); await expect(page).toHaveURL(base + '/'); await storageSafe(page);
  await expect(page.getByRole('navigation', { name: '快捷导航', exact: true }).getByRole('link', { name: '运营后台', exact: true })).toBeVisible();
  await readerPage.goto(base + '/auth/callback?code=used-or-invalid&sb_flow_id=missing-flow');
  await expect(readerPage.getByRole('status')).toContainText('验证链接已失效');
  assert.equal(new URL(readerPage.url()).search, ''); await passed(phase);

  phase = 'stop and restart preserve real Auth accounts, business rows and stable keys';
  const keysBefore = stableKeys(await readFile(join(root, '.env'), 'utf8'));
  const countsSql = 'SELECT (SELECT count(*) FROM orai.users) AS users,(SELECT count(*) FROM orai.orders) AS orders,(SELECT count(*) FROM orai.entitlements) AS entitlements,(SELECT count(*) FROM orai.campaign_assets) AS assets';
  const countsBefore = (await database.query(countsSql)).rows;
  command('auth:down');
  assert.equal((await anonymous.request.get(base + '/health/ready')).status(), 200);
  const during = await (await anonymous.request.get(base + '/api/session/entitlements')).json();
  assert.equal(during.items[0].id, anonymousEntitlements.items[0].id);
  command('auth:up');
  assert.equal(stableKeys(await readFile(join(root, '.env'), 'utf8')), keysBefore);
  assert.deepEqual((await database.query(countsSql)).rows, countsBefore);
  const secondDevice = await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }), secondPage = await secondDevice.newPage();
  await login(secondPage, operator); await expect(secondPage).toHaveURL(base + '/');
  await expect(secondPage.getByRole('navigation', { name: '手机主导航', exact: true }).getByRole('link', { name: '运营后台', exact: true })).toBeVisible();
  const deviceAccount = (await context(secondDevice)).account;
  assert.equal(deviceAccount.id, operator.businessUserId); assert.equal(deviceAccount.role, 'admin');
  await secondPage.goto(base + '/admin'); await expect(secondPage.getByRole('heading', { name: '运营概览', exact: true })).toBeVisible();
  await secondPage.screenshot({ path: join(output, 'admin-mobile.png'), fullPage: true });
  await logout(secondPage); await passed(phase);
  assert.deepEqual(consoleErrors, []);
  await login(page, operator); await expect(page).toHaveURL(base + '/');
  await page.goto(base + '/admin'); await expect(page.getByRole('heading', { name: '运营概览', exact: true })).toBeVisible();
  adminId = operator.businessUserId; success = true;
  await writeFile(join(output, 'result.json'), JSON.stringify({ passed: checks.length, checks, authProvider: 'Supabase Auth v2.197.0', mail: 'Mailpit v1.31.6',
    actualRegisteredUsers: 2, operatorBusinessUserId: adminId, ordinaryBusinessUserId: ordinary.businessUserId, orderId, anonymousEntitlementId: anonymousEntitlements.items[0].id,
    activeOperatorRetained: true, privateCredentials: '.local/auth/operator-account.json', consoleErrors }, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ passed: checks.length, activeOperatorRetained: true, credentialsFile: '.local/auth/operator-account.json' }));
} catch (error) {
  let detail = String(error?.stack ?? error);
  for (const value of [...Object.values(env), operator.password, ordinary.password].filter(x => typeof x === 'string' && x.length >= 12)) detail = detail.replaceAll(value, '[redacted]');
  detail = detail.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-jwt]');
  await writeFile(join(output, 'failure.txt'), phase + '\n' + detail, { mode: 0o600 });
  if (page) await page.screenshot({ path: join(output, 'failure.png'), fullPage: true, timeout: 3000 }).catch(() => {});
  console.error(JSON.stringify({ failedPhase: phase, passed: checks.length, detail: '.local/t06-o/e2e/failure.txt' })); process.exitCode = 1;
} finally {
  await writeFile(join(output, 'http.json'), JSON.stringify(http, null, 2), { mode: 0o600 });
  if (!success && operatorGranted && operator.supabaseUserId) { try { role('revoke', operator); } catch { console.error('Inspect local operator privileges after the failed acceptance.'); } }
  await browser?.close(); await database.end();
}
