-- Phase 1 (P0): Storage RLS isolation hardening
-- Goal: prevent cross-user access to files in bucket `contracts`.
--
-- Policy model:
-- - Object path must start with "<auth.uid()>/..."
-- - Applies to INSERT/SELECT/UPDATE/DELETE
-- - Only authenticated users can act on their own prefix

-- Remove broad policies from initial schema if present.
DROP POLICY IF EXISTS "Users can upload own contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own contracts" ON storage.objects;

-- Insert only inside caller-owned prefix.
CREATE POLICY "Users can insert own contracts prefix" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'contracts'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Read only caller-owned prefix.
CREATE POLICY "Users can select own contracts prefix" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'contracts'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Update only caller-owned prefix.
CREATE POLICY "Users can update own contracts prefix" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'contracts'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'contracts'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Delete only caller-owned prefix.
CREATE POLICY "Users can delete own contracts prefix" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'contracts'
    AND auth.uid() IS NOT NULL
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Optional manual verification (run in SQL editor with impersonated users):
-- 1) User A inserts at "A_UID/file.pdf" => allowed.
-- 2) User B SELECT/DELETE "A_UID/file.pdf" => denied.
-- 3) User A SELECT/DELETE "A_UID/file.pdf" => allowed.
