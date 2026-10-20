import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as publicExports from '@orai/contracts';
import { CatalogQuerySchema, DimensionResultSchema } from '@orai/contracts';
import { AdminAssetInputSchema, ProductConfigurationSchema, RetentionPolicySchema } from '@orai/contracts/admin';
import { DistributionSchema, SaveAnswerRequestSchema } from '@orai/contracts/private';
import { DemoProducts, demoId } from '../scripts/demo-fixtures';
import { toAuthorizedQuestions } from '../src/catalog/projections';

test('public exports and authorized question projections exclude private configuration', () => {
  assert.equal('ProductConfigurationSchema' in publicExports, false);
  const questions = toAuthorizedQuestions(DemoProducts[0]!.configurations[0]!);
  assert.equal(questions.length, DemoProducts[0]!.configurations[0]!.questions.length);
  const json = JSON.stringify(questions);
  for (const key of ['points', 'weight', 'templates', 'retention', 'configuration']) assert.equal(json.includes('"' + key + '"'), false);
});

test('catalog query normalizes URL values and rejects unsupported or inconsistent filters', () => {
  assert.deepEqual(CatalogQuerySchema.parse({ tags: 'demo,energy,demo', minPriceFen: '0', page: '2', pageSize: '10' }),
    { tags: ['demo', 'energy'], minPriceFen: 0, page: 2, pageSize: 10, sort: 'latest' });
  for (const query of [{ sort: 'hot' }, { pageSize: 51 }, { page: '1.5' }, { page: '' }, { minPriceFen: -1 },
    { minPriceFen: 200, maxPriceFen: 100 }, { minDurationMinutes: 3, maxDurationMinutes: 2 }, { userId: demoId('user') }]) {
    assert.equal(CatalogQuerySchema.safeParse(query).success, false);
  }
});

test('configuration rejects duplicate ids, bad references, invalid scoring and threshold boundaries', () => {
  const original = DemoProducts[0]!.configurations[0]!;
  const mutations: ((config: typeof original) => void)[] = [
    config => { config.questions[1]!.id = config.questions[0]!.id; },
    config => { config.questions[0]!.options[1]!.id = config.questions[0]!.options[0]!.id; },
    config => { config.questions[0]!.dimensionId = 'unknown'; },
    config => { config.questions[0]!.options[3]!.points = 5; },
    config => { config.questions[0]!.options[0]!.points = null; },
    config => { config.questions[0]!.options.forEach(option => { if (!option.notApplicable) option.points = 5; }); },
    config => { config.questions.forEach(question => { question.options = question.options.filter(option => !option.notApplicable); }); },
    config => { config.dimensions[0]!.minApplicableAnswers = 100; },
    config => { config.bands[0]!.min = 1; },
    config => { config.bands[1]!.min = 39; },
    config => { config.bands[1]!.min = 41; },
    config => { config.bands[2]!.max = 99; },
    config => { config.bands[1]!.resultTypeId = 'unknown'; },
    config => { config.report.templates[1]!.resultTypeId = 'unknown'; },
    config => { config.report.insufficient.id = config.resultTypes[0]!.id; },
    config => { config.questions[0]!.weight = 0; },
  ];
  for (const mutate of mutations) { const config = structuredClone(original); mutate(config); assert.equal(ProductConfigurationSchema.safeParse(config).success, false); }
  assert.equal(ProductConfigurationSchema.safeParse({ ...original, executableScript: 'return 100' }).success, false);
  const alternate = structuredClone(original);
  alternate.dimensions = [{ ...alternate.dimensions[0]!, id: 'new-dimension', label: '新维度', minApplicableAnswers: 1 }];
  alternate.questions = [{ ...alternate.questions[0]!, id: 'new-question', text: '完全不同的测试题材。', dimensionId: 'new-dimension' }];
  assert.equal(ProductConfigurationSchema.parse(alternate).questions.length, 1);
});

test('periods and asset readiness are validated independently', () => {
  const policy = DemoProducts[0]!.configurations[0]!.retention;
  assert.equal(RetentionPolicySchema.parse({ ...policy, firstRedemptionDays: 1, reportDays: 180 }).reportDays, 180);
  assert.equal(RetentionPolicySchema.safeParse({ ...policy, rawAnswerDays: 0 }).success, false);
  assert.equal(RetentionPolicySchema.safeParse({ ...policy, reportDays: 1.5 }).success, false);
  const asset = { productVersionId: demoId('version'), platform: 'douyin', kind: 'video', variant: 'A', status: 'draft', text: null, storageKey: null };
  assert.equal(AdminAssetInputSchema.safeParse(asset).success, true);
  assert.equal(AdminAssetInputSchema.safeParse({ ...asset, status: 'ready' }).success, false);
  assert.equal(AdminAssetInputSchema.safeParse({ ...asset, storageKey: '../escape.mp4' }).success, false);
});

test('missing dimensions never masquerade as zero scores and save requests cannot supply identity', () => {
  const missing = { id: 'dimension', label: '示例', score: null, applicableAnswers: 0, requiredAnswers: 1, missingReason: '信息不足' };
  assert.equal(DimensionResultSchema.safeParse(missing).success, true);
  assert.equal(DimensionResultSchema.safeParse({ ...missing, score: 0 }).success, false);
  const request = { optionId: 'often', expectedRevision: 0, requestId: demoId('request') };
  assert.equal(SaveAnswerRequestSchema.safeParse(request).success, true);
  assert.equal(SaveAnswerRequestSchema.safeParse({ ...request, expectedRevision: -1 }).success, false);
  assert.equal(SaveAnswerRequestSchema.safeParse({ ...request, userId: demoId('other') }).success, false);
});

test('distribution contracts enforce separate denominator semantics, thresholds and real ratios', () => {
  const empty = { state: 'empty', sampleSize: 0, minimumSampleSize: 20, denominator: 'other_valid_answers', items: [] };
  assert.equal(DistributionSchema.safeParse(empty).success, true);
  assert.equal(DistributionSchema.safeParse({ ...empty, state: 'insufficient', sampleSize: 19 }).success, true);
  const ready = { ...empty, state: 'ready', sampleSize: 20, items: [{ id: 'often', label: '经常', count: 20, percentage: 100 }] };
  assert.equal(DistributionSchema.safeParse(ready).success, true);
  assert.equal(DistributionSchema.safeParse({ ...ready, sampleSize: 19 }).success, false);
  assert.equal(DistributionSchema.safeParse({ ...ready, items: [{ ...ready.items[0]!, percentage: 80 }] }).success, false);
  assert.equal(DistributionSchema.safeParse({ ...empty, sampleSize: 1, items: ready.items }).success, false);
});
