BEGIN;
SET LOCAL search_path=orai,pg_temp;

CREATE TABLE experience_releases (
  id uuid PRIMARY KEY, product_id uuid NOT NULL, product_version_id uuid NOT NULL UNIQUE,
  scope "DataScope" NOT NULL, creative_profile_revision_id uuid,
  manifest jsonb NOT NULL, digest text NOT NULL, created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(id,product_version_id,scope),
  UNIQUE(product_version_id,product_id,scope),
  CONSTRAINT experience_releases_version_scope_fkey FOREIGN KEY(product_version_id,product_id,scope) REFERENCES product_versions(id,product_id,scope) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT experience_releases_profile_scope_fkey FOREIGN KEY(creative_profile_revision_id,product_id,scope) REFERENCES creative_profile_revisions(id,product_id,scope) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT experience_release_digest CHECK(digest=encode(sha256(convert_to(manifest::text,'UTF8')),'hex')),
  CONSTRAINT experience_release_content CHECK(manifest->>'schemaVersion'='1' AND manifest->'content'->>'versionId'=product_version_id::text)
);
CREATE TABLE experience_resources (
  id uuid PRIMARY KEY, release_id uuid NOT NULL, product_version_id uuid NOT NULL, scope "DataScope" NOT NULL,
  resource_id text NOT NULL, file_id uuid NOT NULL, purpose text NOT NULL, checksum text NOT NULL,
  byte_size integer NOT NULL, mime_type text NOT NULL,
  UNIQUE(release_id,resource_id),
  CONSTRAINT experience_resources_release_scope_fkey FOREIGN KEY(release_id,product_version_id,scope) REFERENCES experience_releases(id,product_version_id,scope) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT experience_resources_file_scope_fkey FOREIGN KEY(file_id,product_version_id,scope) REFERENCES asset_files(id,product_version_id,scope) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT experience_resource_purpose CHECK(purpose IN ('illustration','texture','model','audio','font')),
  CONSTRAINT experience_resource_bytes CHECK(byte_size BETWEEN 1 AND 20971520 AND checksum ~ '^[0-9a-f]{64}$')
);
CREATE INDEX experience_resources_file_id_idx ON experience_resources(file_id);

CREATE FUNCTION guard_experience_profile() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE version_profile uuid; profile_value jsonb; expected_intent jsonb;
BEGIN
  SELECT creative_profile_revision_id INTO version_profile FROM product_versions WHERE id=NEW.product_version_id FOR SHARE;
  IF NEW.creative_profile_revision_id IS DISTINCT FROM version_profile OR
    NEW.manifest->>'creativeProfileRevisionId' IS DISTINCT FROM NEW.creative_profile_revision_id::text THEN
    RAISE EXCEPTION 'Experience must use the content version creative profile' USING ERRCODE='23514';
  END IF;
  SELECT profile INTO profile_value FROM creative_profile_revisions WHERE id=version_profile;
  expected_intent:=CASE WHEN profile_value IS NULL THEN 'null'::jsonb ELSE jsonb_build_object(
    'emotionalGoal',profile_value->>'emotionalGoal','understandingGoal',profile_value->>'understandingGoal',
    'world',profile_value->>'world','language',profile_value->>'language') END;
  IF NEW.manifest->'intent' IS DISTINCT FROM expected_intent THEN
    RAISE EXCEPTION 'Experience intent must match its fixed creative profile' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER experience_profile_guard BEFORE INSERT ON experience_releases FOR EACH ROW EXECUTE FUNCTION guard_experience_profile();

