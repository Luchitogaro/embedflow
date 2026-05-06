import type { SupabaseClient } from "@supabase/supabase-js"
import { wompiPlanPeriodDays } from "@/lib/billing-config"
import { nextGarsaasRetryDelayMs } from "@/lib/billing/garsaas-retry-schedule"
import { embedOrgBillingProfileSnapshotForGarsaas } from "@/lib/billing/org-billing-profile-snapshot"

/** Emisor acordado — validar NIT/DV con contador antes de producción fiscal plena. */
const DEFAULT_ISSUER = {
  legal_name: "GARSaas Colombia S.A.S.",
  tax_id_type: "NIT",
  tax_id: "902056629",
} as const

export type NotifyParams = {
  reference: string
  transactionId: string
  paidAtIso?: string
}

export type GarsaasNotifyResult =
  | { kind: "skipped_no_config" }
  | { kind: "intent_not_found" }
  | { kind: "success"; invoiceId: string; duplicate: boolean }
  | { kind: "failed"; detail: string; httpStatus?: number }

type ParsedOk = { invoice_id?: string; duplicate?: boolean }

function logLine(reference: string, transactionId: string, msg: string, extra?: Record<string, unknown>) {
  const base = { reference, transaction_id: transactionId, ...extra }
  console.info(`[billing] ${msg}`, JSON.stringify(base))
}

/**
 * POST a GarSaaS para facturación DIAN. Idempotente en destino por transaction_id.
 */
export async function notifyGarsaasDianBilling(
  admin: SupabaseClient,
  params: NotifyParams
): Promise<GarsaasNotifyResult> {
  const url = process.env.GARSAAS_BILLING_URL?.trim()
  const secret = process.env.GARSAAS_INTERNAL_BILLING_SECRET?.trim()
  if (!url || !secret) {
    logLine(params.reference, params.transactionId, "GarSaaS DIAN skipped (configure GARSAAS_BILLING_URL + secret)")
    return { kind: "skipped_no_config" }
  }

  const { data: intent, error: ie } = await admin
    .from("payment_intents")
    .select("reference, amount_in_cents, currency, customer_email, target_plan, org_id")
    .eq("reference", params.reference)
    .maybeSingle()

  if (ie || !intent) {
    console.warn("[billing] notify GarSaaS: intent not found", params.reference, ie)
    return { kind: "intent_not_found" }
  }

  const { data: org } = await admin
    .from("organizations")
    .select(
      "name, billing_tax_id_type, billing_tax_id, billing_legal_name, billing_invoice_email, billing_phone, billing_country, billing_address_line"
    )
    .eq("id", intent.org_id)
    .maybeSingle()

  const periodStart = new Date()
  const periodEnd = new Date(periodStart)
  periodEnd.setUTCDate(periodEnd.getUTCDate() + wompiPlanPeriodDays())

  const body = {
    schema_version: "1" as const,
    source_app: "embedflow" as const,
    source_env: process.env.NODE_ENV === "production" ? "production" : "development",
    emitted_at: new Date().toISOString(),
    issuer: DEFAULT_ISSUER,
    payment: {
      provider: "wompi" as const,
      status: "APPROVED" as const,
      reference: intent.reference,
      transaction_id: params.transactionId,
      amount_in_cents: intent.amount_in_cents,
      currency: intent.currency || "COP",
      paid_at: params.paidAtIso,
      customer_email: intent.customer_email ?? undefined,
    },
    subscription_or_product: {
      plan_code: intent.target_plan,
      description_line: `Suscripción Embedflow — plan ${intent.target_plan} — periodo mensual`,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    },
    buyer_org: {
      external_id: intent.org_id as string,
      billing_profile_snapshot: embedOrgBillingProfileSnapshotForGarsaas({
        name: org?.name ?? "",
        billing_tax_id_type: org?.billing_tax_id_type ?? null,
        billing_tax_id: org?.billing_tax_id ?? null,
        billing_legal_name: org?.billing_legal_name ?? null,
        billing_invoice_email: org?.billing_invoice_email ?? null,
        billing_phone: org?.billing_phone ?? null,
        billing_country: org?.billing_country ?? null,
        billing_address_line: org?.billing_address_line ?? null,
      }),
    },
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
        "X-Correlation-Id": `embedflow:${params.reference}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    const text = await res.text()
    let parsed: ParsedOk = {}
    try {
      parsed = JSON.parse(text) as ParsedOk
    } catch {
      /* body might be empty */
    }

    if (!res.ok) {
      logLine(params.reference, params.transactionId, "GarSaaS DIAN notify failed", {
        httpStatus: res.status,
        body: text.slice(0, 500),
      })
      return { kind: "failed", httpStatus: res.status, detail: text.slice(0, 500) }
    }

    const invoiceId = typeof parsed.invoice_id === "string" ? parsed.invoice_id : ""
    if (!invoiceId) {
      logLine(params.reference, params.transactionId, "GarSaaS DIAN ok but missing invoice_id in JSON", { body: text })
      return { kind: "failed", detail: "missing_invoice_id_in_response" }
    }

    logLine(params.reference, params.transactionId, "GarSaaS DIAN notify ok", {
      invoice_id: invoiceId,
      duplicate: Boolean(parsed.duplicate),
    })
    return {
      kind: "success",
      invoiceId,
      duplicate: Boolean(parsed.duplicate),
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    logLine(params.reference, params.transactionId, "GarSaaS DIAN notify error", { error: detail })
    return { kind: "failed", detail }
  }
}

/**
 * Persiste el resultado del notify en `payment_intents` (reintentos / marcadores).
 */
export async function persistGarsaasNotifyOutcome(
  admin: SupabaseClient,
  reference: string,
  outcome: GarsaasNotifyResult
): Promise<void> {
  switch (outcome.kind) {
    case "skipped_no_config":
      await admin
        .from("payment_intents")
        .update({
          garsaas_no_upstream: true,
          updated_at: new Date().toISOString(),
        })
        .eq("reference", reference)
      return

    case "intent_not_found":
      return

    case "success":
      await admin
        .from("payment_intents")
        .update({
          garsaas_invoice_id: outcome.invoiceId,
          garsaas_notify_attempts: 0,
          garsaas_notify_last_error: null,
          garsaas_notify_next_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("reference", reference)
      return

    case "failed": {
      const { data: row } = await admin
        .from("payment_intents")
        .select("garsaas_notify_attempts")
        .eq("reference", reference)
        .maybeSingle()

      const prev = row?.garsaas_notify_attempts ?? 0
      const attempts = prev + 1
      const delayMs = nextGarsaasRetryDelayMs(attempts)
      const nextAt = new Date(Date.now() + delayMs).toISOString()
      const errShort = outcome.detail.slice(0, 2000)

      await admin
        .from("payment_intents")
        .update({
          garsaas_notify_attempts: attempts,
          garsaas_notify_last_error: errShort,
          garsaas_notify_next_at: nextAt,
          updated_at: new Date().toISOString(),
        })
        .eq("reference", reference)
      return
    }

    default:
      return
  }
}
