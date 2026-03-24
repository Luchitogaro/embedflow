import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
  const workerUrl = process.env.WORKER_URL || "http://localhost:8000"
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single()

  try {
    const response = await fetch(`${workerUrl}/jobs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_id: documentId,
        file_url: document.file_url,
        user_id: user.id,
        org_id: userData?.org_id,
      }),
    })
    const data = await response.json()
    return NextResponse.json({ jobId: data.job_id, status: "queued" })
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to enqueue analysis job" },
      { status: 500 }
    )
  }
}
