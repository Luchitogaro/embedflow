import type { SupabaseClient } from "@supabase/supabase-js"
import type { Plan } from "@/lib/plan-limits"
import { devPlanOverride, effectiveOrgPlan } from "@/lib/org-plan"

/** Effective plan for the signed-in user (respects `plan_expires_at` for Mercado Pago). */
export async function getEffectivePlanForAuthUser(
  supabase: SupabaseClient,
  userId: string
): Promise<Plan> {
  const o = devPlanOverride()
  if (o !== null) return o

  const { data: row } = await supabase.from("users").select("org_id").eq("id", userId).single()
  if (!row?.org_id) return "free"
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, plan_expires_at")
    .eq("id", row.org_id)
    .single()
  return effectiveOrgPlan(org?.plan, org?.plan_expires_at)
}
