/** Shape written by the worker (`analyses.source_quality` JSONB). */
export type AnalysisSourceQuality = {
  weak_text?: boolean
  char_count?: number
  text_sample_ratio_alnumish?: number
  truncated_before_analysis?: boolean
}

export function parseSourceQuality(raw: unknown): AnalysisSourceQuality | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  return raw as AnalysisSourceQuality
}

export function shouldShowSourceQualityAlert(sq: unknown): boolean {
  const o = parseSourceQuality(sq)
  if (!o) return false
  return Boolean(o.truncated_before_analysis || o.weak_text)
}
