import { ExperienceCheckpointSchema } from '@orai/contracts/experience';

export function experienceCheckpoint(questions: { id: string }[], answers: { questionId: string }[], revision: number, stored: unknown, completed = false) {
  const value = stored as { lastConfirmedQuestionId?: unknown } | null;
  const last = value?.lastConfirmedQuestionId;
  return ExperienceCheckpointSchema.parse({ schemaVersion: 1, revision,
    lastConfirmedQuestionId: typeof last === 'string' && answers.some(a => a.questionId === last) ? last : null,
    nextQuestionId: completed ? null : questions.find(q => !answers.some(a => a.questionId === q.id))?.id ?? null });
}
