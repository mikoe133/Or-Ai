import { QuestionSchema, ReportContentSchema } from '@orai/contracts';
import { ExperienceReleaseSchema } from '@orai/contracts/experience';
import source from '../../../../examples/social-battery-room/public.json?raw';

const sample = JSON.parse(source) as { title: string; questions: { id: string; dimensionId: string; text: string }[]; options: unknown[]; reportExample: unknown };
export const roomSampleTitle = sample.title;
export const roomQuestions = sample.questions.map(question => QuestionSchema.parse({ ...question, required: true, options: sample.options }));
export const roomReportExample = ReportContentSchema.parse(sample.reportExample);
export const roomPreviewRelease = ExperienceReleaseSchema.parse({
  id: '00000000-0000-4000-8000-000000000016', digest: '0'.repeat(64), manifest: {
    schemaVersion: 1, content: { versionId: '00000000-0000-4000-8000-000000000017', inputSchema: 'single_choice_v1', engine: 'dimensions_v1' },
    creativeProfileRevisionId: null, intent: null, renderer: { key: 'quiet-room', version: 1 }, fallback: { key: 'dom-choice', version: 1 },
    report: { contentSchema: 'report_content_v1', renderer: { key: 'field-notes', version: 1 } }, theme: { key: 'social-battery-room', revision: 1 },
    confirmation: 'explicit', recovery: 'server_confirmed_answers', resources: [],
    scenes: roomQuestions.map(question => ({ sceneId: question.id, questionId: question.id, checkpointId: question.id,
      choices: question.options.map((option, index) => ({ objectId: `marker-${index + 1}`, optionId: option.id })) })),
  },
});
