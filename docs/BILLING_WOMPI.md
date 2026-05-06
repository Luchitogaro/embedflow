# EmbedFlow — Facturación Wompi (Colombia)

Checkout regional con **Wompi** como proveedor de cobro (`BILLING_PROVIDER=wompi`), en paralelo a Stripe y Mercado Pago. Las referencias de pago llevan prefijo **`EF-`** y el webhook público recibe eventos reenviados desde el **router GarSaaS** (una sola URL en el panel Wompi).

## Variables de entorno (Next.js)

| Variable | Descripción |
|----------|-------------|
| `BILLING_PROVIDER` | Debe ser **`wompi`** para usar esta ruta de checkout. |
| `WOMPI_ENV` | `sandbox` o `production`. |
| `NEXT_PUBLIC_WOMPI_PUBLIC_KEY` | Llave pública Wompi. |
| `WOMPI_PRIVATE_KEY` | Llave privada (solo servidor). |
| `WOMPI_INTEGRITY_SECRET` | Secreto de integridad del comercio. |
| `SUPABASE_SERVICE_ROLE_KEY` | Obligatoria para insertar intents y aplicar webhooks (igual que Stripe/Mercado Pago). |
| `NEXT_PUBLIC_APP_URL` | Base para `redirect-url` del checkout y enlaces internos. |
| `WOMPI_PLAN_PERIOD_DAYS` | Opcional; días de acceso pagado tras aprobación (default **30**). |

Tras añadir `NEXT_PUBLIC_*`, haz **redeploy con build** para que la variable quede disponible en el cliente/servidor según tu hosting.

## Supabase

Aplicar migraciones **`013_wompi_billing.sql`**, **`014_garsaas_billing_sync.sql`**, **`015_payment_intents_org_admin_select.sql`**, **`016_org_billing_profile.sql`**, **`017_org_billing_profile_audit.sql`** (y posteriores en `supabase/migrations/`):

- Tablas `subscription_plan_catalog` y `payment_intents`.
- Extiende `organizations.billing_provider` con el valor **`wompi`**.
- RLS en `payment_intents`: el **service role** sigue siendo quien inserta/actualiza desde webhooks y checkout; la migración **`015`** permite **SELECT** a usuarios **authenticated** que son **owner** o **admin** de la organización (historial en **Ajustes → Facturación**).
- Migración **`016`**: columnas de **perfil fiscal** en `organizations` (MVP DIAN). Owner/admin los editan en **Ajustes → Facturación**; sin datos completos no se puede iniciar checkout **Wompi**; el snapshot en notify GarSaaS incluye `profile_complete`.
- Migración **`017`**: auditoría mínima (`billing_profile_updated_at`, `billing_profile_updated_by`) para saber quién y cuándo actualizó el perfil fiscal.

Precios iniciales en COP (`amount_in_cents` = pesos × 100). Ajusta con `UPDATE` en SQL o edita el `INSERT` en una migración nueva y aplícala en cada entorno.

### Producción: migraciones vs imagen web

La **`web/Dockerfile`** solo arranca **`node server.js`** (Next standalone): **no** ejecuta migraciones SQL contra Supabase.

| Qué | Dónde |
|-----|--------|
| Esquema Postgres (tablas, RLS, catálogo) | Proyecto **Supabase**: CLI (`supabase db push` / migraciones enlazadas al repo), integración CI, o ejecución manual de SQL en el dashboard **antes** de confiar en nuevas rutas. |
| App Next | Railway u otro host usando la carpeta **`web`** como contexto del Dockerfile. |

Mantén el historial de migraciones Supabase como fuente de verdad del esquema compartido entre entornos.

### Límite mensual de documentos (plan Free)

El tope de envíos que cuentan para la cuota (**documentos con análisis `done` en el mes**) está en código:

- **`web/src/lib/plan-limits.ts`** — `PLAN_DOC_LIMITS.free` (valor actual: **2** documentos/mes). Debe coincidir con los textos de **`web/src/messages/es.ts`**, **`en.ts`**, **`pt.ts`**, con la migración **`013_wompi_billing.sql`** (Starter / Pro / Team en COP: **99.000 / 199.000 / 599.000** mensual, `amount_in_cents` = pesos × 100) y con el pricing público en **`garsaas/lib/productContent.ts`** (producto Embedflow).

### Cambio de precios

1. Actualizar filas en **`subscription_plan_catalog`** (SQL o migración Supabase) — mismos centavos COP × 100 que en otros productos GarSaaS con Wompi.
2. Revisar UI de facturación y mensajes si muestran montos fijos.
3. Documentar en despliegue que **solo** la web redeployada no basta si el cambio es de esquema o catálogo en BD.

## Router GarSaaS

En el proyecto **garsaas**:

```bash
WOMPI_WEBHOOK_EMBEDFLOW_URL=https://<tu-app>/api/webhooks/wompi
```

El panel Wompi debe apuntar solo a `https://garsaas.io/api/webhooks/wompi` (o el dominio público del landing).

**Operación y cron:** ver `docs/BILLING_OPERATIONS.md` (variables, job de reintentos, alertas webhook opcionales).

## Flujo en la app

1. Usuario owner/admin en **Ajustes → Facturación** elige un plan de pago y pulsa upgrade (mismo `CheckoutButton` que Stripe).
2. `POST /api/billing/checkout` crea fila en `payment_intents` y devuelve `url` del checkout Web Wompi.
3. Tras pagar, redirección a `/dashboard/settings/billing?billing=success`.
4. Wompi envía el evento al router → EmbedFlow `/api/webhooks/wompi` → actualiza `organizations` (`plan`, `billing_provider`, `plan_expires_at`) y marca el intent **APPROVED**.
5. En facturación Wompi, owner/admin ve **Facturas y cobros** (hasta 100 intents **APPROVED**): filtros por estado GarSaaS y paginación.

La fuente de verdad del plan pagado es el **webhook**, no solo la redirección.

## Producción (tier 1): seguridad y reintentos GarSaaS

1. **Migración `014_garsaas_billing_sync.sql`** — columnas en `payment_intents` para `garsaas_invoice_id`, reintentos y `garsaas_no_upstream` si no configuraste GarSaaS.
2. **`WOMPI_EVENTS_SECRET`** — secreto de **eventos** del Dashboard Wompi (no es la llave privada ni `WOMPI_INTEGRITY_SECRET`). Con él, `POST /api/webhooks/wompi` rechaza eventos con checksum inválido (`401`). Sin variable: en producción se registra advertencia; conviene definirla antes de ir live.
3. **GarSaaS tras pago** — el webhook intenta `POST` al landing; si falla red, programa `garsaas_notify_next_at` con backoff.
4. **Cron `GET /api/cron/garsaas-billing-sync`** — cabecera `Authorization: Bearer <CRON_SECRET>`. Reintenta intents `APPROVED` sin `garsaas_invoice_id`. Programar en Railway (cron HTTP) o fusionar `vercel.cron.example.json` en `vercel.json` si despliegas en Vercel.
5. **Observabilidad** — logs `[billing]` incluyen `reference` y `transaction_id`; el cliente envía `X-Correlation-Id` a GarSaaS.

BabyFirst / AgroBrain pueden replicar el mismo patrón (verify checksum + cola/reintentos en su BD).

## Referencias cruzadas

- Documentación técnica del router: repositorio **garsaas**, `docs/WOMPI_INTEGRACION_TECNICA.md`.
- BabyFirst y AgroBrain siguen el mismo patrón de referencias (`BF-`, `AB-`).
