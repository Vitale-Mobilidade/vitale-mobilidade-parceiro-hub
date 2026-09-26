-- Editorial AI cover pilot: private bucket guard (bucket row is created by the storage tool, not SQL).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'editorial-covers') THEN
    RAISE EXCEPTION 'bucket editorial-covers must exist before this migration';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'editorial-covers' AND public) THEN
    RAISE EXCEPTION 'bucket editorial-covers must be private';
  END IF;
END $$;
-- Intentionally no storage.objects policies: anon/authenticated have no access.
-- Writes: editorial-admin (service role) after auth + editorial role + revision lock.
-- Reads: bike-image (service role) only for the file referenced exactly by a published article.