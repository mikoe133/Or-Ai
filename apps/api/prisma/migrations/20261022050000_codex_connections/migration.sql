BEGIN;
SET search_path TO orai,pg_temp;
-- AlterTable
ALTER TABLE "machine_credentials" ADD COLUMN     "codex_connection_id" UUID;

-- CreateTable
CREATE TABLE "codex_connections" (
    "id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "client_key" UUID NOT NULL,
    "input_digest" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "codex_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "codex_connections_scope_owner_user_id_created_at_idx" ON "codex_connections"("scope", "owner_user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "codex_connections_id_owner_user_id_workspace_id_scope_key" ON "codex_connections"("id", "owner_user_id", "workspace_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "codex_connections_owner_user_id_scope_client_key_key" ON "codex_connections"("owner_user_id", "scope", "client_key");

-- CreateIndex
CREATE UNIQUE INDEX "machine_credentials_codex_connection_id_domain_key" ON "machine_credentials"("codex_connection_id", "domain");

-- AddForeignKey
ALTER TABLE "machine_credentials" ADD CONSTRAINT "machine_credentials_codex_connection_id_owner_user_id_work_fkey" FOREIGN KEY ("codex_connection_id", "owner_user_id", "workspace_id", "scope") REFERENCES "codex_connections"("id", "owner_user_id", "workspace_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codex_connections" ADD CONSTRAINT "codex_connections_owner_user_id_scope_fkey" FOREIGN KEY ("owner_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codex_connections" ADD CONSTRAINT "codex_connections_workspace_id_scope_fkey" FOREIGN KEY ("workspace_id", "scope") REFERENCES "machine_project_workspaces"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE machine_credentials ADD CONSTRAINT codex_credential_workspace_required
 CHECK (codex_connection_id IS NULL OR workspace_id IS NOT NULL);
ALTER TABLE codex_connections ADD CONSTRAINT codex_connection_shape CHECK (
 input_digest ~ '^[0-9a-f]{64}$' AND digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(document)='object'
 AND document->>'digest'=digest AND jsonb_typeof(document->'plan')='object'
 AND jsonb_typeof(document->'summary'->'grants')='array'
 AND jsonb_array_length(document->'summary'->'grants') BETWEEN 1 AND 5
 AND expires_at>created_at);
CREATE TRIGGER codex_connection_immutable BEFORE UPDATE OR DELETE ON codex_connections
 FOR EACH ROW EXECUTE FUNCTION machine_credential_guard();
CREATE FUNCTION guard_codex_connection_complete() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE c codex_connections; w machine_project_workspaces; credential machine_credentials; selected jsonb;
BEGIN
 IF TG_TABLE_NAME='machine_credentials' THEN
  IF NEW.codex_connection_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO STRICT c FROM codex_connections WHERE id=NEW.codex_connection_id;
 ELSE SELECT * INTO STRICT c FROM codex_connections WHERE id=NEW.id;
 END IF;
 SELECT * INTO STRICT w FROM machine_project_workspaces WHERE id=c.workspace_id AND scope=c.scope;
 IF w.owner_user_id<>c.owner_user_id OR w.expires_at<c.expires_at OR
  (c.revoked_at IS NOT NULL AND EXISTS(SELECT 1 FROM machine_credentials WHERE codex_connection_id=c.id AND revoked_at IS NULL)) OR
  (SELECT count(*) FROM machine_credentials WHERE codex_connection_id=c.id)<>jsonb_array_length(c.document->'summary'->'grants') THEN
  RAISE EXCEPTION 'Codex connection must retain its complete bounded credential set' USING ERRCODE='23514'; END IF;
 FOR selected IN SELECT value FROM jsonb_array_elements(c.document->'summary'->'grants') LOOP
  SELECT * INTO credential FROM machine_credentials WHERE codex_connection_id=c.id AND domain=selected->>'domain';
  IF NOT FOUND OR credential.scope<>c.scope OR credential.owner_user_id<>c.owner_user_id OR credential.workspace_id<>c.workspace_id OR
   credential.expires_at<>c.expires_at OR cardinality(credential.product_ids)<>0 OR
   ARRAY(SELECT unnest(credential.permissions) ORDER BY 1) IS DISTINCT FROM
    ARRAY(SELECT jsonb_array_elements_text(selected->'permissions') ORDER BY 1) OR
   ARRAY(SELECT unnest(credential.skill_ids)::text ORDER BY 1) IS DISTINCT FROM
    ARRAY(SELECT jsonb_array_elements_text(selected->'skillIds') ORDER BY 1) THEN
   RAISE EXCEPTION 'Codex credential differs from the confirmed domain grant' USING ERRCODE='23514'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER codex_connection_complete AFTER INSERT OR UPDATE ON codex_connections
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION guard_codex_connection_complete();
CREATE CONSTRAINT TRIGGER codex_credential_complete AFTER INSERT OR UPDATE ON machine_credentials
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION guard_codex_connection_complete();
REVOKE ALL ON codex_connections FROM PUBLIC;

COMMIT;
