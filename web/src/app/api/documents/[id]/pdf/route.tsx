import React from "react"
import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { createClient } from "@/lib/supabase/server"
import { getMessagesForRequest } from "@/lib/i18n/server"
import { formatDate } from "@/lib/utils"
import { AnalysisPdfDocument } from "@/lib/analysis-pdf"
import { parseJsonField } from "@/lib/parse-json-field"
import { getEffectivePlanForAuthUser } from "@/lib/server-org-plan"
import { guardProgrammaticDocumentApi } from "@/lib/document-api-access"
import { planSupportsOfficialAnalysisPdf } from "@/lib/plan-features"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const effPlan = await getEffectivePlanForAuthUser(supabase, user.id)
  const apiBlocked = guardProgrammaticDocumentApi(req, effPlan)
  if (apiBlocked) return apiBlocked

  if (!planSupportsOfficialAnalysisPdf(effPlan)) {
    return NextResponse.json(
      { error: "Official analysis PDF export requires Pro, Team, or Enterprise.", code: "plan_pdf" },
      { status: 403 }
    )
  }

  const { data: document } = await supabase
    .from("documents")
    .select("id, filename, status, created_at, user_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!document || document.status !== "done") {
    return NextResponse.json({ error: "Not found or analysis not complete" }, { status: 404 })
  }

  const { data: analysis } = await supabase
    .from("analyses")
    .select("summary, pitch_text, key_points, risk_flags")
    .eq("document_id", id)
    .eq("user_id", user.id)
    .single()

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 })
  }

  const { locale, messages } = await getMessagesForRequest()
  const p = messages.pdfExport
  const riskLevel = messages.riskLevel

  const keyPoints = parseJsonField<unknown>(analysis.key_points, [])
  const kp = Array.isArray(keyPoints)
    ? keyPoints.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
    : []

  const riskFlagsRaw = parseJsonField<
    Array<{ clause: string; risk_level: string; explanation: string; recommendation?: string }>
  >(analysis.risk_flags, [])

  const riskFlags = riskFlagsRaw.map((r) => ({
    ...r,
    risk_level: riskLevel[r.risk_level as keyof typeof riskLevel] ?? r.risk_level,
  }))

  const labels = {
    execSummary: p.summaryHeading,
    pitchTitle: p.pitchHeading,
    keyPoints: p.keyPointsHeading,
    risks: p.risksHeading,
    disclaimer: p.disclaimer,
    copyrightLine: p.copyrightLine,
  }

  const generatedAt = `${p.generatedLabel} ${formatDate(new Date().toISOString(), locale)}`

  const node = (
    <AnalysisPdfDocument
      filename={document.filename}
      generatedAt={generatedAt}
      labels={labels}
      summary={analysis.summary}
      pitch={analysis.pitch_text}
      keyPoints={kp}
      riskFlags={riskFlags}
    />
  )

  const buf = await renderToBuffer(node)

  const safeBase = document.filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^\w\- .]+/g, "_")
    .trim()
    .slice(0, 72) || "contract"

  const filenameOut = `${safeBase}-embedflow-analysis.pdf`

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameOut}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
