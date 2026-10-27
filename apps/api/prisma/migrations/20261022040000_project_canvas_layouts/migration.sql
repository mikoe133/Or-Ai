BEGIN;
SET search_path TO orai,pg_temp;
CREATE TABLE project_canvas_layout_revisions (
 id UUID NOT NULL, product_id UUID NOT NULL, scope "DataScope" NOT NULL,
 plan_revision_id UUID NOT NULL, number INTEGER NOT NULL, document JSONB NOT NULL, digest TEXT NOT NULL,
 actor_user_id UUID NOT NULL, created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT project_canvas_layout_revisions_pkey PRIMARY KEY (id),
 CONSTRAINT project_canvas_layout_plan_fkey FOREIGN KEY (plan_revision_id,product_id,scope)
  REFERENCES production_plan_revisions(id,product_id,scope) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT project_canvas_layout_actor_fkey FOREIGN KEY (actor_user_id,scope)
  REFERENCES users(id,scope) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT project_canvas_layout_shape CHECK (number>0 AND digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(document)='object'
  AND document->>'schemaVersion'='1' AND jsonb_typeof(document->'positions')='array' AND jsonb_array_length(document->'positions')<=41)
);
CREATE UNIQUE INDEX project_canvas_layout_revisions_plan_revision_id_number_key ON project_canvas_layout_revisions(plan_revision_id,number);
CREATE INDEX project_canvas_layout_scope_product_plan_created_idx ON project_canvas_layout_revisions(scope,product_id,plan_revision_id,created_at);
CREATE TRIGGER project_canvas_layout_immutable BEFORE UPDATE OR DELETE ON project_canvas_layout_revisions FOR EACH ROW EXECUTE FUNCTION keep_content_history();
CREATE FUNCTION guard_project_canvas_layout() RETURNS trigger LANGUAGE plpgsql SET search_path=orai,pg_temp AS $$
DECLARE p production_plan_revisions; entry jsonb; last_number integer;
BEGIN
 SELECT * INTO STRICT p FROM production_plan_revisions WHERE id=NEW.plan_revision_id AND product_id=NEW.product_id AND scope=NEW.scope;
 PERFORM id FROM products WHERE id=p.product_id AND scope=p.scope FOR UPDATE;
 IF p.number<>(SELECT max(number) FROM production_plan_revisions WHERE product_id=p.product_id AND scope=p.scope) THEN
  RAISE EXCEPTION 'Historical plan layouts are read only' USING ERRCODE='23514'; END IF;
 SELECT COALESCE(max(number),0) INTO last_number FROM project_canvas_layout_revisions WHERE plan_revision_id=p.id;
 IF NEW.number<>last_number+1 THEN RAISE EXCEPTION 'Canvas layout history must append sequentially' USING ERRCODE='23514'; END IF;
 IF (SELECT count(*)<>count(DISTINCT value->>'nodeKey') FROM jsonb_array_elements(NEW.document->'positions')) THEN
  RAISE EXCEPTION 'Canvas positions must have unique node keys' USING ERRCODE='23514'; END IF;
 FOR entry IN SELECT value FROM jsonb_array_elements(NEW.document->'positions') LOOP
  IF jsonb_typeof(entry)<>'object' OR NOT(entry ?& ARRAY['nodeKey','x','y']) OR jsonb_typeof(entry->'x')<>'number' OR jsonb_typeof(entry->'y')<>'number' OR
    abs((entry->>'x')::numeric)>100000 OR abs((entry->>'y')::numeric)>100000 OR
    (entry->>'nodeKey'<>'plan' AND NOT EXISTS(SELECT 1 FROM production_plan_modules m
      WHERE m.plan_revision_id=p.id AND entry->>'nodeKey'='module:'||(m.definition->>'moduleKey'))) THEN
   RAISE EXCEPTION 'Canvas layout positions must belong to the fixed plan' USING ERRCODE='23514'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER project_canvas_layout_guard BEFORE INSERT ON project_canvas_layout_revisions FOR EACH ROW EXECUTE FUNCTION guard_project_canvas_layout();
REVOKE ALL ON project_canvas_layout_revisions FROM PUBLIC;
COMMIT;
