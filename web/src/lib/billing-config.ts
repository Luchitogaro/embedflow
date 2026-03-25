export type BillingProviderName = "stripe" | "mercadopago"

/** Default stripe keeps existing deployments unchanged. */
export function getBillingProvider(): BillingProviderName {
  const v = process.env.BILLING_PROVIDER?.trim().toLowerCase()
  return v === "mercadopago" ? "mercadopago" : "stripe"
}

export function mercadopagoPlanPeriodDays(): number {
  const raw = process.env.MERCADOPAGO_PLAN_PERIOD_DAYS?.trim()
  const n = raw ? parseInt(raw, 10) : 30
  return Number.isFinite(n) && n >= 1 && n <= 365 ? n : 30
}
