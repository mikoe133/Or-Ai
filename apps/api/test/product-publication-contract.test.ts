import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ProductionPlanDocumentSchema, registeredPlanRuntime, threejsPublicationIssues } from '@orai/contracts/admin';
import { ExperienceManifestSchema } from '@orai/contracts/experience';
import { readyPublicationPlan } from './publication-fixture';

function sample() {
  const profileId = randomUUID(), plan = readyPublicationPlan(profileId), module = plan.modules.find(item => item.domain === 'experience')!;
  const manifest = ExperienceManifestSchema.parse({ schemaVersion: 1, content: { versionId: randomUUID(), inputSchema: 'single_choice_v1', engine: 'dimensions_v1' },
    creativeProfileRevisionId: profileId, intent: { emotionalGoal: '被理解', understandingGoal: '看见习惯', world: '花园', language: '具体温和' },
    renderer: { key: 'reflection-garden', version: 1 }, fallback: { key: 'dom-choice', version: 1 },
    report: { contentSchema: 'report_content_v1', renderer: { key: 'garden-notes', version: 1 } }, theme: { key: 'purple', revision: 1 },
    confirmation: 'explicit', recovery: 'server_confirmed_answers', resources: [], scenes: [{ sceneId: 'scene', questionId: 'question', checkpointId: 'question',
      choices: [{ objectId: 'seat', optionId: 'often' }, { objectId: 'door', optionId: 'rarely' }] }] });
  return { plan, module, manifest };
}
test('actual registered protocol, renderer and report pairing determine support for both web and 3d authoring intents', () => {
  const { module } = sample();
  assert.equal(registeredPlanRuntime(module)?.presentation, 'webgl_3d');
  module.target.form = 'web'; assert.equal(registeredPlanRuntime(module)?.presentation, 'webgl_3d');
  for (const form of ['game', 'cards', '2.5d']) { module.target.form = form; assert.equal(registeredPlanRuntime(module), undefined); }
  module.target.form = '3d'; const runtime = module.target.runtime!;
  for (const field of ['inputSchema','engine','reportSchema'] as const) {
    const previous = runtime[field]; runtime[field] = 'unimplemented'; assert.equal(registeredPlanRuntime(module), undefined); runtime[field] = previous;
  }
  runtime.reportRenderer.key = 'legacy-text'; assert.equal(registeredPlanRuntime(module), undefined);
  module.target.runtime = null; assert.equal(registeredPlanRuntime(module), undefined);
});
test('normal Three.js delivery requires implemented decisions and complete budgets while explicitly unnecessary extra motion is allowed', () => {
  const value = sample(); assert.deepEqual(threejsPublicationIssues(value.plan, value.module, value.manifest), []);
  if (value.plan.schemaVersion !== 2) throw new Error('Expected v2');
  value.plan.productPlan.decisions.animation = { requirement: 'not_required', status: 'planned', details: '不另外要求额外动画；必要反馈按模板执行', evidence: [] };
  assert.deepEqual(threejsPublicationIssues(value.plan, value.module, value.manifest), []);
  value.plan.productPlan.decisions.interaction = { requirement: 'undecided', status: 'unplanned', details: '', evidence: [] };
  assert.ok(threejsPublicationIssues(value.plan, value.module, value.manifest).length);
  const complete = sample(); if (complete.plan.schemaVersion !== 2) throw new Error('Expected v2');
  complete.plan.productPlan.decisions.camera.status = 'planned';
  assert.ok(threejsPublicationIssues(complete.plan, complete.module, complete.manifest).length);
  complete.plan.productPlan.decisions.camera.status = 'implemented'; complete.plan.productPlan.budgets.maxFirstFrameMs = null;
  assert.ok(threejsPublicationIssues(complete.plan, complete.module, complete.manifest).length);
});
test('DOM, unknown engines, wrong result pairing, wrong planning modules and old plan documents cannot be normal delivery', () => {
  const value = sample(); value.manifest.renderer.key = 'dom-choice'; value.manifest.report.renderer.key = 'legacy-text';
  assert.ok(threejsPublicationIssues(value.plan, value.module, value.manifest).length);
  const other = sample(); other.manifest.report.renderer.key = 'field-notes';
  assert.ok(threejsPublicationIssues(other.plan, other.module, other.manifest).length);
  const wrong = sample(); if (wrong.plan.schemaVersion !== 2) throw new Error('Expected v2');
  wrong.plan.productPlan.experienceModuleKey = 'other'; assert.ok(threejsPublicationIssues(wrong.plan, wrong.module, wrong.manifest).length);
  wrong.plan.productPlan.experienceModuleKey = 'experience'; wrong.plan.productPlan.assessmentModuleKey = null;
  assert.ok(threejsPublicationIssues(wrong.plan, wrong.module, wrong.manifest).length);
  const { productPlan: _productPlan, ...legacy } = wrong.plan;
  const old = ProductionPlanDocumentSchema.parse({ ...legacy, schemaVersion: 1 });
  assert.ok(threejsPublicationIssues(old, wrong.module, wrong.manifest).length);
});
test('actual file and graphics limits must fit the fixed product budget, and a registered key alone cannot accept an oversized scene', () => {
  const value = sample(); if (value.plan.schemaVersion !== 2) throw new Error('Expected v2');
  value.plan.productPlan.budgets.maxTriangles = 1;
  assert.ok(threejsPublicationIssues(value.plan, value.module, value.manifest).length);
  value.plan.productPlan.budgets.maxTriangles = 14000; value.plan.productPlan.budgets.maxTotalResourceBytes = 0;
  value.manifest.resources = [{ resourceId: 'texture', fileId: randomUUID(), purpose: 'texture', label: '纹理', checksum: 'a'.repeat(64), byteSize: 16, mimeType: 'image/png' }];
  assert.ok(threejsPublicationIssues(value.plan, value.module, value.manifest).length);
  value.plan.productPlan.budgets.maxTotalResourceBytes = 1024 * 1024; value.manifest.scenes[0]!.choices = Array.from({ length: 5 }, (_, i) => ({ objectId: 'object-' + i, optionId: 'option-' + i }));
  assert.ok(threejsPublicationIssues(value.plan, value.module, value.manifest).length);
});
