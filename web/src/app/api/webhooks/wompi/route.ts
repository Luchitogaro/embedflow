import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { parseTransactionFromWebhookBody } from "@/lib/wompi/parse-webhook"
import { verifyWompiEventChecksum } from "@/lib/wompi/verify-event-checksum"
import {
  applyApprovedWompiPayment,
  markWompiIntentDeclined,
} from "@/lib/billing/apply-wompi-payment"
import {
  notifyGarsaasDianBilling,
  persistGarsaasNotifyOutcome,
} from "@/lib/billing/notify-garsaas-dian"

export const runtime = "nodejs"

export function GET() {
  return NextResponse.json({
    ok: true,
    hook: "wompi",
    hint: "Wompi sends transaction events with POST",
  })
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const eventsSecret = process.env.WOMPI_EVENTS_SECRET?.trim()
  if (eventsSecret && typeof body === "object" && body !== null) {
    const ok = verifyWompiEventChecksum(body as Record<string, unknown>, eventsSecret)
    if (!ok) {
      console.warn("[wompi] webhook event checksum mismatch")
      return NextResponse.json({ ok: false, error: "invalid_event_checksum" }, { status: 401 })
    }
  } else if (!eventsSecret && process.env.NODE_ENV === "production") {
    console.warn(
      "[wompi] WOMPI_EVENTS_SECRET unset — configure Events secret from Wompi Dashboard for webhook authenticity (recommended in production)"
    )
  }

  const tx = parseTransactionFromWebhookBody(body)
  if (!tx) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    console.error("wompi webhook: service role unavailable", e)
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 })
  }

  const approved = tx.status === "APPROVED"
  const declined =
    tx.status === "DECLINED" || tx.status === "VOIDED" || tx.status === "REJECTED"

  if (approved) {
    const result = await applyApprovedWompiPayment(admin, tx.reference, tx.transactionId)
    if (!result.ok && result.reason === "INTENT_NOT_FOUND") {
      return NextResponse.json({ ok: true, ignored: true })
    }
    if (result.ok) {
      const notifyResult = await notifyGarsaasDianBilling(admin, {
        reference: tx.reference,
        transactionId: tx.transactionId,
        paidAtIso: new Date().toISOString(),
      })
      await persistGarsaasNotifyOutcome(admin, tx.reference, notifyResult)
    }
  } else if (declined) {
    await markWompiIntentDeclined(admin, tx.reference, tx.transactionId)
  }

  return NextResponse.json({ ok: true })
}
