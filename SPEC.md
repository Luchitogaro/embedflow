# Embedflow — Full Business & Technical Specification

> AI-powered document intelligence for sales teams.
> Upload a contract → get key terms, risk flags, and a 10-second deal pitch in seconds.

---

## 1. Concept & Vision

Sales reps hate reading contracts. They skim, miss clauses that cost the company millions, and often have no idea if a deal is actually good. Embedflow sits between the CRM and the legal team — a frictionless layer that reads contracts so reps don't have to.

The feeling: **"Wait, this is actually useful?"** — like having a senior contracts attorney on your laptop at 2am before a renewal call.

**Tagline:** *Stop reading contracts. Start understanding deals.*

**One-liner:** AI parses your sales contracts, extracts key terms, flags risk, and gives you a 10-second pitch — in under 60 seconds.

---

## 2. Business Plan

### Target Market

| Segment | Description | Willingness to Pay |
|---------|-------------|-------------------|
| **Primary: SMB Sales Teams** | 5-50 person companies, 1-5 deals/mo, no in-house legal | $29-49/user/mo |
| **Secondary: SaaS Account Execs** | Mid-market, high contract volume, need fast turnaround | $49-99/user/mo |
| **Tertiary: Sales Operations** | Team leads who want org-wide visibility on contract risk | $99-199/mo (team plan) |

### Problem (Why this exists)

- Sales reps spend **2-3 hours per contract** reading manually
- Legal is a bottleneck — turns a 1-day deal into a 1-week deal
- Risky clauses (auto-renewal traps, unlimited liability, IP assignment) slip through
- No structured deal intelligence — everyone winges it
- Contract data is completely dark to CRM/revenue tools

### Revenue Model

```
Free Tier      → 3 docs/mo, basic extraction, no risk flags
Starter  $29/u → 20 docs/mo, full extraction, risk flags, pitch gen
Pro       $49/u → Unlimited docs, CRM sync, Slack alerts, priority AI
Team     $149/m → 5 seats, org dashboard, custom risk rules, SSO
Enterprise   → White-label, API access, dedicated support, SLA
```

### TAM / SAM / SOM

- **TAM:** $18B global contract management market (Growing 13%/yr)
- **SAM:** $3.2B Sales Enablement SaaS segment
- **SOM:** $80M reachable in 24 months with focused GTM

---

## 3. Features

### MVP (Phase 1) — Core Loop

1. **Upload** — Drag & drop or click to upload PDF, DOCX, or paste text
2. **Extract** — AI identifies and surfaces: parties, dates, pricing, renewal terms, SLA, liability, termination clauses
3. **Risk Flag** — Red/yellow/green indicators on problematic clauses with plain-English explanations
4. **Pitch Generator** — One-click generation of a 10-second verbal summary for the deal
5. **Download / Share** — Export analysis as PDF or share a link

### Phase 2

- CRM integration (Salesforce, HubSpot) — auto-populate deal fields from contract analysis
- Slack/Teams alerts — notify rep when risk flags are found
- Deal comparison — compare this contract against industry benchmarks
- Repository — searchable contract archive with full-text search

### Phase 3

- Negotiation suggestions — "Ask for X instead of Y clause"
- Multi-contract deal rooms — stitch together MSA + SOW + NDA analysis
- API access for enterprise customers
- White-label embeddable widget

---

## 4. Landing Page Structure

### Hero Section
- **Headline:** *Stop reading contracts. Start understanding deals.*
- **Sub-headline:** Embedflow uses AI to extract key terms, flag risk, and give you a 10-second pitch — in under 60 seconds.
- **CTA:** Start Free Trial (3 docs free, no credit card)
- **Visual:** Animated demo — contract drops in, analysis pops out in real-time

### Social Proof Strip
- Logos: "Trusted by 500+ sales teams at [Y Combinator, Techstars companies]"
- Testimonial: specific numbers ("saved 12 hours last month", "closed 3 deals I would have missed")

### How It Works (3 steps)
1. Upload your contract (PDF, DOCX, paste text)
2. AI reads it in seconds — extracts terms, flags risk
3. Get your analysis + risk summary + 10-sec pitch

### Feature Showcase (3-4 cards)
- Key Term Extraction
- Risk Flagging
- Pitch Generator
- CRM Integrations

### Pricing Section
- 4 tiers, monthly/annual toggle
- Feature comparison table

