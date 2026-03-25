import { createServiceRoleClient } from "@/lib/supabase/admin"

export type SharedAnalysisPayload = {
  filename: string
  createdAt: string
  summary: string | null
  pitchText: string | null
  riskFlags: unknown
  keyTerms: Record<string, unknown>
  parties: unknown
  dates: unknown
  pricing: unknown
  keyPoints: unknown
  essentials: unknown
  obligations: unknown
}

export async function loadSharedAnalysisByToken(
  token: string
): Promise<SharedAnalysisPayload | null> {
  if (!token || token.length < 8) return null

  try {
    const admin = createServiceRoleClient()
    const { data: doc, error: docError } = await admin
      .from("documents")
      .select("id, filename, status, created_at, deleted_at, user_id, share_token")
      .eq("share_token", token)
      .maybeSingle()

    if (docError || !doc) return null
    if (doc.status !== "done") return null
    if (doc.deleted_at) return null

    const { data: analysis, error: anError } = await admin
      .from("analyses")
      .select(
        "summary, pitch_text, risk_flags, key_terms, parties, dates, pricing, key_points, essentials, obligations"
      )
      .eq("document_id", doc.id)
      .eq("user_id", doc.user_id)
      .maybeSingle()

    if (anError || !analysis) return null

    return {
      filename: doc.filename,
      createdAt: doc.created_at,
      summary: analysis.summary,
      pitchText: analysis.pitch_text,
      riskFlags: analysis.risk_flags,
      keyTerms: (analysis.key_terms as Record<string, unknown>) ?? {},
      parties: analysis.parties,
      dates: analysis.dates,
      pricing: analysis.pricing,
      keyPoints: analysis.key_points,
      essentials: analysis.essentials,
      obligations: analysis.obligations,
    }
  } catch {
    return null
  }
}
