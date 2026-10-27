BEGIN;
SET LOCAL search_path=orai,pg_temp;

CREATE OR REPLACE FUNCTION guard_experience_authoring() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE v product_versions; c machine_credentials; item jsonb; method style_skill_versions; previous experience_authoring_revisions;
BEGIN
  SELECT * INTO STRICT v FROM product_versions WHERE id=NEW.product_version_id FOR SHARE;
  IF v.status NOT IN ('DRAFT','REVIEWED') OR NEW.creative_profile_revision_id IS DISTINCT FROM v.creative_profile_revision_id OR
    NEW.manifest->'content'->>'versionId' IS DISTINCT FROM v.id::text OR NEW.manifest->>'creativeProfileRevisionId' IS DISTINCT FROM NEW.creative_profile_revision_id::text THEN
    RAISE EXCEPTION 'Experience authoring must use a mutable version and its fixed profile' USING ERRCODE='23514';
  END IF;
  IF NEW.status='reviewed' THEN
    SELECT * INTO previous FROM experience_authoring_revisions WHERE product_version_id=NEW.product_version_id ORDER BY number DESC LIMIT 1;
    IF previous.id IS NULL OR previous.status<>'draft' OR NEW.number<>previous.number+1 OR
      (to_jsonb(NEW)-ARRAY['id','number','status','digest','created_at']) IS DISTINCT FROM
      (to_jsonb(previous)-ARRAY['id','number','status','digest','created_at']) THEN
      RAISE EXCEPTION 'Review must append the exact latest draft and its fixed inputs' USING ERRCODE='23514';
    END IF;
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
        AND s.purpose=item->>'purpose' AND (s.snapshot-'customization')=item->'version' AND item->>'domain'='experience'
        AND s.id::text=item->'projectMethod'->>'snapshotId' AND s.digest=item->'projectMethod'->>'digest') THEN
        RAISE EXCEPTION 'Candidate experience must retain exact captured methods and customization' USING ERRCODE='23514';
      END IF;
    END LOOP;
    SELECT * INTO STRICT c FROM machine_credentials WHERE id=NEW.machine_credential_id AND scope=NEW.scope;
    IF c.domain<>'experience' OR c.owner_user_id<>NEW.actor_user_id OR
      (NEW.status='draft' AND (NOT ('content:write'=ANY(c.permissions)) OR NOT machine_has_product(c.id,NEW.product_id,NEW.scope))) THEN
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
    IF c.domain<>'experience' OR c.owner_user_id<>NEW.actor_user_id OR jsonb_array_length(NEW.methods)<>2 OR
      (NEW.status='draft' AND (NOT ('content:write'=ANY(c.permissions)) OR NOT machine_has_product(c.id,v.product_id,NEW.scope))) THEN
      RAISE EXCEPTION 'Experience machine provenance mismatch' USING ERRCODE='23514';
    END IF;
    IF NEW.status='draft' THEN
      FOR item IN SELECT value FROM jsonb_array_elements(NEW.methods) LOOP
        IF NOT machine_has_skill(c.id,(item->'version'->>'skillId')::uuid,NEW.scope) THEN RAISE EXCEPTION 'Experience method outside credential scope'; END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- INSERT of already-published records is reserved for the owner restoring
-- historical snapshots. Application/CLI publication always reviews a DRAFT.
-- Updating an old published version is not a new publication and never rewrites
-- its existing release, entitlements, answers, report or planning history.
CREATE FUNCTION guard_threejs_publication() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE e experience_releases; a experience_authoring_revisions; p production_plan_revisions; m production_plan_modules;
BEGIN
  IF NEW.status<>'PUBLISHED' THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    IF NOT pg_has_role(current_user,(SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid='orai.product_versions'::regclass),'USAGE') THEN
      RAISE EXCEPTION 'Runtime cannot insert an already-published version' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status IN ('PUBLISHED','ARCHIVED') THEN RETURN NEW; END IF;
  SELECT * INTO e FROM experience_releases WHERE product_version_id=NEW.id;
  SELECT * INTO a FROM experience_authoring_revisions WHERE product_version_id=NEW.id ORDER BY number DESC LIMIT 1;
  IF OLD.status<>'REVIEWED' OR e.id IS NULL OR a.id IS NULL OR a.status<>'reviewed' OR a.product_plan_input IS NULL OR
    e.authoring_revision_id IS DISTINCT FROM a.id OR e.manifest IS DISTINCT FROM a.manifest OR
    NEW.creative_profile_revision_id IS DISTINCT FROM a.creative_profile_revision_id OR
    a.manifest->'renderer' IS DISTINCT FROM '{"key":"reflection-garden","version":1}'::jsonb OR
    a.manifest->'report'->'renderer' IS DISTINCT FROM '{"key":"garden-notes","version":1}'::jsonb OR
    NOT EXISTS(SELECT 1 FROM content_revisions c WHERE c.product_version_id=NEW.id AND c.asset_id IS NULL
      AND c.source_revision=a.version_revision AND c.snapshot->'configuration'=NEW.configuration) THEN
    RAISE EXCEPTION 'New publication requires an exact reviewed Three.js experience' USING ERRCODE='23514';
  END IF;
  SELECT * INTO p FROM production_plan_revisions WHERE product_id=NEW.product_id AND scope=NEW.scope ORDER BY number DESC LIMIT 1;
  SELECT * INTO m FROM production_plan_modules WHERE id=(a.product_plan_input->>'planModuleId')::uuid AND plan_revision_id=p.id;
  IF p.id IS NULL OR m.id IS NULL OR p.id::text IS DISTINCT FROM a.product_plan_input->>'planRevisionId' OR
    p.digest IS DISTINCT FROM a.product_plan_input->>'planDigest' OR m.digest IS DISTINCT FROM a.product_plan_input->>'moduleDigest' OR
    p.creative_profile_revision_id IS DISTINCT FROM NEW.creative_profile_revision_id OR p.document->>'schemaVersion' IS DISTINCT FROM '2' OR
    p.document->'productPlan'->>'implementation' IS DISTINCT FROM 'threejs' OR
    p.document->'productPlan'->>'experienceModuleKey' IS DISTINCT FROM m.definition->>'moduleKey' OR
    m.definition->'target'->'runtime'->'renderer' IS DISTINCT FROM a.manifest->'renderer' OR
    m.definition->'target'->'runtime'->'reportRenderer' IS DISTINCT FROM a.manifest->'report'->'renderer' OR
    EXISTS(SELECT 1 FROM jsonb_each(p.document->'productPlan'->'decisions') d WHERE d.value->>'requirement'='undecided'
      OR (d.value->>'requirement'='required' AND d.value->>'status' NOT IN ('implemented','verified'))) OR
    EXISTS(SELECT 1 FROM jsonb_each(p.document->'productPlan'->'budgets') b WHERE b.value='null'::jsonb) THEN
    RAISE EXCEPTION 'New publication requires the complete current fixed product plan' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER threejs_publication_guard BEFORE INSERT OR UPDATE OF status ON product_versions
  FOR EACH ROW EXECUTE FUNCTION guard_threejs_publication();
COMMIT;
