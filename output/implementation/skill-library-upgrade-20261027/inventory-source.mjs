import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const root = process.cwd(), require = createRequire(root + '/apps/api/package.json');
const { Pool } = require('pg');
const { assertLocalTarget } = require('./.test-build/scripts/local-database.js');
const { StyleSkillManifestSchema, withThreejsSkillPolicy, threejsSkillPolicyIssues } = require('@orai/contracts/admin');
const target = assertLocalTarget(process.env), pool = new Pool({ connectionString: target.migration.toString(), max: 1 });
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const output = root + '/output/implementation/skill-library-upgrade-20261027';
try {
  await pool.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const marker = (await pool.query('SELECT environment,database_name FROM orai.environment_marker WHERE id=1')).rows[0];
  assert.deepEqual(marker, { environment: 'DEVELOPMENT', database_name: target.migration.pathname.slice(1) });
  assert.equal((await pool.query('SHOW transaction_read_only')).rows[0].transaction_read_only, 'on');
  const versions = (await pool.query(`SELECT v.id,v.skill_id,v.scope,v.number,v.revision,v.status,v.manifest,v.digest,
    s.domain,s.slug,s.revision AS skill_revision,p.product_id AS project_product_id
    FROM orai.style_skill_versions v JOIN orai.style_skills s ON s.id=v.skill_id
    LEFT JOIN orai.machine_project_skills p ON p.skill_id=s.id
    WHERE v.scope='DEMO' ORDER BY s.domain,s.slug,v.number`)).rows;
  const bindings = (await pool.query(`SELECT b.id,b.product_id,b.skill_set_id,b.skill_version_id,b.purpose,b.snapshot,s.digest AS set_digest
    FROM orai.creative_skill_bindings b JOIN orai.creative_skill_sets s ON s.id=b.skill_set_id WHERE b.scope='DEMO' ORDER BY b.id`)).rows;
  const methods = (await pool.query(`SELECT s.id,s.product_id,s.plan_module_id,s.source_version_id,s.source_revision,s.purpose,s.snapshot,s.digest,
    p.id AS plan_id,p.number AS plan_revision,p.digest AS plan_digest,p.document->>'schemaVersion' AS plan_schema_version,
    p.id=(SELECT h.id FROM orai.production_plan_revisions h WHERE h.product_id=s.product_id AND h.scope=s.scope ORDER BY h.number DESC LIMIT 1) AS current_plan
    FROM orai.project_method_snapshots s JOIN orai.production_plan_modules m ON m.id=s.plan_module_id
    JOIN orai.production_plan_revisions p ON p.id=m.plan_revision_id WHERE s.scope='DEMO' ORDER BY s.id`)).rows;
  const attachments = (await pool.query(`SELECT a.version_id,a.file_id,a.path,f.status,f.checksum,f.byte_size
    FROM orai.style_skill_attachments a JOIN orai.skill_reference_files f ON f.id=a.file_id WHERE a.scope='DEMO' ORDER BY a.version_id,a.path`)).rows;
  const packages = (await pool.query("SELECT id,product_id,digest,manifest FROM orai.content_packages WHERE scope='DEMO' ORDER BY id")).rows;
  const productions = (await pool.query("SELECT id,skill_version_id,skill_versions FROM orai.production_records WHERE scope='DEMO' ORDER BY id")).rows;
  const experiences = (await pool.query("SELECT id,product_id,methods FROM orai.experience_authoring_revisions WHERE scope='DEMO' ORDER BY id")).rows;
  const currentPlans = (await pool.query(`SELECT DISTINCT ON(product_id) id,product_id,number,digest,document->>'schemaVersion' AS schema_version
    FROM orai.production_plan_revisions WHERE scope='DEMO' ORDER BY product_id,number DESC`)).rows;
  const grouped = {}, previews = [];
  for (const row of versions) {
    const manifest = StyleSkillManifestSchema.parse(row.manifest), issues = threejsSkillPolicyIssues(manifest);
    assert.equal(digest(manifest), row.digest, 'Stored Skill manifest digest must remain exact');
    const refs = attachments.filter(item => item.version_id === row.id), candidates = withThreejsSkillPolicy(manifest);
    const parsed = StyleSkillManifestSchema.safeParse(candidates);
    const entry = { versionId: row.id, skillId: row.skill_id, domain: row.domain, slug: row.slug, version: row.number,
      expectedSourceRevision: row.revision, sourceDigest: row.digest, expectedSkillRevision: row.skill_revision,
      status: row.status.toLowerCase(), origin: row.project_product_id ? 'project' : 'shared', projectProductId: row.project_product_id,
      purposes: manifest.purposes, policyIssues: issues, attachmentCount: refs.length,
      attachmentMetadataPreserved: true, attachmentBytesVerified: false,
      impact: { bindings: bindings.filter(item => item.skill_version_id === row.id).map(item => ({ id: item.id, productId: item.product_id, setId: item.skill_set_id, setDigest: item.set_digest, purpose: item.purpose })),
        projectMethods: methods.filter(item => item.source_version_id === row.id).map(item => ({ id: item.id, digest: item.digest, planId: item.plan_id, planModuleId: item.plan_module_id })),
        packages: packages.filter(item => JSON.stringify(item.manifest).includes(row.id)).map(item => ({ id: item.id, digest: item.digest })),
        productions: productions.filter(item => item.skill_version_id === row.id || JSON.stringify(item.skill_versions).includes(row.id)).map(item => item.id),
        experiences: experiences.filter(item => JSON.stringify(item.methods).includes(row.id)).map(item => item.id) },
      disposition: !issues.length ? 'policy_compliant_still_requires_content_review' : row.status === 'ARCHIVED' ? 'preserve_history_select_only_if_reused' : 'needs_specialized_review_before_new_draft',
      preview: issues.length ? { readyForAutomaticExecution: false, structurallyValid: parsed.success,
        proposedDigest: parsed.success ? digest(parsed.data) : null, changedFields: ['schemaVersion','productPolicy','supportedForms','inputs','instructions'].filter(key => JSON.stringify(manifest[key]) !== JSON.stringify(candidates[key])),
        originalInstructionsPreserved: candidates.instructions.startsWith(manifest.instructions.trim()),
        examplesPreserved: digest(candidates.examples) === digest(manifest.examples), referencesPreserved: digest(candidates.references) === digest(manifest.references),
        requiresSpecializedMethodReview: true, requiresAttachmentByteVerification: refs.length > 0, selectionConfirmed: false } : null };
    previews.push(entry);
    for (const purpose of manifest.purposes) { const key = row.domain + ':' + purpose; grouped[key] ??= {}; grouped[key][entry.status] = (grouped[key][entry.status] ?? 0) + 1; }
  }
  const fixedSets = [...new Set(bindings.map(item => item.skill_set_id))].map(setId => {
    const rows = bindings.filter(item => item.skill_set_id === setId);
    return { id: setId, productId: rows[0].product_id, digest: rows[0].set_digest,
      bindings: rows.map(item => ({ id: item.id, purpose: item.purpose, versionId: item.skill_version_id,
        policyCompliant: threejsSkillPolicyIssues(item.snapshot.version.manifest).length === 0, hasFixedPlan: !!item.snapshot.productPlanInput })),
      disposition: 'preserve_fixed_set_append_new_binding_only_after_plan_and_method_review' };
  });
  const fixedMethods = methods.map(row => ({ id: row.id, productId: row.product_id, planModuleId: row.plan_module_id,
    sourceVersionId: row.source_version_id, sourceRevision: row.source_revision, purpose: row.purpose, digest: row.digest,
    planId: row.plan_id, planRevision: row.plan_revision, planDigest: row.plan_digest, planSchemaVersion: Number(row.plan_schema_version), currentPlan: row.current_plan,
    hasCustomization: !!row.snapshot.customization, policyIssues: threejsSkillPolicyIssues(row.snapshot.manifest),
    disposition: 'preserve_exact_snapshot_review_specialized_parameters_and_recapture_under_current_plan' }));
  await pool.query('COMMIT');
  const report = { checkedAt: new Date().toISOString(), scope: 'DEMO', localDevelopmentOnly: true, readOnlyTransaction: true,
    domains: ['assessment','cover','video','copy','experience'], purposes: ['assessment_design','report_writing','cover_design','video_production','copywriting','scene_design','report_presentation'],
    summary: { skills: new Set(versions.map(row => row.skill_id)).size, versions: versions.length, policyCompliantVersions: previews.filter(row => !row.policyIssues.length).length,
      legacyVersions: previews.filter(row => row.policyIssues.length).length, fixedSets: fixedSets.length, fixedProjectMethods: fixedMethods.length,
      currentPlans: currentPlans.length, currentV2Plans: currentPlans.filter(row => row.schema_version === '2').length, grouped },
    versions: previews, fixedSets, fixedProjectMethods: fixedMethods, currentPlans,
    operations: { createdDrafts: 0, activatedVersions: 0, reboundSets: 0, recapturedMethods: 0, consumerDataRead: false,
      attachmentByteVerificationPerformed: false, taskComplete: false } };
  await mkdir(output, { recursive: true }); await writeFile(output + '/inventory.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(report.summary));
} catch (error) { await pool.query('ROLLBACK'); throw error; }
finally { await pool.end(); }
