import { z } from 'zod';
import { KeySchema } from './shared.js';

const text = (max: number) => z.string().trim().min(1).max(max);
export const RetentionPolicySchema = z.object({
  firstRedemptionDays: z.number().int().min(1).max(365), entitlementDays: z.number().int().min(1).max(3650),
  rawAnswerDays: z.number().int().min(1).max(365), reportDays: z.number().int().min(1).max(3650),
}).strict();
export const PrivateOptionSchema = z.object({ id: KeySchema, label: text(160), notApplicable: z.boolean(), points: z.number().int().min(0).max(10).nullable() }).strict();
export const ProductConfigurationSchema = z.object({
  schemaVersion: z.literal(1), engine: z.literal('dimensions_v1'), locale: z.literal('zh-CN'),
  dimensions: z.array(z.object({ id: KeySchema, label: text(80), weight: z.number().int().min(1).max(10),
    minApplicableAnswers: z.number().int().min(1).max(100), missingReason: text(200),
  }).strict()).min(1).max(12),
  questions: z.array(z.object({ id: KeySchema, text: text(300), dimensionId: KeySchema,
    required: z.literal(true), weight: z.number().int().min(1).max(10), options: z.array(PrivateOptionSchema).min(2).max(10),
  }).strict()).min(1).max(100),
  bands: z.array(z.object({ resultTypeId: KeySchema, min: z.number().min(0).max(100), max: z.number().min(0).max(100) }).strict()).min(2).max(12),
  resultTypes: z.array(z.object({ id: KeySchema, label: text(80), summary: text(300) }).strict()).min(2).max(12),
  report: z.object({
    disclaimer: text(300), missingDimensionPolicy: z.literal('null'),
    templates: z.array(z.object({ resultTypeId: KeySchema, explanation: text(2000), suggestion: text(1000) }).strict()).min(2).max(12),
    insufficient: z.object({ id: KeySchema, label: text(80), explanation: text(2000), suggestion: text(1000) }).strict(),
  }).strict(), retention: RetentionPolicySchema,
  statisticsMinimum: z.number().int().min(20).max(1000),
}).strict().superRefine((config, context) => {
  const issue = (message: string) => context.addIssue({ code: 'custom', message });
  const unique = (values: string[], label: string) => { if (new Set(values).size !== values.length) issue(label + ' ID 重复'); };
  unique(config.dimensions.map(value => value.id), '维度'); unique(config.questions.map(value => value.id), '题目');
  unique(config.resultTypes.map(value => value.id), '结果'); unique(config.report.templates.map(value => value.resultTypeId), '报告模板');
  unique(config.bands.map(value => value.resultTypeId), '阈值');
  const dimensionIds = new Set(config.dimensions.map(value => value.id));
  const resultIds = new Set(config.resultTypes.map(value => value.id));
  let notApplicableOptions = 0;
  for (const question of config.questions) {
    if (!dimensionIds.has(question.dimensionId)) issue('题目引用未知维度');
    unique(question.options.map(value => value.id), '选项');
    const points: number[] = [];
    for (const option of question.options) {
      if (option.notApplicable !== (option.points === null)) issue('不适用选项必须没有分值，适用选项必须有分值');
      if (option.notApplicable) notApplicableOptions++;
      else if (option.points !== null) points.push(option.points);
    }
    if (points.length < 2 || Math.min(...points) === Math.max(...points)) issue('题目至少需要两个分值不同的有效选项');
  }
  if (notApplicableOptions === 0) issue('至少提供一个不适用选项');
  for (const dimension of config.dimensions) {
    if (config.questions.filter(value => value.dimensionId === dimension.id).length < dimension.minApplicableAnswers) issue('维度最少回答数超过该维度题量');
  }
  if (config.bands[0]?.min !== 0 || config.bands.at(-1)?.max !== 100) issue('阈值必须完整覆盖 0 到 100');
  config.bands.forEach((band, index) => {
    if (!resultIds.has(band.resultTypeId) || band.min >= band.max || (index > 0 && config.bands[index - 1]?.max !== band.min)) issue('阈值类型无效、重叠或存在空隙');
  });
  if (config.bands.length !== resultIds.size || config.report.templates.length !== resultIds.size) issue('每种结果必须恰有一组阈值和报告模板');
  if (resultIds.has(config.report.insufficient.id)) issue('信息不足结果不能使用正常类型 ID');
  for (const template of config.report.templates) if (!resultIds.has(template.resultTypeId)) issue('报告模板引用未知结果');
});
export type ProductConfiguration = z.infer<typeof ProductConfigurationSchema>;
