-- Ensure soft-delete UPDATE is allowed: WITH CHECK must NOT require deleted_at IS NULL.
-- (Otherwise setting deleted_at fails with "new row violates row-level security policy".)

DROP POLICY IF EXISTS "Users update own documents" ON public.documents;

CREATE POLICY "Users update own documents" ON public.documents
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
