import type { Plan } from "@/lib/plan-limits"

/** Pure upgrade/downgrade rules for billing cards — safe for Server Components. */
export function planCheckoutState(
  planId: Plan,
  currentPlan: Plan,
  downgradeHint: string
): { showCheckout: boolean; disabledReason: string | null } {
  if (planId === "free" || planId === "enterprise") {
    return { showCheckout: false, disabledReason: null }
  }
  if (planId === currentPlan) {
    return { showCheckout: false, disabledReason: null }
  }
  const order: Plan[] = ["free", "starter", "pro", "team", "enterprise"]
  const cur = order.indexOf(currentPlan)
  const nxt = order.indexOf(planId)
  if (nxt > cur) {
    return { showCheckout: true, disabledReason: null }
  }
  return { showCheckout: false, disabledReason: downgradeHint }
}
