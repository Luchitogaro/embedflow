import { Check, Clock, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Plan } from "@/lib/plan-limits"
import { countMonthlyQuotaDocuments, getEffectiveMonthlyDocLimit, isDevQuotaBypassForUser } from "@/lib/monthly-upload-quota"
import { CheckoutButton, PortalButton } from "./billing-actions"
import { planCheckoutState } from "./plan-checkout-state"
import { getMessagesForRequest } from "@/lib/i18n/server"
import {
  devPlanOverride,
  effectiveOrgPlan,
  effectiveOrgPlanFromDatabase,
  isActiveDevPlanOverride,
} from "@/lib/org-plan"
import { getBillingProvider } from "@/lib/billing-config"
import { interpolate } from "@/lib/i18n/interpolate"
import { cn } from "@/lib/utils"

export default async function BillingPage() {
  const { messages } = await getMessagesForRequest()
  const b = messages.billing

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const { data: userRow } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single()

  const canManageBilling = ["owner", "admin"].includes(userRow?.role ?? "")

  const billingProvider = getBillingProvider()

  let storedPlan: Plan = "free"
  let currentPlan: Plan = devPlanOverride() ?? "free"
  let stripeCustomerId: string | null = null
  let planExpiresAt: string | null = null
  if (userRow?.org_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("plan, stripe_customer_id, plan_expires_at")
      .eq("id", userRow.org_id)
      .single()
    storedPlan = effectiveOrgPlanFromDatabase(org?.plan, org?.plan_expires_at)
    currentPlan = effectiveOrgPlan(org?.plan, org?.plan_expires_at)
    stripeCustomerId = org?.stripe_customer_id ?? null
    planExpiresAt = org?.plan_expires_at ?? null
  }

  const planOverrideOn = isActiveDevPlanOverride()
  const monthlyLimit = getEffectiveMonthlyDocLimit(currentPlan, user.id, user.email)
  const documentsUsed = await countMonthlyQuotaDocuments(supabase, {
    orgId: userRow?.org_id ?? null,
    userId: user.id,
  })

  const used = documentsUsed
  const quotaBypass = isDevQuotaBypassForUser(user.id, user.email)
  const usageLimitLabel =
    monthlyLimit == null
      ? quotaBypass && currentPlan === "free"
        ? `${used} ${b.usageDevQuotaBypass}`
        : `${used} ${b.unlimited}`
      : `${used} / ${monthlyLimit}`

  const portalStrings = {
    manage: b.manageSubscription,
    opening: b.opening,
    portalFailed: b.actions.portalFailed,
  }

  const checkoutStrings = {
    redirecting: b.actions.redirecting,
    checkoutFailed: b.actions.checkoutFailed,
  }

  const previewPlanKey = currentPlan as keyof typeof messages.planLabels
  const previewPlanLabel = messages.planLabels[previewPlanKey] ?? currentPlan
  const storedPlanKey = storedPlan as keyof typeof messages.planLabels
  const storedPlanLabel = messages.planLabels[storedPlanKey] ?? storedPlan

  /** Unset or anything except the literal `"false"` → “coming soon” billing (demo-friendly). */
  const billingComingSoon = process.env.EMBEDFLOW_BILLING_COMING_SOON !== "false"

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{b.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{b.subtitle}</p>
        </div>
        {billingComingSoon ? (
          <Badge variant="secondary" className="shrink-0 gap-1.5 py-1.5 px-3 text-xs font-semibold">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {b.comingSoonBadge}
          </Badge>
        ) : canManageBilling && stripeCustomerId && billingProvider === "stripe" && !planOverrideOn ? (
          <PortalButton strings={portalStrings} />
        ) : (
          <p className="text-xs text-muted-foreground max-w-xs sm:text-right">
            {planOverrideOn
              ? b.checkoutDisabledWhileOverride
              : canManageBilling
                ? billingProvider === "mercadopago"
                  ? b.portalHintMercadoPago
                  : b.portalHintSubscribe
                : b.portalHintRole}
          </p>
        )}
      </div>

      {billingComingSoon ? (
        <div className="mb-10 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-muted/40 to-muted/20 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
              <Clock className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 space-y-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{b.comingSoonTitle}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">{b.comingSoonBody}</p>
              <p className="text-xs text-muted-foreground/90 pt-1 max-w-2xl">{b.comingSoonFooter}</p>
            </div>
          </div>
        </div>
      ) : null}

      {planOverrideOn ? (
        <Alert className="mb-8 border-amber-500/40 bg-amber-500/5">
          <Sparkles className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900 dark:text-amber-200">Plan override</AlertTitle>
          <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
            {interpolate(b.devPlanOverrideBanner, { planLabel: previewPlanLabel })}
          </AlertDescription>
        </Alert>
      ) : null}

      {billingComingSoon ? (
        <p className="text-xs font-medium text-muted-foreground mb-3 sm:mb-4">{b.comingSoonPlansNote}</p>
      ) : null}

      <div className="relative mb-10">
        {billingComingSoon ? (
          <div
            className="pointer-events-none absolute inset-0 z-[2] rounded-2xl bg-background/25 backdrop-blur-[1px] ring-1 ring-border/30"
            aria-hidden
          />
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {b.plansList.map((plan) => {
          const id = plan.id as Plan
          const isCurrent = id === currentPlan
          const isPro = plan.id === "pro"
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col border-border/80 shadow-sm transition-shadow hover:shadow-md",
                billingComingSoon && "opacity-[0.88]",
                isCurrent && "ring-2 ring-primary border-primary/30 shadow-md",
                isPro && !isCurrent && "border-primary/25 bg-gradient-to-b from-primary/[0.07] to-card"
              )}
            >
              {isPro ? (
                <div className="absolute right-3 top-3">
                  <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                    {b.planRecommendedBadge}
                  </Badge>
                </div>
              ) : null}
              <CardHeader className="pb-3 pt-5">
                <div className="flex flex-wrap items-center gap-2 pr-16">
                  <CardTitle className="text-lg font-semibold">{plan.name}</CardTitle>
                  {isCurrent ? (
                    <Badge className="text-[10px] font-medium bg-primary text-primary-foreground">
                      {b.currentPlanBadge}
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="space-y-0 pt-2">
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-3xl font-bold tracking-tight text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col pt-0">
                <ul className="space-y-2.5 flex-1 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground leading-snug">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {billingComingSoon ? (
                  <Button variant="secondary" size="sm" className="w-full mt-auto" disabled>
                    {b.comingSoonBadge}
                  </Button>
                ) : plan.id === currentPlan ? (
                  <Button variant="outline" size="sm" className="w-full mt-auto" disabled>
                    {b.currentPlan}
                  </Button>
                ) : plan.id === "free" || plan.id === "enterprise" ? (
                  <Button variant="outline" size="sm" className="w-full mt-auto" disabled>
                    {plan.id === "free" ? b.defaultFree : b.contactSales}
                  </Button>
                ) : planOverrideOn ? (
                  <p className="text-xs text-amber-800 dark:text-amber-200/90 mt-auto text-center leading-snug">
                    {b.checkoutDisabledWhileOverride}
                  </p>
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
                      return (
                        <p className="text-xs text-muted-foreground mt-auto text-center leading-snug">{disabledReason}</p>
                      )
                    }
                    return null
                  })()
                )}
              </CardContent>
            </Card>
          )
        })}
        </div>
      </div>

      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/30 pb-4">
          <CardTitle className="text-base font-semibold">{b.usageTitle}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">{usageLimitLabel}</p>
              <p className="text-sm text-muted-foreground mt-1">{b.usageDocs}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-2xl font-bold text-foreground capitalize">{previewPlanLabel}</p>
              <p className="text-sm text-muted-foreground mt-1">{b.currentPlanLabel}</p>
              {planOverrideOn && userRow?.org_id ? (
                <p className="text-xs text-muted-foreground mt-2">
                  {b.storedSubscriptionLabel}: <span className="font-medium text-foreground">{storedPlanLabel}</span>
                </p>
              ) : null}
            </div>
          </div>
          {billingProvider === "mercadopago" && planExpiresAt && currentPlan !== "free" && !planOverrideOn ? (
            <p className="mt-5 text-xs text-muted-foreground border-t border-border pt-4">
              {b.planPaidThroughPrefix}{" "}
              <span className="font-medium text-foreground">
                {new Date(planExpiresAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {". "}
              {b.planPaidThroughSuffix}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
