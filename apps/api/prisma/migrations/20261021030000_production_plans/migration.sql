BEGIN;
SET LOCAL search_path TO orai,pg_temp;
-- CreateTable
CREATE TABLE "production_plan_revisions" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "number" INTEGER NOT NULL,
    "creative_profile_revision_id" UUID NOT NULL,
    "creative_profile_digest" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "digest" TEXT NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_plan_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_module_identities" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "module_key" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_module_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_plan_modules" (
    "id" UUID NOT NULL,
    "plan_revision_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "position" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "digest" TEXT NOT NULL,

    CONSTRAINT "production_plan_modules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "production_plan_revisions_scope_product_id_created_at_idx" ON "production_plan_revisions"("scope", "product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "production_plan_revisions_product_id_number_key" ON "production_plan_revisions"("product_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "production_plan_revisions_id_product_id_scope_key" ON "production_plan_revisions"("id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "production_module_identities_product_id_module_key_key" ON "production_module_identities"("product_id", "module_key");

-- CreateIndex
CREATE UNIQUE INDEX "production_module_identities_id_product_id_scope_key" ON "production_module_identities"("id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "production_plan_modules_plan_revision_id_module_id_key" ON "production_plan_modules"("plan_revision_id", "module_id");

-- CreateIndex
CREATE UNIQUE INDEX "production_plan_modules_plan_revision_id_position_key" ON "production_plan_modules"("plan_revision_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "production_plan_modules_id_product_id_scope_key" ON "production_plan_modules"("id", "product_id", "scope");

-- AddForeignKey
ALTER TABLE "production_plan_revisions" ADD CONSTRAINT "production_plan_revisions_product_id_scope_fkey" FOREIGN KEY ("product_id", "scope") REFERENCES "products"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_plan_revisions" ADD CONSTRAINT "production_plan_revisions_creative_profile_revision_id_pro_fkey" FOREIGN KEY ("creative_profile_revision_id", "product_id", "scope") REFERENCES "creative_profile_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_plan_revisions" ADD CONSTRAINT "production_plan_revisions_actor_user_id_scope_fkey" FOREIGN KEY ("actor_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_module_identities" ADD CONSTRAINT "production_module_identities_product_id_scope_fkey" FOREIGN KEY ("product_id", "scope") REFERENCES "products"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_plan_modules" ADD CONSTRAINT "production_plan_modules_plan_revision_id_product_id_scope_fkey" FOREIGN KEY ("plan_revision_id", "product_id", "scope") REFERENCES "production_plan_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "production_plan_modules" ADD CONSTRAINT "production_plan_modules_module_id_product_id_scope_fkey" FOREIGN KEY ("module_id", "product_id", "scope") REFERENCES "production_module_identities"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE production_plan_revisions ADD CONSTRAINT production_plan_shape CHECK (
  number>0 AND digest ~ '^[0-9a-f]{64}$' AND creative_profile_digest ~ '^[0-9a-f]{64}$' AND
  jsonb_typeof(document)='object' AND document ?& ARRAY['schemaVersion','creativeProfileRevisionId','modules','retention'] AND
  document->>'schemaVersion'='1' AND document->>'retention'='platform_originals_and_exact_methods' AND
  jsonb_typeof(document->'modules')='array' AND jsonb_array_length(document->'modules') BETWEEN 1 AND 40);
ALTER TABLE production_module_identities ADD CONSTRAINT production_module_identity_shape CHECK (
  module_key ~ '^[a-z][a-z0-9-]{0,63}$' AND domain IN ('assessment','cover','video','copy','experience'));
ALTER TABLE production_plan_modules ADD CONSTRAINT production_plan_module_shape CHECK (
  position BETWEEN 0 AND 39 AND digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(definition)='object');

CREATE TRIGGER production_plan_immutable BEFORE UPDATE OR DELETE ON production_plan_revisions FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE TRIGGER production_module_identity_immutable BEFORE UPDATE OR DELETE ON production_module_identities FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE TRIGGER production_plan_module_immutable BEFORE UPDATE OR DELETE ON production_plan_modules FOR EACH ROW EXECUTE FUNCTION keep_content_history();

CREATE FUNCTION guard_production_plan() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE profile creative_profile_revisions; last_number integer;
BEGIN
  PERFORM id FROM products WHERE id=NEW.product_id AND scope=NEW.scope FOR UPDATE;
  SELECT COALESCE(max(number),0) INTO last_number FROM production_plan_revisions WHERE product_id=NEW.product_id;
  SELECT * INTO STRICT profile FROM creative_profile_revisions WHERE id=NEW.creative_profile_revision_id AND product_id=NEW.product_id AND scope=NEW.scope;
  IF NEW.number<>last_number+1 OR NEW.creative_profile_digest<>profile.digest OR
    lower(NEW.document->>'creativeProfileRevisionId') IS DISTINCT FROM profile.id::text OR
    NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.actor_user_id AND scope=NEW.scope AND role='ADMIN' AND disabled_at IS NULL) THEN
    RAISE EXCEPTION 'Production plan must append a fixed same-project profile and trusted administrator' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER production_plan_guard BEFORE INSERT ON production_plan_revisions FOR EACH ROW EXECUTE FUNCTION guard_production_plan();

CREATE FUNCTION guard_production_plan_module() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE expected jsonb; module production_module_identities;
BEGIN
  SELECT document->'modules'->NEW.position INTO expected FROM production_plan_revisions WHERE id=NEW.plan_revision_id;
  SELECT * INTO STRICT module FROM production_module_identities WHERE id=NEW.module_id;
  IF expected IS DISTINCT FROM NEW.definition OR NEW.definition->>'moduleKey' IS DISTINCT FROM module.module_key OR
    NEW.definition->>'domain' IS DISTINCT FROM module.domain THEN
    RAISE EXCEPTION 'Module snapshot must match its fixed plan and stable identity' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER production_plan_module_guard BEFORE INSERT ON production_plan_modules FOR EACH ROW EXECUTE FUNCTION guard_production_plan_module();

CREATE FUNCTION check_production_plan_modules() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE plan_key uuid; expected integer; actual integer; bad boolean;
BEGIN
  IF TG_TABLE_NAME='production_plan_revisions' THEN plan_key:=NEW.id; ELSE plan_key:=NEW.plan_revision_id; END IF;
  SELECT jsonb_array_length(document->'modules') INTO expected FROM production_plan_revisions WHERE id=plan_key;
  SELECT count(*) INTO actual FROM production_plan_modules WHERE plan_revision_id=plan_key;
  IF expected IS DISTINCT FROM actual THEN RAISE EXCEPTION 'Production plan module set is incomplete' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM production_plan_modules m CROSS JOIN LATERAL jsonb_array_elements_text(m.definition->'dependsOn') dep(module_key)
    WHERE m.plan_revision_id=plan_key AND NOT EXISTS(SELECT 1 FROM production_plan_modules target
      WHERE target.plan_revision_id=plan_key AND target.definition->>'moduleKey'=dep.module_key)) THEN
    RAISE EXCEPTION 'Production plan dependency is missing from this revision' USING ERRCODE='23514';
  END IF;
  WITH RECURSIVE edges(source,target) AS (
    SELECT m.definition->>'moduleKey', dep.module_key FROM production_plan_modules m
      CROSS JOIN LATERAL jsonb_array_elements_text(m.definition->'dependsOn') dep(module_key) WHERE m.plan_revision_id=plan_key
  ), paths(source,target) AS (
    SELECT source,target FROM edges UNION SELECT p.source,e.target FROM paths p JOIN edges e ON e.source=p.target
  ) SELECT EXISTS(SELECT 1 FROM paths WHERE source=target) INTO bad;
  IF bad THEN RAISE EXCEPTION 'Production plan dependencies contain a cycle' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER production_plan_complete AFTER INSERT ON production_plan_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_production_plan_modules();
CREATE CONSTRAINT TRIGGER production_plan_module_set_complete AFTER INSERT ON production_plan_modules DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_production_plan_modules();
COMMIT;

