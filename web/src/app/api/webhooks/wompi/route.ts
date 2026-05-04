import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { parseTransactionFromWebhookBody } from "@/lib/wompi/parse-webhook"
import {
  applyApprovedWompiPayment,
  markWompiIntentDeclined,
} from "@/lib/billing/apply-wompi-payment"

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
  } else if (declined) {
    await markWompiIntentDeclined(admin, tx.reference, tx.transactionId)
  }

  return NextResponse.json({ ok: true })
}
