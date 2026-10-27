import { ProductionPlanDocumentSchema, StyleSkillManifestV1Schema, withThreejsSkillPolicy,
  emptyProductImplementationPlan, skillPurposes } from '@orai/contracts/admin';

// New writes in integration fixtures obey the current policy. Historical fixtures
// deliberately bypass this helper and retain their original manifest and digest.
export function currentSkillManifest(input: unknown) {
  const { productPolicy: _policy, ...manifest } = input as Record<string, unknown>;
  return withThreejsSkillPolicy(StyleSkillManifestV1Schema.parse({ ...manifest, schemaVersion: 1 }));
}
export function policyPlanDocument(profileId: string, form = 'web') {
  return ProductionPlanDocumentSchema.parse({ schemaVersion: 2, title: '隔离方法绑定规划', creativeProfileRevisionId: profileId,
    selection: { basis: 'manual', rationale: '仅验证规划与方法的固定关联', evidenceKeys: [] }, freshnessWindowHours: 24, evidence: [],
    productPlan: emptyProductImplementationPlan(), retention: 'platform_originals_and_exact_methods',
    modules: Object.entries(skillPurposes).map(([domain, purposes]) => {
      const kinds = domain === 'assessment' ? ['assessment','report'] : domain === 'cover' ? ['image'] : domain === 'experience' ? ['scene_bundle'] : [domain];
      return { moduleKey: domain, title: domain, domain, required: true, purpose: '隔离方法绑定', dependsOn: [],
        target: { form, runtime: null }, methodPurposes: [...purposes], methodRetention: 'manifest_instructions_and_references',
        outputs: kinds.map(kind => ({ outputKey: kind.replace('_','-'), label: kind, kind, required: true,
          original: { storage: 'platform', representation: ['assessment','report','copy'].includes(kind) ? 'structured' : 'file' },
          files: ['assessment','report','copy'].includes(kind) ? [] : [{ fileKey: 'source', label: '原件', purpose: 'original', required: true,
            mimeTypes: [domain === 'cover' ? 'image/png' : domain === 'video' ? 'video/webm' : 'application/zip'], sourceUrl: null }] })) };
    }),
  });
}
