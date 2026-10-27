import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { StyleSkillManifestSchema, skillPurposes, threejsSkillPolicyIssues, type StyleSkillManifest } from '@orai/contracts/admin';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/config/configuration';
import { CatalogAdminAccessService, type CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { SkillUpgradeService } from '../src/operations/skill-upgrade.service';
import { SkillsService } from '../src/operations/skills.service';
import { SkillFilesService } from '../src/operations/skill-files.service';
import { ProjectProductionService } from '../src/operations/project-production.service';
import { contentDigest } from '../src/operations/content-projections';
import { fixedVersion } from '../src/operations/skill-bindings.service';
import { expandInstructions } from '../src/operations/project-method-instructions';
import { DemoIdentityScenarios } from '../scripts/demo-fixtures';
import { createLocalFixture } from './local-fixture';
import { methodProject } from './project-methods-fixture';

let fixture: Awaited<ReturnType<typeof createLocalFixture>>, app: INestApplication, directory: string, access: CatalogAdminAccess, service: SkillUpgradeService;
before(async () => {
  fixture = await createLocalFixture('t13'); directory = await mkdtemp(join(tmpdir(), 'orai-skill-upgrade-'));
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(APP_CONFIG).useValue({
    ...fixture.configuration, assets: { ...fixture.configuration.assets, driver: 'local', directory },
  }).compile();
  app = module.createNestApplication({ logger: false }); await app.init();
  access = await app.get(CatalogAdminAccessService).authorizeLocalOwner(fixture.owner.client, DemoIdentityScenarios.admin.id);
  service = app.get(SkillUpgradeService);
});
after(async () => { await app?.close(); await fixture?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });
const notes = '保留原专业方法；制作前读取固定商品规划，逐一对应实际 Three.js 场景与交付；未定动画、镜头及玩法保持待规划。';
async function legacy(domain: keyof typeof skillPurposes = 'copy', reference = false, form = 'web') {
  const manifest = StyleSkillManifestSchema.parse({ schemaVersion: 1, domain, name: '旧专业方法 · ' + domain,
    description: '历史正文必须保持', purposes: [...skillPurposes[domain]], styles: ['紫色'], supportedForms: [form],
    inputs: [{ key: 'creative-profile', description: '共同设定', required: true }], outputs: [{ key: 'deliverable', description: '专业交付' }],
    instructions: '先观察具体情境，再提供温和建议；保留原专业步骤。', examples: [{ title: '原例子', input: '日常情境', output: '具体观察' }], references: [] });
  const skill = await fixture.owner.client.styleSkill.create({ data: { scope: 'DEMO', domain, slug: 'upgrade-' + randomUUID(),
    name: manifest.name, description: manifest.description, purposes: manifest.purposes, styles: manifest.styles, supportedForms: manifest.supportedForms } });
  let fileId: string | null = null;
  const bytes = Buffer.from('原专业参考，必须保持同一文件和摘要。');
  if (reference) {
    const files = app.get(SkillFilesService), prepared = await files.prepare(access, domain, skill.id, { fileName: 'guide.md', mimeType: 'text/markdown',
      byteSize: bytes.length, checksum: createHash('sha256').update(bytes).digest('hex'), requestId: randomUUID() });
    await files.upload(access, domain, skill.id, prepared.id, Readable.from([bytes])); await files.complete(access, domain, skill.id, prepared.id, { requestId: randomUUID() });
    fileId = prepared.id; manifest.references = [{ path: 'references/guide.md', fileId }];
  }
  const version = await fixture.owner.client.styleSkillVersion.create({ data: { skillId: skill.id, scope: 'DEMO', number: 1, manifest,
    digest: contentDigest(manifest), actorUserId: access.actorUserId } });
  if (fileId) await fixture.owner.client.styleSkillAttachment.create({ data: { skillId: skill.id, scope: 'DEMO', versionId: version.id, fileId, path: 'references/guide.md' } });
  return { skill, version, manifest, fileId, bytes };
}
function selection(c: Awaited<ReturnType<typeof legacy>>) {
  return { source: { kind: 'skill_version', id: c.version.id, digest: c.version.digest, revision: c.version.revision, skillRevision: c.skill.revision }, notes, requestId: randomUUID(), target: null };
}
const saved = (result: Awaited<ReturnType<SkillUpgradeService['apply']>>) => {
  const entry = result.items[0]!; assert.equal(entry.state, 'saved', JSON.stringify(entry)); if (entry.state !== 'saved') throw Error('Missing result'); return entry.result;
};

test('upgrade inventory is scoped, read-only and exposes all seven purposes plus exact fixed references', async () => {
  const c = await legacy('assessment', true), audits = await fixture.runtime.client.adminAuditLog.count(), count = await fixture.runtime.client.styleSkillVersion.count();
  const value = await service.inventory(access, {}), row = value.versions.find(item => item.id === c.version.id)!;
  assert.equal(row.skillRevision, 0); assert.equal(row.digest, c.version.digest); assert.ok(row.policyIssues.length);
  assert.equal(value.purposes.length, 7); assert.equal(value.domains.length, 5); assert.equal(row.attachmentCount, 1);
  assert.equal(await fixture.runtime.client.adminAuditLog.count(), audits); assert.equal(await fixture.runtime.client.styleSkillVersion.count(), count);
});

test('a reviewed preview appends a new draft and preserves original body, examples, attachments and source identity', async () => {
  const c = await legacy('assessment', true), input = { items: [selection(c)] }, preview = await service.preview(access, input);
  assert.equal(preview.items[0]!.proposal.schemaVersion, 2); assert.equal(threejsSkillPolicyIssues(preview.items[0]!.proposal).length, 0);
  assert.deepEqual(preview.items[0]!.proposal.references, c.manifest.references); assert.deepEqual(preview.items[0]!.proposal.examples, c.manifest.examples);
  assert.ok(preview.items[0]!.proposal.instructions.startsWith(c.manifest.instructions)); assert.ok(preview.items[0]!.diff.changes.length);
  const first = saved(await service.apply(access, JSON.parse(JSON.stringify(preview))));
  assert.notEqual(first.version.id, c.version.id); assert.equal(first.version.status, 'draft'); assert.equal(first.source.id, c.version.id);
  assert.equal(first.source.digest, c.version.digest); assert.equal(first.activationEffect, 'none'); assert.equal(first.bindingEffect, 'none');
  assert.deepEqual((await app.get(SkillsService).readVersion(access, 'assessment', c.skill.id, c.version.id)).manifest, c.manifest);
  assert.equal(first.version.files[0]!.file.id, c.fileId); assert.equal(first.requiresReview, true);
});

test('concurrent and original-request retries append one draft and one upgrade audit', async () => {
  const c = await legacy(), preview = await service.preview(access, { items: [selection(c)] }), audits = await fixture.runtime.client.adminAuditLog.count();
  const [a, b] = await Promise.all([service.apply(access, preview), service.apply(access, preview)]);
  assert.deepEqual(a, b); saved(a); assert.equal(await fixture.runtime.client.styleSkillVersion.count({ where: { skillId: c.skill.id } }), 2);
  assert.equal(await fixture.runtime.client.adminAuditLog.count(), audits + 1);
});

test('changed source revisions, changed previews and duplicate library selections cannot silently upgrade', async () => {
  const c = await legacy(), choice = selection(c), preview = await service.preview(access, { items: [choice] });
  await assert.rejects(service.preview(access, { items: [choice, { ...choice, requestId: randomUUID() }] }));
  await assert.rejects(service.preview(access, { items: [{ ...choice, notes: '' }] }));
  const changed = structuredClone(preview); changed.items[0]!.proposal.instructions += ' 未审阅变更'; await assert.rejects(service.apply(access, changed));
  await fixture.owner.client.styleSkill.update({ where: { id: c.skill.id }, data: { revision: { increment: 1 } } });
  const result = await service.apply(access, preview); assert.equal(result.items[0]!.state, 'failed');
  assert.equal(await fixture.runtime.client.styleSkillVersion.count({ where: { skillId: c.skill.id } }), 1);
});

test('one broken attachment fails only its selected item, and an unchanged retry resumes without duplicating the successful draft', async () => {
  const a = await legacy('copy', true), b = await legacy('cover', true), preview = await service.preview(access, { items: [selection(a), selection(b)] });
  const file = await fixture.runtime.client.skillReferenceFile.findUniqueOrThrow({ where: { id: b.fileId! } });
  await writeFile(join(directory, file.storageKey), Buffer.alloc(b.bytes.length, 88));
  const first = await service.apply(access, preview); assert.equal(first.items[0]!.state, 'saved'); assert.equal(first.items[1]!.state, 'failed');
  assert.equal(await fixture.runtime.client.styleSkillVersion.count({ where: { skillId: b.skill.id } }), 1);
  await writeFile(join(directory, file.storageKey), b.bytes);
  const retry = await service.apply(access, preview); assert.equal(retry.items[0]!.state, 'saved'); assert.equal(retry.items[1]!.state, 'saved');
  for (const c of [a, b]) assert.equal(await fixture.runtime.client.styleSkillVersion.count({ where: { skillId: c.skill.id } }), 2);
});

test('project upgrades retain frozen custom parameters and archived base instructions in a new exact plan snapshot without global activation', async () => {
  const project = await methodProject(app, fixture, access), module = project.module('copy'), c = await legacy('copy', true);
  const row = await fixture.runtime.client.styleSkillVersion.findUniqueOrThrow({ where: { id: c.version.id }, include: { skill: true, attachments: { include: { file: true } } } });
  const fixed = fixedVersion(row), customization = { parameters: { 'sentence-limit': 2, tone: '温柔' }, instructions: '保留商品专属结束语。' };
  const snapshot = { ...fixed, customization: { ...customization, effectiveInstructions: expandInstructions(c.manifest.instructions, customization) } };
  const old = await fixture.owner.client.$transaction(async tx => { const value = await tx.projectMethodSnapshot.create({ data: { planModuleId: module.id, productId: project.boot.productId, scope: 'DEMO',
    skillId: c.skill.id, sourceVersionId: c.version.id, sourceRevision: c.version.revision, purpose: 'copywriting', snapshot,
    digest: contentDigest({ source: snapshot, planModuleId: module.id }), actorUserId: access.actorUserId } });
    await tx.projectMethodReference.create({ data: { snapshotId: value.id, skillId: c.skill.id, scope: 'DEMO', fileId: c.fileId!, path: 'references/guide.md' } }); return value; });
  await fixture.owner.client.styleSkillVersion.update({ where: { id: c.version.id }, data: { status: 'ARCHIVED', revision: { increment: 1 } } });
  const body = { source: { kind: 'project_method', id: old.id, digest: old.digest, skillRevision: c.skill.revision }, notes, requestId: randomUUID(),
    target: { planModuleId: module.id, digest: module.digest } };
  const preview = await service.preview(access, { items: [body] }), result = saved(await service.apply(access, preview));
  assert.ok(result.projectMethod); assert.notEqual(result.projectMethod.id, old.id); assert.notEqual(result.projectMethod.digest, old.digest);
  assert.equal(result.version.status, 'draft'); assert.deepEqual(result.projectMethod.customization?.parameters, customization.parameters);
  assert.equal(result.projectMethod.customization?.instructions, customization.instructions); assert.ok(result.projectMethod.customization?.effectiveInstructions.includes(notes));
  assert.deepEqual((await app.get(ProjectProductionService).readMethod(access, old.id)).customization, snapshot.customization);
  assert.equal((await fixture.runtime.client.styleSkillVersion.findUniqueOrThrow({ where: { id: c.version.id } })).status, 'ARCHIVED');
});

test('source and preview operations require real human administrator scope', async () => {
  const c = await legacy(); await assert.rejects(service.inventory({ ...access } as CatalogAdminAccess, {}));
  await assert.rejects(service.preview({ ...access } as CatalogAdminAccess, { items: [selection(c)] }));
  await assert.rejects(service.preview(access, { items: [{ ...selection(c), source: { ...selection(c).source, id: randomUUID() } }] }));
  await assert.rejects(service.preview(access, { items: [{ ...selection(c), target: { planModuleId: randomUUID(), digest: '0'.repeat(64) } }] }));
});
