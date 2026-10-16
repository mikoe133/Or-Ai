import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import { configureLocalAuth, disableLocalAuth, readLocalAuthConfig } from './local-auth-config.mjs';
import { authComposeArguments, localAuthReadiness } from './local-auth-runtime.mjs';
import { dockerArguments, loadLocalEnvironment, repositoryRoot } from './runtime-config.mjs';

const privateDirectory = join(repositoryRoot, '.local/auth');
const envPath = join(repositoryRoot, '.env'), statePath = join(privateDirectory, 'config-restore.json');
try {
  const action = process.argv[2];
  if (process.argv.length !== 3 || !['setup', 'disable', 'up', 'stop', 'restart', 'status'].includes(action)) throw new Error('Use pnpm auth:setup/auth:up/auth:down/auth:restart/auth:status/auth:disable.');
  mkdirSync(privateDirectory, { recursive: true, mode: 0o700 }); chmodSync(privateDirectory, 0o700);
  if (action === 'setup' || action === 'disable') {
    const config = (action === 'setup' ? configureLocalAuth : disableLocalAuth)(envPath, statePath);
    console.log(JSON.stringify({ enabled: config.enabled, siteOrigin: config.siteOrigin, authOrigin: config.authOrigin, mailOrigin: config.mailOrigin,
      next: action === 'setup' ? 'Run pnpm auth:up, then restart this project API and Vite to reload .env.' : 'Run pnpm auth:down and restart this project API and Vite. Auth keys and data are retained.' }, null, 2));
  } else {
    const text = readFileSync(envPath, 'utf8');
    const config = readLocalAuthConfig(text, { requireEnabled: ['up', 'restart'].includes(action) });
    loadLocalEnvironment();
    if (action !== 'status') {
      const environment = { ...process.env, ...parseEnv(text) };
      // CLI output is retained privately, rather than printing upstream error
      // details which can contain credentials. No command deletes volumes.
      for (const operation of ['config', action]) {
        const result = spawnSync('docker', [...dockerArguments(), ...authComposeArguments(operation)], {
          cwd: repositoryRoot, env: environment, encoding: 'utf8', timeout: 240_000, maxBuffer: 4_000_000,
        });
        writeFileSync(join(privateDirectory, 'runtime-last.log'), (result.stdout ?? '') + (result.stderr ?? ''), { mode: 0o600 });
        chmodSync(join(privateDirectory, 'runtime-last.log'), 0o600);
        if (result.status !== 0) throw new Error('Local Auth container operation failed. Inspect .local/auth/runtime-last.log privately; existing volumes were retained.');
      }
      if (action === 'stop') { console.log('Local Auth containers stopped; Auth and mail volumes retained. Business services were not selected.'); }
      else {
        let ready;
        for (let attempt = 0; attempt < 30; attempt++) {
          ready = await localAuthReadiness(config);
          if (ready.ready) break;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log(JSON.stringify(ready, null, 2));
        if (!ready?.ready) process.exitCode = 1;
      }
    } else {
      const ready = await localAuthReadiness(config);
      console.log(JSON.stringify(ready, null, 2));
      if (!ready.ready) process.exitCode = 1;
    }
  }
} catch (error) {
  // Locally generated errors contain only field names and recovery guidance.
  const safe = error instanceof Error && /^(Local |Private |Unexpected Auth|Unsupported local|Use pnpm|Private configuration)/.test(error.message);
  console.error(safe ? error.message : 'Local Auth operation failed; check the private local configuration without printing credentials.');
  process.exitCode = 1;
}
