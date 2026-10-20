import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const envFile = new URL('../.env', import.meta.url);
export function loadLocalEnvironment() {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

export function defaultRuntimeHome() {
  const id = createHash('sha256').update(repositoryRoot).digest('hex').slice(0, 8);
  // Keep disk images on the workspace volume and socket paths short on macOS.
  const base = repositoryRoot.startsWith('/Volumes/')
    ? repositoryRoot.split('/').slice(0, 3).join('/')
    : homedir();
  return join(base, '.orai-runtime', id);
}

export function runtimeHome() {
  return process.env.ORAI_RUNTIME_HOME || defaultRuntimeHome();
}

export function dockerArguments() {
  return process.platform === 'darwin'
    ? ['--host', `unix://${join(runtimeHome(), 'orai-dev/docker.sock')}`]
    : [];
}
