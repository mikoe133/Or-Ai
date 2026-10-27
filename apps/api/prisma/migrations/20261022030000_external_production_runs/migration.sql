BEGIN;
SET search_path TO orai,pg_temp;
-- AlterTable
ALTER TABLE "machine_project_workspaces" ADD COLUMN     "max_runs_per_project" INTEGER NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE "external_production_runs" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "plan_revision_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "creator_credential_id" UUID NOT NULL,
    "run_key" TEXT NOT NULL,
    "limits" JSONB NOT NULL,
    "digest" TEXT NOT NULL,
    "cancelled_at" TIMESTAMPTZ(3),
    "cancel_reason" TEXT,
    "cancel_actor_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_production_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_production_attempts" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "plan_module_id" UUID NOT NULL,
    "credential_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "client_key" TEXT NOT NULL,
    "input_fingerprint" TEXT NOT NULL,
    "source_frontier_fingerprint" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "methods" JSONB NOT NULL,
    "missing_inputs" JSONB NOT NULL,
    "generation" INTEGER NOT NULL,
    "token_digest" TEXT NOT NULL,
    "lease_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "state" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "output_record_id" UUID,
    "output_digest" TEXT,
    "job" JSONB,
    "reported_cost_fen" INTEGER,
    "reported_tokens" INTEGER,
    "verified_at" TIMESTAMPTZ(3),
    "ended_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_production_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_module_leases" (
    "run_id" UUID NOT NULL,
    "plan_module_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "active_attempt_id" UUID NOT NULL,
    "generation" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "external_module_leases_pkey" PRIMARY KEY ("run_id","plan_module_id")
);

-- CreateTable
CREATE TABLE "external_attempt_events" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "scope" "DataScope" NOT NULL,
    "number" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "reason_code" TEXT,
    "reason" TEXT NOT NULL,
    "job" JSONB,
    "reported_cost_fen" INTEGER,
    "reported_tokens" INTEGER,
    "details" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_attempt_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_production_runs_scope_product_id_created_at_idx" ON "external_production_runs"("scope", "product_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "external_production_runs_product_id_run_key_key" ON "external_production_runs"("product_id", "run_key");

-- CreateIndex
CREATE UNIQUE INDEX "external_production_runs_id_product_id_scope_key" ON "external_production_runs"("id", "product_id", "scope");

