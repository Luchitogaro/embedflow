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

### Database (Supabase)

1. Create a Supabase project at supabase.com
2. Run migrations in order in the SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_documents_soft_delete.sql` (soft delete + RLS tweaks)
   - `supabase/migrations/003_share_and_integrations.sql` (share links + Slack webhook column)
3. Enable Email auth in Supabase dashboard → Authentication → Providers

### Stripe (billing)

1. Create Products/Prices in Stripe for Starter, Pro, and Team (recurring).
2. Set `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM` in `.env.local`.
3. Add webhook endpoint `https://your-domain.com/api/webhooks/stripe` and subscribe to:
   `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Use the webhook signing secret as `STRIPE_WEBHOOK_SECRET`.
5. Checkout syncs plan from session **metadata** and, if needed, from the **Stripe Price** IDs you set in env (portal plan changes included).

### Analysis complete email (worker)

1. Create a [Resend](https://resend.com) API key and verified sender (or use their test domain).
2. In `worker/.env` set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `APP_URL` (same public URL as the Next.js app so links work).
3. Optional: `RESEND_EMAIL_LOCALE=es` for Spanish copy in that email.

**Public API (docs):** `GET /api/v1/health` — see also `/docs/api` on the deployed app for a short overview.

**Slack (optional):** After migration `003`, org owners/admins can set an Incoming Webhook under **Dashboard → Integrations**. The worker posts there when an analysis completes (same `APP_URL` as email links).

**Billing:** the org `plan` in Postgres is derived primarily from **Stripe Price IDs** (`STRIPE_PRICE_STARTER`, etc.). Checkout/session metadata is only a fallback; if metadata and price disagree, the **price wins** (and a warning is logged).

### Environment Variables

**Frontend (.env.local)**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
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
web/          → Next.js 14 frontend (Vercel)
worker/       → FastAPI AI pipeline (Railway/Render)
supabase/     → DB migrations
```

## License

MIT — Luis GR, 2026
