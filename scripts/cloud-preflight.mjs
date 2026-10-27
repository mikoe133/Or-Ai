import { readFileSync, statSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { pathToFileURL } from 'node:url';
import { inspectCloudConfiguration } from './cloud-preflight-lib.mjs';

export async function runPreflight(args) {
  if (args.length !== 2 || args[0] !== '--env-file') return { exitCode: 1, report: { error: 'EXPLICIT_ENV_FILE_REQUIRED' } };
  let env;
  try {
    if (!statSync(args[1]).isFile() || statSync(args[1]).size > 1024 * 1024) throw new Error();
    // No process.env merge and no .env autoload: a local development credential
    // cannot silently fill in a missing production field.
    env = parseEnv(readFileSync(args[1], 'utf8'));
  } catch { return { exitCode: 1, report: { error: 'ENV_FILE_UNREADABLE_OR_TOO_LARGE' } }; }
  let loadConfiguration;
  try { ({ loadConfiguration } = await import('../apps/api/dist/config/configuration.js')); }
  catch { return { exitCode: 1, report: { error: 'API_BUILD_REQUIRED' } }; }
  const report = inspectCloudConfiguration(env, loadConfiguration);
  return { report, exitCode: report.configurationValid ? 2 : 1 };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.slice(2).length === 1 && process.argv[2] === '--help') {
    console.log('Usage: node scripts/cloud-preflight.mjs --env-file <ignored-production-inventory>');
    console.log('Offline only. Exit 1: invalid input/configuration; exit 2: format valid, deployment gaps remain. No credentials are printed.');
  } else {
    try {
      const { report, exitCode } = await runPreflight(process.argv.slice(2));
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = exitCode;
    } catch {
      console.log(JSON.stringify({ error: 'PREFLIGHT_FAILED' }));
      process.exitCode = 1;
    }
  }
}
