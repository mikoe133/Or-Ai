ALTER TABLE orai.categories ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);
ALTER TABLE orai.tags ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);
ALTER TABLE orai.products ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);
ALTER TABLE orai.product_versions ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);
ALTER TABLE orai.campaign_assets ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);

CREATE TYPE orai."AssetFileStatus" AS ENUM ('PENDING','VERIFYING','UPLOADED','AVAILABLE','FAILED','EXPIRED');
CREATE TABLE orai.asset_files (
  id UUID PRIMARY KEY,
  product_version_id UUID NOT NULL,
  scope orai."DataScope" NOT NULL,
  owner_user_id UUID NOT NULL,
  kind orai."AssetKind" NOT NULL CHECK (kind IN ('COVER','VIDEO')),
  original_name TEXT NOT NULL CHECK (length(original_name) BETWEEN 1 AND 160 AND position('/' in original_name)=0 AND position(chr(92) in original_name)=0 AND original_name !~ '[[:cntrl:]]'),
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/png','image/jpeg','image/webp','video/mp4','video/webm')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 536870912),
  checksum TEXT NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  storage_key TEXT NOT NULL UNIQUE CHECK (storage_key = id::text || '.blob'),
  status orai."AssetFileStatus" NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ(3) NOT NULL,
  verified_at TIMESTAMPTZ(3),
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL,
  UNIQUE(id, product_version_id, scope),
  FOREIGN KEY(product_version_id,scope) REFERENCES orai.product_versions(id,scope) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY(owner_user_id,scope) REFERENCES orai.users(id,scope) ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK (status <> 'AVAILABLE' OR verified_at IS NOT NULL),
  CHECK ((kind='COVER' AND mime_type LIKE 'image/%') OR (kind='VIDEO' AND mime_type LIKE 'video/%'))
);
CREATE INDEX asset_files_scope_owner_user_id_status_expires_at_idx ON orai.asset_files(scope,owner_user_id,status,expires_at);
ALTER TABLE orai.campaign_assets ADD COLUMN file_id UUID;
ALTER TABLE orai.campaign_assets ADD CONSTRAINT campaign_assets_file_id_product_version_id_scope_fkey
  FOREIGN KEY(file_id,product_version_id,scope) REFERENCES orai.asset_files(id,product_version_id,scope) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION orai.guard_available_file() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='AVAILABLE' AND (NEW.id,NEW.product_version_id,NEW.scope,NEW.owner_user_id,NEW.kind,NEW.original_name,
    NEW.mime_type,NEW.byte_size,NEW.checksum,NEW.storage_key,NEW.status,NEW.verified_at)
    IS DISTINCT FROM (OLD.id,OLD.product_version_id,OLD.scope,OLD.owner_user_id,OLD.kind,OLD.original_name,
    OLD.mime_type,OLD.byte_size,OLD.checksum,OLD.storage_key,OLD.status,OLD.verified_at) THEN
    RAISE EXCEPTION 'Verified file contents are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER available_file_immutable BEFORE UPDATE ON orai.asset_files FOR EACH ROW EXECUTE FUNCTION orai.guard_available_file();

CREATE FUNCTION orai.guard_asset_file() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE f orai.asset_files%ROWTYPE;
BEGIN
  IF NEW.file_id IS NOT NULL THEN
    SELECT * INTO f FROM orai.asset_files WHERE id=NEW.file_id FOR SHARE;
    IF NOT FOUND OR f.status<>'AVAILABLE' OR f.scope<>NEW.scope OR f.product_version_id<>NEW.product_version_id OR f.kind<>NEW.kind OR
      NEW.storage_key IS DISTINCT FROM f.storage_key OR NEW.mime_type IS DISTINCT FROM f.mime_type OR
      NEW.byte_size IS DISTINCT FROM f.byte_size OR NEW.checksum IS DISTINCT FROM f.checksum THEN
      RAISE EXCEPTION 'Asset requires a matching verified file';
    END IF;
  ELSIF NEW.status='READY' AND NEW.kind IN ('COVER','VIDEO') THEN
    RAISE EXCEPTION 'Ready media requires a verified file reference';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER campaign_asset_verified_file BEFORE INSERT OR UPDATE ON orai.campaign_assets FOR EACH ROW EXECUTE FUNCTION orai.guard_asset_file();
REVOKE ALL ON FUNCTION orai.guard_available_file(), orai.guard_asset_file() FROM PUBLIC;
