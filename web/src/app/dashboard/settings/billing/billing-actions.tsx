"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Plan } from "@/lib/plan-limits"

type Billable = "starter" | "pro" | "team"

type PortalStrings = {
  manage: string
  opening: string
  portalFailed: string
}

type CheckoutStrings = {
  redirecting: string
  checkoutFailed: string
}

export function PortalButton({ disabled, strings }: { disabled?: boolean; strings: PortalStrings }) {
  const [loading, setLoading] = useState(false)

  async function onClick() {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url as string
        return
      }
      alert((data.error as string) || strings.portalFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button type="button" variant="outline" disabled={disabled || loading} onClick={onClick}>
      {loading ? strings.opening : strings.manage}
    </Button>
  )
}

export function CheckoutButton({
  plan,
  disabled,
  label,
  strings,
}: {
  plan: Billable
  disabled?: boolean
  label: string
  strings: CheckoutStrings
}) {
  const [loading, setLoading] = useState(false)

  async function onClick() {
    setLoading(true)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url as string
        return
      }
      alert((data.error as string) || strings.checkoutFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button type="button" size="sm" className="w-full mt-4" disabled={disabled || loading} onClick={onClick}>
      {loading ? strings.redirecting : label}
    </Button>
  )
}

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
