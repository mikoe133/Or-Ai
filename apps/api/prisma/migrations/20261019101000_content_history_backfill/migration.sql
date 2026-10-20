-- Separate idempotent data migration. No source rows, published content or
-- consumer report snapshots are changed. Existing missing files stay missing.
BEGIN;
SELECT orai.capture_version_content(v) FROM orai.product_versions v ORDER BY v.id;
SELECT orai.capture_asset_content(a) FROM orai.campaign_assets a ORDER BY a.id;
COMMIT;
