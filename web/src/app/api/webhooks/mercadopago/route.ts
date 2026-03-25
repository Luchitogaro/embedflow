import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { fetchPayment } from "@/lib/mercadopago-client"
import {
  extractMercadoPagoNotificationDataId,
  extractMercadoPagoNotificationType,
  verifyMercadoPagoWebhookSignature,
} from "@/lib/mercadopago-webhook"
import { mercadopagoPlanPeriodDays } from "@/lib/billing-config"
import type { Plan } from "@/lib/plan-limits"
import { normalizePlan } from "@/lib/plan-limits"
import { isBillablePlan } from "@/lib/stripe-prices"

export const runtime = "nodejs"

function parseExternalReference(ref: string | null | undefined): { orgId: string; plan: Plan } | null {
  if (!ref?.includes("::")) return null
  const idx = ref.indexOf("::")
  const orgId = ref.slice(0, idx).trim()
  const planRaw = ref.slice(idx + 2).trim().toLowerCase()
  if (!orgId || !planRaw) return null
  const plan = normalizePlan(planRaw)
  if (!isBillablePlan(plan)) return null
  return { orgId, plan }
}

function resolvePlanFromPayment(payment: {
  external_reference?: string | null
  metadata?: Record<string, unknown> | null
}): { orgId: string; plan: Plan } | null {
  const fromRef = parseExternalReference(payment.external_reference ?? undefined)
  if (fromRef) return fromRef

  const meta = payment.metadata ?? {}
  const orgId = typeof meta.org_id === "string" ? meta.org_id.trim() : ""
  const planRaw = typeof meta.plan === "string" ? meta.plan.trim().toLowerCase() : ""
  if (!orgId || !planRaw) return null
  const plan = normalizePlan(planRaw)
  if (!isBillablePlan(plan)) return null
  return { orgId, plan }
}

export async function POST(req: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()
  if (!secret) {
    console.error("mercadopago webhook: MERCADOPAGO_WEBHOOK_SECRET not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }

  const rawBody = await req.text()
  let parsed: unknown = null
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null
  } catch {
    parsed = null
  }

  const qs = req.nextUrl.searchParams
  const dataId =
    extractMercadoPagoNotificationDataId(parsed) ||
    qs.get("data.id") ||
    qs.get("id")

  const notifType =
    extractMercadoPagoNotificationType(parsed) || qs.get("type") || qs.get("topic") || ""

  let action = ""
  if (parsed && typeof parsed === "object" && "action" in parsed) {
    const a = (parsed as { action?: unknown }).action
    action = typeof a === "string" ? a : ""
  }

  const isPayment =
    notifType === "payment" ||
    notifType === "topic_payment" ||
    qs.get("topic") === "payment" ||
    action.startsWith("payment.")

  if (!isPayment || !dataId) {
    return NextResponse.json({ received: true, ignored: true })
  }

  const xSig = req.headers.get("x-signature")
  const xReq = req.headers.get("x-request-id")
  const okSig = verifyMercadoPagoWebhookSignature({
    rawBody,
    xSignature: xSig,
    xRequestId: xReq,
    dataId,
    secret,
  })
  if (!okSig) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  try {
    const payment = await fetchPayment(dataId)
    const status = String(payment.status || "").toLowerCase()
    if (status !== "approved") {
      return NextResponse.json({ received: true, status })
    }

    const resolved = resolvePlanFromPayment(payment)
    if (!resolved) {
      console.error("mercadopago webhook: could not resolve org/plan from payment", payment.id)
      return NextResponse.json({ error: "Bad payment payload" }, { status: 400 })
    }

    const days = mercadopagoPlanPeriodDays()
    const expires = new Date()
    expires.setUTCDate(expires.getUTCDate() + days)

    const admin = createServiceRoleClient()
    const { error } = await admin
      .from("organizations")
      .update({
        plan: resolved.plan,
        billing_provider: "mercadopago",
        plan_expires_at: expires.toISOString(),
      })
      .eq("id", resolved.orgId)

    if (error) {
      console.error("mercadopago webhook: org update failed", error)
      return NextResponse.json({ error: "Update failed" }, { status: 500 })
    }

    return NextResponse.json({ received: true, applied: true })
  } catch (e) {
    console.error("mercadopago webhook error", e)
    return NextResponse.json({ error: "Handler failed" }, { status: 500 })
  }
}

/** Some setups probe with GET; acknowledge. */
export async function GET() {
  return NextResponse.json({ ok: true, hook: "mercadopago" })
}
