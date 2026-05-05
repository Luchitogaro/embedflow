import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  notifyGarsaasDianBilling,
  persistGarsaasNotifyOutcome,
} from "@/lib/billing/notify-garsaas-dian"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_ATTEMPTS = 25

/**
 * Reintentos GarSaaS para intents APPROVED sin `garsaas_invoice_id`.
 * Programar en Railway cron (GET + Bearer) o Vercel Cron (ver vercel.cron.example.json).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  const auth = req.headers.get("authorization")
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let admin
  try {
    admin = createServiceRoleClient()
  } catch (e) {
    console.error("[cron] garsaas-billing-sync: service role unavailable", e)
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  const { data: rows, error } = await admin
    .from("payment_intents")
    .select("reference, wompi_transaction_id, garsaas_notify_next_at")
    .eq("status", "APPROVED")
    .is("garsaas_invoice_id", null)
    .eq("garsaas_no_upstream", false)
    .lt("garsaas_notify_attempts", MAX_ATTEMPTS)
    .not("wompi_transaction_id", "is", null)
    .order("garsaas_notify_next_at", { ascending: true, nullsFirst: true })
    .limit(50)

  if (error) {
    console.error("[cron] garsaas-billing-sync query", error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const now = Date.now()
  const due = (rows ?? []).filter((r) => {
    const next = r.garsaas_notify_next_at
    if (!next) return true
    return new Date(next).getTime() <= now
  })

  let processed = 0
  for (const row of due) {
    const ref = row.reference as string
    const tid = row.wompi_transaction_id as string
    const outcome = await notifyGarsaasDianBilling(admin, {
      reference: ref,
      transactionId: tid,
      paidAtIso: new Date().toISOString(),
    })
    await persistGarsaasNotifyOutcome(admin, ref, outcome)
    processed++
  }

  return NextResponse.json({
    ok: true,
    scanned: rows?.length ?? 0,
    due: due.length,
    processed,
  })
}
