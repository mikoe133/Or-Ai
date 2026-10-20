import { assessmentQuestions, type AssessmentPreview } from './preview-state.js';

export interface AssessmentView {
  preview: AssessmentPreview;
  draft: number | null;
  editing: boolean;
  feedbackOpen: boolean;
}

export type AssessmentAction =
  | { type: 'select'; option: number }
  | { type: 'confirm' }
  | { type: 'edit' }
  | { type: 'cancel-edit' }
  | { type: 'previous' }
  | { type: 'next' }
  | { type: 'feedback'; open: boolean };

export function assessmentView(preview: AssessmentPreview): AssessmentView {
  const draft = preview.answers[preview.current] ?? null;
  return { preview, draft, editing: false, feedbackOpen: draft !== null };
}

/** Separate an unconfirmed choice from the saved answer, including during edits. */
export function assessmentReducer(state: AssessmentView, action: AssessmentAction): AssessmentView {
  const { preview } = state;
  const saved = preview.answers[preview.current] ?? null;
  switch (action.type) {
    case 'select':
      if (saved !== null && !state.editing || !Number.isInteger(action.option)
        || action.option < 0 || action.option >= assessmentQuestions[preview.current]!.options.length) return state;
      return { ...state, draft: action.option };
    case 'confirm': {
      if (state.draft === null || saved !== null && !state.editing) return state;
      const answers = [...preview.answers];
      answers[preview.current] = state.draft;
      return { preview: { ...preview, answers, completed: false }, draft: state.draft, editing: false, feedbackOpen: true };
    }
    case 'edit':
      return saved === null ? state : { ...state, draft: saved, editing: true, feedbackOpen: false };
    case 'cancel-edit':
      return state.editing ? { ...state, draft: saved, editing: false, feedbackOpen: true } : state;
    case 'previous':
      return preview.current === 0 ? state : assessmentView({ ...preview, current: preview.current - 1 });
    case 'next': {
      if (saved === null || state.editing) return state;
      if (preview.current < assessmentQuestions.length - 1) return assessmentView({ ...preview, current: preview.current + 1 });
      const unanswered = preview.answers.findIndex(answer => answer === null);
      if (unanswered >= 0) return assessmentView({ ...preview, current: unanswered });
      return { ...state, preview: { ...preview, completed: true } };
    }
    case 'feedback':
      return { ...state, feedbackOpen: saved !== null && !state.editing && action.open };
  }
}

/** The two Figma states are isolated from the user's saved preview progress. */
export function designAssessmentView(feedback: boolean): AssessmentView {
  const answers: (number | null)[] = assessmentQuestions.map((_, index) => index < 4 ? 1 : null);
  if (feedback) answers[4] = 1;
  return { preview: { version: 1, current: 4, completed: false, answers }, draft: 1, editing: false, feedbackOpen: feedback };
}
