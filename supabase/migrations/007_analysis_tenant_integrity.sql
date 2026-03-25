-- Phase 3 (P0): DB tenant integrity constraints
-- Goal: enforce analysis tenant/user consistency at database level.

-- 1) Add org_id to analyses.
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 2) Backfill missing documents.org_id from users.org_id where possible.
UPDATE public.documents d
SET org_id = u.org_id
FROM public.users u
WHERE d.user_id = u.id
  AND d.org_id IS NULL
  AND u.org_id IS NOT NULL;

-- 3) Backfill analyses user/org from their parent document.
UPDATE public.analyses a
SET
  user_id = d.user_id,
  org_id = d.org_id
FROM public.documents d
WHERE a.document_id = d.id
  AND (
    a.user_id IS DISTINCT FROM d.user_id
    OR a.org_id IS DISTINCT FROM d.org_id
  );

-- 4) Support composite FK checks.
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_id_user_unique
  ON public.documents (id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_id_org_unique
  ON public.documents (id, org_id);

-- 5) Enforce analysis->document user consistency.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analyses_document_user_fk'
      AND conrelid = 'public.analyses'::regclass
  ) THEN
    ALTER TABLE public.analyses
      ADD CONSTRAINT analyses_document_user_fk
      FOREIGN KEY (document_id, user_id)
      REFERENCES public.documents(id, user_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 6) Keep tenant fields in sync on every insert/update.
CREATE OR REPLACE FUNCTION public.sync_analysis_tenant_fields()
RETURNS TRIGGER AS $$
DECLARE
  d_user_id UUID;
  d_org_id UUID;
BEGIN
  SELECT user_id, org_id
  INTO d_user_id, d_org_id
  FROM public.documents
  WHERE id = NEW.document_id;

  IF d_user_id IS NULL THEN
    RAISE EXCEPTION 'Document % not found for analysis tenant sync', NEW.document_id;
  END IF;

  NEW.user_id := d_user_id;
  NEW.org_id := d_org_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_analysis_tenant_fields ON public.analyses;
CREATE TRIGGER trg_sync_analysis_tenant_fields
BEFORE INSERT OR UPDATE OF document_id, user_id, org_id
ON public.analyses
FOR EACH ROW
EXECUTE FUNCTION public.sync_analysis_tenant_fields();

-- 7) Helpful index for org-scoped audit/reporting.
CREATE INDEX IF NOT EXISTS idx_analyses_org_created
  ON public.analyses (org_id, created_at DESC);
