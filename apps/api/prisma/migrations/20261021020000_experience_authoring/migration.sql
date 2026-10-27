SET search_path TO orai,pg_temp;
-- AlterEnum
ALTER TYPE "AssetKind" ADD VALUE 'EXPERIENCE';

-- AlterTable
ALTER TABLE "experience_releases" ADD COLUMN     "authoring_revision_id" UUID;

-- CreateTable
CREATE TABLE "experience_authoring_revisions" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "creative_profile_revision_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "version_revision" INTEGER NOT NULL,
    "configuration_digest" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "report_plan" JSONB NOT NULL,
    "methods" JSONB NOT NULL,
    "note" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "machine_credential_id" UUID,
    "machine_request_id" UUID,
    "digest" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experience_authoring_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_authoring_resources" (
    "id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "resource_id" TEXT NOT NULL,
    "file_id" UUID NOT NULL,

    CONSTRAINT "experience_authoring_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "experience_authoring_revisions_product_version_id_number_key" ON "experience_authoring_revisions"("product_version_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "experience_authoring_revisions_id_product_version_id_scope_key" ON "experience_authoring_revisions"("id", "product_version_id", "scope");

-- CreateIndex
CREATE INDEX "experience_authoring_resources_file_id_idx" ON "experience_authoring_resources"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "experience_authoring_resources_revision_id_resource_id_key" ON "experience_authoring_resources"("revision_id", "resource_id");

-- AddForeignKey
ALTER TABLE "experience_authoring_revisions" ADD CONSTRAINT "experience_authoring_version_scope_fkey" FOREIGN KEY ("product_version_id", "product_id", "scope") REFERENCES "product_versions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_authoring_revisions" ADD CONSTRAINT "experience_authoring_profile_scope_fkey" FOREIGN KEY ("creative_profile_revision_id", "product_id", "scope") REFERENCES "creative_profile_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_authoring_revisions" ADD CONSTRAINT "experience_authoring_revisions_actor_user_id_scope_fkey" FOREIGN KEY ("actor_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_authoring_revisions" ADD CONSTRAINT "experience_authoring_revisions_machine_credential_id_scope_fkey" FOREIGN KEY ("machine_credential_id", "scope") REFERENCES "machine_credentials"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_authoring_resources" ADD CONSTRAINT "experience_authoring_resources_revision_scope_fkey" FOREIGN KEY ("revision_id", "product_version_id", "scope") REFERENCES "experience_authoring_revisions"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_authoring_resources" ADD CONSTRAINT "experience_authoring_resources_file_scope_fkey" FOREIGN KEY ("file_id", "product_version_id", "scope") REFERENCES "asset_files"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE style_skills DROP CONSTRAINT skill_identity_values;
ALTER TABLE style_skills ADD CONSTRAINT skill_identity_values CHECK (domain IN ('assessment','cover','video','copy','experience') AND revision>=0 AND cardinality(styles) BETWEEN 1 AND 12 AND cardinality(purposes) BETWEEN 1 AND 2 AND cardinality(supported_forms) BETWEEN 1 AND 5);
ALTER TABLE machine_credentials DROP CONSTRAINT machine_credential_domain;
ALTER TABLE machine_credentials ADD CONSTRAINT machine_credential_domain CHECK (domain IN ('assessment','cover','video','copy','experience'));
ALTER TABLE machine_calls DROP CONSTRAINT machine_call_domain;
ALTER TABLE machine_calls ADD CONSTRAINT machine_call_domain CHECK (domain IN ('assessment','cover','video','copy','experience'));
ALTER TABLE asset_files DROP CONSTRAINT asset_files_kind_check, DROP CONSTRAINT asset_files_check2;
ALTER TABLE asset_files ADD CONSTRAINT asset_files_kind_check CHECK (kind::text IN ('COVER','VIDEO','EXPERIENCE')),
  ADD CONSTRAINT asset_files_check2 CHECK ((kind::text IN ('COVER','EXPERIENCE') AND mime_type LIKE 'image/%') OR (kind::text='VIDEO' AND mime_type LIKE 'video/%')),
  ADD CONSTRAINT experience_file_size CHECK (kind::text<>'EXPERIENCE' OR (byte_size<=4194304 AND mime_type IN ('image/png','image/jpeg','image/webp')));

ALTER TABLE experience_authoring_revisions ADD CONSTRAINT experience_authoring_shape CHECK (
  number>0 AND version_revision>=0 AND status IN ('draft','reviewed') AND source IN ('manual','external_ai','mcp') AND
  configuration_digest ~ '^[0-9a-f]{64}$' AND digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(methods)='array' AND jsonb_array_length(methods) IN (0,2) AND
  ((machine_credential_id IS NULL AND machine_request_id IS NULL AND source<>'mcp') OR (machine_credential_id IS NOT NULL AND machine_request_id IS NOT NULL AND source='mcp')));
CREATE TRIGGER experience_authoring_immutable BEFORE UPDATE OR DELETE ON experience_authoring_revisions FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE TRIGGER experience_authoring_resource_immutable BEFORE UPDATE OR DELETE ON experience_authoring_resources FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE FUNCTION guard_experience_authoring() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE v product_versions; c machine_credentials; item jsonb; method style_skill_versions;
BEGIN
  SELECT * INTO STRICT v FROM product_versions WHERE id=NEW.product_version_id FOR SHARE;
  IF v.status NOT IN ('DRAFT','REVIEWED') OR NEW.creative_profile_revision_id IS DISTINCT FROM v.creative_profile_revision_id OR
    NEW.manifest->'content'->>'versionId' IS DISTINCT FROM v.id::text OR NEW.manifest->>'creativeProfileRevisionId' IS DISTINCT FROM NEW.creative_profile_revision_id::text THEN
    RAISE EXCEPTION 'Experience authoring must use a mutable version and its fixed profile' USING ERRCODE='23514';
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
      NOT (v.product_id=ANY(c.product_ids)) OR jsonb_array_length(NEW.methods)<>2 THEN
      RAISE EXCEPTION 'Experience machine provenance mismatch' USING ERRCODE='23514';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(NEW.methods) LOOP
      IF NOT ((item->'version'->>'skillId')::uuid=ANY(c.skill_ids)) THEN RAISE EXCEPTION 'Experience method outside credential scope'; END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER experience_authoring_guard BEFORE INSERT ON experience_authoring_revisions FOR EACH ROW EXECUTE FUNCTION guard_experience_authoring();
CREATE FUNCTION guard_experience_authoring_resource() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE f asset_files; spec jsonb;
BEGIN
  SELECT * INTO STRICT f FROM asset_files WHERE id=NEW.file_id FOR SHARE;
  SELECT value INTO spec FROM experience_authoring_revisions r,jsonb_array_elements(r.manifest->'resources')
    WHERE r.id=NEW.revision_id AND value->>'resourceId'=NEW.resource_id;
  IF f.kind::text<>'EXPERIENCE' OR f.status<>'AVAILABLE' OR f.verified_at IS NULL OR spec IS NULL OR
    spec->>'fileId' IS DISTINCT FROM f.id::text OR spec->>'checksum' IS DISTINCT FROM f.checksum OR
    (spec->>'byteSize')::int IS DISTINCT FROM f.byte_size OR spec->>'mimeType' IS DISTINCT FROM f.mime_type THEN
    RAISE EXCEPTION 'Experience draft resource must match a verified dedicated file' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER experience_authoring_resource_guard BEFORE INSERT ON experience_authoring_resources FOR EACH ROW EXECUTE FUNCTION guard_experience_authoring_resource();
CREATE FUNCTION check_experience_authoring_resources() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE key uuid; expected int; actual int;
BEGIN
  IF TG_TABLE_NAME='experience_authoring_revisions' THEN key:=NEW.id; ELSE key:=NEW.revision_id; END IF;
  SELECT jsonb_array_length(manifest->'resources') INTO expected FROM experience_authoring_revisions WHERE id=key;
  SELECT count(*) INTO actual FROM experience_authoring_resources WHERE revision_id=key;
  IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Experience draft resources are incomplete' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER experience_authoring_resources_complete AFTER INSERT ON experience_authoring_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_experience_authoring_resources();
CREATE CONSTRAINT TRIGGER experience_authoring_resource_set_complete AFTER INSERT ON experience_authoring_resources DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_experience_authoring_resources();

CREATE OR REPLACE FUNCTION capture_default_experience() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM experience_authoring_revisions WHERE product_version_id=NEW.id) AND
    NOT EXISTS(SELECT 1 FROM experience_releases WHERE product_version_id=NEW.id) THEN
    RAISE EXCEPTION 'An authored experience must be reviewed and captured before publication' USING ERRCODE='23514';
  END IF;
  PERFORM ensure_legacy_experience(NEW.id); RETURN NEW;
