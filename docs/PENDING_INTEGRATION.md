# Pendientes de integración y seguimiento

Documento vivo: cosas que **dependen de registro de empresa**, pasarelas y configuración externa, más **seguimiento de producto** (planes ↔ análisis, calidad del análisis).

---

## 1. Registro de empresa y Mercado Pago (Colombia)

Antes de cobrar en producción con **Mercado Pago** suele hacer falta:

- [ ] Cuenta **Mercado Pago** como **comercio / empresa** (datos de la sociedad o régimen que aplique, representante legal, etc.).
- [ ] Verificación / homologación que pida MP para **producción** (plazos variables).
- [ ] **Credenciales de producción**: Access Token y **secreto de firma** para webhooks (panel de integraciones).
- [ ] Definir precios finales en **COP** y cargarlos en `.env.local`:
  - `MERCADOPAGO_AMOUNT_STARTER`, `MERCADOPAGO_AMOUNT_PRO`, `MERCADOPAGO_AMOUNT_TEAM`
- [ ] URL pública del webhook: `https://TU_DOMINIO/api/webhooks/mercadopago` (no funciona con localhost sin túnel).
- [ ] `NEXT_PUBLIC_APP_URL` coherente con el dominio real (URLs de retorno del checkout).

**Stripe (si más adelante usas LLC USA u otro país soportado):** mantener `BILLING_PROVIDER=stripe` y completar precios + webhook de Stripe según `README.md`.

---

## 2. Base de datos (Supabase)

- [ ] Ejecutar migración **`010_mercadopago_billing.sql`** en el proyecto Supabase (columnas `billing_provider`, `plan_expires_at` en `organizations`).
- [ ] Confirmar que **`SUPABASE_SERVICE_ROLE_KEY`** está en el entorno del **Next.js** que recibe webhooks (igual que para Stripe).

---

## 3. Variables de entorno (Next.js / `.env.local`)

Checklist mínimo con **Mercado Pago**:

| Variable | Notas |
|----------|--------|
| `BILLING_PROVIDER` | `mercadopago` |
| `MERCADOPAGO_ACCESS_TOKEN` | Producción cuando estés listo |
| `MERCADOPAGO_WEBHOOK_SECRET` | Para validar `x-signature` |
| `MERCADOPAGO_AMOUNT_*` | COP enteros por plan |
| `MERCADOPAGO_PLAN_PERIOD_DAYS` | Opcional (default 30) |
| `MERCADOPAGO_USE_SANDBOX_INIT_POINT` | `true` solo en pruebas |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks |

Detalle en `README.md` y `web/.env.example`.

---

## 4. Modelo de cobro actual (importante)

Con Mercado Pago integrado hoy:

- Es **pago por periodo** (tras pago **approved** se setea `plan` + `plan_expires_at`).
- **No** es suscripción automática tipo Stripe Customer Portal: al vencer el periodo el usuario debe **volver a pagar** desde Billing (o en una fase 2 se puede integrar recurrencia nativa de MP).

Documentar esto en comunicación a clientes si aplica.

---

## 5. Seguimiento — Análisis alineados con planes (pendiente de revisión)

**Objetivo:** que lo que el usuario **ve y puede hacer** (límites, features) coincida con lo que los **planes** prometen y con la **calidad** del análisis.

Tareas sugeridas (revisar en conjunto cuando cierres lo de empresa/MP):

- [ ] **Inventario:** listar qué promete cada plan en UI/i18n (`messages/*`, billing) vs qué aplica en código (`plan-limits`, uploads, share, integraciones, API).
- [ ] **Brechas:** marcar “prometido pero no aplicado” o “aplicado pero no visible”.
- [ ] **Cuotas:** mensual por documentos analizados (`done`) vs otros límites (tamaño archivo, worker, etc.).
- [ ] **Worker / extractor:** mismo pipeline para todos los planes o diferencias (modelo, chunks, timeouts) si se decide tiering técnico.

---

## 6. Seguimiento — Calidad del análisis “casi perfecto” (pendiente)

Direcciones típicas (priorizar según feedback real):

- [ ] **PDFs ruidosos / escaneados:** mensajes claros + flujo OCR externo documentado.
- [ ] **Chunked pipeline:** límites TPM, concurrencia, truncado vs calidad del merge.
- [ ] **Prompts y schema:** revisión legal/comercial con abogado de ventas (no sustituir asesoría legal al usuario final).
- [ ] **Evaluación:** conjunto fijo de contratos de prueba + criterios de calidad (completitud de campos, alucinaciones, riesgos).
- [ ] **Locales:** coherencia `en` / `es` / `pt` en salidas del modelo.

Cuando retomemos esto, conviene abrir issues o subtareas numeradas a partir de esta sección.

---

## Referencias en el repo

- Cobro Stripe + Mercado Pago: `README.md`
- Webhook MP: `web/src/app/api/webhooks/mercadopago/route.ts`
- Checkout: `web/src/app/api/billing/checkout/route.ts`
- Límites de plan (docs/mes): `web/src/lib/plan-limits.ts`, `web/src/lib/monthly-upload-quota.ts`
- Análisis (worker): `worker/services/extractor.py`, `worker/services/chunked_pipeline.py`, `worker/prompts/`

---

*Última actualización: 2026-03-25*
