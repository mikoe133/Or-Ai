BEGIN;
SET search_path TO orai, pg_temp;

ALTER TABLE product_versions ADD COLUMN creative_profile_revision_id UUID;
ALTER TABLE product_versions ADD CONSTRAINT version_creative_profile_scope_fkey
  FOREIGN KEY (creative_profile_revision_id, product_id, scope)
  REFERENCES creative_profile_revisions(id, product_id, scope) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE production_records
  ADD COLUMN machine_credential_id UUID,
  ADD COLUMN machine_request_id UUID;
ALTER TABLE production_records ADD CONSTRAINT production_records_machine_credential_id_scope_fkey
  FOREIGN KEY (machine_credential_id, scope) REFERENCES machine_credentials(id, scope) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE production_records ADD CONSTRAINT production_machine_shape CHECK (
  (machine_credential_id IS NULL AND machine_request_id IS NULL) OR
  (machine_credential_id IS NOT NULL AND machine_request_id IS NOT NULL AND source='mcp')
);

-- A historical provenance record remains valid after its credential expires or
-- is revoked. Current authorization is rechecked by the save transaction.
CREATE FUNCTION check_machine_production() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE credential machine_credentials; output_domain text;
BEGIN
  IF NEW.machine_credential_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO STRICT credential FROM machine_credentials WHERE id=NEW.machine_credential_id AND scope=NEW.scope;
  SELECT domain INTO STRICT output_domain FROM content_revisions WHERE id=NEW.output_revision_id AND product_id=NEW.product_id AND scope=NEW.scope;
  IF NEW.actor_user_id IS DISTINCT FROM credential.owner_user_id OR credential.domain IS DISTINCT FROM output_domain OR
     NOT ('content:write'=ANY(credential.permissions)) OR NOT (NEW.product_id=ANY(credential.product_ids)) THEN
    RAISE EXCEPTION 'Machine provenance must match the authorized domain, product and owner' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER production_machine_guard BEFORE INSERT ON production_records FOR EACH ROW EXECUTE FUNCTION check_machine_production();

CREATE OR REPLACE FUNCTION prevent_version_rewrite() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
BEGIN
  IF OLD.status IN ('PUBLISHED','ARCHIVED') THEN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Published versions cannot be deleted'; END IF;
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.product_id IS DISTINCT FROM OLD.product_id OR
      NEW.scope IS DISTINCT FROM OLD.scope OR NEW.number IS DISTINCT FROM OLD.number OR
      NEW.configuration IS DISTINCT FROM OLD.configuration OR NEW.published_at IS DISTINCT FROM OLD.published_at OR
      NEW.creative_profile_revision_id IS DISTINCT FROM OLD.creative_profile_revision_id OR
      NEW.status NOT IN ('PUBLISHED','ARCHIVED') THEN
      RAISE EXCEPTION 'Published versions are immutable';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION capture_version_content(v product_versions) RETURNS uuid LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE payload jsonb; found_id uuid; saved jsonb;
BEGIN
  payload:=jsonb_build_object('schemaVersion',1,'kind','assessment','versionNumber',v.number,'status',lower(v.status::text),'configuration',v.configuration);
  -- Legacy snapshots keep their exact shape and digest. Only explicitly bound
  -- versions include the new fixed authoring profile.
  IF v.creative_profile_revision_id IS NOT NULL THEN
    payload:=payload || jsonb_build_object('creativeProfileRevisionId',v.creative_profile_revision_id);
  END IF;
  SELECT id,snapshot INTO found_id,saved FROM content_revisions
    WHERE product_version_id=v.id AND asset_id IS NULL AND source_revision=v.revision;
  IF found_id IS NOT NULL THEN
    IF saved IS DISTINCT FROM payload THEN RAISE EXCEPTION 'Version changes require a new revision' USING ERRCODE='23514'; END IF;
    RETURN found_id;
  END IF;
  found_id:=gen_random_uuid();
  INSERT INTO content_revisions(id,product_id,product_version_id,scope,domain,source_revision,creative_profile_revision_id,snapshot,digest,created_at)
    VALUES(found_id,v.product_id,v.id,v.scope,'assessment',v.revision,v.creative_profile_revision_id,payload,encode(sha256(convert_to(payload::text,'UTF8')),'hex'),now());
  RETURN found_id;
END $$;

CREATE OR REPLACE FUNCTION capture_version_content_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE revision_key uuid; previous_key uuid;
BEGIN
  revision_key:=capture_version_content(NEW);
  IF TG_OP='UPDATE' AND NEW.configuration=OLD.configuration AND NEW.revision<>OLD.revision
    AND NEW.creative_profile_revision_id IS NOT DISTINCT FROM OLD.creative_profile_revision_id AND NEW.status<>'DRAFT' THEN
    SELECT id INTO previous_key FROM content_revisions WHERE product_version_id=OLD.id AND asset_id IS NULL AND source_revision=OLD.revision;
    INSERT INTO production_records(id,product_id,scope,output_revision_id,creative_profile_revision_id,actor_user_id,source,batch_key,external_label,skill_version_id,skill_set_id,skill_versions,input_manifest,machine_credential_id,machine_request_id,created_at)
      SELECT gen_random_uuid(),product_id,scope,revision_key,creative_profile_revision_id,actor_user_id,source,batch_key,external_label,skill_version_id,skill_set_id,skill_versions,input_manifest,machine_credential_id,machine_request_id,now()
      FROM production_records WHERE output_revision_id=previous_key;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION capture_asset_content_trigger() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE revision_key uuid; previous_key uuid;
BEGIN
  revision_key:=capture_asset_content(NEW);
  IF TG_OP='UPDATE' AND NEW.authoring IS NOT NULL AND NEW.authoring=OLD.authoring AND NEW.revision<>OLD.revision
    AND NEW.file_id IS NOT DISTINCT FROM OLD.file_id AND NEW.text IS NOT DISTINCT FROM OLD.text AND NEW.variant=OLD.variant
    AND NEW.status<>'DRAFT' THEN
    SELECT id INTO previous_key FROM content_revisions WHERE asset_id=OLD.id AND source_revision=OLD.revision;
    INSERT INTO content_references(id,product_id,scope,target_revision_id,source_revision_id,locator,locator_key,target_locator,target_locator_key,role,mode,source_digest,source_snapshot,used_text,created_at)
      SELECT gen_random_uuid(),product_id,scope,revision_key,source_revision_id,locator,locator_key,target_locator,target_locator_key,role,mode,source_digest,source_snapshot,used_text,now()
      FROM content_references WHERE target_revision_id=previous_key;
    INSERT INTO production_records(id,product_id,scope,output_revision_id,creative_profile_revision_id,actor_user_id,source,batch_key,external_label,skill_version_id,skill_set_id,skill_versions,input_manifest,machine_credential_id,machine_request_id,created_at)
      SELECT gen_random_uuid(),product_id,scope,revision_key,creative_profile_revision_id,actor_user_id,source,batch_key,external_label,skill_version_id,skill_set_id,skill_versions,input_manifest,machine_credential_id,machine_request_id,now()
      FROM production_records WHERE output_revision_id=previous_key;
  END IF;
  RETURN NEW;
END $$;
COMMIT;
