import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const image = args.length === 0 ? 'orai-api:cloud-local' : args.length === 2 && args[0] === '--image' ? args[1] : null;
const dockerScript = fileURLToPath(new URL('./docker.mjs', import.meta.url));
const root = fileURLToPath(new URL('../', import.meta.url));
const containerName = `orai-cloud-smoke-${process.pid}`;
const docker = parameters => execFileSync(process.execPath, [dockerScript, ...parameters], {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 4 * 1024 * 1024, timeout: 60000,
});

// The container gets only synthetic unreachable configuration. It has no ports,
// volumes, provider credentials or network, and cannot reach the development DB.
const proof = String.raw`
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
let phase = 'image-files';
let app;
let readyStatus = null;
let appOutput = '';
const memoryMetrics = () => {
  const number = file => { try { const value=Number(fs.readFileSync(file,'utf8').trim()); return Number.isFinite(value)?value:null; } catch { return null; } };
  let oomKills = null;
  try { oomKills=Number(fs.readFileSync('/sys/fs/cgroup/memory.events','utf8').match(/^oom_kill (\d+)$/m)?.[1] ?? 0); } catch {}
  return {limitBytes:number('/sys/fs/cgroup/memory.max'),peakBytes:number('/sys/fs/cgroup/memory.peak'),oomKills};
};
(async () => {
  assert.equal(process.platform, 'linux'); assert.equal(process.arch, 'x64'); assert.equal(process.getuid(), 1000);
  for (const p of ['.env', 'prisma', 'scripts', 'test', '.test-build', '.tools-build']) assert.equal(fs.existsSync('/app/' + p), false);
  phase = 'development-packages';
  for (const name of ['@nestjs/testing', 'typescript', 'prisma']) {
    let present = true; try { require.resolve(name); } catch { present = false; } assert.equal(present, false);
  }
  phase = 'architecture-specific-dependencies';
  let nativeBinaries = 0;
  const scan = dir => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) scan(p);
    else if (e.isFile() && /\.node$|\.so(?:\.\d+)*$|^(schema-engine|query-engine|libquery_engine)/.test(e.name)) nativeBinaries++;
  }};
  scan('/app/node_modules'); assert.equal(nativeBinaries, 0);
  phase = 'production-startup';
  app = spawn(process.execPath, ['dist/main.js'], { cwd: '/app', env: {
    PATH: process.env.PATH, NODE_ENV: 'production', APP_ENV: 'production', API_HOST: '0.0.0.0', API_PORT: '4100',
    APP_PUBLIC_ORIGIN: 'https://store.unit.test', CSRF_SIGNING_KEY: Buffer.alloc(32, 1).toString('base64url'),
    DATABASE_URL: 'postgresql://synthetic_app:synthetic_password@127.0.0.1:9/unreachable?schema=orai',
    DATABASE_SSL_MODE: 'verify-full', DATABASE_POOL_MAX: '1', ASSET_STORAGE_DRIVER: 'disabled'
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [app.stdout, app.stderr]) stream.on('data', chunk => { appOutput = (appOutput + String(chunk)).slice(-16384); });
  let live = 0;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline && app.exitCode === null && app.signalCode === null) {
    try { live = (await fetch('http://127.0.0.1:4100/health/live', {signal: AbortSignal.timeout(1000)})).status; } catch {}
    if (live === 200) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(live, 200);
  phase = 'readiness-is-not-liveness';
  const ready = await fetch('http://127.0.0.1:4100/health/ready', {signal: AbortSignal.timeout(5000)});
  readyStatus = ready.status;
  assert.equal(ready.status, 503); assert.equal((await ready.json()).checks.database, 'down');
  console.log(JSON.stringify({passed:true, platform:process.platform, architecture:process.arch, uid:process.getuid(),
    nativeDependencyBinaries:nativeBinaries, developmentPackagesAbsent:true, secretsAndMigrationToolsAbsent:true,
    productionLiveness:live, unreachableDatabaseReadiness:ready.status, actualDatabaseValidated:false,
    storageConfigured:false, authConfigured:false, network:'none', readOnlyRoot:true,memory:memoryMetrics()}));
})().catch(async error => {
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log(JSON.stringify({passed:false, phase, readyStatus,
  processExitCode:app?.exitCode ?? null, processSignal:app?.signalCode ?? null,
  timeout:error?.name === 'TimeoutError', wasmFailure:/wasm|webassembly/i.test(appOutput),
  memoryFailure:/out of memory|allocation failed/i.test(appOutput), emulationFailure:/qemu|segmentation fault/i.test(appOutput),memory:memoryMetrics()})); process.exitCode=1; })
.finally(async () => {
  if (!app || app.exitCode !== null || app.signalCode !== null) return;
  const stopped = new Promise(resolve => app.once('close', resolve));
  app.kill('SIGTERM');
  const timer = setTimeout(() => app.kill('SIGKILL'), 3000);
  await stopped; clearTimeout(timer);
});
`;

try {
  if (!image || !/^[A-Za-z0-9][A-Za-z0-9./:_-]{0,200}$/.test(image)) throw new Error();
  const info = JSON.parse(docker(['image', 'inspect', image, '--format', '{"os":"{{.Os}}","arch":"{{.Architecture}}","user":"{{.Config.User}}"}']));
  if (info.os !== 'linux' || info.arch !== 'amd64' || info.user !== 'node') throw new Error();
  const result = JSON.parse(docker(['run', '--rm', '--name', containerName, '--pull', 'never', '--platform', 'linux/amd64', '--network', 'none', '--read-only',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
    '--pids-limit', '64', '--memory', '1g', '--cpus', '1', '--entrypoint', 'node', image, '-e', proof]).trim());
  console.log(JSON.stringify({image:info, runtime:result}));
  if (!result.passed) process.exitCode=1;
} catch (error) {
  let phase;
  let diagnostic;
  try {
    const result = JSON.parse(String(error.stdout).trim());
    if (['image-files', 'development-packages', 'architecture-specific-dependencies', 'production-startup', 'readiness-is-not-liveness'].includes(result.phase)) phase = result.phase;
    diagnostic = { readyStatus:Number.isInteger(result.readyStatus) ? result.readyStatus : null,
      processExitCode:Number.isInteger(result.processExitCode) ? result.processExitCode : null,
      processSignal:['SIGSEGV', 'SIGKILL', 'SIGABRT', 'SIGTERM'].includes(result.processSignal) ? result.processSignal : null,
      timeout:result.timeout === true, wasmFailure:result.wasmFailure === true,
      memoryFailure:result.memoryFailure === true, emulationFailure:result.emulationFailure === true,
      memory:result.memory ? Object.fromEntries(['limitBytes','peakBytes','oomKills'].map(key=>[key,Number.isFinite(result.memory[key])?result.memory[key]:null])) : null };
  } catch { /* Do not copy raw Docker/application output into the report. */ }
  console.log(JSON.stringify({passed:false,error:'IMAGE_INSPECTION_OR_RUNTIME_PROOF_FAILED',phase,diagnostic}));
  process.exitCode=1;
} finally {
  // --rm handles normal shutdown; clean up only this invocation after a timeout.
  try { docker(['container', 'rm', '--force', containerName]); } catch { /* Already removed or never created. */ }
}
