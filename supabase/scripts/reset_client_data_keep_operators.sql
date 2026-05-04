-- =============================================================================
-- EmbedFlow — reset de datos de clientes conservando cuentas operadoras
-- =============================================================================
-- Edita la lista de emails en `keeper_emails` antes de ejecutar.
-- Ejecutar en Supabase → SQL Editor con rol que pueda borrar en `auth` y `public`.
-- Haz backup o export previo; operación irreversible.
--
-- Qué borra: documentos, análisis, uso, intents de pago, organizaciones y usuarios
--   que no estén en la lista. Qué conserva: filas en subscription_plan_catalog (precios),
--   y usuarios cuyo email esté en la lista (en public.users y auth.users).
-- =============================================================================

BEGIN;

CREATE TEMP TABLE keeper_emails (email TEXT PRIMARY KEY) ON COMMIT DROP;
-- ▼▼▼ Ajusta aquí tus cuentas de control (minúsculas) ▼▼▼
INSERT INTO keeper_emails (email) VALUES
  ('ventas@garsaas.io');
-- ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

DELETE FROM public.analyses;
DELETE FROM public.documents;
DELETE FROM public.usage_events;
DELETE FROM public.payment_intents;

UPDATE public.users SET org_id = NULL WHERE org_id IS NOT NULL;

DELETE FROM public.organizations;

DELETE FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM keeper_emails k WHERE lower(u.email) = lower(k.email)
);

DELETE FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

COMMIT;

-- Tras esto, solo deberían quedar en auth/public los usuarios listados en keeper_emails.
-- Verificación rápida:
-- SELECT email FROM auth.users ORDER BY email;
-- SELECT email FROM public.users ORDER BY email;
