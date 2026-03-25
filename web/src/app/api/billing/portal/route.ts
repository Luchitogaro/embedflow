import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe"
import { ensureUserAndOrg } from "@/lib/ensure-user-org"
import { getBillingProvider } from "@/lib/billing-config"

export async function POST() {
  if (getBillingProvider() === "mercadopago") {
    return NextResponse.json(
      { error: "Billing portal is only available when using Stripe." },
      { status: 400 }
    )
  }

  const stripe = getStripe()
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 })
  }

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

  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.org_id || !["owner", "admin"].includes(profile.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", profile.org_id)
    .single()

  if (!org?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account yet. Subscribe to a paid plan first." },
      { status: 400 }
    )
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${appUrl}/dashboard/settings/billing`,
  })

  return NextResponse.json({ url: session.url })
}
