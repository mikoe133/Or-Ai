import { spawnSync } from 'node:child_process';
import { loadLocalEnvironment, runtimeHome } from './runtime-config.mjs';

loadLocalEnvironment();
if (process.platform === 'darwin') {
  const result = spawnSync('colima', ['stop', '--profile', 'orai-dev'], {
    stdio: 'inherit', env: { ...process.env, COLIMA_HOME: runtimeHome() },
  });
  process.exitCode = result.status ?? 1;
} else {
  console.log('Use your existing Docker runtime controls on this platform.');
}
