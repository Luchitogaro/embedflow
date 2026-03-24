# Embedflow

> AI-powered document intelligence for sales teams.
> Upload a contract → get key terms, risk flags, and a 10-second deal pitch in seconds.

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Supabase account
- Anthropic API key (for Claude)
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
2. Run migrations: paste `supabase/migrations/001_initial_schema.sql` into SQL Editor
3. Enable Email auth in Supabase dashboard → Authentication → Providers

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
ANTHROPIC_API_KEY=sk-ant-...
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
