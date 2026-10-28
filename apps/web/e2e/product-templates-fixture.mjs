// CUA fixture only: builds no images, creates one disposable TEST DB, and serves the current built web app.
// Run from repository root after compiling API tests and building web; stop with SIGTERM to clean this fixture.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { startPerformanceServer } from './experience-performance-server.mjs';
import { uiFixtureOrigin } from './ui-fixture-origin.mjs';

const root = process.cwd(), require = createRequire(join(root, 'apps/api/package.json'));
require('reflect-metadata');
const { Test } = require('@nestjs/testing'), { AppModule } = require('./.test-build/src/app.module.js');
const { APP_CONFIG } = require('./.test-build/src/config/configuration.js'), { configureApp } = require('./.test-build/src/common/configure-app.js');
const { createLocalFixture } = require('./.test-build/test/local-fixture.js');
const { DemoProducts, DemoIdentityScenarios, demoId } = require('./.test-build/scripts/demo-fixtures.js');
const { AdminProductInputSchema, CreativeProfileSchema, ProductionPlanDocumentSchema } = require('@orai/contracts/admin');
const { currentSkillManifest } = require('./.test-build/test/skill-policy-fixture.js');
const names = ['CatalogAdminAccessService', 'CatalogAdminService', 'ContentService', 'VersionsService',
  'ProductionPlansService', 'ExperienceAuthoringService', 'SkillsService', 'DeliveryAdminService', 'FilesService'];
const paths = ['catalog/admin-access.service', 'operations/catalog-admin.service', 'operations/content.service', 'catalog/versions.service',
  'operations/production-plans.service', 'operations/experience-authoring.service', 'operations/skills.service', 'redemption/delivery-admin.service', 'operations/files.service'];
