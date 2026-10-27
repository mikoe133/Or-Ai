BEGIN;
SET LOCAL search_path TO orai,pg_temp;
-- CreateTable
CREATE TABLE "project_method_snapshots" (
    "id" UUID NOT NULL,
    "plan_module_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "skill_id" UUID NOT NULL,
    "source_version_id" UUID NOT NULL,
    "source_revision" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "digest" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_method_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_method_references" (
    "id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "file_id" UUID NOT NULL,
    "path" TEXT NOT NULL,

    CONSTRAINT "project_method_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_production_records" (
    "id" UUID NOT NULL,
    "plan_module_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "number" INTEGER NOT NULL,
    "document" JSONB NOT NULL,
    "digest" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_production_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_production_methods" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "plan_module_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,

    CONSTRAINT "project_production_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_production_outputs" (
    "id" UUID NOT NULL,
    "record_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "output_key" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "content_revision_id" UUID,
    "experience_revision_id" UUID,
    "file_id" UUID,
    "product_version_id" UUID,
    "snapshot" JSONB NOT NULL,
    "digest" TEXT NOT NULL,

    CONSTRAINT "project_production_outputs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_method_snapshots_scope_product_id_created_at_idx" ON "project_method_snapshots"("scope", "product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_method_snapshots_plan_module_id_purpose_digest_key" ON "project_method_snapshots"("plan_module_id", "purpose", "digest");

-- CreateIndex
CREATE UNIQUE INDEX "project_method_snapshots_id_plan_module_id_product_id_scope_key" ON "project_method_snapshots"("id", "plan_module_id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "project_method_snapshots_id_skill_id_scope_key" ON "project_method_snapshots"("id", "skill_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "project_method_references_snapshot_id_path_key" ON "project_method_references"("snapshot_id", "path");

-- CreateIndex
CREATE INDEX "project_production_records_scope_product_id_created_at_idx" ON "project_production_records"("scope", "product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_production_records_plan_module_id_number_key" ON "project_production_records"("plan_module_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "project_production_records_id_plan_module_id_product_id_sco_key" ON "project_production_records"("id", "plan_module_id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "project_production_records_id_product_id_scope_key" ON "project_production_records"("id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "project_production_methods_record_id_snapshot_id_key" ON "project_production_methods"("record_id", "snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_production_outputs_record_id_output_key_file_key_key" ON "project_production_outputs"("record_id", "output_key", "file_key");

-- CreateIndex
CREATE UNIQUE INDEX "experience_authoring_revisions_id_product_id_scope_key" ON "experience_authoring_revisions"("id", "product_id", "scope");

-- AddForeignKey
ALTER TABLE "project_method_snapshots" ADD CONSTRAINT "project_method_snapshots_plan_module_id_product_id_scope_fkey" FOREIGN KEY ("plan_module_id", "product_id", "scope") REFERENCES "production_plan_modules"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_method_snapshots" ADD CONSTRAINT "project_method_snapshots_source_version_id_skill_id_scope_fkey" FOREIGN KEY ("source_version_id", "skill_id", "scope") REFERENCES "style_skill_versions"("id", "skill_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_method_snapshots" ADD CONSTRAINT "project_method_snapshots_actor_user_id_scope_fkey" FOREIGN KEY ("actor_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_method_references" ADD CONSTRAINT "project_method_references_snapshot_id_skill_id_scope_fkey" FOREIGN KEY ("snapshot_id", "skill_id", "scope") REFERENCES "project_method_snapshots"("id", "skill_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_method_references" ADD CONSTRAINT "project_method_references_file_id_skill_id_scope_fkey" FOREIGN KEY ("file_id", "skill_id", "scope") REFERENCES "skill_reference_files"("id", "skill_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_production_records" ADD CONSTRAINT "project_production_records_plan_module_id_product_id_scope_fkey" FOREIGN KEY ("plan_module_id", "product_id", "scope") REFERENCES "production_plan_modules"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_production_records" ADD CONSTRAINT "project_production_records_actor_user_id_scope_fkey" FOREIGN KEY ("actor_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_production_methods" ADD CONSTRAINT "project_production_methods_record_id_plan_module_id_produc_fkey" FOREIGN KEY ("record_id", "plan_module_id", "product_id", "scope") REFERENCES "project_production_records"("id", "plan_module_id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_production_methods" ADD CONSTRAINT "project_production_methods_snapshot_id_plan_module_id_prod_fkey" FOREIGN KEY ("snapshot_id", "plan_module_id", "product_id", "scope") REFERENCES "project_method_snapshots"("id", "plan_module_id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_production_outputs" ADD CONSTRAINT "project_production_outputs_record_id_product_id_scope_fkey" FOREIGN KEY ("record_id", "product_id", "scope") REFERENCES "project_production_records"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_production_outputs" ADD CONSTRAINT "project_production_outputs_content_revision_id_product_id__fkey" FOREIGN KEY ("content_revision_id", "product_id", "scope") REFERENCES "content_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_production_outputs" ADD CONSTRAINT "project_production_outputs_experience_revision_id_product__fkey" FOREIGN KEY ("experience_revision_id", "product_id", "scope") REFERENCES "experience_authoring_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_production_outputs" ADD CONSTRAINT "project_production_outputs_file_id_product_version_id_scop_fkey" FOREIGN KEY ("file_id", "product_version_id", "scope") REFERENCES "asset_files"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Immutable project methods are independent of the mutable library draft and its lifecycle.
ALTER TABLE project_method_snapshots ADD CONSTRAINT project_method_shape CHECK (
  source_revision>=0 AND digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(snapshot)='object' AND
  snapshot ?& ARRAY['id','skillId','number','digest','manifest','files'] AND jsonb_typeof(snapshot->'files')='array');
ALTER TABLE project_production_records ADD CONSTRAINT project_production_shape CHECK (
  number>0 AND digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(document)='object' AND
  document ?& ARRAY['external','methods','inputs','outputs'] AND jsonb_typeof(document->'external')='object' AND
  jsonb_typeof(document->'methods')='array' AND jsonb_array_length(document->'methods') BETWEEN 1 AND 12 AND
  jsonb_typeof(document->'inputs')='array' AND jsonb_array_length(document->'inputs')<=40 AND
  jsonb_typeof(document->'outputs')='array' AND jsonb_array_length(document->'outputs') BETWEEN 1 AND 32);
ALTER TABLE project_production_outputs ADD CONSTRAINT project_output_shape CHECK (
  digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(snapshot)='object' AND
  ((snapshot->>'kind'='content_revision' AND content_revision_id IS NOT NULL AND experience_revision_id IS NULL) OR
   (snapshot->>'kind'='experience_revision' AND experience_revision_id IS NOT NULL AND content_revision_id IS NULL AND file_id IS NULL) OR
   (snapshot->>'kind'='file' AND file_id IS NOT NULL AND content_revision_id IS NULL AND experience_revision_id IS NULL)) AND
  (file_id IS NULL OR product_version_id IS NOT NULL));

CREATE TRIGGER project_method_immutable BEFORE UPDATE OR DELETE ON project_method_snapshots FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE TRIGGER project_method_reference_immutable BEFORE UPDATE OR DELETE ON project_method_references FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE TRIGGER project_production_immutable BEFORE UPDATE OR DELETE ON project_production_records FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE TRIGGER project_production_method_immutable BEFORE UPDATE OR DELETE ON project_production_methods FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE TRIGGER project_production_output_immutable BEFORE UPDATE OR DELETE ON project_production_outputs FOR EACH ROW EXECUTE FUNCTION keep_content_history();

CREATE FUNCTION guard_project_method() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE v style_skill_versions; m production_plan_modules;
BEGIN
  SELECT * INTO STRICT v FROM style_skill_versions WHERE id=NEW.source_version_id FOR SHARE;
  SELECT * INTO STRICT m FROM production_plan_modules WHERE id=NEW.plan_module_id;
  IF v.status='ARCHIVED' OR NEW.source_revision<>v.revision OR NEW.snapshot->'manifest' IS DISTINCT FROM v.manifest OR
    NEW.snapshot->>'digest' IS DISTINCT FROM v.digest OR (NEW.snapshot->>'id')::uuid IS DISTINCT FROM v.id OR
    (NEW.snapshot->>'skillId')::uuid IS DISTINCT FROM v.skill_id OR (NEW.snapshot->>'number')::int IS DISTINCT FROM v.number OR
    v.manifest->>'domain' IS DISTINCT FROM m.definition->>'domain' OR NOT (v.manifest->'purposes' ? NEW.purpose) OR
    NOT (m.definition->'methodPurposes' ? NEW.purpose) OR NOT (v.manifest->'supportedForms' ? (m.definition->'target'->>'form')) OR
    jsonb_array_length(NEW.snapshot->'files')<>jsonb_array_length(v.manifest->'references') OR
    NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_user_id AND scope=NEW.scope AND role='ADMIN' AND disabled_at IS NULL) THEN
    RAISE EXCEPTION 'Project method must capture the exact compatible source revision' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER project_method_guard BEFORE INSERT ON project_method_snapshots FOR EACH ROW EXECUTE FUNCTION guard_project_method();

CREATE FUNCTION guard_project_method_reference() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE s project_method_snapshots; f skill_reference_files;
BEGIN
  SELECT * INTO STRICT s FROM project_method_snapshots WHERE id=NEW.snapshot_id;
  SELECT * INTO STRICT f FROM skill_reference_files WHERE id=NEW.file_id FOR SHARE;
  IF f.status<>'AVAILABLE' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s.snapshot->'manifest'->'references') r
    WHERE r->>'path'=NEW.path AND (r->>'fileId')::uuid=NEW.file_id) OR
    NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s.snapshot->'files') r WHERE r->>'path'=NEW.path AND
      (r->'file'->>'id')::uuid=NEW.file_id AND r->'file'->>'checksum'=f.checksum AND
      r->'file'->>'mimeType'=f.mime_type AND (r->'file'->>'byteSize')::int=f.byte_size AND r->'file'->>'fileName'=f.original_name) THEN
    RAISE EXCEPTION 'Project method reference must match verified captured bytes' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER project_method_reference_guard BEFORE INSERT ON project_method_references FOR EACH ROW EXECUTE FUNCTION guard_project_method_reference();
CREATE FUNCTION check_project_method_complete() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE key uuid; expected integer; actual integer;
BEGIN
  IF TG_TABLE_NAME='project_method_snapshots' THEN key:=NEW.id; ELSE key:=NEW.snapshot_id; END IF;
  SELECT jsonb_array_length(snapshot->'files') INTO expected FROM project_method_snapshots WHERE id=key;
  SELECT count(*) INTO actual FROM project_method_references WHERE snapshot_id=key;
  IF actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Project method references are incomplete' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER project_method_complete AFTER INSERT ON project_method_snapshots DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_project_method_complete();
CREATE CONSTRAINT TRIGGER project_method_reference_complete AFTER INSERT ON project_method_references DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_project_method_complete();

CREATE FUNCTION guard_project_production() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE m production_plan_modules; last_number integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('project-production:'||NEW.plan_module_id::text,0));
  SELECT * INTO STRICT m FROM production_plan_modules WHERE id=NEW.plan_module_id;
  SELECT COALESCE(max(number),0) INTO last_number FROM project_production_records WHERE plan_module_id=NEW.plan_module_id;
  IF NEW.number<>last_number+1 OR
    NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_user_id AND scope=NEW.scope AND role='ADMIN' AND disabled_at IS NULL) THEN
    RAISE EXCEPTION 'Project production must append using a trusted administrator' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.document->'inputs') input
    WHERE NOT EXISTS(SELECT 1 FROM project_production_records r JOIN production_plan_modules source ON source.id=r.plan_module_id
      WHERE r.id=(input->>'recordId')::uuid AND r.product_id=NEW.product_id AND r.scope=NEW.scope AND
        r.digest=input->>'digest' AND r.plan_module_id=(input->>'planModuleId')::uuid AND source.plan_revision_id=m.plan_revision_id AND
        m.definition->'dependsOn' ? (source.definition->>'moduleKey'))) THEN
    RAISE EXCEPTION 'Project inputs must reference fixed records of declared dependencies' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER project_production_guard BEFORE INSERT ON project_production_records FOR EACH ROW EXECUTE FUNCTION guard_project_production();

CREATE FUNCTION guard_project_production_method() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE r project_production_records; s project_method_snapshots;
BEGIN
  SELECT * INTO STRICT r FROM project_production_records WHERE id=NEW.record_id;
  SELECT * INTO STRICT s FROM project_method_snapshots WHERE id=NEW.snapshot_id;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(r.document->'methods') method WHERE
    (method->>'snapshotId')::uuid=s.id AND method->>'digest'=s.digest AND method->>'purpose'=s.purpose) THEN
    RAISE EXCEPTION 'Selected method must match its immutable source declaration' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER project_production_method_guard BEFORE INSERT ON project_production_methods FOR EACH ROW EXECUTE FUNCTION guard_project_production_method();

CREATE FUNCTION guard_project_production_output() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE r project_production_records; m production_plan_modules; p production_plan_revisions;
  slot jsonb; declaration jsonb; c content_revisions; e experience_authoring_revisions; f asset_files;
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
    (NEW.snapshot->>'fileId')::uuid IS DISTINCT FROM NEW.file_id THEN
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
CREATE TRIGGER project_production_output_guard BEFORE INSERT ON project_production_outputs FOR EACH ROW EXECUTE FUNCTION guard_project_production_output();

CREATE FUNCTION check_project_production_complete() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE key uuid; r project_production_records; m production_plan_modules;
BEGIN
  IF TG_TABLE_NAME='project_production_records' THEN key:=NEW.id; ELSE key:=NEW.record_id; END IF;
  SELECT * INTO STRICT r FROM project_production_records WHERE id=key;
  SELECT * INTO STRICT m FROM production_plan_modules WHERE id=r.plan_module_id;
  IF (SELECT count(*) FROM project_production_methods WHERE record_id=key)<>jsonb_array_length(r.document->'methods') OR
    (SELECT count(*) FROM project_production_outputs WHERE record_id=key)<>jsonb_array_length(r.document->'outputs') OR
    EXISTS(SELECT 1 FROM jsonb_array_elements_text(m.definition->'methodPurposes') purpose WHERE
      NOT EXISTS(SELECT 1 FROM project_production_methods pm JOIN project_method_snapshots s ON s.id=pm.snapshot_id
        WHERE pm.record_id=key AND s.purpose=purpose)) THEN
    RAISE EXCEPTION 'Project production requires all selected methods and declared saved outputs' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER project_production_complete AFTER INSERT ON project_production_records DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_project_production_complete();
CREATE CONSTRAINT TRIGGER project_production_methods_complete AFTER INSERT ON project_production_methods DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_project_production_complete();
CREATE CONSTRAINT TRIGGER project_production_outputs_complete AFTER INSERT ON project_production_outputs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_project_production_complete();

-- Keep the existing file lifecycle checks and protect originals referenced only by a project record.
CREATE FUNCTION protect_project_original_file() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
BEGIN
  IF NEW.status='DELETING' AND EXISTS(SELECT 1 FROM project_production_outputs WHERE file_id=OLD.id) THEN
    RAISE EXCEPTION 'Project originals are protected history' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER project_original_file_protected BEFORE UPDATE ON asset_files FOR EACH ROW EXECUTE FUNCTION protect_project_original_file();
REVOKE ALL ON project_method_snapshots,project_method_references,project_production_records,project_production_methods,project_production_outputs FROM PUBLIC;
COMMIT;
