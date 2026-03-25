import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizePlan, type Plan } from "@/lib/plan-limits"
import { countMonthlyQuotaDocuments, getEffectiveMonthlyDocLimit } from "@/lib/monthly-upload-quota"
import { interpolate } from "@/lib/i18n/interpolate"
import type { Messages } from "@/messages/en"

/** Localized message if monthly doc quota exceeded, or null if OK. */
export async function uploadPlanLimitMessageIfExceeded(
  supabase: SupabaseClient,
  userId: string,
  orgId: string | null,
  email: string | null | undefined,
  messages: Messages
): Promise<string | null> {
  let plan: Plan = "free"
  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("plan")
      .eq("id", orgId)
      .single()
    plan = normalizePlan(org?.plan)
  }

  const monthlyLimit = getEffectiveMonthlyDocLimit(plan, userId, email)
  if (monthlyLimit == null) return null

  const used = await countMonthlyQuotaDocuments(supabase, { orgId, userId })
  if (used >= monthlyLimit) {
    const planKey = plan as keyof typeof messages.planLabels
    const planLabel = messages.planLabels[planKey] ?? messages.planLabels.free
    return interpolate(messages.dashboard.upload.errors.planLimitReached, {
      planLabel,
      limit: monthlyLimit,
    })
  }
  return null
}
