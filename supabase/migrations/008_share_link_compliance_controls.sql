-- Phase 4 (P0/P1): share-link compliance controls
-- Goal: add governance metadata + expiry/revocation controls for public share links.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS share_enabled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_shared_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.documents.share_enabled_at IS
  'When a share link was enabled.';
COMMENT ON COLUMN public.documents.share_expires_at IS
  'Expiry timestamp for share link; null means no expiry (legacy behavior).';
COMMENT ON COLUMN public.documents.share_revoked_at IS
  'When sharing was explicitly revoked.';
COMMENT ON COLUMN public.documents.share_shared_by IS
  'User that last enabled sharing.';

CREATE INDEX IF NOT EXISTS idx_documents_share_expires_at
  ON public.documents (share_expires_at)
  WHERE share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_share_revoked_at
  ON public.documents (share_revoked_at)
  WHERE share_token IS NOT NULL;
