import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEffectivePlanForAuthUser } from "@/lib/server-org-plan"
import { guardProgrammaticDocumentApi } from "@/lib/document-api-access"
import { getLocale } from "@/lib/i18n/server"
import { localeForWorkerAnalysis } from "@/lib/worker-locale"
import { getWorkerUrl, workerAuthHeaders } from "@/lib/worker-auth"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const effPlan = await getEffectivePlanForAuthUser(supabase, user.id)
  const blocked = guardProgrammaticDocumentApi(req, effPlan)
  if (blocked) return blocked

  const { documentId } = await req.json()

  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 })
  }

  // Get document
  const { data: document } = await supabase
    .from("documents")
    .select("file_url")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single()

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  // Enqueue job with FastAPI worker
  const workerUrl = getWorkerUrl()
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single()

  try {
    const wLocale = localeForWorkerAnalysis(await getLocale())
    const response = await fetch(`${workerUrl}/jobs/`, {
      method: "POST",
      headers: workerAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        document_id: documentId,
        file_url: document.file_url,
        user_id: user.id,
        org_id: userData?.org_id,
        locale: wLocale,
      }),
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorPayload?.detail || "Failed to enqueue analysis job" },
        { status: response.status }
      )
    }

    await supabase
      .from("documents")
      .update({ status: "pending", error_message: null })
      .eq("id", documentId)
      .eq("user_id", user.id)

    const data = await response.json()
    return NextResponse.json({ jobId: data.job_id, status: "queued" })
  } catch {
    return NextResponse.json(
      { error: "Failed to enqueue analysis job" },
      { status: 500 }
    )
  }
}