const classes = Object.fromEntries(names.map((name, index) => [name, require('./.test-build/src/' + paths[index] + '.js')[name]]));
const port = Number(process.env.ORAI_TEMPLATE_UI_PORT || 5187), origin = uiFixtureOrigin(port);
const privateDirectory = join(root, '.local/t16-c3-implementation-20261028'), stateFile = join(privateDirectory, 'ui-state.json');
const referenceImages = process.env.ORAI_TEMPLATE_RESOURCE_FIXTURE === '1';
const startup = { apiBootstrapMs: null, apiListenMs: null, referenceImages };
let fixture, app, web, performanceServer, directory, closing = false;
async function stop(code = 0) {
  if (closing) return; closing = true;
  if (web && web.exitCode === null) { const exited = new Promise(resolve => web.once('exit', resolve)); web.kill('SIGTERM'); await exited; }
  await performanceServer?.close();
  await app?.close(); await fixture?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
  await rm(stateFile, { force: true }); process.stdout.write('CLEANED isolated product template TEST fixture\n'); process.exit(code);
}
process.on('SIGTERM', () => void stop()); process.on('SIGINT', () => void stop());
try {
  await mkdir(privateDirectory, { recursive: true });
  process.chdir(join(root, 'apps/api')); fixture = await createLocalFixture('t16');
  directory = await mkdtemp(join(tmpdir(), 'orai-template-cua-'));
  const bootstrapStarted = performance.now();
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG).useValue({ ...fixture.configuration,
    security: { ...fixture.configuration.security, origins: [origin], readIpLimit: 3000, writeIpLimit: 3000 },
    assets: { ...fixture.configuration.assets, driver: 'local', directory } }).compile();
  startup.apiBootstrapMs = performance.now() - bootstrapStarted;
  app = module.createNestApplication({ logger: false }); configureApp(app);
  const listenStarted = performance.now(); await app.listen(0, '127.0.0.1'); startup.apiListenMs = performance.now() - listenStarted;
  const get = name => app.get(classes[name]);
  const access = await get('CatalogAdminAccessService').authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.admin.id);
  const original = await get('CatalogAdminService').product(access, demoId('demo-partner')), products = [];
  for (const [kind, file] of [['A', 'garden-observation'], ['B', 'relationship-atlas']]) {
    const atlas = kind === 'B';
    const product = await get('CatalogAdminService').create(access, { ...AdminProductInputSchema.strip().parse(original),
      slug: 'synthetic-' + kind.toLowerCase() + '-' + randomUUID(), name: '合成' + kind + ' · 商品模板技术验收', requestId: randomUUID() });
    const profile = await get('ContentService').saveProfile(access, product.id, { expectedRevision: 0, requestId: randomUUID(),
      profile: CreativeProfileSchema.parse({ schemaVersion: 1, title: '合成' + kind + '技术设定', audience: '本地技术验收操作者',
        situation: '观察日常交流', emotionalGoal: '留意自己的真实感受', understandingGoal: '理解一次相处中的节奏', takeaway: '核对一个具体观察',
        perspective: atlas ? 'single_person_relationship' : 'self', experienceForm: '3d', pace: '从容',
        world: atlas ? '暖灰纸色正交关系观察台' : '浅紫与鼠尾草的低多边形花园', language: '具体温和', visual: '克制紫色', sound: '无需音效',
        channels: ['manual'], deliverables: ['assessment', 'cover', 'video', 'copy'],
        reportPlan: { schemaVersion: 1, title: '合成观察记录', narrative: '仅作功能验证', presentation: 'standard',
          sections: [{ sectionId: 'next', title: '下一步', purpose: '核对服务器报告承接' }] } }) });
    const configuration = structuredClone(DemoProducts[0].configurations[1]);
    if (atlas) configuration.questions[0].text += ' 当你们的想法暂时不同，也需要各自一点空间时，请按最近的真实感受选择。';
    const version = await get('VersionsService').importConfiguration(access, product.id, { configuration, requestId: randomUUID() });
    const preparation = JSON.parse(await readFile(join(root, 'examples/threejs-products/technical-preparation/' + file + '.json'), 'utf8'));
    const document = ProductionPlanDocumentSchema.parse({ ...preparation.plan, creativeProfileRevisionId: profile.id });
    const references = { scene: atlas ? 'atlas-scene.ts' : 'garden-scene.ts', camera: atlas ? 'atlas-scene.ts' : 'garden-renderer.ts',
      interaction: atlas ? 'relationship-atlas.tsx' : 'reflection-garden.tsx', feedback: atlas ? 'relationship-atlas.tsx' : 'reflection-garden.tsx',
      confirmation: atlas ? 'relationship-atlas.tsx' : 'reflection-garden.tsx', recovery: 'host.tsx',
      report: atlas ? 'atlas-notes.tsx' : 'garden-notes.tsx', accessibility: atlas ? 'relationship-atlas.tsx' : 'reflection-garden.tsx',
      fallback: 'host.tsx', resources: atlas ? 'atlas-scene.ts' : 'garden-scene.ts' };
    for (const [key, source] of Object.entries(references)) Object.assign(document.productPlan.decisions[key], {
      status: 'implemented', evidence: [{ kind: 'implementation', reference: 'apps/web/src/experience/' + source,
        summary: '仓库实现的隔离技术演练；没有性能/真机或正式商品验收声明' }] });
    const plan = await get('ProductionPlansService').save(access, product.id, { plan: document, expectedRevision: 0, requestId: randomUUID() });
    let method = await get('SkillsService').create(access, 'experience', { slug: 'synthetic-' + randomUUID(), requestId: randomUUID(),
      manifest: currentSkillManifest({ schemaVersion: 1, domain: 'experience', name: '合成' + kind + '技术验收方法', description: '仅供隔离模板接线验证',
        purposes: ['scene_design', 'report_presentation'], styles: ['紫色'], supportedForms: ['3d'], inputs: [
          { key: 'creative-profile', description: '固定共同创作设定', required: true }, { key: 'product-plan', description: '固定商品规划', required: true }],
        outputs: [{ key: 'scene', description: '可信模板与服务器报告的结构化配对' }], instructions: '使用固定规划的已注册组合；保留明确确认、同题回退和服务器结果，不按位置或动画评分。', examples: [], references: [] }) });
    for (const action of ['review', 'activate']) method = await get('SkillsService').transition(access, 'experience', method.skillId, method.id, action,
      { expectedRevision: method.revision, requestId: randomUUID() });
    const workspace = await get('ExperienceAuthoringService').workspace(access, product.id, version.id, { profileId: profile.id });
    const manifest = workspace.defaultManifest, runtime = plan.modules.find(item => item.moduleKey === 'scene').definition.target.runtime;
    manifest.renderer = runtime.renderer; manifest.report.renderer = runtime.reportRenderer;
    if (referenceImages) {
      const bytes = await readFile(join(root, 'apps/api/test/fixtures/cover.jpg'));
      const checksum = createHash('sha256').update(bytes).digest('hex'), files = get('FilesService');
      const prepared = await files.prepare(access, { productVersionId: version.id, kind: 'experience', fileName: 'technical-reference.jpg',
        mimeType: 'image/jpeg', byteSize: bytes.length, checksum, requestId: randomUUID() });
      const stream = Readable.from([bytes]); stream.headers = { 'content-type': 'application/octet-stream', 'content-length': String(bytes.length) };
      await files.upload(access, prepared.id, stream); await files.complete(access, prepared.id, { requestId: randomUUID() });
      manifest.resources = [{ resourceId: 'technical-reference', fileId: prepared.id, purpose: 'illustration', label: '既有JPEG技术参考',
        mimeType: 'image/jpeg', byteSize: bytes.length, checksum }];
    }
    const draft = await get('ExperienceAuthoringService').save(access, product.id, version.id, { manifest, reportPlan: profile.profile.reportPlan,
      productPlan: { revisionId: plan.id, digest: plan.digest }, methods: ['scene_design', 'report_presentation'].map(purpose => ({ purpose, skillVersionId: method.id })),
      note: 'CUA合成' + kind + '实际模板验收', source: 'manual', expectedRevision: 0, expectedVersionRevision: version.revision, requestId: randomUUID() });
    await get('ExperienceAuthoringService').review(access, draft.id, { expectedRevision: draft.revision, requestId: randomUUID() });
    await get('VersionsService').review(access, product.id, version.id, { requestId: randomUUID() });
    await get('VersionsService').publish(access, product.id, version.id, { requestId: randomUUID() });
    const order = await get('DeliveryAdminService').recordOrder(access, { platform: 'manual', reference: 'demo:template-cua:' + randomUUID(),
      productVersionId: version.id, scope: 'demo', quantity: 1, amountFen: 0, requestId: randomUUID() });
    const issued = await get('DeliveryAdminService').issueOrder(access, order.id, { requestId: randomUUID() });
    products.push({ kind, productId: product.id, versionId: version.id, planId: plan.id, planDigest: plan.digest,
      code: issued.deliveries[0].code, orderId: order.id, renderer: manifest.renderer.key, reportRenderer: manifest.report.renderer.key });
  }
  const apiOrigin = await app.getUrl();
  if (process.env.ORAI_TEMPLATE_PERF_PROBE === '1') {
    const webStarted = performance.now(); performanceServer = await startPerformanceServer({ root, apiOrigin, port });
    startup.webListenMs = performance.now() - webStarted;
  } else { web = spawn(process.execPath, [join(root, 'apps/web/node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: join(root, 'apps/web'), env: { ...process.env, API_PORT: new URL(apiOrigin).port, WEB_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  web.stdout.on('data', bytes => process.stdout.write(bytes)); web.stderr.on('data', bytes => process.stderr.write(bytes));
  }
  await writeFile(stateFile, JSON.stringify({ pid: process.pid, database: fixture.name, apiOrigin, origin, products, startup }, null, 2), { mode: 0o600 });
  process.stdout.write('READY isolated TEST template UI: ' + origin + '/redeem\n');
} catch (error) { process.stderr.write('TEMPLATE_UI_SETUP_FAILED: ' + String(error.message).slice(0, 300) + '\n'); await stop(1); }