-- CreateIndex
CREATE INDEX "external_production_attempts_run_id_plan_module_id_input_fi_idx" ON "external_production_attempts"("run_id", "plan_module_id", "input_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "external_production_attempts_run_id_plan_module_id_generati_key" ON "external_production_attempts"("run_id", "plan_module_id", "generation");

-- CreateIndex
CREATE UNIQUE INDEX "external_production_attempts_id_run_id_plan_module_id_produ_key" ON "external_production_attempts"("id", "run_id", "plan_module_id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "external_production_attempts_id_product_id_scope_key" ON "external_production_attempts"("id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "external_module_leases_active_attempt_id_key" ON "external_module_leases"("active_attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_module_leases_active_attempt_id_run_id_plan_module_key" ON "external_module_leases"("active_attempt_id", "run_id", "plan_module_id", "product_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "external_attempt_events_attempt_id_number_key" ON "external_attempt_events"("attempt_id", "number");

-- AddForeignKey
ALTER TABLE "external_production_runs" ADD CONSTRAINT "external_production_runs_product_id_scope_fkey" FOREIGN KEY ("product_id", "scope") REFERENCES "products"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_production_runs" ADD CONSTRAINT "external_production_runs_plan_revision_id_product_id_scope_fkey" FOREIGN KEY ("plan_revision_id", "product_id", "scope") REFERENCES "production_plan_revisions"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_production_runs" ADD CONSTRAINT "external_production_runs_workspace_id_scope_fkey" FOREIGN KEY ("workspace_id", "scope") REFERENCES "machine_project_workspaces"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_production_runs" ADD CONSTRAINT "external_production_runs_creator_credential_id_scope_fkey" FOREIGN KEY ("creator_credential_id", "scope") REFERENCES "machine_credentials"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_production_runs" ADD CONSTRAINT "external_production_runs_cancel_actor_user_id_scope_fkey" FOREIGN KEY ("cancel_actor_user_id", "scope") REFERENCES "users"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_production_attempts" ADD CONSTRAINT "external_production_attempts_run_id_product_id_scope_fkey" FOREIGN KEY ("run_id", "product_id", "scope") REFERENCES "external_production_runs"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_production_attempts" ADD CONSTRAINT "external_production_attempts_plan_module_id_product_id_sco_fkey" FOREIGN KEY ("plan_module_id", "product_id", "scope") REFERENCES "production_plan_modules"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_production_attempts" ADD CONSTRAINT "external_production_attempts_credential_id_scope_fkey" FOREIGN KEY ("credential_id", "scope") REFERENCES "machine_credentials"("id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_production_attempts" ADD CONSTRAINT "external_production_attempts_output_record_id_product_id_s_fkey" FOREIGN KEY ("output_record_id", "product_id", "scope") REFERENCES "project_production_records"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_module_leases" ADD CONSTRAINT "external_module_leases_run_id_product_id_scope_fkey" FOREIGN KEY ("run_id", "product_id", "scope") REFERENCES "external_production_runs"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_module_leases" ADD CONSTRAINT "external_module_leases_plan_module_id_product_id_scope_fkey" FOREIGN KEY ("plan_module_id", "product_id", "scope") REFERENCES "production_plan_modules"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_module_leases" ADD CONSTRAINT "external_module_leases_active_attempt_id_run_id_plan_modul_fkey" FOREIGN KEY ("active_attempt_id", "run_id", "plan_module_id", "product_id", "scope") REFERENCES "external_production_attempts"("id", "run_id", "plan_module_id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_attempt_events" ADD CONSTRAINT "external_attempt_events_attempt_id_product_id_scope_fkey" FOREIGN KEY ("attempt_id", "product_id", "scope") REFERENCES "external_production_attempts"("id", "product_id", "scope") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE machine_project_workspaces ADD CONSTRAINT machine_workspace_run_limit CHECK(max_runs_per_project BETWEEN 1 AND 100);
ALTER TABLE external_production_runs ADD CONSTRAINT external_run_shape CHECK (
 digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(limits)='object' AND
 (limits->>'maxAttemptsPerModule')::int BETWEEN 1 AND 10 AND (limits->>'maxTotalAttempts')::int BETWEEN 1 AND 400 AND
 (limits->>'maxConcurrency')::int BETWEEN 1 AND 8 AND (limits->>'maxDurationSeconds')::int BETWEEN 60 AND 86400 AND
 ((cancelled_at IS NULL AND cancel_reason IS NULL AND cancel_actor_user_id IS NULL) OR
  (cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL AND cancel_actor_user_id IS NOT NULL)));
CREATE FUNCTION guard_external_run() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE c machine_credentials; w machine_project_workspaces;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'External run history is retained' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.cancelled_at IS NOT NULL OR NEW.cancelled_at IS NULL OR
   (to_jsonb(NEW)-ARRAY['cancelled_at','cancel_reason','cancel_actor_user_id']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['cancelled_at','cancel_reason','cancel_actor_user_id']) OR
   NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.cancel_actor_user_id AND scope=NEW.scope AND role='ADMIN' AND disabled_at IS NULL) THEN
   RAISE EXCEPTION 'External runs may only be cancelled once' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO STRICT c FROM machine_credentials WHERE id=NEW.creator_credential_id AND scope=NEW.scope;
 SELECT * INTO STRICT w FROM machine_project_workspaces WHERE id=NEW.workspace_id AND scope=NEW.scope;
 PERFORM pg_advisory_xact_lock(hashtextextended('machine-workspace:'||w.id::text,0));
 IF c.domain<>'assessment' OR c.workspace_id IS DISTINCT FROM w.id OR c.owner_user_id<>w.owner_user_id OR
  NOT('projects:write'=ANY(c.permissions)) OR NOT machine_has_product(c.id,NEW.product_id,NEW.scope) OR
  NOT EXISTS(SELECT 1 FROM machine_projects WHERE product_id=NEW.product_id AND workspace_id=w.id AND scope=NEW.scope) OR
  (SELECT count(*) FROM external_production_runs WHERE product_id=NEW.product_id)>=w.max_runs_per_project THEN
  RAISE EXCEPTION 'Run outside approved project grant or quota' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER external_run_guard BEFORE INSERT OR UPDATE OR DELETE ON external_production_runs FOR EACH ROW EXECUTE FUNCTION guard_external_run();

ALTER TABLE external_production_attempts ADD CONSTRAINT external_attempt_shape CHECK (
 generation>0 AND revision BETWEEN 0 AND 200 AND input_fingerprint ~ '^[0-9a-f]{64}$' AND source_frontier_fingerprint ~ '^[0-9a-f]{64}$' AND
 token_digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(methods)='array' AND jsonb_array_length(methods)<=12 AND
 jsonb_typeof(inputs)='array' AND jsonb_array_length(inputs)<=40 AND jsonb_typeof(missing_inputs)='array' AND
 state IN ('waiting_input','producing','uploading','validation_failed','failed','saved_draft','cancelled') AND
 ((state IN ('validation_failed','failed','saved_draft','cancelled'))=(ended_at IS NOT NULL)) AND
 ((state='saved_draft')=(output_record_id IS NOT NULL AND output_digest IS NOT NULL AND verified_at IS NOT NULL)) AND
 (reported_cost_fen IS NULL OR reported_cost_fen>=0) AND (reported_tokens IS NULL OR reported_tokens>=0) AND lease_expires_at>created_at);
CREATE FUNCTION guard_external_attempt() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE r external_production_runs; m production_plan_modules; c machine_credentials; last_generation integer; selection jsonb;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'External attempt history is retained' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.ended_at IS NOT NULL OR NEW.revision<>OLD.revision+1 OR
   (to_jsonb(NEW)-ARRAY['state','revision','output_record_id','output_digest','job','reported_cost_fen','reported_tokens','verified_at','ended_at','lease_expires_at']) IS DISTINCT FROM
   (to_jsonb(OLD)-ARRAY['state','revision','output_record_id','output_digest','job','reported_cost_fen','reported_tokens','verified_at','ended_at','lease_expires_at']) OR
   (OLD.reported_cost_fen IS NOT NULL AND COALESCE(NEW.reported_cost_fen,-1)<OLD.reported_cost_fen) OR
   (OLD.reported_tokens IS NOT NULL AND COALESCE(NEW.reported_tokens,-1)<OLD.reported_tokens) OR
   (OLD.job IS NOT NULL AND (NEW.job IS NULL OR NEW.job->>'provider' IS DISTINCT FROM OLD.job->>'provider' OR
     NEW.job->>'jobId' IS DISTINCT FROM OLD.job->>'jobId' OR (OLD.job->>'terminal'='true' AND NEW.job->>'terminal'<>'true'))) THEN
   RAISE EXCEPTION 'Attempt anchors, terminal states and cumulative declarations cannot be rewritten' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('external-run:'||NEW.run_id::text,0));
 SELECT * INTO STRICT r FROM external_production_runs WHERE id=NEW.run_id AND product_id=NEW.product_id AND scope=NEW.scope;
 SELECT * INTO STRICT m FROM production_plan_modules WHERE id=NEW.plan_module_id AND product_id=NEW.product_id AND scope=NEW.scope;
 SELECT * INTO STRICT c FROM machine_credentials WHERE id=NEW.credential_id AND scope=NEW.scope;
 SELECT COALESCE(max(generation),0) INTO last_generation FROM external_production_attempts WHERE run_id=r.id AND plan_module_id=m.id;
 IF r.cancelled_at IS NOT NULL OR m.plan_revision_id<>r.plan_revision_id OR c.workspace_id IS DISTINCT FROM r.workspace_id OR
  c.domain IS DISTINCT FROM m.definition->>'domain' OR NEW.domain<>c.domain OR NOT('content:write'=ANY(c.permissions)) OR
  NOT machine_has_product(c.id,NEW.product_id,NEW.scope) OR NEW.generation<>last_generation+1 OR NEW.state<>'waiting_input' OR NEW.revision<>0 OR
  (SELECT count(*) FROM external_production_attempts WHERE run_id=r.id)>=(r.limits->>'maxTotalAttempts')::int OR
  (SELECT count(*) FROM external_production_attempts WHERE run_id=r.id AND plan_module_id=m.id)>=(r.limits->>'maxAttemptsPerModule')::int OR
  NEW.lease_expires_at>c.expires_at OR NEW.lease_expires_at>r.created_at+make_interval(secs=>(r.limits->>'maxDurationSeconds')::int) THEN
  RAISE EXCEPTION 'Attempt must respect the fixed run, domain, limits and generation' USING ERRCODE='23514'; END IF;
 FOR selection IN SELECT value FROM jsonb_array_elements(NEW.methods) LOOP
  IF NOT EXISTS(SELECT 1 FROM project_method_snapshots s WHERE s.id=(selection->>'snapshotId')::uuid AND s.plan_module_id=m.id AND s.scope=NEW.scope AND s.digest=selection->>'digest') THEN
   RAISE EXCEPTION 'Attempt methods must match fixed module snapshots' USING ERRCODE='23514'; END IF;
 END LOOP;
 FOR selection IN SELECT value FROM jsonb_array_elements(NEW.inputs) LOOP
  IF NOT EXISTS(SELECT 1 FROM project_production_records source JOIN production_plan_modules dependency ON dependency.id=source.plan_module_id
   WHERE source.id=(selection->>'recordId')::uuid AND source.product_id=NEW.product_id AND source.scope=NEW.scope AND source.digest=selection->>'digest'
   AND dependency.plan_revision_id=r.plan_revision_id AND m.definition->'dependsOn' ? (dependency.definition->>'moduleKey')) THEN
   RAISE EXCEPTION 'Attempt inputs must be records of declared same-plan dependencies' USING ERRCODE='23514'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER external_attempt_guard BEFORE INSERT OR UPDATE OR DELETE ON external_production_attempts FOR EACH ROW EXECUTE FUNCTION guard_external_attempt();

CREATE FUNCTION guard_external_lease() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE a external_production_attempts; previous external_production_attempts;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Lease history anchor is retained' USING ERRCODE='23514'; END IF;
 SELECT * INTO STRICT a FROM external_production_attempts WHERE id=NEW.active_attempt_id;
 IF a.run_id<>NEW.run_id OR a.plan_module_id<>NEW.plan_module_id OR a.product_id<>NEW.product_id OR a.scope<>NEW.scope OR
  a.generation<>NEW.generation OR a.ended_at IS NOT NULL THEN RAISE EXCEPTION 'Lease must target its current live attempt' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.run_id<>OLD.run_id OR NEW.plan_module_id<>OLD.plan_module_id OR NEW.product_id<>OLD.product_id OR NEW.scope<>OLD.scope OR
    (NEW.active_attempt_id=OLD.active_attempt_id AND (NEW.generation<>OLD.generation OR NEW.expires_at<=OLD.expires_at)) OR
    (NEW.active_attempt_id<>OLD.active_attempt_id AND NEW.generation<>OLD.generation+1) THEN
    RAISE EXCEPTION 'Lease may only extend or move to the next fenced generation' USING ERRCODE='23514'; END IF;
  IF NEW.active_attempt_id<>OLD.active_attempt_id THEN
   SELECT * INTO STRICT previous FROM external_production_attempts WHERE id=OLD.active_attempt_id;
   IF previous.ended_at IS NULL AND OLD.expires_at>a.created_at THEN RAISE EXCEPTION 'A live worker still owns this module' USING ERRCODE='23514'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER external_lease_guard BEFORE INSERT OR UPDATE OR DELETE ON external_module_leases FOR EACH ROW EXECUTE FUNCTION guard_external_lease();

ALTER TABLE external_attempt_events ADD CONSTRAINT external_attempt_event_shape CHECK (
 number BETWEEN 0 AND 200 AND state IN ('waiting_input','producing','uploading','validation_failed','failed','saved_draft','cancelled') AND
 step IN ('S2','S3','S4','S5','S6') AND length(reason) BETWEEN 1 AND 500 AND jsonb_typeof(details)='object');
CREATE TRIGGER external_attempt_event_immutable BEFORE UPDATE OR DELETE ON external_attempt_events FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE FUNCTION guard_external_attempt_event() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE a external_production_attempts; last_number integer;
BEGIN
 SELECT * INTO STRICT a FROM external_production_attempts WHERE id=NEW.attempt_id;
 SELECT COALESCE(max(number),-1) INTO last_number FROM external_attempt_events WHERE attempt_id=a.id;
 IF NEW.number<>last_number+1 OR a.ended_at IS NOT NULL THEN RAISE EXCEPTION 'Attempt events must append in order before closure' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER external_attempt_event_guard BEFORE INSERT ON external_attempt_events FOR EACH ROW EXECUTE FUNCTION guard_external_attempt_event();
CREATE FUNCTION check_external_attempt_cache() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE key uuid; a external_production_attempts; e external_attempt_events; lease external_module_leases; record project_production_records;
BEGIN
 IF TG_TABLE_NAME='external_production_attempts' THEN key:=NEW.id; ELSE key:=NEW.attempt_id; END IF;
 SELECT * INTO STRICT a FROM external_production_attempts WHERE id=key;
 SELECT * INTO STRICT e FROM external_attempt_events WHERE attempt_id=key ORDER BY number DESC LIMIT 1;
 IF a.revision<>e.number OR a.state<>e.state OR a.job IS DISTINCT FROM e.job OR a.reported_cost_fen IS DISTINCT FROM e.reported_cost_fen OR a.reported_tokens IS DISTINCT FROM e.reported_tokens THEN
  RAISE EXCEPTION 'Attempt projection must match its persisted latest receipt' USING ERRCODE='23514'; END IF;
 SELECT * INTO lease FROM external_module_leases WHERE active_attempt_id=a.id;
 IF lease.active_attempt_id IS NOT NULL AND lease.expires_at IS DISTINCT FROM a.lease_expires_at THEN
  RAISE EXCEPTION 'Lease deadline must match its persisted receipt' USING ERRCODE='23514'; END IF;
 IF a.state='saved_draft' THEN
  SELECT * INTO STRICT record FROM project_production_records WHERE id=a.output_record_id AND plan_module_id=a.plan_module_id AND product_id=a.product_id AND scope=a.scope;
  IF record.digest IS DISTINCT FROM a.output_digest OR e.details->>'recordId' IS DISTINCT FROM record.id::text OR e.details->>'digest' IS DISTINCT FROM record.digest OR
    jsonb_array_length(a.methods)<>jsonb_array_length(record.document->'methods') OR jsonb_array_length(a.inputs)<>jsonb_array_length(record.document->'inputs') OR
    EXISTS(SELECT 1 FROM jsonb_array_elements(a.methods) selected WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(record.document->'methods') fixed
      WHERE fixed->>'snapshotId'=selected->>'snapshotId' AND fixed->>'digest'=selected->>'digest')) OR
    EXISTS(SELECT 1 FROM jsonb_array_elements(a.inputs) selected WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(record.document->'inputs') fixed
      WHERE fixed->>'recordId'=selected->>'recordId' AND fixed->>'digest'=selected->>'digest')) THEN
    RAISE EXCEPTION 'Saved receipts must retain their exact actual production record, methods and inputs' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER external_attempt_cache_complete AFTER INSERT OR UPDATE ON external_production_attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_external_attempt_cache();
CREATE CONSTRAINT TRIGGER external_attempt_event_complete AFTER INSERT ON external_attempt_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_external_attempt_cache();
REVOKE ALL ON external_production_runs,external_production_attempts,external_module_leases,external_attempt_events FROM PUBLIC;
COMMIT;
