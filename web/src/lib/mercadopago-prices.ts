import type { Plan } from "@/lib/plan-limits"
import { isBillablePlan } from "@/lib/stripe-prices"

/** COP whole pesos (Mercado Pago unit_price for currency_id COP). */
export function mercadopagoUnitPriceForPlan(plan: Plan): number | null {
  if (!isBillablePlan(plan)) return null
  const env: Record<string, string | undefined> = {
    starter: process.env.MERCADOPAGO_AMOUNT_STARTER,
    pro: process.env.MERCADOPAGO_AMOUNT_PRO,
    team: process.env.MERCADOPAGO_AMOUNT_TEAM,
  }
  const raw = env[plan]?.trim()
  if (!raw) return null
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1000) return null
  return n
}

export function mercadopagoCurrencyId(): string {
  const c = process.env.MERCADOPAGO_CURRENCY_ID?.trim().toUpperCase()
  return c || "COP"
}
