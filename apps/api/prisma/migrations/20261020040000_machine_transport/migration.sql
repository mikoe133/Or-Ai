SET search_path TO orai, pg_temp;

-- CreateTable
CREATE TABLE "machine_credentials" (
    "id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "permissions" TEXT[],
    "product_ids" UUID[],
    "skill_ids" UUID[],
    "token_digest" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "machine_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_uploads" (
    "id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "credential_id" UUID NOT NULL,
    "target" JSONB NOT NULL,
    "asset_file_id" UUID,
    "skill_file_id" UUID,
    "ticket_digest" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_calls" (
    "id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "credential_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "error_code" TEXT,
    "entity_id" UUID,
    "request_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "machine_credentials_token_digest_key" ON "machine_credentials"("token_digest");

-- CreateIndex
CREATE INDEX "machine_credentials_scope_created_at_idx" ON "machine_credentials"("scope", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "machine_credentials_id_scope_key" ON "machine_credentials"("id", "scope");

-- CreateIndex
CREATE INDEX "machine_uploads_credential_id_created_at_idx" ON "machine_uploads"("credential_id", "created_at");

-- CreateIndex
CREATE INDEX "machine_calls_credential_id_created_at_idx" ON "machine_calls"("credential_id", "created_at");

-- AddForeignKey
ALTER TABLE "machine_credentials" ADD CONSTRAINT "machine_credentials_owner_user_id_scope_fkey" FOREIGN KEY ("owner_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_uploads" ADD CONSTRAINT "machine_uploads_credential_id_scope_fkey" FOREIGN KEY ("credential_id", "scope") REFERENCES "machine_credentials"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_uploads" ADD CONSTRAINT "machine_uploads_asset_file_id_fkey" FOREIGN KEY ("asset_file_id") REFERENCES "asset_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_uploads" ADD CONSTRAINT "machine_uploads_skill_file_id_fkey" FOREIGN KEY ("skill_file_id") REFERENCES "skill_reference_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_calls" ADD CONSTRAINT "machine_calls_credential_id_scope_fkey" FOREIGN KEY ("credential_id", "scope") REFERENCES "machine_credentials"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE machine_credentials
  ALTER COLUMN permissions SET NOT NULL,
  ALTER COLUMN product_ids SET NOT NULL,
  ALTER COLUMN skill_ids SET NOT NULL,
  ADD CONSTRAINT machine_credential_domain CHECK (domain IN ('assessment','cover','video','copy')),
  ADD CONSTRAINT machine_credential_digest CHECK (token_digest ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT machine_credential_permissions CHECK (cardinality(permissions) BETWEEN 1 AND 5 AND permissions <@ ARRAY['content:read','content:write','skills:read','skills:write','context:read']::text[]),
  ADD CONSTRAINT machine_credential_ranges CHECK (cardinality(product_ids) <= 100 AND cardinality(skill_ids) <= 100),
  ADD CONSTRAINT machine_credential_expiry CHECK (expires_at > created_at AND expires_at <= created_at + INTERVAL '90 days');
ALTER TABLE machine_uploads
  ADD CONSTRAINT machine_upload_one_file CHECK ((asset_file_id IS NULL) <> (skill_file_id IS NULL)),
  ADD CONSTRAINT machine_upload_digest CHECK (ticket_digest ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT machine_upload_expiry CHECK (expires_at > created_at AND expires_at <= created_at + INTERVAL '15 minutes');
ALTER TABLE machine_calls
  ADD CONSTRAINT machine_call_domain CHECK (domain IN ('assessment','cover','video','copy')),
  ADD CONSTRAINT machine_call_outcome CHECK (outcome IN ('success','denied','failed'));

CREATE FUNCTION machine_credential_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = orai, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'machine credential history is retained'; END IF;
  IF (to_jsonb(NEW) - 'revoked_at') IS DISTINCT FROM (to_jsonb(OLD) - 'revoked_at') OR
    (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at) OR NEW.revoked_at IS NULL THEN
    RAISE EXCEPTION 'machine credential grants are immutable; issue a new credential';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER machine_credential_guard BEFORE UPDATE OR DELETE ON machine_credentials FOR EACH ROW EXECUTE FUNCTION machine_credential_guard();

CREATE FUNCTION machine_transport_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = orai, pg_temp AS $$
BEGIN RAISE EXCEPTION 'machine transport history is immutable'; END $$;
CREATE TRIGGER machine_upload_immutable BEFORE UPDATE OR DELETE ON machine_uploads FOR EACH ROW EXECUTE FUNCTION machine_transport_immutable();
CREATE TRIGGER machine_call_immutable BEFORE UPDATE OR DELETE ON machine_calls FOR EACH ROW EXECUTE FUNCTION machine_transport_immutable();

CREATE FUNCTION machine_upload_binding_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = orai, pg_temp AS $$
DECLARE c machine_credentials; f asset_files; sf skill_reference_files;
BEGIN
  SELECT * INTO STRICT c FROM machine_credentials WHERE id = NEW.credential_id AND scope = NEW.scope;
  IF c.revoked_at IS NOT NULL OR c.expires_at <= statement_timestamp() OR NEW.expires_at > c.expires_at THEN
    RAISE EXCEPTION 'invalid machine upload credential';
  END IF;
  IF NEW.asset_file_id IS NOT NULL THEN
    SELECT * INTO STRICT f FROM asset_files WHERE id = NEW.asset_file_id AND scope = NEW.scope AND owner_user_id = c.owner_user_id;
    IF NEW.id <> f.id OR NEW.target->>'type' IS DISTINCT FROM 'media' OR NEW.target->>'productVersionId' IS DISTINCT FROM f.product_version_id::text OR
      NEW.target->>'kind' IS DISTINCT FROM lower(f.kind::text) OR c.domain <> lower(f.kind::text) OR NOT ('content:write' = ANY(c.permissions)) OR
      NOT EXISTS (SELECT 1 FROM product_versions WHERE id = f.product_version_id AND product_id = ANY(c.product_ids) AND scope = NEW.scope) THEN
      RAISE EXCEPTION 'machine media target mismatch';
    END IF;
  ELSE
    SELECT * INTO STRICT sf FROM skill_reference_files WHERE id = NEW.skill_file_id AND scope = NEW.scope AND owner_user_id = c.owner_user_id;
    IF NEW.id <> sf.id OR NEW.target->>'type' IS DISTINCT FROM 'skill_reference' OR NEW.target->>'skillId' IS DISTINCT FROM sf.skill_id::text OR
      NOT ('skills:write' = ANY(c.permissions)) OR NOT (sf.skill_id = ANY(c.skill_ids)) OR
      NOT EXISTS (SELECT 1 FROM style_skills WHERE id = sf.skill_id AND domain = c.domain AND scope = NEW.scope) THEN
      RAISE EXCEPTION 'machine skill target mismatch';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER machine_upload_binding_guard BEFORE INSERT ON machine_uploads FOR EACH ROW EXECUTE FUNCTION machine_upload_binding_guard();
