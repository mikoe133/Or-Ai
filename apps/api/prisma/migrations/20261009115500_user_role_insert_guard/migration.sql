BEGIN;
-- Prisma includes the USER default in INSERT. Allow that column while preventing
-- the application account from creating an administrator through INSERT.
CREATE FUNCTION orai.guard_initial_user_role() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_role oid;
BEGIN
  SELECT c.relowner INTO owner_role FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'orai' AND c.relname = 'users';
  IF NEW.role <> 'USER' AND NOT pg_has_role(current_user, owner_role, 'USAGE') THEN
    RAISE EXCEPTION 'Only the database owner may assign initial administrator roles';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER user_role_on_insert BEFORE INSERT ON orai.users
  FOR EACH ROW EXECUTE FUNCTION orai.guard_initial_user_role();
REVOKE ALL ON FUNCTION orai.guard_initial_user_role() FROM PUBLIC;
COMMIT;
