import { normalizePlan, type Plan } from "@/lib/plan-limits"

/**
 * DB may still store `plan` as paid while access should be treated as free
 * (Mercado Pago period ended). Stripe orgs keep `plan_expires_at` null.
 */
export function effectiveOrgPlan(
  dbPlan: string | null | undefined,
  planExpiresAt: string | null | undefined
): Plan {
  const p = normalizePlan(dbPlan)
  if (p === "free") return "free"
  if (!planExpiresAt) return p
  if (new Date(planExpiresAt).getTime() <= Date.now()) return "free"
  return p
}
