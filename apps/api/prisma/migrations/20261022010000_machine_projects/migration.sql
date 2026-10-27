BEGIN;
SET search_path TO orai,pg_temp;
-- AlterTable
ALTER TABLE "experience_authoring_revisions" ADD COLUMN     "project_plan_module_id" UUID;

-- AlterTable
ALTER TABLE "machine_credentials" ADD COLUMN     "workspace_id" UUID;

-- AlterTable
ALTER TABLE "project_method_snapshots" ADD COLUMN     "machine_credential_id" UUID,
ADD COLUMN     "machine_request_id" UUID;

-- AlterTable
ALTER TABLE "project_production_records" ADD COLUMN     "machine_credential_id" UUID,
ADD COLUMN     "machine_request_id" UUID;

-- CreateTable
CREATE TABLE "machine_project_workspaces" (
    "id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category_ids" UUID[],
    "max_projects" INTEGER NOT NULL,
    "max_methods_per_project" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_project_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_projects" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "product_id" UUID NOT NULL,
    "creator_credential_id" UUID NOT NULL,
    "project_key" TEXT NOT NULL,
    "bootstrap_digest" TEXT NOT NULL,
    "initial_profile_id" UUID NOT NULL,
    "initial_plan_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_project_skills" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "skill_id" UUID NOT NULL,
    "creator_credential_id" UUID NOT NULL,
    "method_key" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "input_digest" TEXT NOT NULL,
    "initial_version_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_project_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_candidate_drafts" (
    "id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "product_id" UUID NOT NULL,
    "plan_module_id" UUID NOT NULL,
    "content_revision_id" UUID,
    "experience_revision_id" UUID,
    "methods" JSONB NOT NULL,
    "digest" TEXT NOT NULL,
    "machine_credential_id" UUID NOT NULL,
    "machine_request_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_candidate_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "machine_project_workspaces_id_scope_key" ON "machine_project_workspaces"("id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "machine_projects_product_id_key" ON "machine_projects"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "machine_projects_workspace_id_project_key_key" ON "machine_projects"("workspace_id", "project_key");

-- CreateIndex
CREATE UNIQUE INDEX "machine_projects_product_id_scope_key" ON "machine_projects"("product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "machine_project_skills_skill_id_key" ON "machine_project_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "machine_project_skills_product_id_domain_method_key_key" ON "machine_project_skills"("product_id", "domain", "method_key");

-- CreateIndex
CREATE UNIQUE INDEX "project_candidate_drafts_machine_credential_id_machine_requ_key" ON "project_candidate_drafts"("machine_credential_id", "machine_request_id");

-- AddForeignKey
ALTER TABLE "experience_authoring_revisions" ADD CONSTRAINT "experience_authoring_revisions_project_plan_module_id_prod_fkey" FOREIGN KEY ("project_plan_module_id", "product_id", "scope") REFERENCES "production_plan_modules"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_method_snapshots" ADD CONSTRAINT "project_method_snapshots_machine_credential_id_scope_fkey" FOREIGN KEY ("machine_credential_id", "scope") REFERENCES "machine_credentials"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_production_records" ADD CONSTRAINT "project_production_records_machine_credential_id_scope_fkey" FOREIGN KEY ("machine_credential_id", "scope") REFERENCES "machine_credentials"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_credentials" ADD CONSTRAINT "machine_credentials_workspace_id_scope_fkey" FOREIGN KEY ("workspace_id", "scope") REFERENCES "machine_project_workspaces"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_project_workspaces" ADD CONSTRAINT "machine_project_workspaces_owner_user_id_scope_fkey" FOREIGN KEY ("owner_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_projects" ADD CONSTRAINT "machine_projects_workspace_id_scope_fkey" FOREIGN KEY ("workspace_id", "scope") REFERENCES "machine_project_workspaces"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_projects" ADD CONSTRAINT "machine_projects_product_id_scope_fkey" FOREIGN KEY ("product_id", "scope") REFERENCES "products"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_projects" ADD CONSTRAINT "machine_projects_creator_credential_id_scope_fkey" FOREIGN KEY ("creator_credential_id", "scope") REFERENCES "machine_credentials"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_projects" ADD CONSTRAINT "machine_projects_initial_profile_id_product_id_scope_fkey" FOREIGN KEY ("initial_profile_id", "product_id", "scope") REFERENCES "creative_profile_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

-- AddForeignKey
ALTER TABLE "machine_projects" ADD CONSTRAINT "machine_projects_initial_plan_id_product_id_scope_fkey" FOREIGN KEY ("initial_plan_id", "product_id", "scope") REFERENCES "production_plan_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

-- AddForeignKey
ALTER TABLE "machine_project_skills" ADD CONSTRAINT "machine_project_skills_product_id_scope_fkey" FOREIGN KEY ("product_id", "scope") REFERENCES "machine_projects"("product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_project_skills" ADD CONSTRAINT "machine_project_skills_skill_id_scope_fkey" FOREIGN KEY ("skill_id", "scope") REFERENCES "style_skills"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_project_skills" ADD CONSTRAINT "machine_project_skills_creator_credential_id_scope_fkey" FOREIGN KEY ("creator_credential_id", "scope") REFERENCES "machine_credentials"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_candidate_drafts" ADD CONSTRAINT "project_candidate_drafts_plan_module_id_product_id_scope_fkey" FOREIGN KEY ("plan_module_id", "product_id", "scope") REFERENCES "production_plan_modules"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_candidate_drafts" ADD CONSTRAINT "project_candidate_drafts_content_revision_id_product_id_sc_fkey" FOREIGN KEY ("content_revision_id", "product_id", "scope") REFERENCES "content_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_candidate_drafts" ADD CONSTRAINT "project_candidate_drafts_experience_revision_id_product_id_fkey" FOREIGN KEY ("experience_revision_id", "product_id", "scope") REFERENCES "experience_authoring_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_candidate_drafts" ADD CONSTRAINT "project_candidate_drafts_machine_credential_id_scope_fkey" FOREIGN KEY ("machine_credential_id", "scope") REFERENCES "machine_credentials"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE machine_credentials DROP CONSTRAINT machine_credential_permissions;
ALTER TABLE machine_credentials ADD CONSTRAINT machine_credential_permissions CHECK (
  cardinality(permissions) BETWEEN 1 AND 9 AND permissions <@ ARRAY['content:read','content:write','skills:read','skills:write','context:read','projects:read','projects:write','projects:create','methods:create']::text[] AND
  (workspace_id IS NOT NULL OR NOT permissions && ARRAY['projects:read','projects:write','projects:create','methods:create']::text[]) AND
  (domain='assessment' OR NOT permissions && ARRAY['projects:write','projects:create']::text[]));
ALTER TABLE machine_project_workspaces ALTER COLUMN category_ids SET NOT NULL;
ALTER TABLE machine_project_workspaces ADD CONSTRAINT machine_workspace_limits CHECK (
  max_projects BETWEEN 1 AND 100 AND max_methods_per_project BETWEEN 1 AND 100 AND
  cardinality(category_ids) BETWEEN 1 AND 30 AND expires_at>created_at AND expires_at<=created_at+INTERVAL '90 days');
ALTER TABLE machine_projects ADD CONSTRAINT machine_project_digest CHECK (bootstrap_digest ~ '^[a-f0-9]{64}$');
ALTER TABLE machine_project_skills ADD CONSTRAINT machine_project_skill_digest CHECK (input_digest ~ '^[a-f0-9]{64}$');
ALTER TABLE project_method_snapshots ADD CONSTRAINT project_method_machine_pair CHECK ((machine_credential_id IS NULL)=(machine_request_id IS NULL));
ALTER TABLE project_production_records ADD CONSTRAINT project_record_machine_pair CHECK ((machine_credential_id IS NULL)=(machine_request_id IS NULL));
ALTER TABLE project_candidate_drafts ADD CONSTRAINT project_candidate_shape CHECK (
  ((content_revision_id IS NULL)<>(experience_revision_id IS NULL)) AND digest ~ '^[a-f0-9]{64}$' AND
  jsonb_typeof(methods)='array' AND jsonb_array_length(methods) BETWEEN 1 AND 12);
CREATE TRIGGER machine_workspace_immutable BEFORE UPDATE OR DELETE ON machine_project_workspaces FOR EACH ROW EXECUTE FUNCTION machine_credential_guard();
CREATE TRIGGER machine_project_immutable BEFORE UPDATE OR DELETE ON machine_projects FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE TRIGGER machine_project_skill_immutable BEFORE UPDATE OR DELETE ON machine_project_skills FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE TRIGGER project_candidate_immutable BEFORE UPDATE OR DELETE ON project_candidate_drafts FOR EACH ROW EXECUTE FUNCTION keep_content_history();

-- Membership is immutable. These functions also validate historical provenance after a credential is revoked.
CREATE FUNCTION machine_has_product(c_id uuid,p_id uuid,s "DataScope") RETURNS boolean LANGUAGE sql STABLE SET search_path=orai,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM machine_credentials c WHERE c.id=c_id AND c.scope=s AND
   (p_id=ANY(c.product_ids) OR EXISTS(SELECT 1 FROM machine_projects p WHERE p.workspace_id=c.workspace_id AND p.product_id=p_id AND p.scope=s)))
$$;
CREATE FUNCTION machine_has_skill(c_id uuid,skill_key uuid,s "DataScope") RETURNS boolean LANGUAGE sql STABLE SET search_path=orai,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM machine_credentials c JOIN style_skills sk ON sk.id=skill_key AND sk.scope=s AND sk.domain=c.domain
   WHERE c.id=c_id AND c.scope=s AND (skill_key=ANY(c.skill_ids) OR EXISTS(SELECT 1 FROM machine_project_skills ps
     JOIN machine_projects p ON p.product_id=ps.product_id AND p.scope=ps.scope
     WHERE ps.skill_id=skill_key AND p.workspace_id=c.workspace_id AND ps.scope=s)))
$$;
CREATE FUNCTION guard_machine_workspace_credential() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
BEGIN
 IF NEW.workspace_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM machine_project_workspaces w WHERE w.id=NEW.workspace_id
   AND w.scope=NEW.scope AND w.owner_user_id=NEW.owner_user_id AND w.revoked_at IS NULL AND w.expires_at>=NEW.expires_at) THEN
   RAISE EXCEPTION 'Workspace does not authorize this credential' USING ERRCODE='23514';
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER machine_workspace_credential_guard BEFORE INSERT ON machine_credentials FOR EACH ROW EXECUTE FUNCTION guard_machine_workspace_credential();
CREATE FUNCTION guard_machine_project_membership() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE c machine_credentials; w machine_project_workspaces; p products; sk style_skills;
BEGIN
 SELECT * INTO STRICT c FROM machine_credentials WHERE id=NEW.creator_credential_id AND scope=NEW.scope;
 PERFORM pg_advisory_xact_lock(hashtextextended('machine-workspace:'||c.workspace_id::text,0));
 SELECT * INTO STRICT w FROM machine_project_workspaces WHERE id=c.workspace_id AND scope=c.scope;
 IF c.revoked_at IS NOT NULL OR c.expires_at<=statement_timestamp() OR w.revoked_at IS NOT NULL OR w.expires_at<=statement_timestamp()
   OR w.owner_user_id<>c.owner_user_id THEN RAISE EXCEPTION 'Workspace creation authorization expired' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='machine_projects' THEN
   SELECT * INTO STRICT p FROM products WHERE id=NEW.product_id AND scope=NEW.scope;
   IF NEW.workspace_id<>w.id OR c.domain<>'assessment' OR NOT ('projects:create'=ANY(c.permissions)) OR p.status<>'DRAFT'
     OR p.current_version_id IS NOT NULL OR p.purchase_url IS NOT NULL OR p.recommended OR NOT(p.category_id=ANY(w.category_ids))
     OR (SELECT count(*) FROM machine_projects WHERE workspace_id=w.id)>=w.max_projects THEN
     RAISE EXCEPTION 'Project outside bounded creation grant' USING ERRCODE='23514'; END IF;
 ELSE
   SELECT * INTO STRICT sk FROM style_skills WHERE id=NEW.skill_id AND scope=NEW.scope;
   IF NOT ('methods:create'=ANY(c.permissions)) OR sk.domain<>c.domain OR NEW.domain<>c.domain OR
     NOT EXISTS(SELECT 1 FROM machine_projects WHERE product_id=NEW.product_id AND scope=NEW.scope AND workspace_id=w.id) OR
     NOT EXISTS(SELECT 1 FROM style_skill_versions WHERE id=NEW.initial_version_id AND skill_id=NEW.skill_id AND status='DRAFT') OR
     (SELECT count(*) FROM machine_project_skills WHERE product_id=NEW.product_id)>=w.max_methods_per_project THEN
     RAISE EXCEPTION 'Method outside bounded creation grant' USING ERRCODE='23514'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER machine_project_membership_guard BEFORE INSERT ON machine_projects FOR EACH ROW EXECUTE FUNCTION guard_machine_project_membership();
CREATE TRIGGER machine_project_skill_membership_guard BEFORE INSERT ON machine_project_skills FOR EACH ROW EXECUTE FUNCTION guard_machine_project_membership();
CREATE FUNCTION guard_project_candidate() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE m production_plan_modules; c machine_credentials; p production_plan_revisions; item jsonb; output_domain text; profile_key uuid; actual_digest text;
BEGIN
 SELECT * INTO STRICT m FROM production_plan_modules WHERE id=NEW.plan_module_id AND product_id=NEW.product_id AND scope=NEW.scope;
 SELECT * INTO STRICT p FROM production_plan_revisions WHERE id=m.plan_revision_id;
 SELECT * INTO STRICT c FROM machine_credentials WHERE id=NEW.machine_credential_id AND scope=NEW.scope;
 IF NOT ('content:write'=ANY(c.permissions)) OR c.domain IS DISTINCT FROM m.definition->>'domain' OR NOT machine_has_product(c.id,NEW.product_id,NEW.scope) THEN
   RAISE EXCEPTION 'Candidate outside machine domain and project' USING ERRCODE='23514'; END IF;
 IF NEW.content_revision_id IS NOT NULL THEN
   SELECT domain,creative_profile_revision_id,digest INTO STRICT output_domain,profile_key,actual_digest FROM content_revisions WHERE id=NEW.content_revision_id;
 ELSE
   SELECT 'experience',creative_profile_revision_id,digest INTO STRICT output_domain,profile_key,actual_digest FROM experience_authoring_revisions WHERE id=NEW.experience_revision_id AND project_plan_module_id=NEW.plan_module_id;
 END IF;
 IF output_domain<>c.domain OR profile_key IS DISTINCT FROM p.creative_profile_revision_id OR actual_digest<>NEW.digest THEN
   RAISE EXCEPTION 'Candidate output does not match fixed module and profile' USING ERRCODE='23514'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(NEW.methods) LOOP
   IF NOT EXISTS(SELECT 1 FROM project_method_snapshots s WHERE s.id=(item->>'snapshotId')::uuid AND s.plan_module_id=m.id
     AND s.scope=NEW.scope AND s.digest=item->>'digest') THEN RAISE EXCEPTION 'Candidate method snapshot mismatch' USING ERRCODE='23514'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(m.definition->'methodPurposes') purpose WHERE NOT EXISTS(
   SELECT 1 FROM jsonb_array_elements(NEW.methods) AS selected(value) JOIN project_method_snapshots s ON s.id=(selected.value->>'snapshotId')::uuid WHERE s.purpose=purpose)) THEN
   RAISE EXCEPTION 'Candidate is missing required methods' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER project_candidate_guard BEFORE INSERT ON project_candidate_drafts FOR EACH ROW EXECUTE FUNCTION guard_project_candidate();
CREATE OR REPLACE FUNCTION machine_upload_binding_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE c machine_credentials; f asset_files; sf skill_reference_files; media_match boolean;
BEGIN
  SELECT * INTO STRICT c FROM machine_credentials WHERE id=NEW.credential_id AND scope=NEW.scope;
  IF c.revoked_at IS NOT NULL OR c.expires_at<=statement_timestamp() OR NEW.expires_at>c.expires_at THEN RAISE EXCEPTION 'invalid machine upload credential'; END IF;
  IF NEW.asset_file_id IS NOT NULL THEN
    SELECT * INTO STRICT f FROM asset_files WHERE id=NEW.asset_file_id AND scope=NEW.scope AND owner_user_id=c.owner_user_id;
    media_match:=CASE WHEN c.domain='experience' THEN f.kind::text='EXPERIENCE' AND NEW.target->>'type'='experience_resource' AND NEW.target->>'purpose' IN ('illustration','texture')
      ELSE NEW.target->>'type'='media' AND NEW.target->>'kind'=lower(f.kind::text) AND c.domain=lower(f.kind::text) END;
    IF NEW.id<>f.id OR media_match IS DISTINCT FROM true OR NEW.target->>'productVersionId' IS DISTINCT FROM f.product_version_id::text OR
      NOT ('content:write'=ANY(c.permissions)) OR NOT EXISTS(SELECT 1 FROM product_versions WHERE id=f.product_version_id AND machine_has_product(c.id,product_id,NEW.scope) AND scope=NEW.scope) THEN
      RAISE EXCEPTION 'machine media target mismatch';
    END IF;
  ELSE
    SELECT * INTO STRICT sf FROM skill_reference_files WHERE id=NEW.skill_file_id AND scope=NEW.scope AND owner_user_id=c.owner_user_id;
    IF NEW.id<>sf.id OR NEW.target->>'type' IS DISTINCT FROM 'skill_reference' OR NEW.target->>'skillId' IS DISTINCT FROM sf.skill_id::text OR
      NOT ('skills:write'=ANY(c.permissions)) OR NOT machine_has_skill(c.id,sf.skill_id,NEW.scope) OR
      NOT EXISTS(SELECT 1 FROM style_skills WHERE id=sf.skill_id AND domain=c.domain AND scope=NEW.scope) THEN RAISE EXCEPTION 'machine skill target mismatch'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION guard_experience_authoring() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE v product_versions; c machine_credentials; item jsonb; method style_skill_versions;
BEGIN
  SELECT * INTO STRICT v FROM product_versions WHERE id=NEW.product_version_id FOR SHARE;
  IF v.status NOT IN ('DRAFT','REVIEWED') OR NEW.creative_profile_revision_id IS DISTINCT FROM v.creative_profile_revision_id OR
    NEW.manifest->'content'->>'versionId' IS DISTINCT FROM v.id::text OR NEW.manifest->>'creativeProfileRevisionId' IS DISTINCT FROM NEW.creative_profile_revision_id::text THEN
    RAISE EXCEPTION 'Experience authoring must use a mutable version and its fixed profile' USING ERRCODE='23514';
  END IF;
  IF NEW.project_plan_module_id IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM production_plan_modules m JOIN production_plan_revisions p ON p.id=m.plan_revision_id
      WHERE m.id=NEW.project_plan_module_id AND m.product_id=NEW.product_id AND m.scope=NEW.scope
      AND m.definition->>'domain'='experience' AND p.creative_profile_revision_id=NEW.creative_profile_revision_id) OR
      jsonb_array_length(NEW.methods)<>2 OR NEW.methods->0->>'purpose'=NEW.methods->1->>'purpose' THEN
      RAISE EXCEPTION 'Candidate experience requires its fixed module and two methods' USING ERRCODE='23514';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(NEW.methods) LOOP
      IF NOT EXISTS(SELECT 1 FROM project_method_snapshots s WHERE s.plan_module_id=NEW.project_plan_module_id AND s.scope=NEW.scope
        AND s.purpose=item->>'purpose' AND s.snapshot=item->'version' AND item->>'domain'='experience') THEN
        RAISE EXCEPTION 'Candidate experience must retain exact captured methods' USING ERRCODE='23514';
      END IF;
    END LOOP;
    SELECT * INTO STRICT c FROM machine_credentials WHERE id=NEW.machine_credential_id AND scope=NEW.scope;
    IF c.domain<>'experience' OR c.owner_user_id<>NEW.actor_user_id OR NOT ('content:write'=ANY(c.permissions)) OR
      NOT machine_has_product(c.id,NEW.product_id,NEW.scope) THEN
      RAISE EXCEPTION 'Candidate experience provenance mismatch' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  IF jsonb_array_length(NEW.methods)=2 AND (SELECT count(DISTINCT value->>'purpose') FROM jsonb_array_elements(NEW.methods))<>2 THEN
    RAISE EXCEPTION 'Experience methods must have distinct purposes' USING ERRCODE='23514';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.methods) LOOP
    SELECT * INTO STRICT method FROM style_skill_versions WHERE id=(item->'version'->>'id')::uuid AND scope=NEW.scope;
    IF item->>'domain' IS DISTINCT FROM 'experience' OR item->>'purpose' NOT IN ('scene_design','report_presentation') OR
      method.digest IS DISTINCT FROM item->'version'->>'digest' OR method.manifest IS DISTINCT FROM item->'version'->'manifest' OR
      method.manifest->>'domain' IS DISTINCT FROM 'experience' OR NOT (method.manifest->'purposes' ? (item->>'purpose')) THEN
      RAISE EXCEPTION 'Experience method snapshot mismatch' USING ERRCODE='23514';
    END IF;
  END LOOP;
  IF NEW.machine_credential_id IS NOT NULL THEN
    SELECT * INTO STRICT c FROM machine_credentials WHERE id=NEW.machine_credential_id AND scope=NEW.scope;
    IF c.domain<>'experience' OR c.owner_user_id<>NEW.actor_user_id OR NOT ('content:write'=ANY(c.permissions)) OR
      NOT machine_has_product(c.id,v.product_id,NEW.scope) OR jsonb_array_length(NEW.methods)<>2 THEN
      RAISE EXCEPTION 'Experience machine provenance mismatch' USING ERRCODE='23514';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(NEW.methods) LOOP
      IF NOT machine_has_skill(c.id,(item->'version'->>'skillId')::uuid,NEW.scope) THEN RAISE EXCEPTION 'Experience method outside credential scope'; END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION check_machine_production() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE credential machine_credentials; output_domain text;
