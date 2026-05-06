import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const CSV_LIMIT = 2000

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return ""
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase.from("users").select("org_id, role").eq("id", user.id).single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No organization" }, { status: 400 })
  }
  if (!["owner", "admin"].includes(profile.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: rows, error } = await supabase
    .from("payment_intents")
    .select(
      [
        "reference",
        "target_plan",
        "amount_in_cents",
        "currency",
        "updated_at",
        "wompi_transaction_id",
        "garsaas_invoice_id",
        "garsaas_notify_last_error",
        "garsaas_notify_next_at",
        "garsaas_no_upstream",
      ].join(", ")
    )
    .eq("org_id", profile.org_id)
    .eq("status", "APPROVED")
    .order("updated_at", { ascending: false })
    .limit(CSV_LIMIT)

  if (error) {
    console.error("[billing] csv export:", error.message)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }

  const header = [
    "reference",
    "target_plan",
    "amount_in_cents",
    "currency",
    "updated_at",
    "wompi_transaction_id",
    "garsaas_invoice_id",
    "garsaas_notify_last_error",
    "garsaas_notify_next_at",
    "garsaas_no_upstream",
  ].join(",")

  const list = (Array.isArray(rows) ? rows : []) as unknown as Record<string, unknown>[]
  const lines = list.map((r) =>
    [
      csvEscape(r.reference),
      csvEscape(r.target_plan),
      csvEscape(r.amount_in_cents),
      csvEscape(r.currency),
      csvEscape(r.updated_at ? new Date(String(r.updated_at)).toISOString() : ""),
      csvEscape(r.wompi_transaction_id),
      csvEscape(r.garsaas_invoice_id),
      csvEscape(r.garsaas_notify_last_error),
      csvEscape(r.garsaas_notify_next_at ? new Date(String(r.garsaas_notify_next_at)).toISOString() : ""),
      csvEscape(r.garsaas_no_upstream),
    ].join(",")
  )

  const csv = `${[header, ...lines].join("\n")}\n`
  const filename = `approved-payments-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