### FAQ (8-10 questions)
- Is my data secure? (SOC2, encryption, no training on customer data)
- How accurate is it? (95%+ on standard contracts, human review recommended for legal)
- What contract types? (MSAs, NDAs, SOWs, RFPs, SaaS agreements)
- Do you integrate with [X]?

### CTA Footer
- Final push: *Start free. No credit card. 3 docs free every month.*

---

## 5. Technical Architecture

### Stack

```
Frontend:    Next.js 14 (App Router) + TypeScript + TailwindCSS
Backend:     Next.js API Routes (Edge Functions) + Python FastAPI (AI processing)
AI/ML:       Claude API (Anthropic) for extraction + classification
Database:    Supabase (Postgres + Auth + Storage + Realtime)
Search:      Supabase pgvector (semantic contract search)
Email:      Resend (transactional emails)
Payments:   Stripe (subscriptions, usage billing)
Analytics:  Plausible or Posthog (privacy-first)
Hosting:    Vercel (frontend) + Railway/Render (FastAPI worker)
Docs:       Mintlify (developer docs)
```

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                  │
│   Web App (Next.js) ─── Mobile PWA ─── API Integration               │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS (REST)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EDGE LAYER (Vercel)                          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│   │ Upload API   │  │ Analysis API │  │ Auth API     │               │
│   │ /api/upload  │  │ /api/analyze │  │ /api/auth/*  │               │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
│          │                │                  │                       │
│   Supabase Storage        │           Supabase Auth                  │
│   (S3-compatible)         │                                          │
└────────────────────────────┼────────────────────────────────────────┘
                             │ async job queue
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FASTAPI WORKER (Railway/Render)                   │
│                                                                      │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│   │ Document     │  │ AI Extractor │  │ Risk         │               │
│   │ Preprocessor │  │ (Claude)     │  │ Classifier   │               │
│   │ (pdf.js)     │  │              │  │              │               │
│   └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
│   Supabase DB ◄──────────────────────────────────► Redis Queue       │
│   (results)                                           (jobs)         │
└────────────────────────────┬────────────────────────────────────────┘
                             │ webhooks / polling
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE LAYER                                  │
│   Postgres DB  │  Auth (magic link, Google, SSO)  │  Storage (S3)   │
│   pgvector     │  Row-level security              │  Contract files │
└─────────────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Users & Orgs
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',  -- free, starter, pro, team, enterprise
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  org_id UUID REFERENCES organizations(id),
  name TEXT,
  role TEXT DEFAULT 'member',  -- owner, admin, member
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Documents & Analyses
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  org_id UUID REFERENCES organizations(id),
  filename TEXT NOT NULL,
  file_url TEXT,  -- Supabase Storage URL
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'pending',  -- pending, processing, done, error
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  
  -- Extracted fields (JSONB)
  extracted_terms JSONB,   -- { parties: [], dates: [], pricing: {}, ... }
  risk_flags JSONB,         -- [{ clause: "", risk: "high", explanation: "" }]
  pitch_text TEXT,
  summary TEXT,
  
  -- Tokens used for billing
  tokens_used INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Usage tracking
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  event_type TEXT,  -- doc_upload, analysis_run, api_call
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_documents_org ON documents(org_id);
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_analyses_document ON analyses(document_id);
```

### API Endpoints

```
Auth:
  POST   /api/auth/signup          → Create account + org
  POST   /api/auth/login           → Magic link or OAuth
  POST   /api/auth/logout
  GET    /api/auth/me              → Current user + org

Documents:
  POST   /api/documents/upload     → Upload file → { document_id, file_url }
  GET    /api/documents            → List user's documents
  GET    /api/documents/:id        → Get document + analysis
  DELETE /api/documents/:id        → Soft delete

Analysis:
  POST   /api/analyze              → Start analysis → { job_id }
  GET    /api/analyze/:job_id       → Poll job status
  POST   /api/analyze/:id/refresh  → Re-run analysis

Billing:
  GET    /api/billing/usage        → Current usage vs plan limits
  POST   /api/billing/upgrade      → Create Stripe checkout session
  POST   /api/billing/portal        → Stripe customer portal
  POST   /api/webhooks/stripe      → Handle Stripe events

Integrations:
  GET    /api/integrations/salesforce/oauth
  GET    /api/integrations/hubspot/oauth
  POST   /api/integrations/slack/webhook
```

---

## 6. AI Prompt Design

### System Prompt (Claude)

```
You are Embedflow, an expert contracts analyst AI. Your job is to analyze
sales contracts and extract key business information.

For every contract you analyze, return a JSON object with this structure:

{
  "summary": "2-3 sentence plain-English summary of the deal",
  "parties": [
    { "name": "Acme Corp", "role": "customer" },
    { "name": "Embedflow Inc", "role": "vendor" }
  ],
  "dates": {
    "effective": "2024-01-15",
    "renewal": "2025-01-15",
    "termination_notice_days": 30
  },
  "pricing": {
    "total_value": "$120,000",
    "billing_cycle": "annual",
    "currency": "USD"
  },
  "key_terms": {
    "auto_renew": true,
    "auto_renew_notice_days": 60,
    "unlimited_liability": false,
    "ip_assignment": false,
    "data_portability": true
  },
  "risk_flags": [
    {
      "clause": "Section 8.2: Unlimited Liability",
      "risk_level": "HIGH",
      "explanation": "This clause exposes the customer to unlimited liability damages. 
                      Legal review strongly recommended before signing.",
      "recommendation": "Negotiate a mutual liability cap, typically 1x-2x annual contract value."
    }
  ],
  "pitch": "This is a 3-year annual contract worth $120K. It auto-renews 
           with 60-day notice. One risk flag in the liability section — 
           we should ask for a mutual cap. Overall it's a standard deal."
}

Rules:
- Be concise and direct in the summary (2-3 sentences max)
- flag anything unusual: unlimited liability, auto-renew < 30 days,
  IP assignment, data port restrictions, unrealistic SLAs
- pitch should sound like a smart sales rep explaining to their manager
- Always be honest about AI confidence — if something is unclear, say so
```

---

## 7. Infrastructure Diagrams (ASCII)

### Upload Flow

```
User              Next.js           Supabase         FastAPI Worker
  │                  │                   │                  │
  │── POST /upload ──▶│                   │                  │
  │                  │── store file ────▶│                  │
  │                  │◀── file_url ─────│                  │
  │◀── { doc_id } ───│                   │                  │
  │                  │── enqueue job ───────────────────▶│   │
  │                  │                   │                  │
  │                  │                   │◀─ poll/pickup ──│   │
  │                  │                   │                  │──▶ parse PDF
  │                  │                   │                  │──▶ call Claude
  │                  │                   │◀── results ─────│   │
  │                  │                   │── update status  │   │
  │                  │◀── poll ─────────│                  │
  │◀── analysis ─────│                   │                  │
```

### System Context

```
                    ┌──────────────────────────────┐
                    │         VERCEL EDGE           │
                    │   (Next.js App + API Routes)  │
                    └──────────────┬───────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────┐
         │                         │                      │
         ▼                         ▼                      ▼
┌────────────────┐      ┌──────────────────┐     ┌────────────────┐
│ Supabase Auth  │      │ Supabase Storage │     │  Redis Queue   │
│ (Magic Link,   │      │ (Contract PDFs)  │     │  (BullMQ or    │
│  Google OAuth) │      │                  │     │   Inngest)     │
└────────────────┘      └──────────────────┘     └───────┬────────┘
                                                         │
                                          ┌──────────────┴───────────┐
                                          │   RAILWAY / RENDER       │
                                          │   (FastAPI Worker)       │
                                          │   • PDF parsing (pdf.js) │
                                          │   • Claude API calls      │
                                          │   • Risk classification   │
                                          │   • Results → Supabase    │
                                          └──────────────────────────┘
                                          │
                                          ▼
                                 ┌──────────────────┐
                                 │   SUPABASE DB     │
                                 │   (Postgres +     │
                                 │    pgvector)      │
                                 └──────────────────┘
```

---

## 8. Development Roadmap

### Phase 0 — Foundation (Week 1-2)
- [ ] Set up Next.js repo with TypeScript + Tailwind + Shadcn UI
- [ ] Configure Supabase project (DB, Auth, Storage)
- [ ] Run DB migrations (organizations, users, documents, analyses tables)
- [ ] Implement Supabase Auth (magic link + Google OAuth)
- [ ] Set up Stripe test mode + webhook endpoint
- [ ] Configure Railway/Render FastAPI worker
- [ ] Set up CI/CD: GitHub Actions → Vercel (frontend) + Railway (worker)

### Phase 1 — MVP Core (Week 3-4)
- [ ] Document upload API + Supabase Storage
- [ ] PDF preprocessing (pdf.js / python pdf2image)
- [ ] Claude API integration — extraction prompt
- [ ] Analysis results display UI
- [ ] Risk flags visualization (red/yellow/green)
- [ ] Pitch generator (separate prompt)
- [ ] Basic dashboard (list documents + status)
- [ ] Free tier usage limits enforcement

### Phase 2 — Polish + Payments (Week 5-6)
- [ ] Stripe subscription flow (pricing page + checkout)
- [ ] Usage tracking (upload count, analysis count)
- [ ] Email notifications (analysis complete)
- [ ] Responsive mobile UI
- [ ] Landing page (marketing site)
- [ ] SEO + OG images + sitemap
- [ ] Error handling + retry logic for AI calls
- [ ] Loading states + progress indicators

### Phase 3 — Integrations (Week 7-8)
- [ ] Salesforce integration (OAuth + sync)
- [ ] HubSpot integration (OAuth + sync)
- [ ] Slack webhook alerts
- [ ] API endpoint (for enterprise)
- [ ] Developer docs (Mintlify)

### Phase 4 — Growth (Week 9-12)
- [ ] Referral program
- [ ] A/B testing on pricing page
- [ ] Onboarding flow / product tour
- [ ] Email drip sequences (rescue abandoned trials)
- [ ] SOC 2 compliance prep (if enterprise demand)
- [ ] Multi-language support (ES, FR, DE)

---

## 9. File Structure

```
embedflow/
├── SPEC.md                          ← You are here
├── README.md
├── .env.example
├── docker-compose.yml               ← local dev (Supabase + Redis)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── web/                             ← Next.js frontend
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx             ← dashboard home
│   │   │   ├── documents/
│   │   │   │   ├── page.tsx         ← document list
│   │   │   │   └── [id]/page.tsx    ← analysis view
│   │   │   └── settings/
│   │   │       ├── page.tsx
│   │   │       └── billing/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── documents/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── analyze/
│   │   │   │   └── route.ts
│   │   │   └── webhooks/
│   │   │       └── stripe/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                      ← shadcn components
│   │   ├── upload-zone.tsx
│   │   ├── analysis-card.tsx
│   │   ├── risk-flag.tsx
│   │   ├── pitch-display.tsx
│   │   ├── pricing-table.tsx
│   │   └── nav.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── stripe.ts
│   │   └── utils.ts
│   └── hooks/
│       ├── use-analysis.ts
│       └── use-upload.ts
├── worker/                          ← FastAPI Python worker
│   ├── main.py
│   ├── routers/
│   │   ├── jobs.py
│   │   └── webhooks.py
│   ├── services/
│   │   ├── extractor.py            ← Claude extraction
│   │   ├── risk_classifier.py
│   │   ├── pitch_generator.py
│   │   └── pdf_parser.py
│   ├── prompts/
│   │   └── extraction.py
│   ├── models/
│   │   └── schemas.py              ← Pydantic models
│   └── requirements.txt
└── infra/
    ├── vercel.json
    ├── railway.toml
    └── terraform/                   ← optional: AWS/GCP infra
```

---

## 10. Key Decisions & Tradeoffs

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PDF parsing | pdf.js (JS) + python | pdf.js for frontend preview, python for server-side extraction |
| AI model | Claude Sonnet 4 | Best-in-class document understanding, cost-effective vs GPT-4 |
| Database | Supabase | Auth + DB + Storage in one, pgvector for future semantic search |
| Queue | BullMQ (Redis) or Inngest | Inngest is simpler for serverless Vercel integration |
| Worker hosting | Railway | Fastest deploy for Python workers, scales to zero when idle |
| Auth | Supabase Auth | Magic link = no passwords, Google OAuth = frictionless |

---

## 11. Go-to-Market

### Launch Strategy

**Week 0-4: Stealth Beta (50 users)**
- Target: Twitter/X network, Indie Hackers, YC founders
- Free tier unlocked for beta testers
- Direct outreach to 100 sales reps on LinkedIn

**Week 5-8: Public Beta + Launch**
- Product Hunt launch
- Hacker News "Show HN"
- Cold email to 1,000 SMB sales teams
- SEO: write 10 blog posts on contract risk

**Week 9-16: Paid Growth**
- $5K/mo content + SEO budget
- LinkedIn ads targeting "VP Sales", "Sales Director"
- Partner with Salesforce AppExchange early

### Conversion Metrics

| Metric | Target |
|--------|--------|
| Sign-up → Upload | 40% |
| Upload → Paid | 8% |
| Free churn (30-day) | <15% |
| Paid MRR growth | 15% week-over-week |
| CAC | <$100 (organic), <$300 (paid) |

---

*Last updated: 2026-03-19*
