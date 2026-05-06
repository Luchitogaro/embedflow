# Operación: billing Wompi + cola GarSaaS (sin API DIAN en la app)

Guía corta para que los cobros lleguen a la cola central y qué revisar cuando algo falla.

## Variables imprescindibles (producción)

| Variable | Rol |
|----------|-----|
| `GARSAAS_BILLING_URL` | `POST` interno, ej. `https://<garsaas>/api/internal/billing/payment-approved` |
| `GARSAAS_INTERNAL_BILLING_SECRET` | Mismo valor que en el servicio GarSaaS (`Authorization: Bearer`) |
| `WOMPI_EVENTS_SECRET` | Recomendado: valida checksum de eventos en `/api/webhooks/wompi` |
| `CRON_SECRET` | Protege `GET /api/cron/garsaas-billing-sync` |

## Cron de reintentos

Tras un pago **APPROVED**, si el primer `POST` a GarSaaS falla, el intent queda con `garsaas_notify_next_at` y debe **reintentarse** el job HTTP:

- **Ruta:** `GET /api/cron/garsaas-billing-sync`
- **Cabecera:** `Authorization: Bearer <CRON_SECRET>`
- **Frecuencia sugerida:** cada 5 minutos (Railway Scheduled Task, Vercel Cron, etc.)

Respuesta JSON incluye `scanned`, `due`, `processed` para comprobar en logs del proveedor.

## Alertas operativas (opcional)

Si configuras:

```bash
BILLING_OPS_WEBHOOK_URL=https://hooks.slack.com/services/...   # o Zapier/Make
# BILLING_OPS_WEBHOOK_SECRET=...   # opcional; envía Authorization: Bearer
```

Se envía un **POST JSON** cuando un cobro acumula fallos de notify en los intentos **1** (primer fallo) y **10** (escalación), para no saturar el canal:

```json
{
  "event": "garsaas_notify_failed",
  "source_app": "embedflow",
  "reference": "…",
  "attempts": 1,
  "error": "…",
  "http_status": 503,
  "next_retry_at": "…",
  "emitted_at": "…"
}
```

## Qué mirar en logs

- `[billing] GarSaaS DIAN notify ok` — cola recibió el cobro.
- `[billing] GarSaaS DIAN notify failed` — revisar cuerpo/código HTTP; típico: GarSaaS sin `DATABASE_URL`, secreto incorrecto, o **Cloudflare challenge** (403 HTML): usar URL que no exija JS challenge al servidor.
- UI **Facturación**: estado por fila en “Mis facturas y cobros” (sync / pendiente / error).

## Migraciones Supabase

Incluyen columnas de sync en `payment_intents` y perfil fiscal en `organizations`; aplicar todas hasta `016_org_billing_profile.sql` (o posteriores) antes de producción.
