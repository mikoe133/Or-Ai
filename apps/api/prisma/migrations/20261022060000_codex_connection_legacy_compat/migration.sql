BEGIN;
SET search_path TO orai,pg_temp;
-- Legacy credentials do not belong to a unified connection. Do not enqueue
-- deferred group events for them, including during owner-only maintenance.
DROP TRIGGER codex_credential_complete ON machine_credentials;
CREATE CONSTRAINT TRIGGER codex_credential_complete AFTER INSERT OR UPDATE ON machine_credentials
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
 WHEN (NEW.codex_connection_id IS NOT NULL)
 EXECUTE FUNCTION guard_codex_connection_complete();
COMMIT;
