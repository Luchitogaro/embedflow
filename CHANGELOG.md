# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.1] - 2026-05-06

### Added

- **Supabase migration `017_org_billing_profile_audit.sql`** — `billing_profile_updated_at` / `billing_profile_updated_by` en `organizations` para auditoría del perfil fiscal.
- **Export CSV de cobros aprobados** — `GET /api/billing/approved-payments-csv` (owner/admin); botón en historial de facturación.
- **Correo opcional tras sync GarSaaS exitoso** — si `BILLING_GARSAAS_SYNC_SUCCESS_EMAIL=true` y `RESEND_API_KEY`, aviso al `billing_invoice_email` de la org (`web/src/lib/email/resend.ts`, `garsaas-sync-success-email.ts`).
- **Texto de auditoría** en el formulario de datos fiscales cuando existe última actualización.

### Changed

- `updateOrgBillingInvoiceProfile` persiste fecha y usuario de última edición fiscal.
- `.env.example` — variables Resend y `BILLING_GARSAAS_SYNC_SUCCESS_EMAIL`.

---

## [0.2.0] - 2026-05-06

### Added

- **Wompi billing history + sync status in settings**
  - "Invoices and payments" section with filters (All/Pending/Errors/Synced).
  - Client pagination and range display over up to 100 approved intents.
  - Visual sync badges for GarSaaS/DIAN queue states.
- **RLS policy for billing intents history**
  - Migration `015_payment_intents_org_admin_select.sql` enables authenticated owner/admin read access on `payment_intents` for their org.
- **Organization fiscal profile (DIAN MVP)**
  - Migration `016_org_billing_profile.sql` adds `billing_*` fields on `organizations`.
  - Billing form in dashboard settings with validation and owner/admin write access.
  - i18n for invoice profile in ES/EN/PT.
- **GarSaaS snapshot parity with BabyFirst/AgroBrain**
  - `buyer_org.billing_profile_snapshot` now includes normalized fiscal fields and `profile_complete`.

### Changed

- Wompi checkout now requires complete fiscal profile before creating a paid intent.
- `customer_email` in payment intent now prioritizes billing invoice email when available.
- Billing documentation updated (`docs/BILLING_WOMPI.md`) with migrations 015/016 and the full billing profile flow.

---
