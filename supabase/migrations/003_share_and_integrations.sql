-- Public read-only share links + org Slack webhook
-- Run after 002_documents_soft_delete.sql

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS share_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_share_token_unique
  ON public.documents (share_token)
  WHERE share_token IS NOT NULL;

COMMENT ON COLUMN public.documents.share_token IS 'Opaque token for public read-only analysis page; null = sharing disabled.';

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;

COMMENT ON COLUMN public.organizations.slack_webhook_url IS 'Incoming webhook for Slack (https://hooks.slack.com/...). Optional.';
