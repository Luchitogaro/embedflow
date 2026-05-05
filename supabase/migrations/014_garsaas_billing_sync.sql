-- Seguimiento sync GarSaaS (facturación DIAN): reintentos y correlación con billing_invoices.

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS garsaas_invoice_id UUID,
  ADD COLUMN IF NOT EXISTS garsaas_notify_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS garsaas_notify_next_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS garsaas_notify_last_error TEXT,
  ADD COLUMN IF NOT EXISTS garsaas_no_upstream BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.payment_intents.garsaas_invoice_id IS
  'UUID devuelto por GarSaaS POST /api/internal/billing/payment-approved (tabla billing_invoices).';
COMMENT ON COLUMN public.payment_intents.garsaas_notify_attempts IS
  'Intentos de POST a GarSaaS (webhook + cron); sin incrementar si no hay URL configurada.';
COMMENT ON COLUMN public.payment_intents.garsaas_notify_next_at IS
  'Próximo reintento permitido (cron); NULL tras éxito o si no aplica.';
COMMENT ON COLUMN public.payment_intents.garsaas_no_upstream IS
  'True cuando no hay GARSAAS_BILLING_URL/secret: no reintentar desde cron.';

CREATE INDEX IF NOT EXISTS idx_payment_intents_garsaas_retry
  ON public.payment_intents (garsaas_notify_next_at)
  WHERE garsaas_invoice_id IS NULL
    AND garsaas_no_upstream = false
    AND status = 'APPROVED';
