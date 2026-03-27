# Embedflow

> AI-powered document intelligence for sales teams.
> Upload a contract → get key terms, risk flags, and a 10-second deal pitch in seconds.

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Supabase account
- OpenAI API key
- Redis (optional, falls back to in-memory)

### Frontend (Next.js)

```bash
cd web
cp .env.example .env.local  # fill in your keys
npm install
npm run dev
```

### Worker (FastAPI)

```bash
cd worker
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

If analysis fails with **no selectable text** / **0 chars**, the PDF is likely **scanned (image-only)**. The worker extracts text with pdfplumber + pypdf but cannot OCR images. Re-export with OCR, use a text-based PDF, or upload DOCX/TXT.

**Long contracts:** If the extracted text is longer than `OPENAI_EXTRACTION_CHUNK_THRESHOLD` (default matches `OPENAI_EXTRACTION_MAX_INPUT_CHARS`, 45k chars), the worker runs **chunked analysis**: small JSON extractions per excerpt (`OPENAI_MODEL_CHUNK`, default `gpt-4o-mini`), aggregates them, then one **merge** call with the full schema (`OPENAI_MODEL_MERGE`, default `gpt-4o`). **`OPENAI_MAX_EXTRACTED_CHARS`** (default `auto`) caps pathological PDF text *before* splitting: `auto` matches the maximum characters the chunked map can cover with your `OPENAI_CHUNK_HARD_MAX` / `OPENAI_CHUNK_MAX_COUNT` / overlap settings (~5.6M with defaults), avoiding huge in-memory buffers when the tail would be dropped anyway; set to `0` to disable that early cap. Defaults use larger windows (`OPENAI_CHUNK_CHAR_SIZE` 52k, overlap 2k) to limit call count; `OPENAI_CHUNK_MAX_COUNT` (default 72) and `OPENAI_CHUNK_HARD_MAX` (80k) widen windows up to that cap, then truncate the tail with a log line if the document is still too long. The map step runs **up to `OPENAI_CHUNK_MAP_CONCURRENCY` (default 2)** chunk requests in parallel; large windows already use many tokens per call, so higher values often hit TPM (429). Raise only if your org limit allows it; use `1` for strictly sequential calls. Tune these if you hit TPM limits per request. Shorter contracts still use a single `OPENAI_MODEL` call with the full text (no truncation).

### Database (Supabase)

1. Create a Supabase project at supabase.com
2. Run migrations in order in the SQL Editor (see `supabase/migrations/`, numeric prefix), including at least through:
   - `001_initial_schema.sql` … `003_share_and_integrations.sql` (baseline + share links)
   - `011_analysis_source_quality.sql` (`analyses.source_quality` for low-confidence UI hints)
3. Enable Email auth in Supabase dashboard → Authentication → Providers
4. **Storage file size:** Dashboard → Storage → open the `contracts` bucket → **Configuration** (or project *Settings → Storage*) and set the **max file upload size** to at least the app limit (`UPLOAD_MAX_FILE_MB` in `web/src/lib/upload-limits.ts`, currently 35 MB). The default project limit is often lower; large PDFs fail with HTTP 413 from Storage until this is raised.

### Stripe (billing)

1. Create Products/Prices in Stripe for Starter, Pro, and Team (recurring).
2. Set `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM` in `.env.local`.
3. Add webhook endpoint `https://your-domain.com/api/webhooks/stripe` and subscribe to:
   `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Use the webhook signing secret as `STRIPE_WEBHOOK_SECRET`.
5. Checkout syncs plan from session **metadata** and, if needed, from the **Stripe Price** IDs you set in env (portal plan changes included).

### Mercado Pago (Colombia / regional billing)

Use when `BILLING_PROVIDER=mercadopago` in the Next.js app (Stripe remains available when `BILLING_PROVIDER=stripe`, the default).

1. Apply migration `010_mercadopago_billing.sql` (adds `billing_provider`, `plan_expires_at` on `organizations`).
2. Create an app in the [Mercado Pago Developers](https://www.mercadopago.com.co/developers) hub and copy the **production access token** (and webhook **secret** for signature validation).
3. Set env vars: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, amounts in COP (`MERCADOPAGO_AMOUNT_STARTER`, `MERCADOPAGO_AMOUNT_PRO`, `MERCADOPAGO_AMOUNT_TEAM`), optional `MERCADOPAGO_CURRENCY_ID=COP`, `MERCADOPAGO_PLAN_PERIOD_DAYS` (default 30).
4. Configure webhook URL `https://your-domain.com/api/webhooks/mercadopago` in Mercado Pago (payment notifications). The handler validates `x-signature` and, on **approved** payments, sets `organizations.plan`, `billing_provider=mercadopago`, and `plan_expires_at` (period access, not Stripe subscriptions).
5. For local testing, use sandbox credentials and set `MERCADOPAGO_USE_SANDBOX_INIT_POINT=true` so checkout uses `sandbox_init_point`.

Operational checklist (empresa, webhooks, migraciones): see [`docs/PENDING_INTEGRATION.md`](docs/PENDING_INTEGRATION.md). **SaaS quotas & limits** (monthly doc cap, upload size, worker vs billing): section **5** in that file.

### Analysis complete email (worker)

1. Create a [Resend](https://resend.com) API key and verified sender (or use their test domain).
2. In `worker/.env` set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `APP_URL` (same public URL as the Next.js app so links work).
3. Optional: `RESEND_EMAIL_LOCALE=es` for Spanish copy in that email.

**Public API (docs):** `GET /api/v1/health` — see also `/docs/api` on the deployed app for a short overview.

**Slack (optional):** After migration `003`, org owners/admins can set an Incoming Webhook under **Dashboard → Integrations**. The worker posts there when an analysis completes (same `APP_URL` as email links).

**Billing:** With **Stripe**, the org `plan` in Postgres is derived primarily from **Stripe Price IDs** (`STRIPE_PRICE_STARTER`, etc.); checkout/session metadata is a fallback. With **Mercado Pago**, the org `plan` and `plan_expires_at` are updated from approved payments via `/api/webhooks/mercadopago`.

### Environment Variables

**Frontend (.env.local)**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Billing: stripe (default) | mercadopago
# BILLING_PROVIDER=stripe
# MERCADOPAGO_ACCESS_TOKEN=
# MERCADOPAGO_WEBHOOK_SECRET=
# MERCADOPAGO_AMOUNT_STARTER=99000
# MERCADOPAGO_AMOUNT_PRO=199000
# MERCADOPAGO_AMOUNT_TEAM=599000
# MERCADOPAGO_CURRENCY_ID=COP
# MERCADOPAGO_PLAN_PERIOD_DAYS=30
# MERCADOPAGO_USE_SANDBOX_INIT_POINT=false
```

**Worker (.env)**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=sk-...
REDIS_URL=redis://localhost:6379
```

## Architecture

```
web/          → Next.js frontend (Vercel, Fly, or Railway — see docs/deploy-railway.md)
worker/       → FastAPI AI pipeline (Railway/Render)
supabase/     → DB migrations
```

**Railway (worker + web):** step-by-step [docs/deploy-railway.md](docs/deploy-railway.md).

## License

MIT — Luis GR, 2026
