import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  return NextResponse.json({ documents })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get org for usage tracking
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single()

  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
  }

  // Upload to Supabase Storage
  const fileBuffer = await file.arrayBuffer()
  const filePath = `${user.id}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from("contracts")
    .upload(filePath, fileBuffer, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from("contracts")
    .getPublicUrl(filePath)

  // Create document record
  const { data: document, error: dbError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      org_id: userData?.org_id,
      filename: file.name,
      file_url: publicUrl,
      file_size: file.size,
      mime_type: file.type,
      status: "pending",
    })
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Record usage
  if (userData?.org_id) {
    await supabase.rpc("record_usage", {
      p_org_id: userData.org_id,
      p_event_type: "doc_upload",
      p_quantity: 1,
    })
  }

  // Enqueue analysis job (calls FastAPI worker)
  try {
    await fetch(`${process.env.WORKER_URL || "http://localhost:8000"}/jobs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_id: document.id,
        file_url: publicUrl,
        user_id: user.id,
        org_id: userData?.org_id,
      }),
    })
  } catch (e) {
    console.error("Failed to enqueue job:", e)
    // Non-fatal — document is saved, job can be retried
  }

  return NextResponse.json({ documentId: document.id, fileUrl: publicUrl })
}
