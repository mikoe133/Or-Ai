import { existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadLocalEnvironment, runtimeHome } from './runtime-config.mjs';

loadLocalEnvironment();
if (process.platform !== 'darwin') {
  const result = spawnSync('docker', ['info'], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} else {
  const pluginDirectory = join(homedir(), '.docker/cli-plugins');
  mkdirSync(pluginDirectory, { recursive: true });
  for (const name of ['docker-compose', 'docker-buildx']) {
    const destination = join(pluginDirectory, name);
    const alreadyPresent = existsSync(destination) || (() => {
      try { return lstatSync(destination).isSymbolicLink(); } catch { return false; }
    })();
    const source = ['/opt/homebrew/lib/docker/cli-plugins', '/usr/local/lib/docker/cli-plugins']
      .map(directory => join(directory, name)).find(candidate => existsSync(candidate));
    if (!alreadyPresent && source) symlinkSync(source, destination);
  }
  mkdirSync(runtimeHome(), { recursive: true });
  const result = spawnSync('colima', [
    'start', '--profile', 'orai-dev', '--activate=false', '--ssh-config=false',
    '--mount', 'none', '--cpus', '2', '--memory', '2', '--disk', '12',
    '--root-disk', '12', '--vm-type', 'vz', '--dns', '1.1.1.1', '--dns', '8.8.8.8',
  ], { stdio: 'inherit', env: { ...process.env, COLIMA_HOME: runtimeHome() } });
  process.exitCode = result.status ?? 1;
  if (result.status === 0) {
    // Some minimal guest images leave a dangling systemd-resolved symlink.
    // Repair only that known defect in our own VM, leaving working resolvers intact.
    const repair = spawnSync('colima', ['ssh', '--profile', 'orai-dev', '--', 'sudo', 'sh', '-s'], {
      input: readFileSync(new URL('./repair-runtime-dns.sh', import.meta.url), 'utf8'),
      stdio: ['pipe', 'inherit', 'inherit'],
      env: { ...process.env, COLIMA_HOME: runtimeHome() },
    });
    process.exitCode = repair.status ?? 1;
  }
}
