BEGIN;
SET LOCAL search_path=orai,pg_temp;

-- Historical authoring rows keep NULL and their original digest. New saves pin
-- the actual planning input, including manual work that has no Skill bindings.
ALTER TABLE experience_authoring_revisions ADD COLUMN product_plan_input jsonb;
CREATE FUNCTION guard_experience_product_plan() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE p production_plan_revisions; m production_plan_modules; item jsonb;
BEGIN
  IF NEW.product_plan_input IS NULL THEN
    IF NEW.status='reviewed' THEN RAISE EXCEPTION 'New review requires its fixed product plan' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF jsonb_typeof(NEW.product_plan_input) IS DISTINCT FROM 'object' OR
    NOT (NEW.product_plan_input ?& ARRAY['schemaVersion','planRevisionId','planDigest','planModuleId','moduleDigest','form']) OR
    NEW.product_plan_input->>'schemaVersion' IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'Invalid fixed experience product plan input' USING ERRCODE='23514';
  END IF;
  SELECT * INTO STRICT p FROM production_plan_revisions WHERE id=(NEW.product_plan_input->>'planRevisionId')::uuid
    AND product_id=NEW.product_id AND scope=NEW.scope;
  SELECT * INTO STRICT m FROM production_plan_modules WHERE id=(NEW.product_plan_input->>'planModuleId')::uuid
    AND plan_revision_id=p.id AND product_id=NEW.product_id AND scope=NEW.scope;
  IF p.document->>'schemaVersion' IS DISTINCT FROM '2' OR p.creative_profile_revision_id<>NEW.creative_profile_revision_id OR
    p.digest IS DISTINCT FROM NEW.product_plan_input->>'planDigest' OR m.digest IS DISTINCT FROM NEW.product_plan_input->>'moduleDigest' OR
    m.definition->>'domain' IS DISTINCT FROM 'experience' OR m.definition->'target'->>'form' IS DISTINCT FROM NEW.product_plan_input->>'form' OR
    (NEW.project_plan_module_id IS NOT NULL AND NEW.project_plan_module_id<>m.id) THEN
    RAISE EXCEPTION 'Experience plan must retain its exact same-project module and profile' USING ERRCODE='23514';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.methods) LOOP
    IF item->'productPlanInput' IS DISTINCT FROM NEW.product_plan_input THEN
      RAISE EXCEPTION 'Experience methods must share the fixed product plan input' USING ERRCODE='23514';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER experience_product_plan_guard BEFORE INSERT ON experience_authoring_revisions
  FOR EACH ROW EXECUTE FUNCTION guard_experience_product_plan();

-- Keep the native authoring/original distinction. A 3d form is accepted only
-- with the implemented garden pair and the exact declared input/report schemas;
-- application gates additionally use the shared runtime registry and budgets.
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
      m.definition->'target'->>'form' NOT IN ('web','3d') OR
      (m.definition->'target'->>'form'='3d' AND (e.manifest->'renderer' IS DISTINCT FROM '{"key":"reflection-garden","version":1}'::jsonb OR
        e.manifest->'report'->'renderer' IS DISTINCT FROM '{"key":"garden-notes","version":1}'::jsonb)) OR
      m.definition->'target'->'runtime'->'renderer' IS DISTINCT FROM e.manifest->'renderer' OR
      m.definition->'target'->'runtime'->'reportRenderer' IS DISTINCT FROM e.manifest->'report'->'renderer' OR
      m.definition->'target'->'runtime'->>'inputSchema' IS DISTINCT FROM e.manifest->'content'->>'inputSchema' OR
      m.definition->'target'->'runtime'->>'engine' IS DISTINCT FROM e.manifest->'content'->>'engine' OR
      m.definition->'target'->'runtime'->>'reportSchema' IS DISTINCT FROM e.manifest->'report'->>'contentSchema' THEN
      RAISE EXCEPTION 'Experience authoring cannot replace an original web/3D package' USING ERRCODE='23514';
    END IF;
    IF e.product_plan_input IS NOT NULL AND (e.product_plan_input->>'planRevisionId' IS DISTINCT FROM p.id::text OR
      e.product_plan_input->>'planModuleId' IS DISTINCT FROM m.id::text OR e.product_plan_input->>'planDigest' IS DISTINCT FROM p.digest OR
      e.product_plan_input->>'moduleDigest' IS DISTINCT FROM m.digest) THEN
      RAISE EXCEPTION 'Experience authoring must retain the same fixed product plan' USING ERRCODE='23514';
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
COMMIT;