CREATE FUNCTION ensure_legacy_experience(version_key uuid) RETURNS uuid LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE v product_versions; p products; profile_value jsonb; payload jsonb; release_key uuid; scenes jsonb;
BEGIN
  SELECT id INTO release_key FROM experience_releases WHERE product_version_id=version_key;
  IF release_key IS NOT NULL THEN RETURN release_key; END IF;
  SELECT * INTO v FROM product_versions WHERE id=version_key;
  IF NOT FOUND OR v.status NOT IN ('PUBLISHED','ARCHIVED') THEN RAISE EXCEPTION 'Experience requires an available content version' USING ERRCODE='23514'; END IF;
  SELECT * INTO p FROM products WHERE id=v.product_id;
  SELECT c.profile INTO profile_value FROM creative_profile_revisions c WHERE c.id=v.creative_profile_revision_id;
  SELECT jsonb_agg(jsonb_build_object('sceneId',q.value->>'id','questionId',q.value->>'id','checkpointId',q.value->>'id',
    'choices',(SELECT jsonb_agg(jsonb_build_object('objectId',o.value->>'id','optionId',o.value->>'id') ORDER BY o.ordinality)
      FROM jsonb_array_elements(q.value->'options') WITH ORDINALITY o(value,ordinality))) ORDER BY q.ordinality)
    INTO scenes FROM jsonb_array_elements(v.configuration->'questions') WITH ORDINALITY q(value,ordinality);
  payload:=jsonb_build_object('schemaVersion',1,
    'content',jsonb_build_object('versionId',v.id,'inputSchema','single_choice_v1','engine','dimensions_v1'),
    'creativeProfileRevisionId',v.creative_profile_revision_id,
    'intent',CASE WHEN profile_value IS NULL THEN 'null'::jsonb ELSE jsonb_build_object('emotionalGoal',profile_value->>'emotionalGoal',
      'understandingGoal',profile_value->>'understandingGoal','world',profile_value->>'world','language',profile_value->>'language') END,
    'renderer',jsonb_build_object('key','dom-choice','version',1),'fallback',jsonb_build_object('key','dom-choice','version',1),
    'report',jsonb_build_object('contentSchema','report_content_v1','renderer',jsonb_build_object('key','legacy-text','version',1)),
    'theme',jsonb_build_object('key',p.theme_key,'revision',1),'confirmation','explicit','recovery','server_confirmed_answers',
    'scenes',scenes,'resources','[]'::jsonb);
  INSERT INTO experience_releases(id,product_id,product_version_id,scope,creative_profile_revision_id,manifest,digest)
    VALUES(gen_random_uuid(),v.product_id,v.id,v.scope,v.creative_profile_revision_id,payload,encode(sha256(convert_to(payload::text,'UTF8')),'hex'))
    ON CONFLICT(product_version_id) DO NOTHING;
  SELECT id INTO release_key FROM experience_releases WHERE product_version_id=version_key;
  RETURN release_key;
END $$;

-- Capture legacy presentation once; never rewrite configurations, answers or report snapshots.
DO $$ DECLARE v record; BEGIN
  FOR v IN SELECT id FROM product_versions WHERE status IN ('PUBLISHED','ARCHIVED') LOOP
    PERFORM ensure_legacy_experience(v.id);
  END LOOP;
END $$;
ALTER TABLE attempts ADD COLUMN experience_release_id uuid, ADD COLUMN runtime_checkpoint jsonb;
UPDATE attempts a SET experience_release_id=r.id,
  runtime_checkpoint=jsonb_build_object('schemaVersion',1,'revision',a.revision,'lastConfirmedQuestionId',
    (SELECT question_id FROM attempt_answers WHERE attempt_id=a.id ORDER BY saved_at DESC,question_id LIMIT 1))
  FROM experience_releases r WHERE r.product_version_id=a.product_version_id;
ALTER TABLE attempts ADD CONSTRAINT attempt_experience_scope_fkey FOREIGN KEY(experience_release_id,product_version_id,scope)
  REFERENCES experience_releases(id,product_version_id,scope) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE attempts ADD CONSTRAINT attempt_experience_present CHECK(experience_release_id IS NOT NULL AND runtime_checkpoint IS NOT NULL);
ALTER TABLE reports ADD COLUMN presentation jsonb;
UPDATE reports p SET presentation=jsonb_build_object('schemaVersion',1,'releaseId',r.id,
  'contentSchema',r.manifest->'report'->>'contentSchema','renderer',r.manifest->'report'->'renderer','theme',r.manifest->'theme')
  FROM attempts a JOIN experience_releases r ON r.id=a.experience_release_id WHERE a.id=p.attempt_id;

CREATE FUNCTION capture_default_experience() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
BEGIN PERFORM ensure_legacy_experience(NEW.id); RETURN NEW; END $$;
CREATE TRIGGER experience_release_capture AFTER INSERT OR UPDATE OF status ON product_versions
  FOR EACH ROW WHEN (NEW.status IN ('PUBLISHED','ARCHIVED')) EXECUTE FUNCTION capture_default_experience();
