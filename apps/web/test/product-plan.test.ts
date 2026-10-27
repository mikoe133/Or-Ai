import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProductionPlanDocumentSchema, MachineProjectBootstrapSchema,emptyProductImplementationPlan,
  productPlanDifference,productPlanPendingFields,ProductPlanDecisionSchema } from '@orai/contracts/admin';
import { productPlanFixture } from './product-plan-fixture.js';
import { emptyProjectPlan, isPlanningSaveUncertain, planningRuntimeKey } from '../src/admin/project-planning-model.js';
import { ClientError } from '../src/api/client.js';

test('v2 accepts independent static and animated Three.js plans without imposing one scene or gameplay', () => {
  const staticPlan = ProductionPlanDocumentSchema.parse(productPlanFixture('static'));
  const animatedPlan = ProductionPlanDocumentSchema.parse(productPlanFixture('animated'));
  assert.equal(staticPlan.schemaVersion, 2);
  assert.notDeepEqual(staticPlan, animatedPlan);
  assert.deepEqual(staticPlan, productPlanFixture('static'));
});

test('legacy v1 stays exact and rejects v2 fields; unknown future versions fail closed', () => {
  const { productPlan: _, ...base } = productPlanFixture();
  const legacy = { ...base, schemaVersion: 1 };
  assert.deepEqual(ProductionPlanDocumentSchema.parse(legacy), legacy);
  const oldNormalized={schemaVersion:1,title:legacy.title,creativeProfileRevisionId:legacy.creativeProfileRevisionId,selection:legacy.selection,
    freshnessWindowHours:legacy.freshnessWindowHours,evidence:legacy.evidence,modules:legacy.modules,retention:legacy.retention};
  assert.equal(JSON.stringify(ProductionPlanDocumentSchema.parse(legacy)),JSON.stringify(oldNormalized),'legacy normalization order is part of existing digest and retry compatibility');
  assert.equal(ProductionPlanDocumentSchema.safeParse({ ...legacy, productPlan: productPlanFixture().productPlan }).success, false);
  assert.equal(ProductionPlanDocumentSchema.safeParse({ ...productPlanFixture(), schemaVersion: 3 }).success, false);
});

test('new admin plans declare Three.js while leaving product-specific decisions genuinely undecided', () => {
  const plan = emptyProjectPlan(productPlanFixture().creativeProfileRevisionId, '新商品规划') as Record<string, any>;
  assert.equal(plan.schemaVersion, 2);
  assert.equal(plan.productPlan.implementation, 'threejs');
  assert.equal(plan.productPlan.visualDimension, 'undecided');
  assert.ok(Object.values(plan.productPlan.decisions).every((item: any) => item.requirement === 'undecided' && item.status === 'unplanned'));
  assert.equal(plan.modules.length, 0);
});

test('lost or invalid save responses and proxy failures require original-request recovery before more edits', () => {
  for (const [code, status] of [['NETWORK_ERROR', 0], ['INVALID_RESPONSE', 0], ['SERVICE_UNAVAILABLE', 502], ['SERVICE_UNAVAILABLE', 504]] as const)
    assert.equal(isPlanningSaveUncertain(new ClientError(code, 'synthetic', status)), true);
  assert.equal(isPlanningSaveUncertain(new ClientError('REVISION_CONFLICT', 'conflict', 409)), false);
  assert.equal(isPlanningSaveUncertain(new ClientError('FORBIDDEN', 'revoked', 403)), false);
  assert.equal(isPlanningSaveUncertain(new ClientError('VALIDATION_ERROR', 'bad input', 400)), false);
});

test('runtime choices distinguish exact renderer versions, report pairs and evaluation schemas instead of matching a renderer name', () => {
  const runtime=ProductionPlanDocumentSchema.parse(productPlanFixture()).modules[0]!.target.runtime!;
  assert.notEqual(planningRuntimeKey(runtime),planningRuntimeKey({...runtime,reportRenderer:{key:'other-report',version:1}}));
  assert.notEqual(planningRuntimeKey(runtime),planningRuntimeKey({...runtime,renderer:{...runtime.renderer,version:2}}));
  assert.notEqual(planningRuntimeKey(runtime),planningRuntimeKey({...runtime,engine:'other-engine'}));
  assert.equal(planningRuntimeKey(null),'');assert.equal(planningRuntimeKey(runtime),planningRuntimeKey(structuredClone(runtime)));
});

