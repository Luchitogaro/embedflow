import type { Plan } from "@/lib/plan-limits"

const BILLABLE_PLANS = new Set<Plan>(["starter", "pro", "team"])

export function isBillablePlan(plan: string): plan is Plan {
  return BILLABLE_PLANS.has(plan as Plan)
}

export function stripePriceIdForPlan(plan: Plan): string | null {
  const env: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    team: process.env.STRIPE_PRICE_TEAM,
  }
  const id = env[plan]
  return id?.trim() ? id : null
}

/** Resolve plan when subscription metadata is missing (e.g. after a portal change). */
export function planFromStripePriceId(priceId: string | undefined): Plan | null {
  if (!priceId?.trim()) return null
  if (priceId === process.env.STRIPE_PRICE_STARTER?.trim()) return "starter"
  if (priceId === process.env.STRIPE_PRICE_PRO?.trim()) return "pro"
  if (priceId === process.env.STRIPE_PRICE_TEAM?.trim()) return "team"
  return null
}
