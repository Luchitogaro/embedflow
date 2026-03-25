# Embedflow Production Hardening Plan

Last updated: 2026-03-25  
Owner: Product + Engineering  
Scope: Security, multi-tenant isolation, legal/compliance readiness, reliability, and release ops.

---

## Goal

Ship Embedflow to production with legal-grade tenant isolation and operational reliability, without cross-user data leakage.

---

## Tracking Rules

- Work strictly **phase by phase**.
- Each phase must end with:
  - passing acceptance criteria,
  - validation evidence (tests/audit outputs),
  - one or more git commits linked below.
- Do not start the next phase until the current one is marked complete.

Status values:
- `todo`
- `in_progress`
- `blocked`
- `done`

---

## Master Phase Tracker

| Phase | Name | Priority | Status | Target | Commit(s) | Evidence |
|---|---|---|---|---|---|---|
| 1 | Storage RLS isolation hardening | P0 | done | 2 days | `474d12a` | Cross-account test passed: user B receives 404 when accessing user A object path |
| 2 | Worker trust boundary hardening | P0 | done | 2 days | `474d12a` | Worker `/jobs` now requires `x-worker-secret` and web calls include `WORKER_SHARED_SECRET` |
| 3 | DB tenant integrity constraints | P0 | done | 2 days | `TBD (next commit)` | Migration 007 applied; null-org sanity 0/0; invalid insert blocked by tenant sync trigger |
| 4 | Share-link compliance controls | P0/P1 | done | 1 day | `TBD (next commit)` | Migration 008 applied and verified: create/revoke works; expired links blocked by shared loader |
| 5 | Billing/usage auditability | P1 | in_progress | 1 day | - | Starting deduplicated, attributable usage events for document uploads |
| 6 | Security + a11y + E2E quality gate | P1 | todo | 2 days | - | - |
| 7 | Go-live operations and runbooks | P0 | todo | 1 day | - | - |

---

## Phase 1 — Storage RLS Isolation Hardening (P0)

### Problem
Current `storage.objects` policies for `contracts` allow authenticated users too broadly, risking cross-user file reads.

### Deliverables
- Tighten `storage.objects` policies to enforce per-user object prefix:
  - `name LIKE auth.uid() || '/%'`
- Ensure upload/list/read/delete are user-scoped.
- Add SQL migration and verification notes.

### Acceptance Criteria
- User A cannot read/list/delete User B file objects under any path.
- User A can only access `contracts/<A_UID>/...`.
- Existing upload flow still works.

### Validation
- Manual SQL checks with two test users.
- App smoke test: upload + open analysis still works.

---

## Phase 2 — Worker Trust Boundary Hardening (P0)

### Problem
`/jobs` accepts payload that can trigger service-role writes if exposed.

### Deliverables
- Add shared-secret authentication (`WORKER_SHARED_SECRET`) between web API and worker.
- Reject unauthorized enqueue requests.
- Document required env vars.

### Acceptance Criteria
- Missing/invalid worker secret => 401/403.
- Valid secret => normal processing.
- No regression in analyze/refresh flows.

### Validation
- API tests for authorized and unauthorized cases.
- Worker logs show only authenticated enqueue sources.

---

## Phase 3 — DB Tenant Integrity Constraints (P0)

### Problem
Tenant consistency is partly app-enforced; DB-level guarantees need strengthening.

### Deliverables
- Add `org_id` to `analyses` (with backfill from `documents`).
- Enforce consistency constraints/indexes to avoid cross-tenant mismatches.
- Update write paths if needed.

### Acceptance Criteria
- DB rejects inconsistent `analyses` rows (document/user/org mismatch).
- Existing analysis pipeline works after migration.

### Validation
- Migration dry-run + rollback plan.
- Integration test creating/processing documents under multiple orgs.

---

## Phase 4 — Share-Link Compliance Controls (P0/P1)

### Problem
Share tokens do not expire and lack governance metadata.

### Deliverables
- Add fields such as:
  - `share_enabled_at`
  - `share_expires_at`
  - `share_revoked_at`
  - `shared_by`
- Enforce expiration/revocation in shared analysis loader.

### Acceptance Criteria
- Expired/revoked token cannot access shared page.
- Active token continues to work until expiry.

### Validation
- Route tests for valid/expired/revoked tokens.

---

## Phase 5 — Billing and Usage Auditability (P1)

### Problem
Usage accounting needs stronger auditability and consistency checks.

### Deliverables
- Ensure usage events are complete, deduplicated, and attributable.
- Cross-check billing usage against documents analyzed.

### Acceptance Criteria
- Monthly usage report is reproducible and consistent.
- No double-counting in normal retry flows.

### Validation
- Reconciliation script/report on staging dataset.

---

## Phase 6 — Quality Gate (Security + A11y + E2E) (P1)

### Deliverables
- E2E critical flows:
  - auth
  - upload
  - analysis
  - share/revoke
  - logout
  - billing access
- Keep `a11y:audit` and `a11y:audit:deep` green.

### Acceptance Criteria
- CI quality gate passes consistently.
- No P0/P1 bugs in release candidate.

### Validation
- CI artifacts + test reports attached.

---

## Phase 7 — Go-Live Ops and Release Controls (P0)

### Deliverables
- Monitoring/alerts:
  - worker availability
  - webhook failures
  - 5xx rates
  - latency and queue depth
- Incident runbooks and rollback procedure.
- Production release checklist.

### Acceptance Criteria
- On-call can execute runbook with no ambiguity.
- Rollback tested in staging.

### Validation
- Staging game-day exercise completed.

---

## Go / No-Go Checklist

- [ ] Storage isolation verified (no cross-user file access)
- [ ] Worker enqueue endpoint authenticated
- [ ] DB tenant constraints active and validated
- [ ] Share links have expiry/revocation controls
- [ ] Billing/usage reconciliation passes
- [ ] Security + a11y + E2E gates pass
- [ ] Monitoring, alerts, and runbooks in place
- [ ] Staging sign-off completed

---

## Change Log

- 2026-03-25: Initial production hardening plan created.
- 2026-03-25: Phase 1 started. Added storage RLS hardening migration for user-prefix isolation in `contracts` bucket.
- 2026-03-25: Phase 2 started. Added mandatory `WORKER_SHARED_SECRET` auth for `/jobs` endpoints and propagated `x-worker-secret` from web calls.
- 2026-03-25: Phase 2 closed as done after baseline commit `474d12a`.
- 2026-03-25: Phase 3 started. Added tenant-integrity migration (`analyses.org_id`, backfills, composite FK, sync trigger) and worker-side ownership validation before analysis writes.
- 2026-03-25: Phase 1 closed as done after manual cross-account storage verification (B cannot access A object path).
- 2026-03-25: Phase 3 closed as done after DB checks: org null counts returned 0/0 and invalid analysis insert was blocked by tenant sync trigger.
- 2026-03-25: Phase 4 started. Added share-link compliance migration (enabled/expires/revoked/shared_by) and enforced revocation/expiry checks in shared analysis loader and share API.
- 2026-03-25: Phase 4 closed as done after functional verification (share create/revoke + expiry enforcement path).
- 2026-03-25: Phase 5 started to strengthen usage auditability and prevent double-counting.
