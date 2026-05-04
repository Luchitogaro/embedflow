import { randomUUID } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Plan } from "@/lib/plan-limits"
import { isBillablePlan } from "@/lib/stripe-prices"
import { getWompiIntegritySecret, getWompiPublicKey, isWompiConfiguredForServer } from "@/lib/wompi/config"
import { wompiIntegritySignature } from "@/lib/wompi/signature"
import { buildWompiWebCheckoutUrl } from "@/lib/wompi/build-checkout-url"
import { getWompiEnvLabel } from "@/lib/billing/wompi-env-label"

function buildReference(orgId: string): string {
  const short = orgId.replace(/-/g, "").slice(0, 10)
  const tail = randomUUID().replace(/-/g, "").slice(0, 12)
  return `EF-${getWompiEnvLabel()}-${short}-${tail}`
}

export async function createEmbedflowWompiCheckout(
  admin: SupabaseClient,
  input: {
    orgId: string
    plan: Plan
    appUrl: string
    customerEmail?: string | null
  }
): Promise<
  | { ok: true; checkoutUrl: string; reference: string; amountInCents: number; currency: string }
  | { ok: false; error: string }
> {
  if (!isBillablePlan(input.plan)) {
    return { ok: false, error: "Plan not billable" }
  }
  if (!isWompiConfiguredForServer()) {
    return { ok: false, error: "Wompi not configured (missing server keys)" }
  }

  const { data: row, error: catErr } = await admin
    .from("subscription_plan_catalog")
    .select("*")
    .eq("plan", input.plan)
    .eq("is_active", true)
    .maybeSingle()

  if (catErr || !row) {
    return { ok: false, error: "Plan not available in catalog" }
  }

  const amountInCents = row.amount_in_cents as number
  if (!amountInCents || amountInCents <= 0) {
    return { ok: false, error: "Invalid plan amount" }
  }

  const currency = (row.currency as string) || "COP"
  const reference = buildReference(input.orgId)
  const secret = getWompiIntegritySecret()!
  const publicKey = getWompiPublicKey()!

  const integritySignature = wompiIntegritySignature({
    reference,
    amountInCents,
    currency,
    integritySecret: secret,
  })

  const { error: insErr } = await admin.from("payment_intents").insert({
    reference,
    org_id: input.orgId,
    target_plan: input.plan,
    amount_in_cents: amountInCents,
    currency,
    status: "CREATED",
    customer_email: input.customerEmail ?? null,
  })

  if (insErr) {
    console.error("wompi checkout insert intent:", insErr)
    return { ok: false, error: "Could not create payment intent" }
  }

  const base = input.appUrl.replace(/\/$/, "")
  const redirectUrl = `${base}/dashboard/settings/billing?billing=success`

  const checkoutUrl = buildWompiWebCheckoutUrl({
    publicKey,
    currency,
    amountInCents,
    reference,
    integritySignature,
    redirectUrl,
  })

  return {
    ok: true,
    checkoutUrl,
    reference,
    amountInCents,
    currency,
  }
}
