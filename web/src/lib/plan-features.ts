import type { Plan } from "@/lib/plan-limits"
import { normalizePlan } from "@/lib/plan-limits"

/** Aligned with billing / landing: Pro+ gets share links, official analysis PDF, Slack, programmatic HTTP API. */
const PRO_TIER: ReadonlySet<Plan> = new Set(["pro", "team", "enterprise"])

/** Deal pitch generation (worker + UI): Starter and above — not on Free (see pricing table). */
const PITCH_TIER: ReadonlySet<Plan> = new Set(["starter", "pro", "team", "enterprise"])

export function planSupportsDealPitch(plan: string | null | undefined): boolean {
  return PITCH_TIER.has(normalizePlan(plan))
}

export function planSupportsShareLinks(plan: string | null | undefined): boolean {
  return PRO_TIER.has(normalizePlan(plan))
}

export function planSupportsOfficialAnalysisPdf(plan: string | null | undefined): boolean {
  return PRO_TIER.has(normalizePlan(plan))
}

export function planSupportsSlackIntegration(plan: string | null | undefined): boolean {
  return PRO_TIER.has(normalizePlan(plan))
}

/** curl/scripts without browser Fetch Metadata — Pro+ only (dashboard uses the browser; unaffected). */
export function planSupportsProgrammaticDocumentApi(plan: string | null | undefined): boolean {
  return PRO_TIER.has(normalizePlan(plan))
}
