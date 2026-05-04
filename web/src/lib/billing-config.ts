export type BillingProviderName = "stripe" | "mercadopago" | "wompi"

/** Default stripe keeps existing deployments unchanged. */
export function getBillingProvider(): BillingProviderName {
  const v = process.env.BILLING_PROVIDER?.trim().toLowerCase()
  if (v === "mercadopago") return "mercadopago"
  if (v === "wompi") return "wompi"
  return "stripe"
}

export function wompiPlanPeriodDays(): number {
  const raw = process.env.WOMPI_PLAN_PERIOD_DAYS?.trim()
  const n = raw ? parseInt(raw, 10) : 30
  return Number.isFinite(n) && n >= 1 && n <= 365 ? n : 30
}

export function mercadopagoPlanPeriodDays(): number {
  const raw = process.env.MERCADOPAGO_PLAN_PERIOD_DAYS?.trim()
  const n = raw ? parseInt(raw, 10) : 30
  return Number.isFinite(n) && n >= 1 && n <= 365 ? n : 30
}
