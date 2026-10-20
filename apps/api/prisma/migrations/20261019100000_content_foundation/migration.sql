-- Additive schema migration. Reverting the application leaves history intact;
-- removing these tables is intentionally not an automatic rollback operation.
BEGIN;
SET LOCAL search_path = orai, public;

-- AlterTable
ALTER TABLE "campaign_assets" ADD COLUMN     "authoring" JSONB;

-- CreateTable
CREATE TABLE "creative_profile_revisions" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "number" INTEGER NOT NULL,
    "profile" JSONB NOT NULL,
    "digest" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_profile_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_revisions" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_version_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "asset_id" UUID,
    "domain" TEXT NOT NULL,
    "source_revision" INTEGER NOT NULL,
    "creative_profile_revision_id" UUID,
    "snapshot" JSONB NOT NULL,
    "digest" TEXT NOT NULL,
    "file_id" UUID,
    "preview_file_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_references" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "target_revision_id" UUID NOT NULL,
    "source_revision_id" UUID NOT NULL,
    "locator" JSONB NOT NULL,
    "locator_key" TEXT NOT NULL,
    "target_locator" JSONB NOT NULL,
    "target_locator_key" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "source_digest" TEXT NOT NULL,
    "source_snapshot" JSONB NOT NULL,
    "used_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_records" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "output_revision_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "source" TEXT NOT NULL,
    "batch_key" TEXT,
    "external_label" TEXT,
    "skill_version_id" UUID,
    "input_manifest" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "creative_profile_revisions_scope_product_id_created_at_idx" ON "creative_profile_revisions"("scope", "product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "creative_profile_revisions_product_id_number_key" ON "creative_profile_revisions"("product_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "creative_profile_revisions_id_product_id_scope_key" ON "creative_profile_revisions"("id", "product_id", "scope");

-- CreateIndex
CREATE INDEX "content_revisions_product_version_id_domain_source_revision_idx" ON "content_revisions"("product_version_id", "domain", "source_revision");

-- CreateIndex
CREATE INDEX "content_revisions_scope_product_id_created_at_idx" ON "content_revisions"("scope", "product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_revisions_id_product_id_scope_key" ON "content_revisions"("id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "content_revisions_asset_id_source_revision_key" ON "content_revisions"("asset_id", "source_revision");

-- CreateIndex
CREATE INDEX "content_references_source_revision_id_idx" ON "content_references"("source_revision_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_reference_position_key" ON "content_references"("target_revision_id", "source_revision_id", "locator_key", "target_locator_key", "role");

-- CreateIndex
CREATE UNIQUE INDEX "production_records_output_revision_id_key" ON "production_records"("output_revision_id");

-- CreateIndex
CREATE INDEX "production_records_scope_product_id_batch_key_created_at_idx" ON "production_records"("scope", "product_id", "batch_key", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "production_records_output_revision_id_product_id_scope_key" ON "production_records"("output_revision_id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_assets_id_product_version_id_scope_key" ON "campaign_assets"("id", "product_version_id", "scope");

-- AddForeignKey
ALTER TABLE "creative_profile_revisions" ADD CONSTRAINT "creative_profile_revisions_product_id_scope_fkey" FOREIGN KEY ("product_id", "scope") REFERENCES "products"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_product_version_id_product_id_scope_fkey" FOREIGN KEY ("product_version_id", "product_id", "scope") REFERENCES "product_versions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_asset_id_product_version_id_scope_fkey" FOREIGN KEY ("asset_id", "product_version_id", "scope") REFERENCES "campaign_assets"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revision_profile_scope_fkey" FOREIGN KEY ("creative_profile_revision_id", "product_id", "scope") REFERENCES "creative_profile_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_file_id_product_version_id_scope_fkey" FOREIGN KEY ("file_id", "product_version_id", "scope") REFERENCES "asset_files"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_revisions" ADD CONSTRAINT "content_revisions_preview_file_id_product_version_id_scope_fkey" FOREIGN KEY ("preview_file_id", "product_version_id", "scope") REFERENCES "asset_files"("id", "product_version_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_references" ADD CONSTRAINT "content_references_target_revision_id_product_id_scope_fkey" FOREIGN KEY ("target_revision_id", "product_id", "scope") REFERENCES "content_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_references" ADD CONSTRAINT "content_references_source_revision_id_product_id_scope_fkey" FOREIGN KEY ("source_revision_id", "product_id", "scope") REFERENCES "content_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_output_revision_id_product_id_scope_fkey" FOREIGN KEY ("output_revision_id", "product_id", "scope") REFERENCES "content_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_actor_user_id_scope_fkey" FOREIGN KEY ("actor_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX content_assessment_source_revision_key ON content_revisions(product_version_id, source_revision) WHERE asset_id IS NULL;
ALTER TABLE production_records ADD COLUMN creative_profile_revision_id uuid;
ALTER TABLE production_records ADD CONSTRAINT production_profile_scope_fkey FOREIGN KEY (creative_profile_revision_id,product_id,scope) REFERENCES creative_profile_revisions(id,product_id,scope) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE creative_profile_revisions ADD CONSTRAINT creative_profile_shape CHECK (number > 0 AND jsonb_typeof(profile)='object' AND digest ~ '^[0-9a-f]{64}$');
ALTER TABLE content_revisions ADD CONSTRAINT content_revision_shape CHECK (
  source_revision >= 0 AND digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(snapshot)='object' AND
  ((domain='assessment' AND asset_id IS NULL AND file_id IS NULL AND preview_file_id IS NULL) OR
   (domain IN ('cover','video','copy') AND asset_id IS NOT NULL)));
ALTER TABLE content_references ADD CONSTRAINT content_reference_shape CHECK (
  target_revision_id <> source_revision_id AND mode IN ('exact','adapted') AND
  role IN ('question','hook','cta','voiceover','subtitle','visual','reference') AND
  source_digest ~ '^[0-9a-f]{64}$' AND length(used_text) BETWEEN 1 AND 20000);
ALTER TABLE production_records ADD CONSTRAINT production_source_shape CHECK (source IN ('manual','external_ai','mcp') AND skill_version_id IS NULL);

CREATE FUNCTION orai.keep_content_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Content history is immutable; create a new revision' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER profile_history_immutable BEFORE UPDATE OR DELETE ON creative_profile_revisions FOR EACH ROW EXECUTE FUNCTION orai.keep_content_history();
CREATE TRIGGER content_history_immutable BEFORE UPDATE OR DELETE ON content_revisions FOR EACH ROW EXECUTE FUNCTION orai.keep_content_history();
CREATE TRIGGER reference_history_immutable BEFORE UPDATE OR DELETE ON content_references FOR EACH ROW EXECUTE FUNCTION orai.keep_content_history();
CREATE TRIGGER production_history_immutable BEFORE UPDATE OR DELETE ON production_records FOR EACH ROW EXECUTE FUNCTION orai.keep_content_history();

CREATE FUNCTION orai.validate_content_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_row orai.content_revisions; target_row orai.content_revisions; cyclic boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('content-refs:' || NEW.product_id::text,0));
  SELECT * INTO source_row FROM orai.content_revisions WHERE id=NEW.source_revision_id;
  SELECT * INTO target_row FROM orai.content_revisions WHERE id=NEW.target_revision_id;
  IF source_row.digest IS DISTINCT FROM NEW.source_digest OR
     (source_row.creative_profile_revision_id IS NOT NULL AND source_row.creative_profile_revision_id IS DISTINCT FROM target_row.creative_profile_revision_id) THEN
    RAISE EXCEPTION 'Reference digest or creative profile mismatch' USING ERRCODE='23514';
  END IF;
  WITH RECURSIVE dependency(id) AS (
    SELECT NEW.source_revision_id UNION
    SELECT r.source_revision_id FROM orai.content_references r JOIN dependency d ON r.target_revision_id=d.id
  ) SELECT EXISTS(SELECT 1 FROM dependency WHERE id=NEW.target_revision_id) INTO cyclic;
  IF cyclic THEN RAISE EXCEPTION 'Cyclic content reference' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER content_reference_valid BEFORE INSERT ON content_references FOR EACH ROW EXECUTE FUNCTION orai.validate_content_reference();

-- Database capture also covers legacy catalog/assets APIs and maintenance CLI.
CREATE FUNCTION orai.capture_version_content(v orai.product_versions) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE payload jsonb; found_id uuid; saved jsonb;
BEGIN
  payload := jsonb_build_object('schemaVersion',1,'kind','assessment','versionNumber',v.number,'status',lower(v.status::text),'configuration',v.configuration);
  SELECT id,snapshot INTO found_id,saved FROM orai.content_revisions WHERE product_version_id=v.id AND asset_id IS NULL AND source_revision=v.revision;
  IF found_id IS NOT NULL THEN
    IF saved IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Version changes require a new revision' USING ERRCODE='23514'; END IF;
    RETURN found_id;
  END IF;
  found_id := gen_random_uuid();
  INSERT INTO orai.content_revisions(id,product_id,product_version_id,scope,domain,source_revision,snapshot,digest,created_at)
    VALUES(found_id,v.product_id,v.id,v.scope,'assessment',v.revision,payload,encode(sha256(convert_to(payload::text,'UTF8')),'hex'),now());
  RETURN found_id;
END;
$$;
CREATE FUNCTION orai.capture_asset_content(a orai.campaign_assets) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE payload jsonb; found_id uuid; saved jsonb; product_key uuid; profile_key uuid; preview_key uuid; domain_key text; authored_text text;
BEGIN
  SELECT product_id INTO product_key FROM orai.product_versions WHERE id=a.product_version_id AND scope=a.scope;
  IF a.authoring IS NOT NULL THEN
    IF a.authoring#>>'{content,kind}' IS DISTINCT FROM lower(a.kind::text) THEN
      RAISE EXCEPTION 'Structured content kind mismatch' USING ERRCODE='23514';
    END IF;
    IF a.kind IN ('COPY','SCRIPT') THEN
      SELECT string_agg(value->>'text',E'\n' ORDER BY ordinal) INTO authored_text
        FROM jsonb_array_elements(CASE WHEN a.kind='COPY' THEN a.authoring#>'{content,blocks}' ELSE a.authoring#>'{content,scenes}' END) WITH ORDINALITY AS parts(value,ordinal);
      IF a.text IS DISTINCT FROM authored_text THEN
        RAISE EXCEPTION 'Structured text must be edited with its content revision' USING ERRCODE='23514';
      END IF;
    END IF;
  END IF;
  profile_key := (a.authoring->>'creativeProfileRevisionId')::uuid;
  preview_key := (a.authoring#>>'{media,previewFileId}')::uuid;
  domain_key := CASE WHEN a.kind='SCRIPT' THEN 'video' ELSE lower(a.kind::text) END;
  payload := jsonb_build_object('schemaVersion',1,'kind',lower(a.kind::text),'platform',lower(a.platform::text),
    'variant',a.variant,'status',lower(a.status::text),'text',a.text,'fileId',a.file_id,'authoring',a.authoring);
  SELECT id,snapshot INTO found_id,saved FROM orai.content_revisions WHERE asset_id=a.id AND source_revision=a.revision;
  IF found_id IS NOT NULL THEN
    IF saved IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Asset changes require a new revision' USING ERRCODE='23514'; END IF;
    RETURN found_id;
  END IF;
  -- Preserve legacy file references even when their bytes are unavailable.
  -- New writes validate availability in the shared service; read DTOs report
  -- unavailable files honestly, and historical references still prevent deletion.
  found_id := gen_random_uuid();
  INSERT INTO orai.content_revisions(id,product_id,product_version_id,scope,asset_id,domain,source_revision,creative_profile_revision_id,snapshot,digest,file_id,preview_file_id,created_at)
    VALUES(found_id,product_key,a.product_version_id,a.scope,a.id,domain_key,a.revision,profile_key,payload,
      encode(sha256(convert_to(payload::text,'UTF8')),'hex'),a.file_id,preview_key,now());
  RETURN found_id;
END;
$$;
CREATE FUNCTION orai.capture_version_content_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM orai.capture_version_content(NEW); RETURN NEW; END;
$$;
CREATE TRIGGER version_content_capture AFTER INSERT OR UPDATE ON product_versions FOR EACH ROW EXECUTE FUNCTION orai.capture_version_content_trigger();
CREATE FUNCTION orai.capture_asset_content_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision_key uuid; previous_key uuid;
BEGIN
  revision_key := orai.capture_asset_content(NEW);
  IF TG_OP='UPDATE' AND NEW.authoring IS NOT NULL AND NEW.authoring=OLD.authoring AND NEW.revision<>OLD.revision
    AND NEW.file_id IS NOT DISTINCT FROM OLD.file_id AND NEW.text IS NOT DISTINCT FROM OLD.text AND NEW.variant=OLD.variant THEN
    SELECT id INTO previous_key FROM orai.content_revisions WHERE asset_id=OLD.id AND source_revision=OLD.revision;
    INSERT INTO orai.content_references(id,product_id,scope,target_revision_id,source_revision_id,locator,locator_key,target_locator,target_locator_key,role,mode,source_digest,source_snapshot,used_text,created_at)
      SELECT gen_random_uuid(),product_id,scope,revision_key,source_revision_id,locator,locator_key,target_locator,target_locator_key,role,mode,source_digest,source_snapshot,used_text,now()
      FROM orai.content_references WHERE target_revision_id=previous_key;
    INSERT INTO orai.production_records(id,product_id,scope,output_revision_id,creative_profile_revision_id,actor_user_id,source,batch_key,external_label,skill_version_id,input_manifest,created_at)
      SELECT gen_random_uuid(),product_id,scope,revision_key,creative_profile_revision_id,actor_user_id,source,batch_key,external_label,skill_version_id,input_manifest,now()
      FROM orai.production_records WHERE output_revision_id=previous_key;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER asset_content_capture AFTER INSERT OR UPDATE ON campaign_assets FOR EACH ROW EXECUTE FUNCTION orai.capture_asset_content_trigger();

COMMIT;