BEGIN
  IF NEW.machine_credential_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO STRICT credential FROM machine_credentials WHERE id=NEW.machine_credential_id AND scope=NEW.scope;
  SELECT domain INTO STRICT output_domain FROM content_revisions WHERE id=NEW.output_revision_id AND product_id=NEW.product_id AND scope=NEW.scope;
  IF NEW.actor_user_id IS DISTINCT FROM credential.owner_user_id OR credential.domain IS DISTINCT FROM output_domain OR
     NOT ('content:write'=ANY(credential.permissions)) OR NOT machine_has_product(credential.id,NEW.product_id,NEW.scope) THEN
    RAISE EXCEPTION 'Machine provenance must match the authorized domain, product and owner' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION guard_project_machine_provenance() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE c machine_credentials; m production_plan_modules; needed text;
BEGIN
 IF NEW.machine_credential_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO STRICT c FROM machine_credentials WHERE id=NEW.machine_credential_id AND scope=NEW.scope;
 SELECT * INTO STRICT m FROM production_plan_modules WHERE id=NEW.plan_module_id AND product_id=NEW.product_id AND scope=NEW.scope;
 needed:=CASE WHEN TG_TABLE_NAME='project_method_snapshots' THEN 'methods:create' ELSE 'content:write' END;
 IF c.owner_user_id<>NEW.actor_user_id OR c.domain IS DISTINCT FROM m.definition->>'domain' OR NOT (needed=ANY(c.permissions)) OR
   NOT machine_has_product(c.id,NEW.product_id,NEW.scope) THEN RAISE EXCEPTION 'Project machine provenance mismatch' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER project_method_machine_guard BEFORE INSERT ON project_method_snapshots FOR EACH ROW EXECUTE FUNCTION guard_project_machine_provenance();
CREATE TRIGGER project_record_machine_guard BEFORE INSERT ON project_production_records FOR EACH ROW EXECUTE FUNCTION guard_project_machine_provenance();
REVOKE ALL ON machine_project_workspaces,machine_projects,machine_project_skills,project_candidate_drafts FROM PUBLIC;
COMMIT;
