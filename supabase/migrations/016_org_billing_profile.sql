-- Perfil fiscal del adquiriente (DIAN / GarSaaS), alineado con BabyFirst MVP.
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS billing_tax_id_type TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS billing_tax_id TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS billing_legal_name TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS billing_invoice_email TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS billing_phone TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS billing_country TEXT DEFAULT 'CO';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS billing_address_line TEXT;

COMMENT ON COLUMN public.organizations.billing_tax_id_type IS 'Tipo documento tributario adquiriente (NIT, CC, CE, PA, TI).';
COMMENT ON COLUMN public.organizations.billing_tax_id IS 'Número de documento sin formato visual donde aplique.';
COMMENT ON COLUMN public.organizations.billing_legal_name IS 'Razón social o nombre completo para factura.';
COMMENT ON COLUMN public.organizations.billing_invoice_email IS 'Correo para envío de factura electrónica.';
COMMENT ON COLUMN public.organizations.billing_phone IS 'Teléfono de contacto fiscal.';
COMMENT ON COLUMN public.organizations.billing_country IS 'ISO país facturación; MVP Colombia CO.';
COMMENT ON COLUMN public.organizations.billing_address_line IS 'Dirección línea fiscal.';
