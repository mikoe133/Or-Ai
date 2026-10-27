BEGIN;
SET LOCAL search_path TO orai,pg_temp;

-- Forward-only schema discrimination. No existing document, digest or default is rewritten.
ALTER TABLE production_plan_revisions DROP CONSTRAINT production_plan_shape;
ALTER TABLE production_plan_revisions ADD CONSTRAINT production_plan_shape CHECK (
  number>0 AND digest ~ '^[0-9a-f]{64}$' AND creative_profile_digest ~ '^[0-9a-f]{64}$' AND
  jsonb_typeof(document)='object' AND document ?& ARRAY['schemaVersion','creativeProfileRevisionId','modules','retention'] AND
  document->>'retention'='platform_originals_and_exact_methods' AND
  jsonb_typeof(document->'modules')='array' AND jsonb_array_length(document->'modules') BETWEEN 1 AND 40 AND
  ((document->'schemaVersion'='1'::jsonb AND NOT document ? 'productPlan') OR
   (document->'schemaVersion'='2'::jsonb AND document ? 'productPlan' AND jsonb_typeof(document->'productPlan')='object' AND
    document->'productPlan' ?& ARRAY['schemaVersion','implementation','basedOnPlanRevisionId','visualDimension',
      'experienceModuleKey','assessmentModuleKey','decisions','budgets','sources'] AND
    document->'productPlan'->'schemaVersion'='1'::jsonb AND document->'productPlan'->>'implementation'='threejs' AND
    jsonb_typeof(document->'productPlan'->'decisions')='object' AND jsonb_typeof(document->'productPlan'->'budgets')='object' AND
    jsonb_typeof(document->'productPlan'->'sources')='array' AND jsonb_array_length(document->'productPlan'->'sources')<=100))
);

CREATE FUNCTION guard_product_implementation_plan() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE p jsonb; source jsonb; source_digest text; source_profile uuid; source_domain text; target_domain text; origin uuid;
BEGIN
  IF NEW.document->>'schemaVersion'<>'2' THEN RETURN NEW; END IF;
  p:=NEW.document->'productPlan';
  origin:=(p->>'basedOnPlanRevisionId')::uuid;
  IF origin IS NOT NULL AND NOT EXISTS(SELECT 1 FROM production_plan_revisions WHERE id=origin AND product_id=NEW.product_id AND scope=NEW.scope) THEN
    RAISE EXCEPTION 'Product plan origin must belong to the same product and scope' USING ERRCODE='23514';
  END IF;
  IF (p->>'experienceModuleKey' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.document->'modules') m
      WHERE m->>'moduleKey'=p->>'experienceModuleKey' AND m->>'domain'='experience')) OR
     (p->>'assessmentModuleKey' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.document->'modules') m
      WHERE m->>'moduleKey'=p->>'assessmentModuleKey' AND m->>'domain'='assessment')) THEN
    RAISE EXCEPTION 'Product plan targets must refer to its own typed modules' USING ERRCODE='23514';
  END IF;
  FOR source IN SELECT value FROM jsonb_array_elements(p->'sources') LOOP
    source_digest:=NULL; source_profile:=NULL; source_domain:=NULL;
    SELECT m->>'domain' INTO target_domain FROM jsonb_array_elements(NEW.document->'modules') m WHERE m->>'moduleKey'=source->>'moduleKey';
    IF target_domain IS NULL THEN RAISE EXCEPTION 'Unknown source target module' USING ERRCODE='23514'; END IF;
    IF source->>'kind'='content_revision' THEN
      SELECT digest,creative_profile_revision_id INTO source_digest,source_profile FROM content_revisions
        WHERE id=(source->>'id')::uuid AND product_id=NEW.product_id AND scope=NEW.scope;
    ELSIF source->>'kind'='experience_release' THEN
      SELECT digest,creative_profile_revision_id INTO source_digest,source_profile FROM experience_releases
        WHERE id=(source->>'id')::uuid AND product_id=NEW.product_id AND scope=NEW.scope;
    ELSIF source->>'kind'='method_snapshot' THEN
      SELECT s.digest,r.creative_profile_revision_id,i.domain INTO source_digest,source_profile,source_domain
        FROM project_method_snapshots s JOIN production_plan_modules m ON m.id=s.plan_module_id
        JOIN production_plan_revisions r ON r.id=m.plan_revision_id JOIN production_module_identities i ON i.id=m.module_id
        WHERE s.id=(source->>'id')::uuid AND s.product_id=NEW.product_id AND s.scope=NEW.scope;
    END IF;
    IF source_digest IS NULL OR source_digest IS DISTINCT FROM source->>'digest' OR
      (source_profile IS NOT NULL AND source_profile<>NEW.creative_profile_revision_id) OR
      (source_domain IS NOT NULL AND source_domain<>target_domain) THEN
      RAISE EXCEPTION 'Fixed product plan source must match its product, scope, profile, domain and digest' USING ERRCODE='23514';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER product_implementation_plan_guard BEFORE INSERT ON production_plan_revisions
  FOR EACH ROW EXECUTE FUNCTION guard_product_implementation_plan();
-- Reuse existing append-only tables and restricted role grants. No new writable tables or columns.
COMMIT;
