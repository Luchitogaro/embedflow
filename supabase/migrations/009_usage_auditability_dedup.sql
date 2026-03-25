-- Phase 5 (P1): Billing/usage auditability hardening
-- Goal: make usage events attributable and deduplicated for document uploads.

ALTER TABLE public.usage_events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.usage_events.user_id IS
  'User responsible for the usage event when known.';
COMMENT ON COLUMN public.usage_events.document_id IS
  'Document associated with the usage event when applicable.';

-- Backfill known document-upload events when traceable by org and current month relation.
-- (Best-effort only; historical perfect backfill may not be possible.)
UPDATE public.usage_events ue
SET
  user_id = d.user_id,
  document_id = d.id
FROM public.documents d
WHERE ue.event_type = 'doc_upload'
  AND ue.document_id IS NULL
  AND ue.org_id IS NOT DISTINCT FROM d.org_id
  AND date_trunc('month', ue.created_at) = date_trunc('month', d.created_at);

-- Prevent duplicate counting of the same uploaded document.
CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_doc_upload_unique
  ON public.usage_events (org_id, event_type, document_id)
  WHERE event_type = 'doc_upload' AND document_id IS NOT NULL;

-- Strongly attributable helper for upload events.
CREATE OR REPLACE FUNCTION public.record_document_upload_usage(
  p_org_id UUID,
  p_user_id UUID,
  p_document_id UUID
)
RETURNS UUID AS $$
DECLARE
  inserted_id UUID;
BEGIN
  INSERT INTO public.usage_events (org_id, user_id, document_id, event_type, quantity)
  VALUES (p_org_id, p_user_id, p_document_id, 'doc_upload', 1)
  ON CONFLICT (org_id, event_type, document_id)
  WHERE event_type = 'doc_upload' AND document_id IS NOT NULL
  DO NOTHING
  RETURNING id INTO inserted_id;

  RETURN inserted_id;
END;
$$ LANGUAGE plpgsql;