CREATE TRIGGER experience_release_immutable BEFORE UPDATE OR DELETE ON experience_releases FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE TRIGGER experience_resource_immutable BEFORE UPDATE OR DELETE ON experience_resources FOR EACH ROW EXECUTE FUNCTION keep_content_history();

CREATE FUNCTION guard_experience_resource() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE f asset_files; spec jsonb;
BEGIN
  SELECT * INTO f FROM asset_files WHERE id=NEW.file_id FOR SHARE;
  SELECT value INTO spec FROM experience_releases r,jsonb_array_elements(r.manifest->'resources')
    WHERE r.id=NEW.release_id AND value->>'resourceId'=NEW.resource_id;
  IF f.status IS DISTINCT FROM 'AVAILABLE' OR f.verified_at IS NULL OR spec IS NULL OR
    (f.product_version_id,f.scope,f.checksum,f.byte_size,f.mime_type) IS DISTINCT FROM (NEW.product_version_id,NEW.scope,NEW.checksum,NEW.byte_size,NEW.mime_type) OR
    spec->>'fileId' IS DISTINCT FROM NEW.file_id::text OR spec->>'purpose' IS DISTINCT FROM NEW.purpose OR
    spec->>'checksum' IS DISTINCT FROM NEW.checksum OR (spec->>'byteSize')::integer IS DISTINCT FROM NEW.byte_size OR spec->>'mimeType' IS DISTINCT FROM NEW.mime_type THEN
    RAISE EXCEPTION 'Experience resource must match its fixed verified file and manifest' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER experience_resource_guard BEFORE INSERT ON experience_resources FOR EACH ROW EXECUTE FUNCTION guard_experience_resource();
CREATE FUNCTION check_experience_resources() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE release_key uuid; expected integer; actual integer;
BEGIN
  IF TG_TABLE_NAME='experience_releases' THEN release_key:=NEW.id; ELSE release_key:=NEW.release_id; END IF;
  SELECT jsonb_array_length(manifest->'resources') INTO expected FROM experience_releases WHERE id=release_key;
  SELECT count(*) INTO actual FROM experience_resources WHERE release_id=release_key;
  IF expected IS DISTINCT FROM actual THEN RAISE EXCEPTION 'Experience resource manifest is incomplete' USING ERRCODE='23514'; END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER experience_resources_complete AFTER INSERT ON experience_releases DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_experience_resources();
CREATE CONSTRAINT TRIGGER experience_resource_set_complete AFTER INSERT ON experience_resources DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_experience_resources();

CREATE FUNCTION lock_attempt_experience() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.experience_release_id:=COALESCE(NEW.experience_release_id,ensure_legacy_experience(NEW.product_version_id));
    NEW.runtime_checkpoint:=COALESCE(NEW.runtime_checkpoint,jsonb_build_object('schemaVersion',1,'revision',NEW.revision,'lastConfirmedQuestionId',NULL));
  ELSIF NEW.experience_release_id IS DISTINCT FROM OLD.experience_release_id THEN
    RAISE EXCEPTION 'Attempt experience release is locked' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER attempt_experience_locked BEFORE INSERT OR UPDATE ON attempts FOR EACH ROW EXECUTE FUNCTION lock_attempt_experience();
CREATE FUNCTION lock_report_presentation() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE r experience_releases;
BEGIN
  IF TG_OP='INSERT' THEN
    SELECT e.* INTO r FROM attempts a JOIN experience_releases e ON e.id=a.experience_release_id WHERE a.id=NEW.attempt_id;
    NEW.presentation:=jsonb_build_object('schemaVersion',1,'releaseId',r.id,'contentSchema',r.manifest->'report'->>'contentSchema',
      'renderer',r.manifest->'report'->'renderer','theme',r.manifest->'theme');
  ELSIF NEW.presentation IS DISTINCT FROM OLD.presentation THEN
    RAISE EXCEPTION 'Report presentation is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER report_presentation_locked BEFORE INSERT OR UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION lock_report_presentation();
COMMIT;
