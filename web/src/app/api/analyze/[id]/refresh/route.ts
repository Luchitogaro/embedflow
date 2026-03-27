import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEffectivePlanForAuthUser } from "@/lib/server-org-plan"
import { guardProgrammaticDocumentApi } from "@/lib/document-api-access"
import { getLocale } from "@/lib/i18n/server"
import { localeForWorkerAnalysis } from "@/lib/worker-locale"
import { getWorkerUrl, workerAuthHeaders } from "@/lib/worker-auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const effPlan = await getEffectivePlanForAuthUser(supabase, user.id)
  const blocked = guardProgrammaticDocumentApi(req, effPlan)
  if (blocked) return blocked

  const { data: document } = await supabase
    .from("documents")
    .select("id, file_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 })
  }

  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single()

  await supabase
    .from("documents")
    .update({ status: "pending", error_message: null })
    .eq("id", document.id)
    .eq("user_id", user.id)

  const workerUrl = getWorkerUrl()
  try {
    const wLocale = localeForWorkerAnalysis(await getLocale())
    const response = await fetch(`${workerUrl}/jobs/`, {
      method: "POST",
      headers: workerAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        document_id: document.id,
        file_url: document.file_url,
        user_id: user.id,
        org_id: userData?.org_id,
        locale: wLocale,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.detail || "Failed to refresh analysis" },
        { status: response.status }
      )
    }

    return NextResponse.json({ jobId: data.job_id, status: "queued" })
  } catch {
    return NextResponse.json(
      { error: "Worker unavailable while refreshing analysis" },
      { status: 502 }
    )
  }
}
