import type { SupabaseClient } from "@supabase/supabase-js"
import { getMonthlyDocLimit } from "@/lib/plan-limits"

/** Start of the current calendar month in local time, as ISO string (matches prior upload limit logic). */
export function startOfCurrentMonthISO(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function quotaBypassRuntimeEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.EMBEDFLOW_ALLOW_QUOTA_BYPASS === "true"
  )
}

function parseCsvEnv(value: string | undefined): string[] {
  if (!value?.trim()) return []
  return value.split(",").map((s) => s.trim()).filter(Boolean)
}

/**
 * When enabled (local `next dev` or `EMBEDFLOW_ALLOW_QUOTA_BYPASS=true`), users listed by
 * `EMBEDFLOW_DEV_QUOTA_BYPASS_USER_IDS` (Supabase auth UUIDs) or `EMBEDFLOW_DEV_QUOTA_BYPASS_EMAILS`
 * skip monthly caps. Entries in the USER_IDS list that look like emails (`@`) are matched against
 * the session email so a mistaken copy into the wrong variable still works in dev.
 */
export function isDevQuotaBypassForUser(userId: string, email?: string | null): boolean {
  if (!quotaBypassRuntimeEnabled()) return false

  const idList = parseCsvEnv(process.env.EMBEDFLOW_DEV_QUOTA_BYPASS_USER_IDS)
  if (idList.includes(userId)) return true

  const emailLower = email?.toLowerCase()
  if (emailLower) {
    for (const entry of idList) {
      if (entry.includes("@") && entry.toLowerCase() === emailLower) return true
    }
  }

  const emails = parseCsvEnv(process.env.EMBEDFLOW_DEV_QUOTA_BYPASS_EMAILS).map((e) => e.toLowerCase())
  if (emailLower && emails.includes(emailLower)) return true

  return false
}

/** Plan limit, or no cap when dev bypass applies for this user. */
export function getEffectiveMonthlyDocLimit(
  plan: string | null | undefined,
  userId: string,
  email?: string | null
): number | null {
  if (isDevQuotaBypassForUser(userId, email)) return null
  return getMonthlyDocLimit(plan)
}

/**
 * Documents that count toward the monthly upload cap: analyzed successfully this month (`status = done`).
 */
export async function countMonthlyQuotaDocuments(
  supabase: SupabaseClient,
  params: { orgId: string | null; userId: string }
): Promise<number> {
  const start = startOfCurrentMonthISO()
  let q = supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start)
    .eq("status", "done")

  q = params.orgId ? q.eq("org_id", params.orgId) : q.eq("user_id", params.userId)
  const { count } = await q
  return count ?? 0
}
