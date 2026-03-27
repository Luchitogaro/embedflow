import { normalizePlan, type Plan } from "@/lib/plan-limits"

/**
 * DB may still store `plan` as paid while access should be treated as free
 * (Mercado Pago period ended). Stripe orgs keep `plan_expires_at` null.
 */
export function effectiveOrgPlanFromDatabase(
  dbPlan: string | null | undefined,
  planExpiresAt: string | null | undefined
): Plan {
  const p = normalizePlan(dbPlan)
  if (p === "free") return "free"
  if (!planExpiresAt) return p
  if (new Date(planExpiresAt).getTime() <= Date.now()) return "free"
  return p
}

export function isDevPlanBypassRuntimeEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.EMBEDFLOW_ALLOW_PLAN_BYPASS === "true"
  )
}

/** When set (with bypass runtime), all feature gates use this plan instead of Postgres. */
export function devPlanOverride(): Plan | null {
  if (!isDevPlanBypassRuntimeEnabled()) return null
  const raw = process.env.EMBEDFLOW_DEV_PLAN_OVERRIDE?.trim().toLowerCase()
  if (!raw) return null
  return normalizePlan(raw)
}

export function isActiveDevPlanOverride(): boolean {
  return devPlanOverride() !== null
}

/**
 * Effective plan for product gates (upload limits, pitch, share, API, etc.).
 * Applies `EMBEDFLOW_DEV_PLAN_OVERRIDE` in development or when `EMBEDFLOW_ALLOW_PLAN_BYPASS=true`.
 */
export function effectiveOrgPlan(
  dbPlan: string | null | undefined,
  planExpiresAt: string | null | undefined
): Plan {
  const o = devPlanOverride()
  if (o !== null) return o
  return effectiveOrgPlanFromDatabase(dbPlan, planExpiresAt)
}
