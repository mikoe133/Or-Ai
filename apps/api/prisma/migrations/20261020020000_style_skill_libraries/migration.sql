-- Forward-only expansion. Roll back application routes, retain skill history and files.
BEGIN;
SET LOCAL search_path TO orai;
-- CreateEnum
CREATE TYPE "SkillVersionStatus" AS ENUM ('DRAFT', 'REVIEWED', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "style_skills" (
    "id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "domain" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "styles" TEXT[],
    "purposes" TEXT[],
    "supported_forms" TEXT[],
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "style_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "style_skill_versions" (
    "id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "number" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "status" "SkillVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "manifest" JSONB NOT NULL,
    "digest" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "style_skill_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_reference_files" (
    "id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
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

    CONSTRAINT "skill_reference_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "style_skill_attachments" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "file_id" UUID NOT NULL,
    "path" TEXT NOT NULL,

    CONSTRAINT "style_skill_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "style_skills_scope_domain_name_idx" ON "style_skills"("scope", "domain", "name");

-- CreateIndex
CREATE UNIQUE INDEX "style_skills_scope_domain_slug_key" ON "style_skills"("scope", "domain", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "style_skills_id_scope_key" ON "style_skills"("id", "scope");

-- CreateIndex
CREATE INDEX "style_skill_versions_scope_status_skill_id_idx" ON "style_skill_versions"("scope", "status", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "style_skill_versions_skill_id_number_key" ON "style_skill_versions"("skill_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "style_skill_versions_id_skill_id_scope_key" ON "style_skill_versions"("id", "skill_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "skill_reference_files_storage_key_key" ON "skill_reference_files"("storage_key");

-- CreateIndex
CREATE INDEX "skill_reference_files_scope_owner_user_id_status_expires_at_idx" ON "skill_reference_files"("scope", "owner_user_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "skill_reference_files_id_skill_id_scope_key" ON "skill_reference_files"("id", "skill_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "style_skill_attachments_version_id_path_key" ON "style_skill_attachments"("version_id", "path");

-- AddForeignKey
ALTER TABLE "style_skill_versions" ADD CONSTRAINT "style_skill_versions_skill_id_scope_fkey" FOREIGN KEY ("skill_id", "scope") REFERENCES "style_skills"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "style_skill_versions" ADD CONSTRAINT "style_skill_versions_actor_user_id_scope_fkey" FOREIGN KEY ("actor_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_reference_files" ADD CONSTRAINT "skill_reference_files_skill_id_scope_fkey" FOREIGN KEY ("skill_id", "scope") REFERENCES "style_skills"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_reference_files" ADD CONSTRAINT "skill_reference_files_owner_user_id_scope_fkey" FOREIGN KEY ("owner_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "style_skill_attachments" ADD CONSTRAINT "style_skill_attachments_version_id_skill_id_scope_fkey" FOREIGN KEY ("version_id", "skill_id", "scope") REFERENCES "style_skill_versions"("id", "skill_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "style_skill_attachments" ADD CONSTRAINT "style_skill_attachments_file_id_skill_id_scope_fkey" FOREIGN KEY ("file_id", "skill_id", "scope") REFERENCES "skill_reference_files"("id", "skill_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE style_skills ADD CONSTRAINT skill_identity_values CHECK (domain IN ('assessment','cover','video','copy') AND revision>=0 AND cardinality(styles) BETWEEN 1 AND 12 AND cardinality(purposes) BETWEEN 1 AND 2 AND cardinality(supported_forms) BETWEEN 1 AND 5);
ALTER TABLE style_skill_versions ADD CONSTRAINT skill_version_values CHECK (number>0 AND revision>=0 AND digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(manifest)='object');
CREATE UNIQUE INDEX skill_one_active_version ON style_skill_versions(skill_id) WHERE status='ACTIVE';
ALTER TABLE skill_reference_files ADD CONSTRAINT skill_file_values CHECK (byte_size BETWEEN 1 AND 5242880 AND checksum ~ '^[0-9a-f]{64}$' AND storage_key=id::text||'.blob' AND mime_type IN ('text/markdown','text/plain','application/json','application/pdf','image/png','image/jpeg','image/webp') AND position('/' in original_name)=0 AND position(chr(92) in original_name)=0 AND original_name !~ '[[:cntrl:]]' AND (status<>'AVAILABLE' OR verified_at IS NOT NULL));
CREATE FUNCTION guard_style_skill_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Skill history cannot be deleted'; END IF;
 IF (NEW.id,NEW.scope,NEW.domain,NEW.slug,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.scope,OLD.domain,OLD.slug,OLD.created_at) OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Skill identity is immutable and revision must advance'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER style_skill_identity_guard BEFORE UPDATE OR DELETE ON style_skills FOR EACH ROW EXECUTE FUNCTION guard_style_skill_identity();
CREATE FUNCTION guard_style_skill_version() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE parent_domain text;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Skill versions cannot be deleted'; END IF;
 SELECT domain INTO parent_domain FROM style_skills WHERE id=NEW.skill_id AND scope=NEW.scope FOR KEY SHARE;
 IF NEW.manifest->>'domain' IS DISTINCT FROM parent_domain THEN RAISE EXCEPTION 'Skill domain mismatch'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'DRAFT' OR NEW.revision<>0 THEN RAISE EXCEPTION 'New versions start as draft'; END IF;
 ELSE
  IF (NEW.id,NEW.skill_id,NEW.scope,NEW.number,NEW.actor_user_id,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.skill_id,OLD.scope,OLD.number,OLD.actor_user_id,OLD.created_at) OR NEW.revision<>OLD.revision+1 THEN RAISE EXCEPTION 'Invalid skill revision'; END IF;
  IF OLD.status<>'DRAFT' AND (NEW.manifest,NEW.digest) IS DISTINCT FROM (OLD.manifest,OLD.digest) THEN RAISE EXCEPTION 'Reviewed skill content is immutable'; END IF;
  IF OLD.status='ARCHIVED' OR (OLD.status='ACTIVE' AND NEW.status<>'ARCHIVED') OR (OLD.status='REVIEWED' AND NEW.status NOT IN ('ACTIVE','ARCHIVED')) OR (OLD.status='DRAFT' AND NEW.status NOT IN ('DRAFT','REVIEWED','ARCHIVED')) THEN RAISE EXCEPTION 'Invalid skill lifecycle'; END IF;
 END IF;
 IF NEW.status IN ('REVIEWED','ACTIVE') AND (SELECT count(*) FROM style_skill_attachments WHERE version_id=NEW.id)<>jsonb_array_length(NEW.manifest->'references') THEN RAISE EXCEPTION 'Skill references incomplete'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER style_skill_version_guard BEFORE INSERT OR UPDATE OR DELETE ON style_skill_versions FOR EACH ROW EXECUTE FUNCTION guard_style_skill_version();
CREATE FUNCTION guard_skill_reference_file() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Reference metadata cannot be deleted'; END IF;
 IF (to_jsonb(NEW)-ARRAY['status','verified_at','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','verified_at','updated_at']) THEN RAISE EXCEPTION 'Reference metadata is immutable'; END IF;
 IF OLD.status IN ('AVAILABLE','FAILED','EXPIRED','DELETING','DELETED') THEN RAISE EXCEPTION 'Reference file is terminal'; END IF;
 IF NOT ((OLD.status='PENDING' AND NEW.status IN ('VERIFYING','EXPIRED')) OR (OLD.status='VERIFYING' AND NEW.status IN ('UPLOADED','FAILED','EXPIRED')) OR (OLD.status='UPLOADED' AND NEW.status IN ('AVAILABLE','FAILED','EXPIRED'))) THEN RAISE EXCEPTION 'Invalid reference upload state'; END IF;
 IF NEW.status<>'AVAILABLE' AND NEW.verified_at IS NOT NULL THEN RAISE EXCEPTION 'Unverified reference'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER skill_reference_file_guard BEFORE UPDATE OR DELETE ON skill_reference_files FOR EACH ROW EXECUTE FUNCTION guard_skill_reference_file();
CREATE FUNCTION guard_style_skill_attachment() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE v style_skill_versions; f skill_reference_files; item record;
BEGIN
 IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Replace draft references explicitly'; END IF;
 IF TG_OP='DELETE' THEN SELECT * INTO v FROM style_skill_versions WHERE id=OLD.version_id FOR UPDATE;
 ELSE SELECT * INTO v FROM style_skill_versions WHERE id=NEW.version_id FOR UPDATE; END IF;
 IF v.status<>'DRAFT' THEN RAISE EXCEPTION 'Fixed skill references cannot change'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 SELECT * INTO f FROM skill_reference_files WHERE id=NEW.file_id FOR KEY SHARE;
 IF f.status<>'AVAILABLE' OR f.skill_id<>NEW.skill_id OR f.scope<>NEW.scope THEN RAISE EXCEPTION 'Reference unavailable or wrong scope'; END IF;
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v.manifest->'references') x WHERE x->>'path'=NEW.path AND (x->>'fileId')::uuid=NEW.file_id) THEN RAISE EXCEPTION 'Reference does not match manifest'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER style_skill_attachment_guard BEFORE INSERT OR UPDATE OR DELETE ON style_skill_attachments FOR EACH ROW EXECUTE FUNCTION guard_style_skill_attachment();
REVOKE ALL ON style_skills,style_skill_versions,skill_reference_files,style_skill_attachments FROM PUBLIC;
COMMIT;
