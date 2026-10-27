import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { ExperienceManifestSchema, registeredExperiences, supportsExperience } from '@orai/contracts/experience';
import { ExperienceContextInputSchema, ExperienceWorkspaceQuerySchema, ProductCapabilitiesSchema,
  ProductCapabilitiesV1Schema, ProductCapabilitiesV2Schema, productCapabilities, registeredExperienceCapabilities } from '@orai/contracts/admin';
import { defaultProfile } from '../src/admin/content-model.js';

const legacyProfile = (name: string) => ({ ...defaultProfile({ name }), experienceForm: 'web' as const });

function manifest() {
  return ExperienceManifestSchema.parse({ schemaVersion: 1,
    content: { versionId: randomUUID(), inputSchema: 'single_choice_v1', engine: 'dimensions_v1' }, creativeProfileRevisionId: null, intent: null,
    renderer: { key: 'dom-choice', version: 1 }, fallback: { key: 'dom-choice', version: 1 },
    report: { contentSchema: 'report_content_v1', renderer: { key: 'legacy-text', version: 1 } }, theme: { key: 'legacy', revision: 1 },
    confirmation: 'explicit', recovery: 'server_confirmed_answers',
    scenes: [{ sceneId: 'room', questionId: 'question', checkpointId: 'checkpoint', choices: [{ objectId: 'seat', optionId: 'often' }, { objectId: 'door', optionId: 'rarely' }] }], resources: [] });
}

test('every advertised renderer/report pair and budget is enforced by the shared runtime registry', () => {
  for (const descriptor of registeredExperienceCapabilities()) {
    const template = registeredExperiences.find(item => `${item.key}@${item.version}` === descriptor.renderer)!;
    const value = manifest();
    value.renderer = { key: template.key, version: template.version };
    value.report.renderer = { key: template.reportKey, version: template.reportVersion };
    assert.equal(supportsExperience(value), true);
    const resolved = productCapabilities({ profile: legacyProfile('同一个商品'), manifest: value, hasContentVersion: true });
    assert.equal(resolved.status, 'compatible');
    assert.deepEqual(resolved.selected, descriptor);
    value.scenes[0]!.choices = Array.from({ length: descriptor.limits.maxOptions + 1 }, (_, i) => ({ objectId: `o-${i}`, optionId: `c-${i}` }));
    assert.equal(supportsExperience(value), false);
    value.scenes[0]!.choices = value.scenes[0]!.choices.slice(0, 2);
    value.resources = [{ resourceId: 'picture', fileId: randomUUID(), purpose: 'illustration', label: '图片',
      checksum: 'a'.repeat(64), mimeType: 'image/png', byteSize: descriptor.limits.maxResourceBytes }];
    assert.equal(supportsExperience(value), true);
    value.resources[0]!.byteSize += 1;
    assert.equal(supportsExperience(value), false);
    // Invalid resources can still be corrected in the existing editor.
    const invalid = productCapabilities({ profile: legacyProfile('修正预算'), manifest: value, hasContentVersion: true });
    assert.equal(invalid.status, 'blocked');
    assert.equal(invalid.modules.experience, 'editable');
  }
});

test('creative forms never register runtimes; planned forms expose no new single-choice draft and preserve old content read-only', () => {
  const profile = legacyProfile('多形态方案');
  for (const experienceForm of ['3d', 'game', 'cards', '2.5d'] as const) {
    const next = { ...profile, experienceForm };
    const planned = productCapabilities({ profile: next, hasContentVersion: false });
    assert.equal(planned.status, 'blocked');
    assert.deepEqual(planned.modules, { content: 'planned', experience: 'planned', result: 'planned' });
    const old = productCapabilities({ profile: next, manifest: manifest(), hasContentVersion: true });
    assert.equal(old.modules.content, 'read_only');
    assert.equal(old.modules.result, 'read_only');
    assert.equal(old.selected?.renderer, 'dom-choice@1');
    assert.equal(old.registered.some(item => item.renderer.includes('three')), false);
  }
  for (const next of [
    { ...profile, perspective: 'planned_two_person' as const },
    { ...profile, reportPlan: { ...profile.reportPlan, presentation: 'journal' as const } },
    { ...profile, deliverables: ['cover' as const] },
  ]) assert.equal(productCapabilities({ profile: next, manifest: manifest(), hasContentVersion: true }).status, 'blocked');
  const legacyNarrative = productCapabilities({ profile: { ...profile, reportPlan: { ...profile.reportPlan, presentation: 'journal' } }, manifest: manifest(), hasContentVersion: true });
  assert.equal(legacyNarrative.modules.content, 'editable');
  assert.equal(legacyNarrative.modules.result, 'editable');
  assert.equal(legacyNarrative.modules.experience, 'read_only');
  assert.equal(legacyNarrative.profileBinding, 'candidate');
  const legacy = productCapabilities({ hasContentVersion: true, manifest: manifest() });
  assert.equal(legacy.status, 'needs_profile');
  assert.equal(legacy.modules.content, 'editable');
  assert.equal(legacy.modules.experience, 'read_only');
});

