# Incident response and rollback

## Severity (suggested)

- **Sev1**: Data exposure across tenants, auth bypass, or total outage.
- **Sev2**: Partial outage (worker down, web up), payment/webhook failures affecting billing.
- **Sev3**: Elevated errors, degraded latency, non-critical feature down.

## Immediate actions

1. **Confirm scope**: Which surface (web, worker, Supabase, Stripe webhooks, storage)?
2. **Preserve evidence**: Export relevant log lines, request IDs, Stripe event IDs, Supabase request IDs before heavy restarts.
3. **Communicate**: Internal channel + status page if you have one.

## Rollback (web)

- Revert to last known good deployment in your platform (e.g. Vercel “Promote previous deployment”).
- If rollback is not instant, consider toggling a maintenance banner or read-only mode if you have one.

## Rollback (worker)

- Redeploy previous worker image/commit.
- Ensure `WORKER_SHARED_SECRET` matches what the web app sends.

## Data / security suspected

- Rotate Supabase service role and JWT-related secrets only under a controlled process (invalidates sessions).
- If cross-tenant access is suspected, freeze writes and escalate; review RLS policies and audit logs.

## Monitoring (what to watch)

| Area | What to alert on |
|------|------------------|
| Web | 5xx rate, latency p95/p99, auth errors spike |
| Worker | Process up, queue depth, job failure rate, OpenAI/HTTP errors |
| Stripe | Webhook delivery failures, signature errors |
| Supabase | DB connection errors, RLS-related client errors in app logs |

These are baseline ideas; wire them to your observability stack (Datadog, Grafana, Vercel Analytics, Supabase dashboard, etc.).

**Free-tier starting point:** [monitoring-free-tier.md](./monitoring-free-tier.md).
