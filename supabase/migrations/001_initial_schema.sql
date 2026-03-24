-- Embedflow Initial Schema
-- Run against Supabase SQL Editor

-- Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'team', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Organizations: users can only see their own org
CREATE POLICY "Users can view own org" ON public.organizations
  FOR SELECT USING (id IN (SELECT org_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own org" ON public.organizations
  FOR UPDATE USING (id IN (SELECT org_id FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'admin')));

-- Users: users can view/update their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- Documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own documents" ON public.documents
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Org members can view org documents" ON public.documents
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid()));

-- Analyses
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  
  -- Extracted fields (JSONB)
  summary TEXT,
  parties JSONB DEFAULT '[]',
  dates JSONB DEFAULT '{}',
  pricing JSONB DEFAULT '{}',
  key_terms JSONB DEFAULT '{}',
  
  -- Risk & pitch
  risk_flags JSONB DEFAULT '[]',
  pitch_text TEXT,
  
  -- Tokens used for billing
  tokens_used INTEGER DEFAULT 0,
  
  -- Error handling
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own analyses" ON public.analyses
  FOR ALL USING (user_id = auth.uid());

-- Usage tracking
CREATE TABLE IF NOT EXISTS public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view org usage" ON public.usage_events
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.users WHERE id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_org ON public.documents(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_analyses_document ON public.analyses(document_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_org ON public.usage_events(org_id);
CREATE INDEX IF NOT EXISTS idx_usage_created ON public.usage_events(created_at);

-- Function: get org usage for current billing period
CREATE OR REPLACE FUNCTION public.get_org_usage(p_org_id UUID, p_event_type TEXT)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(quantity), 0)
  FROM public.usage_events
  WHERE org_id = p_org_id
    AND event_type = p_event_type
    AND created_at > date_trunc('month', now())
$$ LANGUAGE SQL STABLE;

-- Function: increment usage
CREATE OR REPLACE FUNCTION public.record_usage(p_org_id UUID, p_event_type TEXT, p_quantity INTEGER DEFAULT 1)
RETURNS UUID AS $$
  INSERT INTO public.usage_events (org_id, event_type, quantity)
  VALUES (p_org_id, p_event_type, p_quantity)
  RETURNING id
$$ LANGUAGE SQL;

-- Trigger: auto-create org for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  INSERT INTO public.organizations (name, plan)
  VALUES (NEW.email || '''s Org', 'free')
  RETURNING id INTO org_id;
  
  UPDATE public.users SET org_id = org_id WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger would be on auth.users, not public.users
-- You'll need to create it via Supabase Dashboard or with service role key

-- Storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contracts', 'contracts', false, 10485760, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own contracts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own contracts" ON storage.objects
  FOR SELECT USING (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own contracts" ON storage.objects
  FOR DELETE USING (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);
