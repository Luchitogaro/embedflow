import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { normalizePlan, type Plan } from "@/lib/plan-limits"
import { countMonthlyQuotaDocuments, getEffectiveMonthlyDocLimit } from "@/lib/monthly-upload-quota"
import { CheckoutButton, PortalButton } from "./billing-actions"
import { planCheckoutState } from "./plan-checkout-state"
import { getMessagesForRequest } from "@/lib/i18n/server"

export default async function BillingPage() {
  const { messages } = await getMessagesForRequest()
  const b = messages.billing

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  // Read-only: avoid ensureUserAndOrg (needs service role if public.users row is missing).
  const { data: userRow } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single()

  const canManageBilling = ["owner", "admin"].includes(userRow?.role ?? "")

  let currentPlan: Plan = "free"
  let stripeCustomerId: string | null = null
  if (userRow?.org_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("plan, stripe_customer_id")
      .eq("id", userRow.org_id)
      .single()
    currentPlan = normalizePlan(org?.plan)
    stripeCustomerId = org?.stripe_customer_id ?? null
  }

  const monthlyLimit = getEffectiveMonthlyDocLimit(currentPlan, user.id, user.email)
  const documentsUsed = await countMonthlyQuotaDocuments(supabase, {
    orgId: userRow?.org_id ?? null,
    userId: user.id,
  })

  const used = documentsUsed
  const usageLabel = monthlyLimit == null ? `${used}` : `${used} / ${monthlyLimit}`

  const portalStrings = {
    manage: b.manageSubscription,
    opening: b.opening,
    portalFailed: b.actions.portalFailed,
  }

  const checkoutStrings = {
    redirecting: b.actions.redirecting,
    checkoutFailed: b.actions.checkoutFailed,
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{b.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{b.subtitle}</p>
        </div>
        {canManageBilling && stripeCustomerId ? (
          <PortalButton strings={portalStrings} />
        ) : (
          <p className="text-xs text-muted-foreground max-w-xs text-right">
            {canManageBilling ? b.portalHintSubscribe : b.portalHintRole}
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {b.plansList.map((plan) => (
          <Card key={plan.id} className={plan.id === currentPlan ? "ring-2 ring-blue-500" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                {plan.id === currentPlan && <Badge className="text-xs">{b.currentPlanBadge}</Badge>}
              </div>
              <CardDescription>
                <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-primary/100 rounded-full" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.id === currentPlan ? (
                <Button variant="outline" size="sm" className="w-full mt-4" disabled>
                  {b.currentPlan}
                </Button>
              ) : plan.id === "free" || plan.id === "enterprise" ? (
                <Button variant="outline" size="sm" className="w-full mt-4" disabled>
                  {plan.id === "free" ? b.defaultFree : b.contactSales}
                </Button>
              ) : (
                (() => {
                  const { showCheckout, disabledReason } = planCheckoutState(
                    plan.id as Plan,
                    currentPlan,
                    b.downgradeHint
                  )
                  if (showCheckout) {
                    return (
                      <CheckoutButton
                        plan={plan.id as "starter" | "pro" | "team"}
                        disabled={!canManageBilling}
                        label={b.upgrade}
                        strings={checkoutStrings}
                      />
                    )
                  }
                  if (disabledReason) {
                    return <p className="text-xs text-muted-foreground mt-4 text-center leading-snug">{disabledReason}</p>
                  }
                  return null
                })()
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{b.usageTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-foreground">
                {usageLabel}
                {monthlyLimit == null ? <span className="text-sm text-muted-foreground ml-1">{b.unlimited}</span> : null}
              </p>
              <p className="text-sm text-muted-foreground">{b.usageDocs}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground capitalize">{currentPlan}</p>
              <p className="text-sm text-muted-foreground">{b.currentPlanLabel}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
