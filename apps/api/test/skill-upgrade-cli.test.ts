import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StyleSkillManifestSchema } from '@orai/contracts/admin';
import { createLocalFixture } from './local-fixture';
import { DemoIdentityScenarios } from '../scripts/demo-fixtures';
import { contentDigest } from '../src/operations/content-projections';

const execute = promisify(execFile);
let fixture: Awaited<ReturnType<typeof createLocalFixture>>, directory: string;
before(async () => { fixture = await createLocalFixture('t13'); directory = await mkdtemp(join(tmpdir(), 'orai-upgrade-cli-')); });
after(async () => { await fixture?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });
const command = (args: string[]) => execute(process.execPath, ['.test-build/scripts/skill-upgrade-cli.js', ...args], {
  env: { ...fixture.env, ASSET_DIRECTORY: directory }, maxBuffer: 8 * 1024 * 1024,
});
async function input() {
  const manifest = StyleSkillManifestSchema.parse({ schemaVersion: 1, domain: 'copy', name: '旧文案维护样例', description: '仅验证维护工具',
    purposes: ['copywriting'], styles: ['紫色'], supportedForms: ['web'], inputs: [{ key: 'creative-profile', description: '共同设定', required: true }],
    outputs: [{ key: 'copy', description: '具体观察文案' }], instructions: '从具体生活观察提出邀请，保留理解空间。', examples: [], references: [] });
  const skill = await fixture.owner.client.styleSkill.create({ data: { scope: 'DEMO', domain: 'copy', slug: 'cli-' + randomUUID(), name: manifest.name,
    description: manifest.description, purposes: manifest.purposes, styles: manifest.styles, supportedForms: manifest.supportedForms } });
  const source = await fixture.owner.client.styleSkillVersion.create({ data: { skillId: skill.id, scope: 'DEMO', number: 1, manifest,
    digest: contentDigest(manifest), actorUserId: DemoIdentityScenarios.admin.id } });
  const path = join(directory, randomUUID() + '.json');
  await writeFile(path, JSON.stringify({ items: [{ source: { kind: 'skill_version', id: source.id, digest: source.digest, revision: 0, skillRevision: 0 },
    notes: '以实际商品 Three.js 场景和固定规划作为表达依据，不预设动画或玩法卖点。', requestId: randomUUID(), target: null }] }), { mode: 0o600 });
  return { skill, source, path };
}

test('local maintenance CLI inventories only after owner and administrator authorization', async () => {
  const result = await command(['inventory', '--actor', DemoIdentityScenarios.admin.id]);
  const body = JSON.parse(result.stdout); assert.equal(body.executionStarted, false); assert.equal(body.consumerDataRead, false); assert.equal(body.purposes.length, 7);
});

test('CLI preview, apply and original-request retry keep private receipts and never duplicate a new draft', async () => {
  const c = await input(), preview = join(directory, randomUUID() + '.json'), receipt = join(directory, randomUUID() + '.json'), retry = join(directory, randomUUID() + '.json');
  await command(['preview', '--actor', DemoIdentityScenarios.admin.id, '--file', c.path, '--out', preview]);
  assert.equal((await stat(preview)).mode & 0o777, 0o600); assert.equal(await fixture.runtime.client.styleSkillVersion.count({ where: { skillId: c.skill.id } }), 1);
  await command(['apply', '--actor', DemoIdentityScenarios.admin.id, '--file', preview, '--out', receipt]);
  await command(['apply', '--actor', DemoIdentityScenarios.admin.id, '--file', preview, '--out', retry]);
  assert.deepEqual(JSON.parse(await readFile(receipt, 'utf8')), JSON.parse(await readFile(retry, 'utf8')));
  assert.equal(await fixture.runtime.client.styleSkillVersion.count({ where: { skillId: c.skill.id } }), 2);
  assert.equal(JSON.parse(await readFile(receipt, 'utf8')).items[0].result.version.status, 'draft');
});

test('CLI refuses an existing output file before executing the mutation and sanitizes bad arguments', async () => {
  const c = await input(), preview = join(directory, randomUUID() + '.json'), output = join(directory, randomUUID() + '.json');
  await command(['preview', '--actor', DemoIdentityScenarios.admin.id, '--file', c.path, '--out', preview]);
  await writeFile(output, 'keep exact existing file');
  await assert.rejects(command(['apply', '--actor', DemoIdentityScenarios.admin.id, '--file', preview, '--out', output]));
  assert.equal(await readFile(output, 'utf8'), 'keep exact existing file');
  assert.equal(await fixture.runtime.client.styleSkillVersion.count({ where: { skillId: c.skill.id } }), 1);
  await assert.rejects(command(['inventory', '--actor', DemoIdentityScenarios.admin.id, '--token', 'PRIVATE_ARGUMENT_SENTINEL']), (error: unknown) => {
    const value = error as { stdout: string; stderr: string }; assert.equal((value.stdout + value.stderr).includes('PRIVATE_ARGUMENT_SENTINEL'), false); return true;
  });
});
