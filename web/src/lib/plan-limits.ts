export type Plan = "free" | "starter" | "pro" | "team" | "enterprise"

export const PLAN_DOC_LIMITS: Record<Plan, number | null> = {
  free: 3,
  starter: 20,
  pro: null,
  team: null,
  enterprise: null,
}

export function normalizePlan(value: string | null | undefined): Plan {
  if (!value) return "free"
  if (value === "starter" || value === "pro" || value === "team" || value === "enterprise") {
    return value
  }
  return "free"
}

export function getMonthlyDocLimit(plan: string | null | undefined): number | null {
  return PLAN_DOC_LIMITS[normalizePlan(plan)]
}
