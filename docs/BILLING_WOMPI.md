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

Aplicar migración **`013_wompi_billing.sql`** (y migraciones posteriores en `supabase/migrations/`):

- Tablas `subscription_plan_catalog` y `payment_intents`.
- Extiende `organizations.billing_provider` con el valor **`wompi`**.
- RLS activado en las nuevas tablas (solo el **service role** del backend debe acceder).

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

- **`web/src/lib/plan-limits.ts`** — `PLAN_DOC_LIMITS.free` (valor actual: **2** documentos/mes). Debe coincidir con los textos de **`web/src/messages/es.ts`**, **`en.ts`**, **`pt.ts`** y con cualquier pricing público en el landing GarSaaS.

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

## Flujo en la app

1. Usuario owner/admin en **Ajustes → Facturación** elige un plan de pago y pulsa upgrade (mismo `CheckoutButton` que Stripe).
2. `POST /api/billing/checkout` crea fila en `payment_intents` y devuelve `url` del checkout Web Wompi.
3. Tras pagar, redirección a `/dashboard/settings/billing?billing=success`.
4. Wompi envía el evento al router → EmbedFlow `/api/webhooks/wompi` → actualiza `organizations` (`plan`, `billing_provider`, `plan_expires_at`) y marca el intent **APPROVED**.

La fuente de verdad del plan pagado es el **webhook**, no solo la redirección.

## Referencias cruzadas

- Documentación técnica del router: repositorio **garsaas**, `docs/WOMPI_INTEGRACION_TECNICA.md`.
- BabyFirst y AgroBrain siguen el mismo patrón de referencias (`BF-`, `AB-`).
