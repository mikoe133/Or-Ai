import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessmentReducer, assessmentView, designAssessmentView } from '../src/store/assessment-state.js';
import { newAssessmentPreview, readAssessmentPreview, saveAssessmentPreview } from '../src/store/preview-state.js';

test('unconfirmed selections cannot increase progress or advance the question', () => {
  const initial = assessmentView(newAssessmentPreview());
  assert.equal(assessmentReducer(initial, { type: 'confirm' }), initial);
  const selected = assessmentReducer(initial, { type: 'select', option: 1 });
  assert.equal(selected.preview.answers[0], null);
  assert.equal(assessmentReducer(selected, { type: 'next' }), selected);
  const confirmed = assessmentReducer(selected, { type: 'confirm' });
  assert.equal(confirmed.preview.answers[0], 1);
  assert.equal(confirmed.feedbackOpen, true);
  assert.equal(assessmentReducer(confirmed, { type: 'next' }).preview.current, 1);
});

test('saved answers are locked until editing; cancelling restores the saved choice', () => {
  const initial = designAssessmentView(true);
  assert.equal(assessmentReducer(initial, { type: 'select', option: 2 }), initial);
  let edited = assessmentReducer(initial, { type: 'edit' });
  edited = assessmentReducer(edited, { type: 'select', option: 2 });
  assert.equal(edited.preview.answers[4], 1);
  assert.equal(edited.feedbackOpen, false);
  assert.equal(assessmentReducer(edited, { type: 'next' }), edited);
  const cancelled = assessmentReducer(edited, { type: 'cancel-edit' });
  assert.equal(cancelled.draft, 1);
  assert.equal(cancelled.feedbackOpen, true);
  const confirmed = assessmentReducer(edited, { type: 'confirm' });
  assert.equal(confirmed.preview.answers[4], 2);
  assert.equal(confirmed.preview.answers.filter(answer => answer !== null).length, 5);
  assert.equal(initial.preview.answers[4], 1);
});

test('collapsing feedback preserves the answer and navigating back restores it', () => {
  const confirmed = designAssessmentView(true);
  const collapsed = assessmentReducer(confirmed, { type: 'feedback', open: false });
  assert.equal(collapsed.preview, confirmed.preview);
  const next = assessmentReducer(collapsed, { type: 'next' });
  assert.equal(next.draft, null);
  assert.equal(next.feedbackOpen, false);
  const previous = assessmentReducer(next, { type: 'previous' });
  assert.equal(previous.draft, 1);
  assert.equal(previous.feedbackOpen, true);
});

test('finishing an incomplete sequence returns to its first unanswered question', () => {
  const preview = newAssessmentPreview();
  preview.current = 15;
  preview.answers[15] = 2;
  const result = assessmentReducer(assessmentView(preview), { type: 'next' });
  assert.equal(result.preview.current, 0);
  assert.equal(result.preview.completed, false);
});

test('all sixteen answers must be confirmed before completion', () => {
  let state = assessmentView(newAssessmentPreview());
  for (let index = 0; index < 16; index++) {
    state = assessmentReducer(state, { type: 'select', option: index % 4 });
    state = assessmentReducer(state, { type: 'confirm' });
    assert.equal(state.preview.completed, false);
    state = assessmentReducer(state, { type: 'next' });
  }
  assert.equal(state.preview.completed, true);
  assert.equal(state.preview.current, 15);
  assert.equal(state.preview.answers.filter(answer => answer !== null).length, 16);
  const edited = assessmentReducer(state, { type: 'edit' });
  assert.equal(assessmentReducer(edited, { type: 'confirm' }).preview.completed, false);
});

test('out-of-range choices, navigation boundaries and unopened feedback are safe', () => {
  const initial = assessmentView(newAssessmentPreview());
  for (const option of [-1, 4, NaN, 1.5]) assert.equal(assessmentReducer(initial, { type: 'select', option }), initial);
  assert.equal(assessmentReducer(initial, { type: 'previous' }), initial);
  assert.equal(assessmentReducer(initial, { type: 'feedback', open: true }).feedbackOpen, false);
});

test('design states represent question five without overwriting stored progress', () => {
  const answer = designAssessmentView(false), feedback = designAssessmentView(true);
  assert.equal(answer.preview.current, 4);
  assert.equal(answer.draft, 1);
  assert.equal(answer.preview.answers.filter(value => value !== null).length, 4);
  assert.equal(feedback.preview.answers.filter(value => value !== null).length, 5);
  assert.equal(answer.feedbackOpen, false);
  assert.equal(feedback.feedbackOpen, true);
});

test('confirmed preview progress survives reload; corrupt or unavailable storage falls back safely', () => {
  let data: string | null = null;
  const old = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => data, setItem: (_: string, value: string) => { data = value; },
  } });
  try {
    const preview = designAssessmentView(true).preview;
    assert.equal(saveAssessmentPreview(preview), true);
    assert.deepEqual(readAssessmentPreview(), preview);
    data = '{corrupt';
    assert.deepEqual(readAssessmentPreview(), newAssessmentPreview());
    data = JSON.stringify({ ...preview, current: 16 });
    assert.deepEqual(readAssessmentPreview(), newAssessmentPreview());
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('unavailable'); } });
    assert.equal(saveAssessmentPreview(preview), false);
    assert.deepEqual(readAssessmentPreview(), newAssessmentPreview());
  } finally {
    if (old) Object.defineProperty(globalThis, 'localStorage', old);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
