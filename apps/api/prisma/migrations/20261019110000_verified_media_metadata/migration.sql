ALTER TABLE orai.asset_files ADD COLUMN width INTEGER, ADD COLUMN height INTEGER, ADD COLUMN duration_ms INTEGER;
ALTER TABLE orai.asset_files ADD CONSTRAINT asset_file_dimensions_check CHECK (
  (width IS NULL AND height IS NULL) OR (width BETWEEN 1 AND 16384 AND height BETWEEN 1 AND 16384));
ALTER TABLE orai.asset_files ADD CONSTRAINT asset_file_duration_check CHECK (duration_ms IS NULL OR (kind='VIDEO' AND duration_ms BETWEEN 1 AND 86400000));
CREATE OR REPLACE FUNCTION orai.guard_available_file() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='AVAILABLE' AND (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN
    RAISE EXCEPTION 'Verified file contents are immutable';
  END IF;
  RETURN NEW;
END $$;