test('unregistered pairs cannot claim compatibility; capability discovery is opt-in and strictly parsed', () => {
  const profile = legacyProfile('配对边界'), value = manifest();
  value.renderer.key = 'quiet-room';
  const mismatch = productCapabilities({ profile, manifest: value, hasContentVersion: true });
  assert.equal(mismatch.selected, null);
  assert.equal(mismatch.status, 'blocked');
  assert.equal(mismatch.modules.experience, 'editable');
  assert.ok(mismatch.issues.length);
  assert.equal(ProductCapabilitiesSchema.safeParse({ ...mismatch, executeUrl: 'https://invalid.example' }).success, false);
  assert.equal(ExperienceContextInputSchema.parse({ productVersionId: value.content.versionId }).includeCapabilities, false);
  assert.equal(ExperienceWorkspaceQuerySchema.parse({ includeCapabilities: 'false' }).includeCapabilities, false);
  assert.equal(ExperienceWorkspaceQuerySchema.parse({ includeCapabilities: 'true' }).includeCapabilities, true);
  assert.equal(ExperienceWorkspaceQuerySchema.safeParse({ includeCapabilities: 'anything' }).success, false);
  assert.equal(ExperienceContextInputSchema.safeParse({ productVersionId: value.content.versionId, inputSchema: 'branching_v1' }).success, false);
});

test('3D registration requires explicit capability v2 and a matching report; strict v1 consumers retain their original shapes', () => {
  const profile = { ...defaultProfile({ name: '3D 单选' }), experienceForm: '3d' as const }, value = manifest();
  value.renderer = { key: 'reflection-garden', version: 1 }; value.report.renderer = { key: 'garden-notes', version: 1 };
  const old = productCapabilities({ profile, manifest: value, hasContentVersion: true });
  ProductCapabilitiesV1Schema.parse(old);
  assert.equal(old.schemaVersion, 1); assert.equal(old.selected, null); assert.equal(old.status, 'blocked');
  assert.equal(old.registered.length, 2);
  const current = ProductCapabilitiesV2Schema.parse(productCapabilities({ profile, manifest: value, hasContentVersion: true, capabilityVersion: 2 }));
  assert.equal(current.status, 'compatible'); assert.equal(current.modules.content, 'editable');
  assert.equal(current.selected?.presentation, 'webgl_3d'); assert.equal(current.selected?.graphics?.assets, 'bundled_geometry');
  assert.equal(supportsExperience(value), true);
  value.report.renderer.key = 'field-notes'; assert.equal(supportsExperience(value), false);
  value.report.renderer.key = 'garden-notes'; value.scenes[0]!.choices = Array.from({ length: 5 }, (_, i) => ({ objectId: `o-${i}`, optionId: `c-${i}` }));
  assert.equal(supportsExperience(value), false);
  assert.equal(ExperienceWorkspaceQuerySchema.parse({ includeCapabilities: 'true', capabilityVersion: '2' }).capabilityVersion, 2);
  assert.equal(ExperienceWorkspaceQuerySchema.safeParse({ capabilityVersion: '3' }).success, false);
  assert.equal(ExperienceContextInputSchema.parse({ productVersionId: value.content.versionId }).capabilityVersion, 1);
});
