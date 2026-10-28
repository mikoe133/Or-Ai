-- Execute in the same exported REPEATABLE READ snapshot as pg_dump.
-- Stop writes and cleanup first. This is an inventory, never an object deletion.
-- AVAILABLE rows are mandatory. Keep UPLOADED/PENDING rows for reconciliation;
-- an absent object for those states must be recorded rather than called verified.
SELECT source, id, scope, status, storage_key, byte_size, checksum, mime_type
FROM (
  SELECT 'asset_files' AS source, id, scope::text, status::text,
         storage_key, byte_size, checksum, mime_type FROM orai.asset_files
  UNION ALL
  SELECT 'skill_reference_files', id, scope::text, status::text,
         storage_key, byte_size, checksum, mime_type FROM orai.skill_reference_files
  UNION ALL
  SELECT 'project_original_files', id, scope::text, status::text,
         storage_key, byte_size, checksum, mime_type FROM orai.project_original_files
) objects
ORDER BY source, id;
