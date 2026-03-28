-- Record explicit consent for AI analysis of uploaded contract text (audit / privacy).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ai_processing_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_processing_consent_version TEXT;

COMMENT ON COLUMN public.users.ai_processing_consent_at IS 'When the user accepted AI processing of contract content.';
COMMENT ON COLUMN public.users.ai_processing_consent_version IS 'Consent copy/version identifier at acceptance time.';
