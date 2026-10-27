BEGIN;
SET search_path TO orai,pg_temp;
-- AlterTable
ALTER TABLE "project_production_outputs" ADD COLUMN     "original_file_id" UUID;

-- AlterTable
ALTER TABLE "machine_uploads" ADD COLUMN     "original_file_id" UUID;

-- CreateTable
CREATE TABLE "project_original_files" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "plan_module_id" UUID NOT NULL,
    "output_key" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "status" "AssetFileStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "project_original_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_review_revisions" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "plan_revision_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "previous_revision_id" UUID,
    "status" TEXT NOT NULL,
    "selection" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "frontier_fingerprint" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "returns" JSONB NOT NULL,
    "note" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_review_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_review_records" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "review_id" UUID NOT NULL,
    "record_id" UUID NOT NULL,

    CONSTRAINT "project_review_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_original_files_storage_key_key" ON "project_original_files"("storage_key");

-- CreateIndex
CREATE INDEX "project_original_files_scope_owner_user_id_status_expires_a_idx" ON "project_original_files"("scope", "owner_user_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_original_files_id_product_id_scope_key" ON "project_original_files"("id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "project_original_files_id_scope_key" ON "project_original_files"("id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "project_review_revisions_product_id_number_key" ON "project_review_revisions"("product_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "project_review_revisions_id_product_id_scope_key" ON "project_review_revisions"("id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "project_review_records_review_id_record_id_key" ON "project_review_records"("review_id", "record_id");

-- AddForeignKey
ALTER TABLE "project_production_outputs" ADD CONSTRAINT "project_production_outputs_original_file_id_product_id_sco_fkey" FOREIGN KEY ("original_file_id", "product_id", "scope") REFERENCES "project_original_files"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_uploads" ADD CONSTRAINT "machine_uploads_original_file_id_scope_fkey" FOREIGN KEY ("original_file_id", "scope") REFERENCES "project_original_files"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_original_files" ADD CONSTRAINT "project_original_files_plan_module_id_product_id_scope_fkey" FOREIGN KEY ("plan_module_id", "product_id", "scope") REFERENCES "production_plan_modules"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_original_files" ADD CONSTRAINT "project_original_files_owner_user_id_scope_fkey" FOREIGN KEY ("owner_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_review_revisions" ADD CONSTRAINT "project_review_revisions_product_id_scope_fkey" FOREIGN KEY ("product_id", "scope") REFERENCES "products"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_review_revisions" ADD CONSTRAINT "project_review_revisions_plan_revision_id_product_id_scope_fkey" FOREIGN KEY ("plan_revision_id", "product_id", "scope") REFERENCES "production_plan_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_review_revisions" ADD CONSTRAINT "project_review_revisions_previous_revision_id_product_id_s_fkey" FOREIGN KEY ("previous_revision_id", "product_id", "scope") REFERENCES "project_review_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_review_revisions" ADD CONSTRAINT "project_review_revisions_actor_user_id_scope_fkey" FOREIGN KEY ("actor_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_review_records" ADD CONSTRAINT "project_review_records_review_id_product_id_scope_fkey" FOREIGN KEY ("review_id", "product_id", "scope") REFERENCES "project_review_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_review_records" ADD CONSTRAINT "project_review_records_record_id_product_id_scope_fkey" FOREIGN KEY ("record_id", "product_id", "scope") REFERENCES "project_production_records"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE machine_uploads DROP CONSTRAINT machine_upload_one_file;
ALTER TABLE machine_uploads ADD CONSTRAINT machine_upload_one_file CHECK(num_nonnulls(asset_file_id,skill_file_id,original_file_id)=1);
ALTER TABLE project_production_outputs DROP CONSTRAINT project_output_shape;
ALTER TABLE project_production_outputs ADD CONSTRAINT project_output_shape CHECK (
 digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(snapshot)='object' AND
 ((snapshot->>'kind'='content_revision' AND content_revision_id IS NOT NULL AND experience_revision_id IS NULL AND original_file_id IS NULL) OR
  (snapshot->>'kind'='experience_revision' AND experience_revision_id IS NOT NULL AND content_revision_id IS NULL AND file_id IS NULL AND original_file_id IS NULL) OR
  (snapshot->>'kind'='file' AND file_id IS NOT NULL AND content_revision_id IS NULL AND experience_revision_id IS NULL AND original_file_id IS NULL) OR
  (snapshot->>'kind'='original_file' AND original_file_id IS NOT NULL AND content_revision_id IS NULL AND experience_revision_id IS NULL AND file_id IS NULL)) AND
 (file_id IS NULL OR product_version_id IS NOT NULL));
ALTER TABLE project_original_files ADD CONSTRAINT project_original_shape CHECK (
 mime_type IN ('application/zip','text/html','model/gltf-binary') AND byte_size BETWEEN 1 AND 104857600 AND
 checksum ~ '^[0-9a-f]{64}$' AND storage_key=id::text||'.blob' AND expires_at>created_at AND expires_at<=created_at+INTERVAL '1 hour' AND
 (status<>'AVAILABLE' OR verified_at IS NOT NULL));
CREATE FUNCTION guard_project_original() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE m production_plan_modules; slot jsonb; spec jsonb;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Original import history is retained' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.status='AVAILABLE' OR (to_jsonb(NEW)-ARRAY['status','verified_at','updated_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['status','verified_at','updated_at']) OR NOT (
    (OLD.status='PENDING' AND NEW.status IN ('VERIFYING','EXPIRED')) OR
    (OLD.status='VERIFYING' AND NEW.status IN ('UPLOADED','FAILED','EXPIRED')) OR
    (OLD.status='UPLOADED' AND NEW.status IN ('AVAILABLE','FAILED','EXPIRED'))) THEN
    RAISE EXCEPTION 'Original imports have immutable metadata and explicit lifecycle' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO STRICT m FROM production_plan_modules WHERE id=NEW.plan_module_id AND product_id=NEW.product_id AND scope=NEW.scope;
 SELECT value INTO slot FROM jsonb_array_elements(m.definition->'outputs') WHERE value->>'outputKey'=NEW.output_key;
 SELECT value INTO spec FROM jsonb_array_elements(slot->'files') WHERE value->>'fileKey'=NEW.file_key;
 IF slot->>'kind' NOT IN ('web_bundle','scene_bundle') OR spec->>'purpose' IS DISTINCT FROM 'original' OR
  NOT(spec->'mimeTypes' ? NEW.mime_type) OR NEW.status<>'PENDING' OR
  NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.owner_user_id AND scope=NEW.scope AND role='ADMIN' AND disabled_at IS NULL) THEN
  RAISE EXCEPTION 'Original must match a declared same-project source slot' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER project_original_guard BEFORE INSERT OR UPDATE OR DELETE ON project_original_files FOR EACH ROW EXECUTE FUNCTION guard_project_original();
CREATE OR REPLACE FUNCTION guard_project_production_output() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE r project_production_records; m production_plan_modules; p production_plan_revisions;
  slot jsonb; declaration jsonb; c content_revisions; e experience_authoring_revisions; f asset_files; original project_original_files;
BEGIN
  SELECT * INTO STRICT r FROM project_production_records WHERE id=NEW.record_id;
  SELECT * INTO STRICT m FROM production_plan_modules WHERE id=r.plan_module_id;
  SELECT * INTO STRICT p FROM production_plan_revisions WHERE id=m.plan_revision_id;
  SELECT item INTO slot FROM jsonb_array_elements(m.definition->'outputs') item WHERE item->>'outputKey'=NEW.output_key;
  IF slot IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(r.document->'outputs') output WHERE output=NEW.snapshot) OR
    NEW.snapshot->>'outputKey' IS DISTINCT FROM NEW.output_key OR COALESCE(NEW.snapshot->>'fileKey','structured') IS DISTINCT FROM NEW.file_key OR
    NEW.snapshot->>'digest' IS DISTINCT FROM NEW.digest OR
    (NEW.snapshot->>'contentRevisionId')::uuid IS DISTINCT FROM NEW.content_revision_id OR
    (NEW.snapshot->>'experienceRevisionId')::uuid IS DISTINCT FROM NEW.experience_revision_id OR
    (NEW.snapshot->>'fileId')::uuid IS DISTINCT FROM NEW.file_id OR
    (NEW.snapshot->>'originalFileId')::uuid IS DISTINCT FROM NEW.original_file_id THEN
    RAISE EXCEPTION 'Project output must match the fixed module and source document' USING ERRCODE='23514';
  END IF;
  IF NEW.content_revision_id IS NOT NULL THEN
    SELECT * INTO STRICT c FROM content_revisions WHERE id=NEW.content_revision_id;
    IF c.digest<>NEW.digest OR c.creative_profile_revision_id IS DISTINCT FROM p.creative_profile_revision_id OR
      c.product_version_id IS DISTINCT FROM NEW.product_version_id OR
      c.domain IS DISTINCT FROM (CASE WHEN slot->>'kind' IN ('assessment','report') THEN 'assessment' WHEN slot->>'kind'='image' THEN 'cover' ELSE slot->>'kind' END) OR
      (slot->>'kind' IN ('image','video') AND (NEW.file_id IS NULL OR NEW.file_id IS DISTINCT FROM c.file_id)) THEN
      RAISE EXCEPTION 'Content output must retain its exact profile, domain and bytes' USING ERRCODE='23514';
    END IF;
  ELSIF NEW.experience_revision_id IS NOT NULL THEN
    SELECT * INTO STRICT e FROM experience_authoring_revisions WHERE id=NEW.experience_revision_id;
    IF m.definition->>'domain'<>'experience' OR slot->>'kind' NOT IN ('web_bundle','scene_bundle') OR
      e.digest<>NEW.digest OR e.creative_profile_revision_id IS DISTINCT FROM p.creative_profile_revision_id OR
      e.product_version_id IS DISTINCT FROM NEW.product_version_id OR NEW.snapshot->>'purpose'<>'authoring' OR
      m.definition->'target'->>'form'<>'web' OR m.definition->'target'->'runtime'->'renderer' IS DISTINCT FROM e.manifest->'renderer' OR
      m.definition->'target'->'runtime'->'reportRenderer' IS DISTINCT FROM e.manifest->'report'->'renderer' THEN
      RAISE EXCEPTION 'Experience authoring cannot replace an original web/3D package' USING ERRCODE='23514';
    END IF;
  END IF;
  IF NEW.original_file_id IS NOT NULL THEN
    SELECT * INTO STRICT original FROM project_original_files WHERE id=NEW.original_file_id AND product_id=NEW.product_id AND scope=NEW.scope FOR SHARE;
    SELECT item INTO declaration FROM jsonb_array_elements(slot->'files') item WHERE item->>'fileKey'=NEW.file_key;
    IF original.status<>'AVAILABLE' OR original.plan_module_id<>m.id OR original.output_key<>NEW.output_key OR original.file_key<>NEW.file_key OR
      declaration->>'purpose' IS DISTINCT FROM 'original' OR NOT(declaration->'mimeTypes' ? original.mime_type) OR
      NEW.snapshot->>'purpose' IS DISTINCT FROM 'original' OR NEW.digest<>original.checksum OR
      NEW.snapshot->'file'->>'checksum' IS DISTINCT FROM original.checksum OR NEW.snapshot->'file'->>'mimeType' IS DISTINCT FROM original.mime_type OR
      NEW.snapshot->'file'->>'fileName' IS DISTINCT FROM original.original_name OR (NEW.snapshot->'file'->>'byteSize')::int IS DISTINCT FROM original.byte_size THEN
      RAISE EXCEPTION 'Project package original must retain exact verified bytes' USING ERRCODE='23514';
    END IF;
  END IF;
  IF NEW.file_id IS NOT NULL THEN
    SELECT * INTO STRICT f FROM asset_files WHERE id=NEW.file_id FOR SHARE;
    SELECT item INTO declaration FROM jsonb_array_elements(slot->'files') item WHERE item->>'fileKey'=NEW.file_key;
    IF f.status<>'AVAILABLE' OR f.product_version_id IS DISTINCT FROM NEW.product_version_id OR
      NOT EXISTS(SELECT 1 FROM product_versions WHERE id=f.product_version_id AND product_id=NEW.product_id AND scope=NEW.scope) OR
      declaration IS NULL OR NOT (declaration->'mimeTypes' ? f.mime_type) OR NEW.snapshot->>'purpose' IS DISTINCT FROM declaration->>'purpose' OR
      f.kind::text IS DISTINCT FROM (CASE WHEN m.definition->>'domain'='experience' THEN 'EXPERIENCE' WHEN slot->>'kind'='video' THEN 'VIDEO' ELSE 'COVER' END) OR
      NEW.snapshot->'file'->>'checksum' IS DISTINCT FROM f.checksum OR NEW.snapshot->'file'->>'mimeType' IS DISTINCT FROM f.mime_type OR
      (NEW.snapshot->'file'->>'byteSize')::int IS DISTINCT FROM f.byte_size OR NEW.snapshot->'file'->>'fileName' IS DISTINCT FROM f.original_name OR
      (NEW.snapshot->>'kind'='file' AND NEW.digest<>f.checksum) THEN
      RAISE EXCEPTION 'Project files must retain actual verified same-project originals or previews' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION machine_upload_binding_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE c machine_credentials; f asset_files; sf skill_reference_files; media_match boolean; original project_original_files; m production_plan_modules;
BEGIN
  SELECT * INTO STRICT c FROM machine_credentials WHERE id=NEW.credential_id AND scope=NEW.scope;
  IF c.revoked_at IS NOT NULL OR c.expires_at<=statement_timestamp() OR NEW.expires_at>c.expires_at THEN RAISE EXCEPTION 'invalid machine upload credential'; END IF;
  IF c.workspace_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM machine_project_workspaces w WHERE w.id=c.workspace_id AND w.scope=c.scope
    AND w.owner_user_id=c.owner_user_id AND w.revoked_at IS NULL AND w.expires_at>statement_timestamp()) THEN RAISE EXCEPTION 'Workspace is no longer authorized'; END IF;
  IF NEW.original_file_id IS NOT NULL THEN
    SELECT * INTO STRICT original FROM project_original_files WHERE id=NEW.original_file_id AND scope=NEW.scope AND owner_user_id=c.owner_user_id;
    SELECT * INTO STRICT m FROM production_plan_modules WHERE id=original.plan_module_id;
    IF NEW.id<>original.id OR c.domain IS DISTINCT FROM m.definition->>'domain' OR NOT('content:write'=ANY(c.permissions)) OR
      NOT machine_has_product(c.id,original.product_id,NEW.scope) OR NEW.expires_at>original.expires_at OR
      NEW.target IS DISTINCT FROM jsonb_build_object('type','project_original','planModuleId',original.plan_module_id::text,
        'outputKey',original.output_key,'fileKey',original.file_key) THEN RAISE EXCEPTION 'Machine project original mismatch' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
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