test('change previews preserve the base and distinguish resolved decisions from remaining unknown requirements', () => {
  const before=emptyProductImplementationPlan(),snapshot=structuredClone(before),after=structuredClone(before);
  after.visualDimension='2.5d';after.decisions.animation={requirement:'not_required',status:'planned',details:'固定构图',evidence:[]};after.budgets.minFps=30;
  assert.deepEqual(productPlanDifference(before,after).map(item=>item.path),['visualDimension','decisions.animation','budgets.minFps']);
  assert.deepEqual(before,snapshot);assert.deepEqual(productPlanDifference(after,structuredClone(after)),[]);
  assert.equal(productPlanPendingFields(after).includes('decisions.animation'),false);
  assert.equal(productPlanPendingFields(after).includes('decisions.camera'),true);
  assert.equal(productPlanPendingFields(after).includes('budgets.minFps'),false);
  assert.ok(productPlanDifference(null,after).length>10);
  const required={requirement:'required',status:'implemented',details:'已编写功能',evidence:[{kind:'implementation',reference:'synthetic://code',summary:'合同样本'}]};
  assert.equal(ProductPlanDecisionSchema.safeParse(required).success,true);
  assert.equal(ProductPlanDecisionSchema.safeParse({...required,status:'planned',details:''}).success,false);
  assert.equal(ProductPlanDecisionSchema.safeParse({...required,status:'unplanned'}).success,false);
});

test('undecided, explicitly unnecessary, implemented and verified are distinct and require corresponding evidence', () => {
  const plan = productPlanFixture() as Record<string, any>;
  plan.productPlan.decisions.animation = { requirement: 'undecided', status: 'unplanned', details: '', evidence: [] };
  assert.equal(ProductionPlanDocumentSchema.safeParse(plan).success, true);
  plan.productPlan.decisions.animation.status = 'verified';
  assert.equal(ProductionPlanDocumentSchema.safeParse(plan).success, false);
  plan.productPlan.decisions.animation = { requirement: 'required', status: 'verified', details: '明确动画', evidence: [] };
  assert.equal(ProductionPlanDocumentSchema.safeParse(plan).success, false);
  plan.productPlan.decisions.animation.evidence = [
    { kind: 'implementation', reference: 'synthetic://implementation', summary: '合成引用，不是真实交付成绩' },
    { kind: 'verification', reference: 'synthetic://verification', summary: '仅用于合同测试' },
  ];
  assert.equal(ProductionPlanDocumentSchema.safeParse(plan).success, true);
  plan.productPlan.decisions.animation.requirement = 'not_required';
  plan.productPlan.decisions.animation.status = 'implemented';
  assert.equal(ProductionPlanDocumentSchema.safeParse(plan).success, false);
});

test('draft budgets and targets may remain undecided while invalid technology, cross-module targets and forged fields fail', () => {
  const plan = productPlanFixture() as Record<string, any>;
  plan.productPlan.experienceModuleKey = null;
  plan.productPlan.visualDimension = 'undecided';
  plan.productPlan.budgets = Object.fromEntries(Object.keys(plan.productPlan.budgets).map(key => [key, key === 'devices' ? [] : null]));
  assert.equal(ProductionPlanDocumentSchema.safeParse(plan).success, true);
  for (const change of [
    { implementation: 'html' }, { experienceModuleKey: 'foreign-module' }, { assessmentModuleKey: 'experience' },
    { published: true }, { budgets: { ...plan.productPlan.budgets, maxTriangles: -1 } },
  ]) assert.equal(ProductionPlanDocumentSchema.safeParse({ ...plan, productPlan: { ...plan.productPlan, ...change } }).success, false);
});

test('source references are fixed, bounded, unique and point to declared target modules', () => {
  const plan = productPlanFixture() as Record<string, any>;
  const source = { sourceKey: 'reference', moduleKey: 'experience', kind: 'experience_release', id: '22222222-2222-4222-8222-222222222222', digest: 'a'.repeat(64) };
  plan.productPlan.sources = [source];
  assert.equal(ProductionPlanDocumentSchema.safeParse(plan).success, true);
  plan.productPlan.sources.push(source);
  assert.equal(ProductionPlanDocumentSchema.safeParse(plan).success, false);
  plan.productPlan.sources = [{ ...source, moduleKey: 'foreign' }];
  assert.equal(ProductionPlanDocumentSchema.safeParse(plan).success, false);
  // Bootstrap binds a real profile later, but must expose both strict schema versions.
  const { creativeProfileRevisionId: _, ...bootstrapPlan } = productPlanFixture();
  assert.equal(MachineProjectBootstrapSchema.shape.plan.safeParse(bootstrapPlan).success, true);
});
