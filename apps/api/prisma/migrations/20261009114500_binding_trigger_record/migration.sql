BEGIN;
-- Trigger records have different row types on the two tables. Separate the
-- expressions so PostgreSQL only resolves fields belonging to the active record.
CREATE OR REPLACE FUNCTION orai.check_binding_consistency() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
  IF TG_TABLE_NAME = 'entitlements' THEN
    target := COALESCE(NEW.id, OLD.id);
  ELSE
    target := COALESCE(NEW.entitlement_id, OLD.entitlement_id);
  END IF;
  IF EXISTS (SELECT 1 FROM orai.entitlements e WHERE e.id = target AND e.ownership = 'ACCOUNT_BOUND' AND
    NOT EXISTS (SELECT 1 FROM orai.entitlement_bindings b WHERE b.entitlement_id = e.id AND b.user_id = e.owner_user_id)) THEN
    RAISE EXCEPTION 'Account ownership requires its unique binding';
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION orai.check_binding_consistency() FROM PUBLIC;
COMMIT;
