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
- [ ] Ejecutar migración **`011_analysis_source_quality.sql`** (`analyses.source_quality` JSONB para avisos de calidad de texto en UI).
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

## 5. Seguimiento — Análisis alineados con planes

**Objetivo:** que lo que el usuario **ve y puede hacer** (límites, features) coincida con lo que los **planes** prometen y con la **calidad** del análisis.

### Inventario (promesa ↔ código)

| Feature / límite | Dónde se promete (revisar) | Dónde se aplica |
|------------------|----------------------------|-----------------|
| Cuota mensual de documentos (`done`) | Billing / dashboard | `web/src/lib/plan-limits.ts`, `web/src/lib/monthly-upload-quota.ts`, `web/src/lib/upload-plan-limit.ts`, API de upload |
| Plan efectivo si vence periodo (`plan_expires_at`) | Webhooks MP / Stripe | `web/src/lib/org-plan.ts` (`effectiveOrgPlan`), `web/src/lib/server-org-plan.ts` (`getEffectivePlanForAuthUser`) |
| Share links solo Pro+ | Copy billing + UI | `web/src/lib/plan-features.ts`, `web/src/app/api/documents/[id]/share/route.ts` (`create` gated; `revoke` siempre), `web/src/components/analysis-actions.tsx` |
| PDF oficial de análisis solo Pro+ | Copy billing + UI | `web/src/app/api/documents/[id]/pdf/route.tsx`, `analysis-actions.tsx` |
| Integración Slack solo Pro+ | Settings + worker | `web/src/app/api/settings/integrations/route.ts` (PUT), `web/src/components/integrations-slack-form.tsx`, `worker/services/slack_notify.py` |
| Pitch de 10s solo Starter+ | Landing + billing + análisis | `web/src/lib/plan-features.ts` (`planSupportsDealPitch`), `worker/services/extractor.py` (no llama pitch si plan efectivo `free`), dashboard documento |
| API HTTP programática (curl/scripts sin cabeceras de navegador) solo Pro+ | Landing “Document API” | `web/src/lib/document-api-access.ts` + rutas `GET/POST /api/documents`, `GET/DELETE /api/documents/[id]`, `POST /api/analyze`, `GET /api/analyze/[jobId]`, `POST /api/analyze/[id]/refresh`; código `plan_api` |
| CRM nativo (Salesforce / HubSpot) | Roadmap en landing + Integraciones | Solo UI “Próximamente”; sin rutas OAuth/sync |

### Cuotas y límites (operación — referencia única)

| Capa | Qué limita | Dónde |
|------|------------|--------|
| **Upload HTTP** | Tamaño máx. archivo (35 MB por defecto) | `web/src/lib/upload-limits.ts` → API `documents` rechaza antes de Storage; Supabase Storage debe permitir ≥ ese tamaño (`README.md` → Database). |
| **Cuota mensual** | Documentos con análisis **completado** (`status = done`) en el mes calendario | `web/src/lib/monthly-upload-quota.ts`, `upload-plan-limit.ts`; bypass en dev vía `EMBEDFLOW_ALLOW_QUOTA_BYPASS` / listas CSV en `.env.local`. |
| **Plan efectivo** | Tras vencer `plan_expires_at` (Mercado Pago) el plan se trata como free | `web/src/lib/org-plan.ts`; worker: `worker/services/org_plan.py` + `get_effective_plan_for_document` en `db.py`. |
| **Worker OpenAI** | Timeout por llamada, reintentos 429, umbral single-shot vs chunked, truncado previo, max chunks / ventana | `worker/services/extractor.py`, `worker/.env.example`, párrafo largo en `README.md` (worker). |
| **PDF sin texto** | Error explícito si hay menos de 50 caracteres extraídos | `worker/services/extractor.py` (mensaje orienta a OCR / DOCX). |

### Estado de tareas

- [x] **Inventario** inicial (tabla arriba); revisar que `messages/*` y páginas de billing sigan alineados tras cambios de copy.
- [x] **Brechas críticas cerradas:** share create, PDF oficial, Slack (API + UI + worker) gated a Pro / Team / Enterprise; revoke de share sin gate.
- [x] **Brechas menores (auditoría):** rutas API sensibles usan `getEffectivePlanForAuthUser` + `plan-features`; billing usa `effectiveOrgPlan` y copy centralizado en `messages/*`. Re-auditar si se añaden features de pago.
- [x] **Cuotas:** tabla “Cuotas y límites” en esta sección + enlace desde `README.md`.
- [x] **Worker / extractor — tiering:** mismo pipeline por defecto; **Enterprise** opcional: si `OPENAI_MODEL_ENTERPRISE` está definido y el plan efectivo de la org es `enterprise`, single-shot + merge + pitch usan ese modelo (`worker/services/extractor.py`). Map chunked sigue en `OPENAI_MODEL_CHUNK` salvo que se amplíe el producto.

---

## 6. Seguimiento — Calidad del análisis “casi perfecto”

Direcciones típicas (priorizar según feedback real):

- [x] **PDFs ruidosos / escaneados:** banner en dashboard y vista compartida según `analyses.source_quality` (`weak_text` / `truncated_before_analysis`); worker `worker/services/text_quality.py`. Flujo OCR: mensaje de error si el texto es demasiado corto + guía en `README.md` (worker).
- [x] **Chunked pipeline:** notas TPM / concurrencia / truncado en docstring de `worker/services/chunked_pipeline.py` y variables en `worker/.env.example` + `README.md`.
- [x] **Prompts (anti-ruido / anti-invención):** `worker/prompts/extraction.py`, `worker/prompts/chunked_extraction.py`.
- [ ] **Prompts y schema — revisión legal/comercial:** tarea **externa** con abogado de ventas (no sustituir asesoría legal al usuario final). Checklist de contexto: `docs/EVALUATION_SUITE.md` §4.
- [x] **Evaluación:** criterios + fixtures locales descritos en [`docs/EVALUATION_SUITE.md`](EVALUATION_SUITE.md) (`eval/fixtures/`, gitignore para PDF/DOCX).
- [x] **Locales (UI + checklist):** nuevo copy en `en` / `es` / `pt` para avisos de calidad; checklist de paridad de claves en `docs/EVALUATION_SUITE.md` §3. Salida del **modelo** por locale ya se envía al worker; regresión manual vía suite.

Cuando retomemos mejoras iterativas, abrir issues a partir de esta sección.

---

## Referencias en el repo

- Cobro Stripe + Mercado Pago: `README.md`
- Webhook MP: `web/src/app/api/webhooks/mercadopago/route.ts`
- Checkout: `web/src/app/api/billing/checkout/route.ts`
- Features por plan (Pro+): `web/src/lib/plan-features.ts`
- Límites de plan (docs/mes): `web/src/lib/plan-limits.ts`, `web/src/lib/monthly-upload-quota.ts`
- Análisis (worker): `worker/services/extractor.py`, `worker/services/chunked_pipeline.py`, `worker/services/text_quality.py`, `worker/prompts/`
- Evaluación manual: `docs/EVALUATION_SUITE.md`
- Migración `source_quality`: `supabase/migrations/011_analysis_source_quality.sql`

---

**Dev — simular plan:** `EMBEDFLOW_DEV_PLAN_OVERRIDE` + `EMBEDFLOW_ALLOW_PLAN_BYPASS=true` (o `next dev` / worker `ENVIRONMENT=development`) en `web/.env.local` y `worker/.env`. Ver `web/.env.example`.

---

*Última actualización: 2026-03-25 (secc. 5–6 cerradas en código; pendiente externa = revisión legal)*
