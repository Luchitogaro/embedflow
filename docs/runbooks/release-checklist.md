# Production release checklist

Use before tagging a production deploy. Adjust for your hosting (Vercel, Fly, etc.).

## Pre-deploy

- [ ] `master` (or release branch) is green: CI quality gate (lint, typecheck, build, a11y, Playwright smoke + auth-gate).
- [ ] Optional: authenticated Playwright suite passes with `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` against staging.
- [ ] Supabase migrations applied in order on production (or verified already applied).
- [ ] Environment variables set and reviewed for production: Supabase, Stripe, worker `WORKER_SHARED_SECRET`, Resend, `APP_URL`, etc.
- [ ] Worker OpenAI tuning matches org limits: `OPENAI_CHUNK_MAP_CONCURRENCY`, TPM vs `OPENAI_CHUNK_HARD_MAX`, and `OPENAI_MAX_EXTRACTED_CHARS` (`auto` or explicit).
- [ ] Optional free baseline: see [monitoring-free-tier.md](./monitoring-free-tier.md) (uptime, Stripe webhooks, OpenAI usage, Sentry).
- [ ] Stripe webhook endpoint URL and signing secret match production app URL.
- [ ] Worker image/build matches web expectations (API contract, env).

## Deploy

- [ ] Deploy web app; confirm health (`GET /api/v1/health` or equivalent).
- [ ] Deploy worker; confirm worker health and that enqueue uses shared secret.
- [ ] Smoke test: sign-in, upload path or API health, one analysis path if applicable.

## Post-deploy

- [ ] Watch error rates and logs for 15–30 minutes.
- [ ] Confirm Stripe test/live mode matches intention (no accidental test keys in prod).

## Rollback

See [incident-response.md](./incident-response.md).