ALTER TABLE project_review_revisions ADD CONSTRAINT project_review_shape CHECK (
 number>0 AND status IN ('draft','submitted','returned','retained') AND fingerprint ~ '^[0-9a-f]{64}$' AND frontier_fingerprint ~ '^[0-9a-f]{64}$' AND
 jsonb_typeof(selection)='object' AND jsonb_typeof(manifest)='object' AND manifest->>'kind'='project_retention' AND
 manifest->>'schemaVersion'='1' AND jsonb_typeof(issues)='array' AND jsonb_typeof(returns)='array' AND
 (status<>'retained' OR jsonb_array_length(issues)=0));
CREATE TRIGGER project_review_immutable BEFORE UPDATE OR DELETE ON project_review_revisions FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE TRIGGER project_review_record_immutable BEFORE UPDATE OR DELETE ON project_review_records FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE FUNCTION guard_project_review() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE previous project_review_revisions; last_number integer; latest_key uuid; selected jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('project-review:'||NEW.product_id::text,0));
 SELECT * INTO previous FROM project_review_revisions WHERE product_id=NEW.product_id AND scope=NEW.scope ORDER BY number DESC LIMIT 1;
 IF NEW.number<>COALESCE(previous.number,0)+1 OR NEW.previous_revision_id IS DISTINCT FROM previous.id OR
  NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_user_id AND scope=NEW.scope AND role='ADMIN' AND disabled_at IS NULL) OR
  NEW.selection->>'planRevisionId' IS DISTINCT FROM NEW.plan_revision_id::text OR NEW.manifest->'plan'->>'id' IS DISTINCT FROM NEW.plan_revision_id::text OR
  NEW.manifest->'plan'->>'productId' IS DISTINCT FROM NEW.product_id::text THEN RAISE EXCEPTION 'Project review must append one exact authorized revision' USING ERRCODE='23514'; END IF;
 IF NEW.status<>'draft' AND (NEW.fingerprint IS DISTINCT FROM previous.fingerprint OR NEW.frontier_fingerprint IS DISTINCT FROM previous.frontier_fingerprint OR
  NEW.manifest IS DISTINCT FROM previous.manifest OR NEW.selection IS DISTINCT FROM previous.selection OR
  (NEW.status IN ('returned','retained') AND previous.status<>'submitted') OR
  (NEW.status='submitted' AND previous.status NOT IN ('draft','returned'))) THEN
  RAISE EXCEPTION 'Review transition must pin the unchanged fixed selection' USING ERRCODE='23514'; END IF;
 IF NEW.status='returned' AND (jsonb_array_length(NEW.returns)=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.returns) reason WHERE
  NOT EXISTS(SELECT 1 FROM production_plan_modules m WHERE m.id=(reason->>'planModuleId')::uuid AND m.plan_revision_id=NEW.plan_revision_id))) THEN
  RAISE EXCEPTION 'Return must name a module in this plan' USING ERRCODE='23514'; END IF;
 FOR selected IN SELECT value FROM jsonb_array_elements(NEW.selection->'records') LOOP
  IF NOT EXISTS(SELECT 1 FROM project_production_records r JOIN production_plan_modules m ON m.id=r.plan_module_id
    WHERE r.id=(selected->>'recordId')::uuid AND r.product_id=NEW.product_id AND r.scope=NEW.scope AND r.digest=selected->>'digest'
    AND m.plan_revision_id=NEW.plan_revision_id AND EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.manifest->'records') fixed WHERE
      fixed->>'id'=r.id::text AND fixed->>'digest'=r.digest)) THEN RAISE EXCEPTION 'Review selection must retain fixed records and exact digests' USING ERRCODE='23514'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER project_review_guard BEFORE INSERT ON project_review_revisions FOR EACH ROW EXECUTE FUNCTION guard_project_review();
CREATE FUNCTION check_project_review_records() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE key uuid; review project_review_revisions;
BEGIN
 IF TG_TABLE_NAME='project_review_revisions' THEN key:=NEW.id; ELSE key:=NEW.review_id; END IF;
 SELECT * INTO STRICT review FROM project_review_revisions WHERE id=key;
 IF (SELECT count(*) FROM project_review_records WHERE review_id=key)<>jsonb_array_length(review.selection->'records') OR
  EXISTS(SELECT 1 FROM project_review_records link WHERE link.review_id=key AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(review.selection->'records') selected
    WHERE selected->>'recordId'=link.record_id::text)) THEN RAISE EXCEPTION 'Project review record links are incomplete' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER project_review_records_complete AFTER INSERT ON project_review_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_project_review_records();
CREATE CONSTRAINT TRIGGER project_review_links_complete AFTER INSERT ON project_review_records DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_project_review_records();
REVOKE ALL ON project_original_files,project_review_revisions,project_review_records FROM PUBLIC;
COMMIT;
