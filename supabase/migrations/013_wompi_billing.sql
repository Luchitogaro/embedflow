-- Wompi (Colombia): catálogo de planes, intents y soporte billing_provider = wompi.

ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_billing_provider_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_billing_provider_check
  CHECK (billing_provider IS NULL OR billing_provider IN ('stripe', 'mercadopago', 'wompi'));

COMMENT ON COLUMN public.organizations.billing_provider IS
  'stripe | mercadopago | wompi | null';

CREATE TABLE IF NOT EXISTS public.subscription_plan_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan TEXT NOT NULL UNIQUE CHECK (plan IN ('starter', 'pro', 'team')),
  display_name TEXT NOT NULL,
  amount_in_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP',
  monthly_doc_limit INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_plan TEXT NOT NULL CHECK (target_plan IN ('starter', 'pro', 'team')),
  amount_in_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP',
  status TEXT NOT NULL DEFAULT 'CREATED'
    CHECK (status IN ('CREATED', 'PENDING_WOMPI', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR')),
  wompi_transaction_id TEXT,
  customer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_intents_org ON public.payment_intents(org_id);

ALTER TABLE public.subscription_plan_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.subscription_plan_catalog IS
  'Precios COP para Wompi: amount_in_cents = pesos COP × 100 (convención checkout).';

COMMENT ON TABLE public.payment_intents IS
  'Referencias EF-… enrutadas por GarSaaS hacia este webhook.';

INSERT INTO public.subscription_plan_catalog (plan, display_name, amount_in_cents, currency, monthly_doc_limit, is_active, sort_order)
VALUES
  ('starter', 'Starter', 9900000, 'COP', 20, true, 1),
  ('pro', 'Pro', 19900000, 'COP', NULL, true, 2),
  ('team', 'Team', 59900000, 'COP', NULL, true, 3)
ON CONFLICT (plan) DO NOTHING;
