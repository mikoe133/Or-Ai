import { spawnSync } from 'node:child_process';
import { dockerArguments, loadLocalEnvironment } from './runtime-config.mjs';

loadLocalEnvironment();
const result = spawnSync('docker', [...dockerArguments(), ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) console.error('Docker CLI is unavailable; install the local runtime tools.');
process.exitCode = result.status ?? 1;
