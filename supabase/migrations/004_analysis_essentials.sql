-- Richer analysis output (essentials narrative fields + key point bullets)
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS essentials JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS key_points JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS obligations JSONB DEFAULT '[]'::jsonb;
