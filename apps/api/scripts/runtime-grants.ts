import type {PoolClient} from 'pg';

// Identical grants are used by local provisioning and the separate cloud maintenance runner.
export async function grantRuntimeAccess(owner: Pick<PoolClient,'query'>, role = 'orai_app') {
  if (!/^[a-z_][a-z0-9_]{1,62}$/.test(role)) throw new Error('Invalid runtime role');
  const statements = [
    "GRANT USAGE ON SCHEMA orai TO orai_app",
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA orai TO orai_app",
    "REVOKE ALL ON orai._prisma_migrations, orai.environment_marker FROM orai_app",
    "GRANT SELECT ON orai.environment_marker TO orai_app",
    "REVOKE INSERT, UPDATE, DELETE ON orai.users FROM orai_app",
    "GRANT INSERT (id, supabase_user_id, scope, role, disabled_at, created_at, updated_at), UPDATE (disabled_at, updated_at) ON orai.users TO orai_app",
    "REVOKE UPDATE, DELETE ON orai.admin_audit_logs, orai.machine_calls, orai.machine_uploads FROM orai_app",
    "REVOKE UPDATE, DELETE ON orai.experience_releases, orai.experience_resources FROM orai_app",
    "REVOKE UPDATE, DELETE ON orai.experience_authoring_revisions, orai.experience_authoring_resources FROM orai_app",
    "REVOKE UPDATE, DELETE ON orai.production_plan_revisions, orai.production_module_identities, orai.production_plan_modules FROM orai_app",
    "REVOKE UPDATE, DELETE ON orai.project_method_snapshots, orai.project_method_references, orai.project_production_records, orai.project_production_methods, orai.project_production_outputs FROM orai_app",
    "REVOKE UPDATE, DELETE ON orai.external_attempt_events, orai.external_production_attempts, orai.external_module_leases, orai.external_production_runs FROM orai_app",
    "GRANT UPDATE (cancelled_at, cancel_reason, cancel_actor_user_id) ON orai.external_production_runs TO orai_app",
    "GRANT UPDATE (active_attempt_id, generation, expires_at) ON orai.external_module_leases TO orai_app",
    "GRANT UPDATE (state, revision, output_record_id, output_digest, job, reported_cost_fen, reported_tokens, verified_at, ended_at, lease_expires_at) ON orai.external_production_attempts TO orai_app",
    "REVOKE UPDATE, DELETE ON orai.project_review_revisions, orai.project_review_records, orai.project_original_files FROM orai_app",
    "REVOKE UPDATE, DELETE ON orai.project_canvas_layout_revisions FROM orai_app",
    "GRANT UPDATE (status, verified_at, updated_at) ON orai.project_original_files TO orai_app",
    "REVOKE UPDATE, DELETE ON orai.machine_projects, orai.machine_project_skills, orai.project_candidate_drafts, orai.machine_project_workspaces FROM orai_app",
    "GRANT UPDATE (revoked_at) ON orai.machine_project_workspaces TO orai_app",
    "REVOKE UPDATE, DELETE ON orai.machine_credentials FROM orai_app",
    "GRANT UPDATE (revoked_at) ON orai.machine_credentials TO orai_app",
    "REVOKE UPDATE, DELETE ON orai.external_run_configurations, orai.external_run_configuration_revisions FROM orai_app",
    "GRANT UPDATE (current_revision) ON orai.external_run_configurations TO orai_app",
    "REVOKE UPDATE, DELETE ON orai.codex_connections FROM orai_app",
    "GRANT UPDATE (revoked_at) ON orai.codex_connections TO orai_app",
    "REVOKE DELETE ON orai.asset_files, orai.file_cleanup_plans, orai.style_skills, orai.style_skill_versions, orai.skill_reference_files FROM orai_app",
    "REVOKE UPDATE, DELETE ON orai.creative_profile_revisions, orai.content_revisions, orai.content_references, orai.production_records, orai.content_review_records, orai.content_packages, orai.content_package_items, orai.creative_skill_sets, orai.creative_skill_bindings FROM orai_app",
  ];
  for (const statement of statements) await owner.query(statement.replace(/\borai_app\b/g, '"'+role+'"'));
}
