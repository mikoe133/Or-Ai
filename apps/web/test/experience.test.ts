import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { ExperienceManifestSchema, ExperienceResourceSchema, supportsExperience } from '@orai/contracts/experience';
import { confirmedCheckpoint, resourceImage, sceneSelection, scopedResourceImages } from '../src/experience/model.js';

function manifest() {
  return ExperienceManifestSchema.parse({ schemaVersion: 1,
    content: { versionId: randomUUID(), inputSchema: 'single_choice_v1', engine: 'dimensions_v1' }, creativeProfileRevisionId: null, intent: null,
    renderer: { key: 'dom-choice', version: 1 }, fallback: { key: 'dom-choice', version: 1 },
    report: { contentSchema: 'report_content_v1', renderer: { key: 'legacy-text', version: 1 } }, theme: { key: 'legacy', revision: 1 },
    confirmation: 'explicit', recovery: 'server_confirmed_answers',
    scenes: [{ sceneId: 'room', questionId: 'question-a', checkpointId: 'checkpoint-a', choices: [{ objectId: 'seat', optionId: 'often' }, { objectId: 'door', optionId: 'rarely' }] }], resources: [] });
}
test('scene objects normalize only to the locked question and option pair; unknown objects never create an answer', () => {
  const value = manifest();
  assert.deepEqual(sceneSelection(value, 'room', 'seat'), { questionId: 'question-a', optionId: 'often' });
  assert.equal(sceneSelection(value, 'room', 'other'), null);
  assert.equal(sceneSelection(value, 'other-room', 'seat'), null);
  assert.equal('points' in sceneSelection(value, 'room', 'seat')!, false);
});
test('refresh checkpoints derive exclusively from saved answers, preserve zero revision and keep unconfirmed choices missing', () => {
  const questions = [{ id: 'question-a' }, { id: 'question-b' }];
  assert.deepEqual(confirmedCheckpoint(questions, [], 0, 'question-a'), { schemaVersion: 1, revision: 0, lastConfirmedQuestionId: null, nextQuestionId: 'question-a' });
  assert.equal(confirmedCheckpoint(questions, [{ questionId: 'question-a' }], 1, 'question-a').nextQuestionId, 'question-b');
  assert.equal(confirmedCheckpoint(questions, questions.map(q => ({ questionId: q.id })), 2, 'question-b').nextQuestionId, null);
});
test('resuming a scene never reuses revoked image URLs or files from another attempt or fixed release', () => {
  const images = [{ url: 'blob:synthetic-old-generation', label: '已校验参考图' }];
  const batch = { identity: 'attempt-a/release-a/0', images };
  assert.deepEqual(scopedResourceImages(batch, 'attempt-a/release-a/0', true), images);
  assert.deepEqual(scopedResourceImages(batch, 'attempt-a/release-a/0', false), []);
  for (const next of ['attempt-a/release-a/1', 'attempt-b/release-a/0', 'attempt-a/release-b/0'])
    assert.deepEqual(scopedResourceImages(batch, next, true), []);
  assert.deepEqual(scopedResourceImages(null, 'attempt-a/release-a/1', true), []);
});
test('unregistered templates and reserved model/audio purposes do not become runnable merely because their manifests parse', () => {
  const value = manifest(); assert.equal(supportsExperience(value), true);
  value.renderer.key = 'arbitrary-module'; assert.equal(supportsExperience(value), false);
  assert.equal(ExperienceManifestSchema.safeParse({ ...manifest(), script: 'alert(1)' }).success, false);
  const resource = { resourceId: 'model-a', fileId: randomUUID(), purpose: 'model', mimeType: 'image/png', label: '模型', byteSize: 1, checksum: 'a'.repeat(64) };
  assert.equal(ExperienceResourceSchema.safeParse(resource).success, false);
  value.renderer.key = 'dom-choice';
  value.resources = [ExperienceResourceSchema.parse({ ...resource, mimeType: 'model/gltf-binary' })];
  assert.equal(supportsExperience(value), false);
});
test('resource reads stay on the owned same-origin endpoint and verify byte length, MIME and SHA-256 before display', async () => {
  const bytes = new Uint8Array([137, 80, 78, 71]), id = randomUUID();
  const resource = ExperienceResourceSchema.parse({ resourceId: 'picture', fileId: randomUUID(), purpose: 'illustration', label: '图片',
    checksum: createHash('sha256').update(bytes).digest('hex'), mimeType: 'image/png', byteSize: bytes.length });
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (input, options) => {
      assert.equal(input, `/api/attempts/${id}/resources/picture`); assert.equal(options?.credentials, 'same-origin'); assert.equal(options?.cache, 'no-store');
      return new Response(bytes, { headers: { 'content-type': 'image/png' } });
    };
    const blob = await resourceImage(id, resource, new AbortController().signal);
    assert.equal(blob.size, bytes.length);
    await assert.rejects(resourceImage(id, { ...resource, checksum: 'f'.repeat(64) }, new AbortController().signal));
    await assert.rejects(resourceImage(id, { ...resource, byteSize: 3 }, new AbortController().signal));
    globalThis.fetch = async () => new Response(bytes, { headers: { 'content-type': 'text/html' } });
    await assert.rejects(resourceImage(id, resource, new AbortController().signal));
    globalThis.fetch = async () => new Response(null, { status: 403 });
    await assert.rejects(resourceImage(id, resource, new AbortController().signal));
  } finally { globalThis.fetch = original; }
});

test('quiet room registration fixes its report pair, four-option limit and smaller resource budget while DOM keeps its existing budget', () => {
  const room = manifest();
  room.renderer = { key: 'quiet-room', version: 1 };
  assert.equal(supportsExperience(room), false);
  room.report.renderer = { key: 'field-notes', version: 1 };
  assert.equal(supportsExperience(room), true);
  const large = ExperienceResourceSchema.parse({ resourceId: 'room-art', fileId: randomUUID(), purpose: 'illustration', label: '小屋',
    checksum: 'a'.repeat(64), mimeType: 'image/png', byteSize: 512 * 1024 + 1 });
  room.resources = [large];
  assert.equal(supportsExperience(room), false);
  const dom = manifest(); dom.resources = [large];
  assert.equal(supportsExperience(dom), true);
  room.resources = [];
  room.scenes[0]!.choices = Array.from({ length: 5 }, (_, index) => ({ objectId: `object-${index}`, optionId: `option-${index}` }));
  assert.equal(supportsExperience(room), false);
  room.scenes[0]!.choices.pop();
  assert.equal(supportsExperience(room), true);
  room.renderer.version = 2;
  assert.equal(supportsExperience(room), false);
});
