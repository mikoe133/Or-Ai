-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AssetFileStatus" ADD VALUE 'DELETING';
ALTER TYPE "AssetFileStatus" ADD VALUE 'DELETED';

-- CreateTable
CREATE TABLE "content_review_records" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "revision_id" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "impact" JSONB NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_review_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_packages" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "creative_profile_revision_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "note" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_package_items" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "revision_id" UUID NOT NULL,

    CONSTRAINT "content_package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_cleanup_plans" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "digest" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "results" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'prepared',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_cleanup_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_review_records_revision_id_fingerprint_key" ON "content_review_records"("revision_id", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "content_packages_product_id_number_key" ON "content_packages"("product_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "content_packages_id_product_id_scope_key" ON "content_packages"("id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "content_package_items_package_id_revision_id_key" ON "content_package_items"("package_id", "revision_id");

-- CreateIndex
CREATE INDEX "file_cleanup_plans_scope_product_id_created_at_idx" ON "file_cleanup_plans"("scope", "product_id", "created_at");

-- AddForeignKey
ALTER TABLE "content_review_records" ADD CONSTRAINT "content_review_records_revision_id_product_id_scope_fkey" FOREIGN KEY ("revision_id", "product_id", "scope") REFERENCES "content_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_review_records" ADD CONSTRAINT "content_review_records_actor_user_id_scope_fkey" FOREIGN KEY ("actor_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_packages" ADD CONSTRAINT "content_packages_creative_profile_revision_id_product_id_s_fkey" FOREIGN KEY ("creative_profile_revision_id", "product_id", "scope") REFERENCES "creative_profile_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_packages" ADD CONSTRAINT "content_packages_actor_user_id_scope_fkey" FOREIGN KEY ("actor_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_package_items" ADD CONSTRAINT "content_package_items_package_id_product_id_scope_fkey" FOREIGN KEY ("package_id", "product_id", "scope") REFERENCES "content_packages"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_package_items" ADD CONSTRAINT "content_package_items_revision_id_product_id_scope_fkey" FOREIGN KEY ("revision_id", "product_id", "scope") REFERENCES "content_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_cleanup_plans" ADD CONSTRAINT "file_cleanup_plans_actor_user_id_scope_fkey" FOREIGN KEY ("actor_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_cleanup_plans" ADD CONSTRAINT "file_cleanup_plans_product_id_scope_fkey" FOREIGN KEY ("product_id", "scope") REFERENCES "products"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;



-- No historical contents are rewritten. Disable new entrypoints to roll back
-- application behavior; preserve these records and repair with forward DDL.
ALTER TABLE orai.content_review_records ADD CONSTRAINT content_review_shape CHECK (fingerprint ~ '^[0-9a-f]{64}$' AND length(note) BETWEEN 1 AND 2000);
ALTER TABLE orai.content_packages ADD CONSTRAINT content_package_shape CHECK (number>0 AND digest ~ '^[0-9a-f]{64}$' AND length(note) BETWEEN 1 AND 2000 AND jsonb_typeof(manifest)='object');
ALTER TABLE orai.file_cleanup_plans ADD CONSTRAINT cleanup_plan_shape CHECK (status IN ('prepared','running','complete') AND digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(files)='array' AND jsonb_typeof(results)='array');
CREATE TRIGGER content_review_immutable BEFORE UPDATE OR DELETE ON orai.content_review_records FOR EACH ROW EXECUTE FUNCTION orai.keep_content_history();
CREATE TRIGGER content_package_immutable BEFORE UPDATE OR DELETE ON orai.content_packages FOR EACH ROW EXECUTE FUNCTION orai.keep_content_history();
CREATE TRIGGER content_package_item_immutable BEFORE UPDATE OR DELETE ON orai.content_package_items FOR EACH ROW EXECUTE FUNCTION orai.keep_content_history();

-- All content writers, including legacy API/CLI paths, serialize with adoption
-- and review. Reads remain ordinary MVCC reads under this product lock.
CREATE FUNCTION orai.serialize_content_work() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE product_key uuid;
BEGIN
  IF TG_TABLE_NAME='products' THEN product_key:=NEW.id;
  ELSIF TG_TABLE_NAME='campaign_assets' THEN
    SELECT product_id INTO product_key FROM orai.product_versions WHERE id=NEW.product_version_id;
  ELSE product_key:=NEW.product_id;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('content-work:'||NEW.scope::text||':'||product_key::text,0));
  RETURN NEW;
END $$;
CREATE TRIGGER content_work_serial BEFORE INSERT OR UPDATE ON orai.products FOR EACH ROW EXECUTE FUNCTION orai.serialize_content_work();
CREATE TRIGGER content_work_serial BEFORE INSERT OR UPDATE ON orai.product_versions FOR EACH ROW EXECUTE FUNCTION orai.serialize_content_work();
CREATE TRIGGER content_work_serial BEFORE INSERT OR UPDATE ON orai.campaign_assets FOR EACH ROW EXECUTE FUNCTION orai.serialize_content_work();
CREATE TRIGGER content_work_serial BEFORE INSERT ON orai.creative_profile_revisions FOR EACH ROW EXECUTE FUNCTION orai.serialize_content_work();
CREATE TRIGGER content_work_serial BEFORE INSERT ON orai.production_records FOR EACH ROW EXECUTE FUNCTION orai.serialize_content_work();
CREATE TRIGGER content_work_serial BEFORE INSERT ON orai.content_references FOR EACH ROW EXECUTE FUNCTION orai.serialize_content_work();

-- The file row lock closes the race between a new history reference and cleanup.
CREATE FUNCTION orai.lock_content_files() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE key uuid; state text;
BEGIN
  FOREACH key IN ARRAY ARRAY[NEW.file_id,NEW.preview_file_id] LOOP
    IF key IS NOT NULL THEN
      SELECT status::text INTO state FROM orai.asset_files WHERE id=key FOR SHARE;
      IF state IS DISTINCT FROM 'AVAILABLE' THEN RAISE EXCEPTION 'Content file is not available' USING ERRCODE='23514'; END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER content_file_lock BEFORE INSERT ON orai.content_revisions FOR EACH ROW EXECUTE FUNCTION orai.lock_content_files();
CREATE OR REPLACE FUNCTION orai.guard_available_file() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status::text IN ('AVAILABLE','DELETING','DELETED') AND
    (to_jsonb(NEW)-'updated_at'-'status') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at'-'status') THEN
    RAISE EXCEPTION 'Verified file contents are immutable';
  END IF;
  IF NEW.status::text='DELETING' AND OLD.status::text<>'DELETING' THEN
    IF OLD.status::text='DELETED' OR OLD.expires_at>now() OR
      EXISTS(SELECT 1 FROM orai.campaign_assets WHERE file_id=OLD.id) OR
      EXISTS(SELECT 1 FROM orai.content_revisions WHERE file_id=OLD.id OR preview_file_id=OLD.id) OR
      (to_jsonb(NEW)-'updated_at'-'status') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at'-'status') THEN
      RAISE EXCEPTION 'Referenced or active files are protected' USING ERRCODE='23514';
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND
    (OLD.status::text='AVAILABLE' OR OLD.status::text='DELETED' OR
      (OLD.status::text='DELETING' AND NEW.status::text<>'DELETED') OR NEW.status::text='DELETED') THEN
    IF NOT (OLD.status::text='DELETING' AND NEW.status::text='DELETED') THEN
      RAISE EXCEPTION 'Verified file lifecycle is immutable' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE FUNCTION orai.guard_cleanup_plan() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW)-'status'-'results') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'results') OR
    OLD.status='complete' OR (NEW.status<>OLD.status AND NOT ((OLD.status='prepared' AND NEW.status='running') OR (OLD.status='running' AND NEW.status='complete'))) THEN
    RAISE EXCEPTION 'Cleanup plan intent and completed results are immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cleanup_plan_guard BEFORE UPDATE ON orai.file_cleanup_plans FOR EACH ROW EXECUTE FUNCTION orai.guard_cleanup_plan();

-- A review/publish transition retains the fixed production source; editing the
-- configuration creates a new authoring revision which must declare its source.
CREATE OR REPLACE FUNCTION orai.capture_version_content_trigger() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision_key uuid; previous_key uuid;
BEGIN
  revision_key:=orai.capture_version_content(NEW);
  IF TG_OP='UPDATE' AND NEW.configuration=OLD.configuration AND NEW.revision<>OLD.revision THEN
    SELECT id INTO previous_key FROM orai.content_revisions WHERE product_version_id=OLD.id AND asset_id IS NULL AND source_revision=OLD.revision;
    INSERT INTO orai.production_records(id,product_id,scope,output_revision_id,creative_profile_revision_id,actor_user_id,source,batch_key,external_label,skill_version_id,input_manifest,created_at)
      SELECT gen_random_uuid(),product_id,scope,revision_key,creative_profile_revision_id,actor_user_id,source,batch_key,external_label,skill_version_id,input_manifest,now()
      FROM orai.production_records WHERE output_revision_id=previous_key;
  END IF;
  RETURN NEW;
END $$;
