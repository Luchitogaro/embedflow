import type { SupabaseClient } from "@supabase/supabase-js"
import type { Plan } from "@/lib/plan-limits"
import { normalizePlan } from "@/lib/plan-limits"
import { wompiPlanPeriodDays } from "@/lib/billing-config"

export async function applyApprovedWompiPayment(
  admin: SupabaseClient,
  reference: string,
  wompiTransactionId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: intent, error: findErr } = await admin
    .from("payment_intents")
    .select("id, status, org_id, target_plan")
    .eq("reference", reference)
    .maybeSingle()

  if (findErr || !intent) {
    return { ok: false, reason: "INTENT_NOT_FOUND" }
  }
  if (intent.status === "APPROVED") {
    return { ok: true }
  }

  const targetPlan = normalizePlan(intent.target_plan as string) as Plan

  const expires = new Date()
  expires.setUTCDate(expires.getUTCDate() + wompiPlanPeriodDays())

  const { error: orgErr } = await admin
    .from("organizations")
    .update({
      plan: targetPlan,
      billing_provider: "wompi",
      plan_expires_at: expires.toISOString(),
    })
    .eq("id", intent.org_id as string)

  if (orgErr) {
    console.error("apply wompi org update:", orgErr)
    return { ok: false, reason: "ORG_UPDATE_FAILED" }
  }

  const { error: intentErr } = await admin
    .from("payment_intents")
    .update({
      status: "APPROVED",
      wompi_transaction_id: wompiTransactionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", intent.id as string)

  if (intentErr) {
    console.error("apply wompi intent update:", intentErr)
    return { ok: false, reason: "INTENT_UPDATE_FAILED" }
  }

  return { ok: true }
}

export async function markWompiIntentDeclined(
  admin: SupabaseClient,
  reference: string,
  wompiTransactionId?: string
): Promise<void> {
  await admin
    .from("payment_intents")
    .update({
      status: "DECLINED",
      ...(wompiTransactionId ? { wompi_transaction_id: wompiTransactionId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("reference", reference)
    .neq("status", "APPROVED")
}
