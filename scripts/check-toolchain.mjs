import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const expectedNode = readFileSync(new URL('.nvmrc', root), 'utf8').trim();
const manifest = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const expectedPnpm = manifest.packageManager.split('@').at(-1);
const actualPnpm = execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim();
const checks = [
  ['Node', process.versions.node, expectedNode],
  ['pnpm', actualPnpm, expectedPnpm],
];

for (const [name, actual, expected] of checks) {
  const matches = actual === expected;
  console.log(`${name}: ${actual}; expected ${expected}; ${matches ? 'PASS' : 'FAIL'}`);
  if (!matches) process.exitCode = 1;
}
