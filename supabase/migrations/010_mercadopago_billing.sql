-- Mercado Pago (Colombia / regional): local billing alongside optional Stripe.
-- plan_expires_at: when set for mercadopago-paid orgs, app treats plan as free after this instant.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS billing_provider TEXT
    CHECK (billing_provider IS NULL OR billing_provider IN ('stripe', 'mercadopago'));

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.organizations.billing_provider IS
  'stripe | mercadopago | null (legacy: infer from stripe ids if present).';

COMMENT ON COLUMN public.organizations.plan_expires_at IS
  'Paid access end time for Mercado Pago one-shot plan purchases; null = no local expiry (e.g. Stripe).';
