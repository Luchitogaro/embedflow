import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"
import type { Plan } from "@/lib/plan-limits"
import { isBillablePlan, stripePriceIdForPlan } from "@/lib/stripe-prices"
import { ensureUserAndOrg } from "@/lib/ensure-user-org"
import { getBillingProvider } from "@/lib/billing-config"
import { createCheckoutPreference } from "@/lib/mercadopago-client"

export async function POST(req: NextRequest) {
  const provider = getBillingProvider()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureUserAndOrg(user.id, user.email)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Setup failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  let body: { plan?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const requested = body.plan?.toLowerCase()
  if (!requested || !isBillablePlan(requested)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }
  const plan = requested as Plan

  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 })
  }
  if (!["owner", "admin"].includes(profile.role ?? "")) {
    return NextResponse.json({ error: "Only owners and admins can manage billing" }, { status: 403 })
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id, stripe_customer_id")
    .eq("id", profile.org_id)
    .single()

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, "")

  if (provider === "mercadopago") {
    try {
      const { redirectUrl } = await createCheckoutPreference({
        orgId: org.id,
        plan,
        payerEmail: user.email,
        appUrl,
      })
      return NextResponse.json({ url: redirectUrl })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Mercado Pago checkout failed"
      console.error("billing/checkout mercadopago:", e)
      return NextResponse.json({ error: msg }, { status: 503 })
    }
  }

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 })
  }

  const priceId = stripePriceIdForPlan(plan)
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing Stripe price env for plan: ${plan}` },
      { status: 503 }
    )
  }

  const successUrl = `${appUrl}/dashboard/settings/billing?checkout=success`
  const cancelUrl = `${appUrl}/dashboard/settings/billing?checkout=cancel`

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: org.stripe_customer_id || undefined,
    customer_email: org.stripe_customer_id ? undefined : user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: org.id,
    metadata: {
      org_id: org.id,
      plan,
    },
    subscription_data: {
      metadata: {
        org_id: org.id,
        plan,
      },
    },
    allow_promotion_codes: true,
  })

  if (!session.url) {
    return NextResponse.json({ error: "Could not create checkout session" }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
