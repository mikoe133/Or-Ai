import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from 'playwright/test';

// Browser-only Auth protocol fixtures. No application bypass or live account writes.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const webRequire = createRequire(join(root, 'apps/web/package.json'));
const base = `http://127.0.0.1:${process.env.ORAI_ADMIN_ENTRY_PORT || 5176}`;
const output = join(root, '.local/admin-entry');
const accountId = randomUUID(), userId = randomUUID();
const expiresAt = new Date(Date.now() + 86400000).toISOString();
const csrfToken = 'c'.repeat(100), checks = [], errors = [];
let server, vite, browser, phase = 'setup', signedIn = false, unavailable = false;
let role = 'admin', emailVerified = true;
const account = () => ({ id: accountId, role, emailVerified });
const adminEntry = page => page.getByRole('navigation', { name: '快捷导航', exact: true }).getByRole('link', { name: '运营后台', exact: true });
const mobileEntry = page => page.getByRole('navigation', { name: '手机主导航', exact: true }).getByRole('link', { name: '运营后台', exact: true });
async function login(page) {
  await page.goto(base + '/auth/login');
  await page.getByLabel('邮箱', { exact: true }).fill('operator@example.test');
  await page.getByLabel('密码', { exact: true }).fill('fixture_password');
  await page.getByRole('button', { name: '邮箱登录', exact: true }).click();
}
try {
  await mkdir(output, { recursive: true });
  server = createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json');
    response.setHeader('X-Supabase-Api-Version', '2024-01-01');
    response.setHeader('Access-Control-Allow-Origin', base);
    response.setHeader('Access-Control-Allow-Headers', '*');
    response.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
    response.setHeader('Access-Control-Expose-Headers', 'X-Supabase-Api-Version');
    if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
    const user = { id: userId, email: 'operator@example.test', aud: 'authenticated', role: 'authenticated',
      created_at: '2026-01-01T00:00:00Z', email_confirmed_at: emailVerified ? '2026-01-01T00:00:00Z' : null,
      app_metadata: {}, user_metadata: {} };
    if (request.url === '/auth/v1/token?grant_type=password') {
      const encoded = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600, session_id: randomUUID() })).toString('base64url');
      response.end(JSON.stringify({ access_token: 'eyJhbGciOiJIUzI1NiJ9.' + encoded + '.fixture_signature',
        refresh_token: 'fixture_refresh_credential', expires_in: 3600, token_type: 'bearer', user }));
    } else if (request.url === '/auth/v1/user') response.end(JSON.stringify(user));
    else response.writeHead(404).end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:' + server.address().port;
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_' + 'p'.repeat(40);
  process.env.VITE_APP_PUBLIC_ORIGIN = base;
  process.chdir(join(root, 'apps/web'));
  const { createServer: createViteServer } = await import(pathToFileURL(webRequire.resolve('vite')).href);
  vite = await createViteServer({ root: join(root, 'apps/web'), configFile: join(root, 'apps/web/vite.config.ts'),
    server: { host: '127.0.0.1', port: Number(new URL(base).port), strictPort: true } });
  await vite.listen();
  browser = await chromium.launch({ headless: true, ...(process.env.ORAI_BROWSER_PATH ? { executablePath: process.env.ORAI_BROWSER_PATH }
    : process.platform === 'darwin' ? { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.route(base + '/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/account/context') return route.fulfill(unavailable ? { status: 503, json: {} }
      : { json: { configured: true, account: signedIn ? account() : null, csrfToken, sessionExpiresAt: signedIn ? expiresAt : null } });
    if (path === '/api/account/session') { signedIn = true; return route.fulfill({ json: { account: account(), sessionExpiresAt: expiresAt } }); }
    if (path === '/api/account/logout') { signedIn = false; return route.fulfill({ json: { providerRevoked: true } }); }
    if (path === '/api/session/context') return route.fulfill({ json: { authenticated: false, csrfToken, sessionExpiresAt: null } });
    if (['/api/categories', '/api/tags'].includes(path)) return route.fulfill({ json: [] });
    if (path === '/api/products') return route.fulfill({ json: { items: [], page: 1, pageSize: 20, total: 0 } });
    return route.fulfill({ status: 403, json: { error: { code: 'FORBIDDEN', message: '无权访问。' } } });
  });
  const page = await context.newPage();
  phase = 'unsigned shoppers have no administration entry';
  await page.goto(base + '/');
  await expect(page.getByRole('heading', { name: '发现有趣的自己', exact: true })).toBeVisible();
  await expect(adminEntry(page)).toHaveCount(0);
  await expect(mobileEntry(page)).toHaveCount(0);
  checks.push(phase);

  phase = 'verified administrator password login returns home with a working left rail entry';
  await login(page);
  await expect(page).toHaveURL(base + '/');
  await expect(adminEntry(page)).toBeVisible();
  await expect(adminEntry(page)).toHaveAttribute('href', '/admin');
  await expect(page.getByRole('navigation', { name: '商城工具', exact: true }).getByRole('link', { name: '运营后台', exact: true })).toHaveCount(0);
  await expect(page.locator('.store-header-actions').getByRole('link', { name: '我的账户', exact: true })).toBeVisible();
  await adminEntry(page).click();
  await expect(page).toHaveURL(base + '/admin');
  await expect(page.getByRole('navigation', { name: '后台导航', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '← 返回商城', exact: true }).click();
  await expect(adminEntry(page)).toBeVisible();
  await page.reload();
  await expect(adminEntry(page)).toBeVisible();
  checks.push(phase);

  phase = 'mobile administrators have five usable navigation items without overflow';
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(mobileEntry(page)).toBeVisible();
  const mobile = page.getByRole('navigation', { name: '手机主导航', exact: true });
  await expect(mobile.getByRole('link')).toHaveCount(5);
  assert.equal(await mobile.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    return [...node.querySelectorAll('a')].every(link => { const b = link.getBoundingClientRect(); return b.left >= bounds.left && b.right <= bounds.right && b.width >= 44; });
  }), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  checks.push(phase);

  phase = 'logout removes the entry from an already open storefront tab';
  await page.setViewportSize({ width: 1440, height: 1000 });
  const sibling = await context.newPage();
  await sibling.goto(base + '/');
  await expect(adminEntry(sibling)).toBeVisible();
  await page.goto(base + '/account');
  await page.getByRole('button', { name: '退出账户', exact: true }).click();
  await expect(page.getByText('当前未登录。', { exact: true })).toBeVisible();
  await expect(adminEntry(sibling)).toHaveCount(0);
  await sibling.close();
  checks.push(phase);

  for (const scenario of [{ role: 'user', emailVerified: true }, { role: 'admin', emailVerified: false }]) {
    phase = `${scenario.role}/${scenario.emailVerified ? 'verified' : 'unverified'} cannot see the administration entry`;
    ({ role, emailVerified } = scenario);
    await login(page);
    await expect(page).toHaveURL(base + '/account');
    await page.getByRole('navigation', { name: '主导航', exact: true }).getByRole('link', { name: '商城', exact: true }).click();
    await expect(page.locator('.store-header-actions').getByRole('link', { name: '我的账户', exact: true })).toBeVisible();
    await expect(adminEntry(page)).toHaveCount(0);
    await expect(mobileEntry(page)).toHaveCount(0);
    checks.push(phase);
  }

  phase = 'unavailable account verification and design previews never show administrator tools';
  role = 'admin'; emailVerified = true;
  await login(page);
  // The account shell now has the same verified admin entry. Wait for the
  // actual login destination before making the storefront context unavailable.
  await expect(page).toHaveURL(base + '/');
  await expect(adminEntry(page)).toBeVisible();
  unavailable = true;
  await page.reload();
  await expect(page.getByRole('heading', { name: '发现有趣的自己', exact: true })).toBeVisible();
  await expect(adminEntry(page)).toHaveCount(0);
  unavailable = false;
  await page.goto(base + '/preview');
  await expect(page.getByText('独立设计预览 · 数据为示例', { exact: false })).toBeVisible();
  await expect(adminEntry(page)).toHaveCount(0);
  checks.push(phase);
  assert.deepEqual(errors, []);
  await writeFile(join(output, 'result.json'), JSON.stringify({ passed: true, checks, isolatedAuthFixtures: true, liveDataChanged: false }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: checks.length, checks }));
} catch (error) {
  const debugPage = browser?.contexts().flatMap(context => context.pages()).at(-1);
  if (debugPage) {
    await writeFile(join(root, '.local/t10-local-ui/admin-entry-failure.json'), JSON.stringify({ phase, error: String(error), pageErrors: errors, url: debugPage.url(), body: await debugPage.locator('body').innerText() }, null, 2) + '\n').catch(() => {});
    await debugPage.screenshot({ path: join(root, '.local/t10-local-ui/admin-entry-failure.png'), fullPage: true }).catch(() => {});
  }
  console.error(JSON.stringify({ failedPhase: phase, detail: String(error), checks }));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await vite?.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
