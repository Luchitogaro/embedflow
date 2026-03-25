/** Order of `essentials` fields in the analysis UI (matches worker JSON schema). */
export const ESSENTIAL_FIELD_ORDER = [
  "deal_type",
  "governing_law",
  "jurisdiction_venue",
  "term_and_renewal",
  "termination_rights",
  "payment_terms",
  "liability_indemnity",
  "confidentiality",
  "data_protection",
  "ip_rights",
  "sla_support",
  "insurance",
  "change_control",
] as const

/** Compliance, breach, extensions, penalties, disputes — inside `essentials` (excludes bullet list key). */
export const COMPLIANCE_ESSENTIAL_FIELD_ORDER = [
  "breach_default_cure",
  "extensions_prorrogas_modifications",
  "penalties_liquidated_damages",
  "warranties_reps_survival",
  "dispute_resolution_litigation",
  "regulatory_compliance_obligations",
  "force_majeure_hardship",
  "monitoring_audit_breach_notice",
] as const

export function isPresentEssentialValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") {
    const s = value.trim().toLowerCase()
    return s.length > 0 && s !== "null" && s !== "n/a" && s !== "none"
  }
  if (typeof value === "number" && Number.isFinite(value)) return true
  return false
}

export function normalizeKeyPoints(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function normalizeObligations(raw: unknown): Array<{ party: string; obligation: string }> {
  if (!Array.isArray(raw)) return []
  const out: Array<{ party: string; obligation: string }> = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const o = item as Record<string, unknown>
    const party = String(o.party ?? o.who ?? "").trim()
    const obligation = String(o.obligation ?? o.what ?? "").trim()
    if (!party && !obligation) continue
    out.push({ party: party || "—", obligation: obligation || "—" })
  }
  return out
}
