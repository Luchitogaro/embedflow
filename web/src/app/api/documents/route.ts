import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getLocale, getMessagesForRequest } from "@/lib/i18n/server"
import { localeForWorkerAnalysis } from "@/lib/worker-locale"
import { getWorkerUrl, workerAuthHeaders } from "@/lib/worker-auth"
import { interpolate } from "@/lib/i18n/interpolate"
import { uploadPlanLimitMessageIfExceeded } from "@/lib/upload-plan-limit"
import { UPLOAD_MAX_FILE_BYTES, UPLOAD_MAX_FILE_MB } from "@/lib/upload-limits"
import { messageForStorageUploadError } from "@/lib/storage-upload-errors"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  const { messages } = await getMessagesForRequest()
  const e = messages.dashboard.upload.errors

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: e.unauthorized }, { status: 401 })
  }

  const { data: userData } = await supabase.from("users").select("org_id").eq("id", user.id).single()

  const limitMsg = await uploadPlanLimitMessageIfExceeded(
    supabase,
    user.id,
    userData?.org_id ?? null,
    user.email,
    messages
  )
  if (limitMsg) {
    return NextResponse.json({ error: limitMsg }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: e.bodyTruncated }, { status: 400 })
  }

  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json({ error: e.noFile }, { status: 400 })
  }

  if (file.size > UPLOAD_MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: interpolate(e.tooLarge, { maxMb: UPLOAD_MAX_FILE_MB }) },
      { status: 413 }
    )
  }

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: e.unsupportedType }, { status: 400 })
  }

  const fileBuffer = await file.arrayBuffer()
  const filePath = `${user.id}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from("contracts")
    .upload(filePath, fileBuffer, { contentType: file.type })

  if (uploadError) {
    console.error("storage upload:", uploadError)
    const msg = messageForStorageUploadError(
      {
        message: uploadError.message,
        statusCode: (uploadError as { statusCode?: string }).statusCode,
      },
      e
    )
    const status = (uploadError as { statusCode?: string }).statusCode === "413" ? 413 : 500
    return NextResponse.json({ error: msg }, { status })
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("contracts").getPublicUrl(filePath)

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
    console.error("documents insert:", dbError)
    return NextResponse.json({ error: e.saveFailed }, { status: 500 })
  }

  if (userData?.org_id) {
    try {
      await supabase
        .rpc("record_document_upload_usage", {
          p_org_id: userData.org_id,
          p_user_id: user.id,
          p_document_id: document.id,
        })
        .throwOnError()
    } catch {
      try {
        await supabase.rpc("record_usage", {
          p_org_id: userData.org_id,
          p_event_type: "doc_upload",
          p_quantity: 1,
        })
      } catch {
        /* non-fatal */
      }
    }
  }

  let enqueueFailed = false
  try {
    const wLocale = localeForWorkerAnalysis(await getLocale())
    const res = await fetch(`${getWorkerUrl()}/jobs/`, {
      method: "POST",
      headers: workerAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        document_id: document.id,
        file_url: publicUrl,
        user_id: user.id,
        org_id: userData?.org_id,
        locale: wLocale,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error("Worker enqueue failed:", res.status, body)
      enqueueFailed = true
    }
  } catch (err) {
    console.error("Failed to enqueue job:", err)
    enqueueFailed = true
  }

  return NextResponse.json({
    documentId: document.id,
    fileUrl: publicUrl,
    ...(enqueueFailed ? { enqueueFailed: true } : {}),
  })
}
