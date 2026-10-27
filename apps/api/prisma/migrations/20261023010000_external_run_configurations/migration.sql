-- Additive, forward-only. Rollback disables the application entry; retain immutable history.
-- No existing business rows are changed. Destructive removal requires a separate reviewed migration.
BEGIN;
SET search_path TO orai,pg_temp;
CREATE TABLE "external_run_configurations" (
    "id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "client_key" UUID NOT NULL,
    "input_digest" TEXT NOT NULL,
    "current_revision" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_run_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_run_configuration_revisions" (
    "id" UUID NOT NULL,
    "configuration_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "revision" INTEGER NOT NULL,
    "digest" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_run_configuration_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "external_run_configurations_scope_owner_user_id_created_at_idx" ON "external_run_configurations"("scope", "owner_user_id", "created_at");

CREATE UNIQUE INDEX "external_run_configurations_id_scope_key" ON "external_run_configurations"("id", "scope");

CREATE UNIQUE INDEX "external_run_configurations_owner_user_id_scope_client_key_key" ON "external_run_configurations"("owner_user_id", "scope", "client_key");

CREATE UNIQUE INDEX "external_run_configuration_revisions_configuration_id_revis_key" ON "external_run_configuration_revisions"("configuration_id", "revision");

CREATE UNIQUE INDEX "external_run_configuration_revisions_id_configuration_id_sc_key" ON "external_run_configuration_revisions"("id", "configuration_id", "scope");

ALTER TABLE "external_run_configurations" ADD CONSTRAINT "external_run_configurations_owner_user_id_scope_fkey" FOREIGN KEY ("owner_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "external_run_configurations" ADD CONSTRAINT "external_run_configurations_workspace_id_scope_fkey" FOREIGN KEY ("workspace_id", "scope") REFERENCES "machine_project_workspaces"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "external_run_configuration_revisions" ADD CONSTRAINT "external_run_configuration_revisions_configuration_id_scop_fkey" FOREIGN KEY ("configuration_id", "scope") REFERENCES "external_run_configurations"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "external_run_configuration_revisions" ADD CONSTRAINT "external_run_configuration_revisions_created_by_id_scope_fkey" FOREIGN KEY ("created_by_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE external_run_configurations ADD CONSTRAINT external_config_shape CHECK (current_revision>0 AND input_digest ~ '^[0-9a-f]{64}$');
ALTER TABLE external_run_configuration_revisions ADD CONSTRAINT external_config_revision_shape CHECK (
 revision>0 AND digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(document)='object' AND (document->>'schemaVersion') IS NOT DISTINCT FROM '1'
 AND NOT document ? 'enabled' AND NOT document ? 'credentials');
CREATE FUNCTION guard_external_config_head() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Configuration history cannot be deleted' USING ERRCODE='23514'; END IF;
 IF NEW.current_revision<>OLD.current_revision+1 OR
  to_jsonb(NEW)-'current_revision' IS DISTINCT FROM to_jsonb(OLD)-'current_revision' THEN
  RAISE EXCEPTION 'Only the next configuration revision may be appended' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER external_config_head_guard BEFORE UPDATE OR DELETE ON external_run_configurations
 FOR EACH ROW EXECUTE FUNCTION guard_external_config_head();
CREATE FUNCTION guard_external_config_revision() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE parent external_run_configurations; count_before integer;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Configuration revisions are immutable' USING ERRCODE='23514'; END IF;
 SELECT * INTO STRICT parent FROM external_run_configurations WHERE id=NEW.configuration_id AND scope=NEW.scope FOR UPDATE;
 SELECT coalesce(max(revision),0) INTO count_before FROM external_run_configuration_revisions WHERE configuration_id=parent.id;
 IF NEW.created_by_id<>parent.owner_user_id OR (NEW.document->>'workspaceId') IS DISTINCT FROM parent.workspace_id::text OR
  NEW.revision<>count_before+1 OR NEW.revision<>parent.current_revision THEN
  RAISE EXCEPTION 'Configuration revision differs from its owner, workspace or frontier' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER external_config_revision_guard BEFORE INSERT OR UPDATE OR DELETE ON external_run_configuration_revisions
 FOR EACH ROW EXECUTE FUNCTION guard_external_config_revision();
CREATE FUNCTION check_external_config_complete() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE parent external_run_configurations; owner_id uuid; max_revision integer;
BEGIN
 IF TG_TABLE_NAME='external_run_configurations' THEN
  SELECT * INTO STRICT parent FROM external_run_configurations WHERE id=NEW.id;
 ELSE SELECT * INTO STRICT parent FROM external_run_configurations WHERE id=NEW.configuration_id;
 END IF;
 SELECT owner_user_id INTO STRICT owner_id FROM machine_project_workspaces WHERE id=parent.workspace_id AND scope=parent.scope;
 SELECT max(revision) INTO max_revision FROM external_run_configuration_revisions WHERE configuration_id=parent.id;
 IF owner_id<>parent.owner_user_id OR parent.current_revision IS DISTINCT FROM max_revision THEN
  RAISE EXCEPTION 'Configuration must retain a complete owner-scoped revision frontier' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER external_config_complete AFTER INSERT OR UPDATE ON external_run_configurations
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_external_config_complete();
CREATE CONSTRAINT TRIGGER external_config_revision_complete AFTER INSERT ON external_run_configuration_revisions
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_external_config_complete();
REVOKE ALL ON external_run_configurations,external_run_configuration_revisions FROM PUBLIC;
COMMIT;
