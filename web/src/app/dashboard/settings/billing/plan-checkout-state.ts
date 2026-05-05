import type { Plan } from "@/lib/plan-limits"

export type PlanCheckoutIntent = "upgrade" | "switch_paid_plan"

export type PlanCheckoutOptions = {
  /**
   * Stripe: solo upgrades vía checkout; bajadas → portal.
   * Wompi / Mercado Pago: sin portal; cada pago nuevo puede fijar otro plan de pago (subir o bajar).
   */
  allowPaidTierSwitch?: boolean
}

/** Pure upgrade/downgrade rules for billing cards — safe for Server Components. */
export function planCheckoutState(
  planId: Plan,
  currentPlan: Plan,
  downgradeHint: string,
  opts?: PlanCheckoutOptions
): {
  showCheckout: boolean
  disabledReason: string | null
  checkoutIntent: PlanCheckoutIntent | null
} {
  if (planId === "free" || planId === "enterprise") {
    return { showCheckout: false, disabledReason: null, checkoutIntent: null }
  }
  if (planId === currentPlan) {
    return { showCheckout: false, disabledReason: null, checkoutIntent: null }
  }
  const order: Plan[] = ["free", "starter", "pro", "team", "enterprise"]
  const cur = order.indexOf(currentPlan)
  const nxt = order.indexOf(planId)
  if (nxt > cur) {
    return { showCheckout: true, disabledReason: null, checkoutIntent: "upgrade" }
  }
  if (opts?.allowPaidTierSwitch) {
    return { showCheckout: true, disabledReason: null, checkoutIntent: "switch_paid_plan" }
  }
  return { showCheckout: false, disabledReason: downgradeHint, checkoutIntent: null }
}
