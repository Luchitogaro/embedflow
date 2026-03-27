-- Worker-populated hints about extracted text (noise, truncation) for UI disclaimers.
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS source_quality JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.analyses.source_quality IS
  'e.g. {"weak_text": bool, "char_count": int, "truncated_before_analysis": bool} — not legal advice.';