END $$;

CREATE FUNCTION guard_authored_experience_release() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE latest experience_authoring_revisions;
BEGIN
  SELECT * INTO latest FROM experience_authoring_revisions WHERE product_version_id=NEW.product_version_id ORDER BY number DESC LIMIT 1;
  IF latest.id IS NOT NULL THEN
    IF NEW.authoring_revision_id IS DISTINCT FROM latest.id OR latest.status<>'reviewed' OR NEW.manifest IS DISTINCT FROM latest.manifest THEN
      RAISE EXCEPTION 'Experience release must capture the exact latest reviewed revision' USING ERRCODE='23514';
    END IF;
  ELSIF NEW.authoring_revision_id IS NOT NULL THEN
    RAISE EXCEPTION 'Experience authoring reference mismatch' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER authored_experience_release_guard BEFORE INSERT ON experience_releases FOR EACH ROW EXECUTE FUNCTION guard_authored_experience_release();

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
      NOT ('content:write'=ANY(c.permissions)) OR NOT EXISTS(SELECT 1 FROM product_versions WHERE id=f.product_version_id AND product_id=ANY(c.product_ids) AND scope=NEW.scope) THEN
      RAISE EXCEPTION 'machine media target mismatch';
    END IF;
  ELSE
    SELECT * INTO STRICT sf FROM skill_reference_files WHERE id=NEW.skill_file_id AND scope=NEW.scope AND owner_user_id=c.owner_user_id;
    IF NEW.id<>sf.id OR NEW.target->>'type' IS DISTINCT FROM 'skill_reference' OR NEW.target->>'skillId' IS DISTINCT FROM sf.skill_id::text OR
      NOT ('skills:write'=ANY(c.permissions)) OR NOT (sf.skill_id=ANY(c.skill_ids)) OR
      NOT EXISTS(SELECT 1 FROM style_skills WHERE id=sf.skill_id AND domain=c.domain AND scope=NEW.scope) THEN RAISE EXCEPTION 'machine skill target mismatch'; END IF;
  END IF;
  RETURN NEW;
END $$;

-- AddForeignKey
ALTER TABLE "experience_releases" ADD CONSTRAINT "experience_release_authoring_scope_fkey" FOREIGN KEY ("authoring_revision_id", "product_version_id", "scope") REFERENCES "experience_authoring_revisions"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

