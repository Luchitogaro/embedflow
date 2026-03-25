-- Soft delete for documents (Phase 2)
-- Run in Supabase SQL Editor after 001_initial_schema.sql

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.documents.deleted_at IS 'When set, document is hidden from UI; file may be removed from storage.';

CREATE INDEX IF NOT EXISTS idx_documents_active
  ON public.documents (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_org_active
  ON public.documents (org_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- RLS: soft-deleted rows stay in DB but are hidden from SELECT. UPDATE must still allow owners to set deleted_at.
DROP POLICY IF EXISTS "Users can manage own documents" ON public.documents;

CREATE POLICY "Users insert own documents" ON public.documents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users select own active documents" ON public.documents
  FOR SELECT USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users update own documents" ON public.documents
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own documents" ON public.documents
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Org members can view org documents" ON public.documents;
CREATE POLICY "Org members can view org documents" ON public.documents
  FOR SELECT USING (
    deleted_at IS NULL
    AND org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid())
  );
