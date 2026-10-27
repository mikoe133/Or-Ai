import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { CreativeProfileSchema, ProductionPlanDocumentSchema } from '@orai/contracts/admin';
import { ExperienceManifestSchema, reflectionGardenGraphics } from '@orai/contracts/experience';
import type { CatalogAdminAccess } from '../src/catalog/admin-access.service';
import { ContentService } from '../src/operations/content.service';
import { ExperienceAuthoringService } from '../src/operations/experience-authoring.service';
import { ProductionPlansService } from '../src/operations/production-plans.service';
import type { createLocalFixture } from './local-fixture';
import { policyPlanDocument } from './skill-policy-fixture';

/** Synthetic policy fixture using the already implemented registry, with no external content generation. */
export function readyPublicationPlan(profileId: string, form = '3d') {
  const plan = policyPlanDocument(profileId, form);
  if (plan.schemaVersion !== 2) throw new Error('Expected current plan');
  plan.productPlan.visualDimension = '3d'; plan.productPlan.experienceModuleKey = 'experience'; plan.productPlan.assessmentModuleKey = 'assessment';
  for (const [key, decision] of Object.entries(plan.productPlan.decisions)) Object.assign(decision, {
    requirement: 'required', status: 'implemented', details: '隔离样例使用已注册花园的 ' + key + ' 能力',
    evidence: [{ kind: 'implementation', reference: 'registered:reflection-garden@1/garden-notes@1', summary: '已有模板实现；不声称设备验收通过' }],
  });
  plan.productPlan.budgets = { devices: ['desktop'], ...reflectionGardenGraphics, maxTotalResourceBytes: 1024 * 1024,
    maxFirstFrameMs: 6000, minFps: 30 };
  // The implementation contract has no renderer backend/assets fields in its budgets.
  const { backend: _backend, assets: _assets, ...budgets } = plan.productPlan.budgets as typeof plan.productPlan.budgets & { backend?: string; assets?: string };
  plan.productPlan.budgets = budgets;
  plan.modules.find(module => module.domain === 'experience')!.target.runtime = {
    renderer: { key: 'reflection-garden', version: 1 }, reportRenderer: { key: 'garden-notes', version: 1 },
    inputSchema: 'single_choice_v1', engine: 'dimensions_v1', reportSchema: 'report_content_v1',
  };
  return ProductionPlanDocumentSchema.parse(plan);
}

export async function reviewThreejsFixture(app: INestApplication, fixture: Awaited<ReturnType<typeof createLocalFixture>>,
  access: CatalogAdminAccess, versionId: string) {
  const version = await fixture.runtime.client.productVersion.findUniqueOrThrow({ where: { id: versionId } });
  let profile = version.creativeProfileRevisionId
    ? await fixture.runtime.client.creativeProfileRevision.findUniqueOrThrow({ where: { id: version.creativeProfileRevisionId } }) : null;
  if (!profile) {
    const latest = await fixture.runtime.client.creativeProfileRevision.aggregate({ where: { productId: version.productId }, _max: { number: true } });
    const created = await app.get(ContentService).saveProfile(access, version.productId, { expectedRevision: latest._max.number ?? 0, requestId: randomUUID(),
      profile: CreativeProfileSchema.parse({ schemaVersion: 1, title: '隔离花园体验', audience: '自我观察的成年人', situation: '日常沟通',
        emotionalGoal: '被理解', understandingGoal: '看见沟通节奏', takeaway: '一个具体行动', perspective: 'self', experienceForm: '3d',
        pace: '从容', world: '安静花园', language: '具体温和', visual: '克制紫色', sound: '安静', channels: ['manual'],
        deliverables: ['assessment', 'cover', 'video', 'copy'], reportPlan: { schemaVersion: 1, title: '观察与下一步', narrative: '开放建议',
          presentation: 'standard', sections: [{ sectionId: 'next', title: '下一步', purpose: '具体行动' }] } }) });
    profile = await fixture.runtime.client.creativeProfileRevision.findUniqueOrThrow({ where: { id: created.id } });
  }
  const setting = CreativeProfileSchema.parse(profile.profile), plans = app.get(ProductionPlansService), experiences = app.get(ExperienceAuthoringService);
  const latest = await fixture.runtime.client.productionPlanRevision.aggregate({ where: { productId: version.productId }, _max: { number: true } });
  const plan = await plans.save(access, version.productId, { plan: readyPublicationPlan(profile.id, setting.experienceForm),
    expectedRevision: latest._max.number ?? 0, requestId: randomUUID() });
  const workspace = await experiences.workspace(access, version.productId, version.id, { profileId: profile.id });
  const manifest = ExperienceManifestSchema.parse({ ...workspace.defaultManifest,
    renderer: { key: 'reflection-garden', version: 1 }, report: { contentSchema: 'report_content_v1', renderer: { key: 'garden-notes', version: 1 } } });
  const draft = await experiences.save(access, version.productId, version.id, { manifest, reportPlan: setting.reportPlan, methods: [],
    productPlan: { revisionId: plan.id, digest: plan.digest }, note: '隔离 Three.js 兼容性验收样例', source: 'manual',
    expectedRevision: workspace.latest?.revision ?? 0, expectedVersionRevision: workspace.versionRevision, requestId: randomUUID() });
  const reviewed = await experiences.review(access, draft.id, { expectedRevision: draft.revision, requestId: randomUUID() });
  return { plan, draft, reviewed };
}
