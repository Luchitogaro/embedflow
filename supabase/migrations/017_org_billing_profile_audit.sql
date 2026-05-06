-- Auditoría mínima del perfil fiscal (quién / cuándo).
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS billing_profile_updated_at TIMESTAMPTZ;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS billing_profile_updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.organizations.billing_profile_updated_at IS 'Última vez que se guardaron datos fiscales del adquiriente.';
COMMENT ON COLUMN public.organizations.billing_profile_updated_by IS 'Usuario (public.users) que realizó la última actualización fiscal.';
