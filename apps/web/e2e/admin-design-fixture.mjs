// CUA-only persistent TEST fixture. No browser runner, real identity, generation or deployment.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { authProtocolFixture } from './auth-protocol-fixture.mjs';
import { startPerformanceServer } from './experience-performance-server.mjs';
import { uiFixtureOrigin } from './ui-fixture-origin.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url)), require = createRequire(join(root, 'apps/api/package.json'));
require('reflect-metadata');
const { Test } = require('@nestjs/testing'), { AppModule } = require('./.test-build/src/app.module.js');
const { APP_CONFIG } = require('./.test-build/src/config/configuration.js');
const { configureApp } = require('./.test-build/src/common/configure-app.js');
const { SupabaseAuthGateway } = require('./.test-build/src/accounts/supabase-auth.gateway.js');
const { createLocalFixture } = require('./.test-build/test/local-fixture.js');
const { DemoIdentityScenarios } = require('./.test-build/scripts/demo-fixtures.js');
const port = Number(process.env.ORAI_ADMIN_DESIGN_PORT || 5187), origin = uiFixtureOrigin(port);
const privateDirectory = join(root, '.local/t18-admin-shell-20261028'), stateFile = join(privateDirectory, 'ui-state.json');
let fixture, app, web, protocol, directory, stateWritten = false, closing = false, phase = 'prepare';

async function stop(code = 0) {
  if (closing) return;
  closing = true;
  await web?.close();
  await app?.close();
  await protocol?.close();
  await fixture?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
  if (stateWritten) await rm(stateFile, { force: true });
  process.stdout.write('CLEANED isolated admin design TEST fixture\n');
  process.exit(code);
}
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());

try {
  await mkdir(privateDirectory, { recursive: true, mode: 0o700 });
  await chmod(privateDirectory, 0o700);
  process.chdir(join(root, 'apps/api'));
  phase = 'isolated database';
  fixture = await createLocalFixture('t18');
  if (fixture.configuration.environment !== 'test') throw new Error('TEST configuration required');
  directory = await mkdtemp(join(tmpdir(), 'orai-admin-design-'));
  protocol = await authProtocolFixture({ origin, actors: DemoIdentityScenarios });
  phase = 'isolated API';
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG).useValue({
    ...fixture.configuration,
    assets: { ...fixture.configuration.assets, driver: 'local', directory },
    security: { ...fixture.configuration.security, origins: [origin], readIpLimit: 3000, writeIpLimit: 3000 },
    auth: { url: 'https://isolated.example.test', publishableKey: 'sb_publishable_' + 'p'.repeat(40),
      sessionEncryptionKey: randomBytes(32).toString('base64url'), sessionDays: 1, requestTimeoutMs: 1000 },
  }).overrideProvider(SupabaseAuthGateway).useValue(protocol.gateway).compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  phase = 'synthetic protocol credentials';
  async function syntheticSession(email) {
    const response = await fetch(protocol.url + '/auth/v1/token?grant_type=password', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'isolated-protocol-only' }) });
    if (!response.ok) throw new Error('Synthetic protocol session failed');
    const data = await response.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  }
  const login = { administrator: await syntheticSession('operator@example.test'), member: await syntheticSession('member@example.test') };
  phase = 'loopback web';
  web = await startPerformanceServer({ root, apiOrigin: await app.getUrl(), port });
  await writeFile(stateFile, JSON.stringify({ pid: process.pid, database: fixture.name, origin,
    auth: 'SupabaseAuthGateway protocol substitute; seeded TEST roles only; no real account', login }, null, 2), { flag: 'wx', mode: 0o600 });
  stateWritten = true;
  process.stdout.write('READY isolated admin design TEST: ' + origin + '/admin\n');
} catch (error) {
  process.stderr.write('ADMIN_DESIGN_SETUP_FAILED at ' + phase + ' (' + error.name + ')\n');
  await stop(1);
}
