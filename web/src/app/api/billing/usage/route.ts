import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { normalizePlan } from "@/lib/plan-limits"
import { countMonthlyQuotaDocuments, getEffectiveMonthlyDocLimit } from "@/lib/monthly-upload-quota"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single()

  let plan = "free"
  if (userRow?.org_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("plan")
      .eq("id", userRow.org_id)
      .single()
    plan = normalizePlan(org?.plan)
  }

  const monthlyLimit = getEffectiveMonthlyDocLimit(plan, user.id, user.email)
  const documentsUsed = await countMonthlyQuotaDocuments(supabase, {
    orgId: userRow?.org_id ?? null,
    userId: user.id,
  })

  return NextResponse.json({
    plan,
    usage: {
      documentsUsed,
      documentsLimit: monthlyLimit,
    },
  })
}
