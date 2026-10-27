BEGIN;
SET LOCAL search_path=orai,pg_temp;

-- AlterTable
ALTER TABLE "production_records" ADD COLUMN     "skill_set_id" UUID,
ADD COLUMN     "skill_versions" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "creative_skill_sets" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "creative_profile_revision_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "digest" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_skill_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_skill_bindings" (
    "id" UUID NOT NULL,
    "skill_set_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "purpose" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "skill_id" UUID NOT NULL,
    "skill_version_id" UUID NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "creative_skill_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "creative_skill_sets_scope_product_id_created_at_idx" ON "creative_skill_sets"("scope", "product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "creative_skill_sets_creative_profile_revision_id_number_key" ON "creative_skill_sets"("creative_profile_revision_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "creative_skill_sets_id_product_id_scope_key" ON "creative_skill_sets"("id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "creative_skill_bindings_skill_set_id_purpose_key" ON "creative_skill_bindings"("skill_set_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "style_skill_versions_id_scope_key" ON "style_skill_versions"("id", "scope");

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_skill_version_id_scope_fkey" FOREIGN KEY ("skill_version_id", "scope") REFERENCES "style_skill_versions"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_skill_set_id_product_id_scope_fkey" FOREIGN KEY ("skill_set_id", "product_id", "scope") REFERENCES "creative_skill_sets"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_skill_sets" ADD CONSTRAINT "creative_skill_sets_creative_profile_revision_id_product_i_fkey" FOREIGN KEY ("creative_profile_revision_id", "product_id", "scope") REFERENCES "creative_profile_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_skill_bindings" ADD CONSTRAINT "creative_skill_bindings_skill_set_id_product_id_scope_fkey" FOREIGN KEY ("skill_set_id", "product_id", "scope") REFERENCES "creative_skill_sets"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_skill_bindings" ADD CONSTRAINT "creative_skill_bindings_skill_version_id_skill_id_scope_fkey" FOREIGN KEY ("skill_version_id", "skill_id", "scope") REFERENCES "style_skill_versions"("id", "skill_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE creative_skill_sets ADD CONSTRAINT skill_set_values CHECK(number>0 AND digest ~ '^[0-9a-f]{64}$' AND length(note) BETWEEN 1 AND 2000);
ALTER TABLE creative_skill_bindings ADD CONSTRAINT skill_binding_purpose CHECK(
 (purpose IN ('assessment_design','report_writing') AND domain='assessment') OR
 (purpose='cover_design' AND domain='cover') OR (purpose='video_production' AND domain='video') OR
 (purpose='copywriting' AND domain='copy'));
CREATE TRIGGER skill_set_immutable BEFORE UPDATE OR DELETE ON creative_skill_sets FOR EACH ROW EXECUTE FUNCTION orai.keep_content_history();
CREATE TRIGGER skill_binding_immutable BEFORE UPDATE OR DELETE ON creative_skill_bindings FOR EACH ROW EXECUTE FUNCTION orai.keep_content_history();
CREATE TRIGGER content_work_serial BEFORE INSERT ON creative_skill_sets FOR EACH ROW EXECUTE FUNCTION orai.serialize_content_work();

CREATE FUNCTION orai.check_skill_set_complete() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
BEGIN
 IF (SELECT count(*) FROM creative_skill_bindings WHERE skill_set_id=NEW.id)<>5 THEN
  RAISE EXCEPTION 'A fixed skill set requires all five purposes' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER skill_set_complete AFTER INSERT ON creative_skill_sets DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION orai.check_skill_set_complete();

CREATE FUNCTION orai.check_skill_binding() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE v style_skill_versions; s creative_skill_sets; m jsonb; form_key text;
BEGIN
 SELECT * INTO v FROM style_skill_versions WHERE id=NEW.skill_version_id AND scope=NEW.scope FOR SHARE;
 SELECT * INTO s FROM creative_skill_sets WHERE id=NEW.skill_set_id AND product_id=NEW.product_id AND scope=NEW.scope;
 SELECT profile->>'experienceForm' INTO form_key FROM creative_profile_revisions WHERE id=s.creative_profile_revision_id;
 m:=v.manifest;
 IF v.id IS NULL OR s.id IS NULL OR
  m->>'domain' IS DISTINCT FROM NEW.domain OR NOT (m->'purposes' ? NEW.purpose) OR NOT (m->'supportedForms' ? form_key) OR
  (v.status::text<>'ACTIVE' AND NOT (v.status::text='ARCHIVED' AND EXISTS(
    SELECT 1 FROM creative_skill_bindings b JOIN creative_skill_sets old_set ON old_set.id=b.skill_set_id
    WHERE old_set.creative_profile_revision_id=s.creative_profile_revision_id AND old_set.number=s.number-1
     AND b.purpose=NEW.purpose AND b.skill_version_id=v.id))) OR
  NEW.snapshot->>'purpose' IS DISTINCT FROM NEW.purpose OR NEW.snapshot->>'domain' IS DISTINCT FROM NEW.domain OR
  NEW.snapshot->'version'->>'id' IS DISTINCT FROM v.id::text OR NEW.snapshot->'version'->>'skillId' IS DISTINCT FROM v.skill_id::text OR
  NEW.snapshot->'version'->>'digest' IS DISTINCT FROM v.digest OR NEW.snapshot->'version'->'manifest' IS DISTINCT FROM m OR
  (NEW.snapshot->'version'->>'number')::integer IS DISTINCT FROM v.number THEN
  RAISE EXCEPTION 'Skill binding is not compatible or fixed to the declared version' USING ERRCODE='23514';
 END IF;
 IF jsonb_typeof(NEW.snapshot->'version'->'files') IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.snapshot->'version'->'files')<>(SELECT count(*) FROM style_skill_attachments WHERE version_id=v.id) OR
   EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.snapshot->'version'->'files') ref WHERE NOT EXISTS(
    SELECT 1 FROM style_skill_attachments a JOIN skill_reference_files f ON f.id=a.file_id
    WHERE a.version_id=v.id AND a.path=ref->>'path' AND f.id::text=ref->'file'->>'id' AND f.status='AVAILABLE'
      AND f.checksum=ref->'file'->>'checksum' AND f.byte_size=(ref->'file'->>'byteSize')::integer
      AND f.mime_type=ref->'file'->>'mimeType' AND f.original_name=ref->'file'->>'fileName')) THEN
  RAISE EXCEPTION 'Skill reference snapshot is incomplete' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER skill_binding_guard BEFORE INSERT ON creative_skill_bindings FOR EACH ROW EXECUTE FUNCTION orai.check_skill_binding();

ALTER TABLE production_records DROP CONSTRAINT production_source_shape;
ALTER TABLE production_records ADD CONSTRAINT production_source_shape CHECK(source IN ('manual','external_ai','mcp') AND
 ((skill_set_id IS NULL AND skill_version_id IS NULL AND skill_versions='[]'::jsonb) OR
  (skill_set_id IS NOT NULL AND skill_version_id IS NOT NULL AND jsonb_typeof(skill_versions)='array')));
CREATE FUNCTION orai.check_production_skills() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE s creative_skill_sets; output_domain text; expected jsonb; primary_key uuid;
BEGIN
 IF NEW.skill_set_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO s FROM creative_skill_sets WHERE id=NEW.skill_set_id AND product_id=NEW.product_id AND scope=NEW.scope;
 SELECT domain INTO output_domain FROM content_revisions WHERE id=NEW.output_revision_id AND product_id=NEW.product_id AND scope=NEW.scope;
 SELECT jsonb_agg(snapshot ORDER BY purpose), (array_agg(skill_version_id ORDER BY purpose))[1] INTO expected,primary_key
  FROM creative_skill_bindings WHERE skill_set_id=s.id AND domain=output_domain;
 IF s.id IS NULL OR s.creative_profile_revision_id IS DISTINCT FROM NEW.creative_profile_revision_id OR
  expected IS NULL OR NEW.skill_versions IS DISTINCT FROM expected OR NEW.skill_version_id IS DISTINCT FROM primary_key THEN
  RAISE EXCEPTION 'Production must use the declared profile and domain skill versions' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER production_skill_guard BEFORE INSERT ON production_records FOR EACH ROW EXECUTE FUNCTION orai.check_production_skills();

CREATE OR REPLACE FUNCTION orai.capture_asset_content_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE revision_key uuid; previous_key uuid;
BEGIN
  revision_key := orai.capture_asset_content(NEW);
  IF TG_OP='UPDATE' AND NEW.authoring IS NOT NULL AND NEW.authoring=OLD.authoring AND NEW.revision<>OLD.revision
    AND NEW.file_id IS NOT DISTINCT FROM OLD.file_id AND NEW.text IS NOT DISTINCT FROM OLD.text AND NEW.variant=OLD.variant THEN
    SELECT id INTO previous_key FROM orai.content_revisions WHERE asset_id=OLD.id AND source_revision=OLD.revision;
    INSERT INTO orai.content_references(id,product_id,scope,target_revision_id,source_revision_id,locator,locator_key,target_locator,target_locator_key,role,mode,source_digest,source_snapshot,used_text,created_at)
      SELECT gen_random_uuid(),product_id,scope,revision_key,source_revision_id,locator,locator_key,target_locator,target_locator_key,role,mode,source_digest,source_snapshot,used_text,now()
      FROM orai.content_references WHERE target_revision_id=previous_key;
    INSERT INTO orai.production_records(id,product_id,scope,output_revision_id,creative_profile_revision_id,actor_user_id,source,batch_key,external_label,skill_version_id,skill_set_id,skill_versions,input_manifest,created_at)
      SELECT gen_random_uuid(),product_id,scope,revision_key,creative_profile_revision_id,actor_user_id,source,batch_key,external_label,skill_version_id,skill_set_id,skill_versions,input_manifest,now()
      FROM orai.production_records WHERE output_revision_id=previous_key;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION orai.capture_version_content_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE revision_key uuid; previous_key uuid;
BEGIN
  revision_key:=orai.capture_version_content(NEW);
  IF TG_OP='UPDATE' AND NEW.configuration=OLD.configuration AND NEW.revision<>OLD.revision THEN
    SELECT id INTO previous_key FROM orai.content_revisions WHERE product_version_id=OLD.id AND asset_id IS NULL AND source_revision=OLD.revision;
    INSERT INTO orai.production_records(id,product_id,scope,output_revision_id,creative_profile_revision_id,actor_user_id,source,batch_key,external_label,skill_version_id,skill_set_id,skill_versions,input_manifest,created_at)
      SELECT gen_random_uuid(),product_id,scope,revision_key,creative_profile_revision_id,actor_user_id,source,batch_key,external_label,skill_version_id,skill_set_id,skill_versions,input_manifest,now()
      FROM orai.production_records WHERE output_revision_id=previous_key;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON creative_skill_sets,creative_skill_bindings FROM PUBLIC;
COMMIT;
