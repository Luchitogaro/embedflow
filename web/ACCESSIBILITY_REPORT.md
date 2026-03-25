# Accessibility Audit Report

Date: 2026-03-25  
Scope: Public and auth-entry routes in the Next.js web app  
Standard: WCAG 2.1 AA (via `pa11y-ci`)

## Tooling

- Added dev tooling:
  - `pa11y`
  - `pa11y-ci`
- Added script:
  - `npm run a11y:audit`
  - `npm run a11y:audit:deep`
- Added config:
  - `.pa11yci.json`
  - `scripts/a11y-deep.mjs` (supports authenticated audits via session cookie)

## Routes Audited

- `/`
- `/login`
- `/signup`
- `/docs/api`
- `/dashboard` (redirect path for unauthenticated users)

## Results

- Initial run: **10 issues** (name/label accessibility in auth forms).
- Fixes implemented:
  - Added explicit `htmlFor` + `id` mapping for auth inputs.
  - Added accessible names (`aria-label`) for password visibility toggle buttons.
  - Added i18n copy for those aria labels (`showPassword`, `hidePassword`) in `en`, `es`, and `pt`.
  - Improved mobile nav accessibility semantics (dialog labels and keyboard close behavior).
  - Ensured unique control IDs for locale/theme selectors (`useId`).
- Final run: **5/5 routes passed, 0 errors**.

## Commands Used

```bash
npm run a11y:audit
npm run a11y:audit:deep
npx tsc --noEmit
```

## Deep Audit Phase

- Added deep audit runner with optional authenticated route coverage.
- Environment variables:
  - `A11Y_BASE_URL` (default: `http://127.0.0.1:3000`)
  - `A11Y_SESSION_COOKIE` (required to scan private dashboard routes)
  - `A11Y_DOCUMENT_ID` (optional, to include one document detail route)
- Latest deep run (without auth cookie): **4/4 passed, 0 errors** on:
  - `/`
  - `/login`
  - `/signup`
  - `/docs/api`
- Authenticated routes are now wired for audit and can be scanned in CI or locally once a session cookie is provided.
- Latest authenticated deep run:
  - **8/8 evaluated routes passed, 0 errors**
  - **1 route skipped** (`/dashboard/settings/billing`) because the app returned an error page in this environment (non-a11y functional dependency issue).

### Authenticated Deep Run Example

```bash
A11Y_BASE_URL="http://127.0.0.1:3000" \
A11Y_SESSION_COOKIE="sb-...=..." \
A11Y_DOCUMENT_ID="your-document-id" \
npm run a11y:audit:deep
```

## Notes / Remaining Risk

- This pass validates static/entry flows. A full certification-style program should also include:
  - authenticated deep flows (`/dashboard/documents/[id]`, billing/integrations states),
  - keyboard-only path walkthroughs,
  - screen reader smoke tests (VoiceOver/NVDA),
  - zoom/reflow checks (200%-400%),
  - reduced motion and high-contrast mode checks.
