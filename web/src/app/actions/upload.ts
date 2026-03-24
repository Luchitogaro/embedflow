"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function uploadDocument(formData: FormData): Promise<{ documentId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const file = formData.get("file") as File | null
  if (!file) throw new Error("No file provided")

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ]
  if (!allowedTypes.includes(file.type)) throw new Error("Unsupported file type")

  // Upload to Supabase Storage
  const fileBuffer = await file.arrayBuffer()
  const filePath = `${user.id}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from("contracts")
    .upload(filePath, fileBuffer, { contentType: file.type })

  if (uploadError) throw new Error(uploadError.message)

  const { data: { publicUrl } } = supabase.storage
    .from("contracts")
    .getPublicUrl(filePath)

  // Get org for usage tracking
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single()

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

  if (dbError) throw new Error(dbError.message)

  // Record usage
  if (userData?.org_id) {
    await supabase.rpc("record_usage", {
      p_org_id: userData.org_id,
      p_event_type: "doc_upload",
      p_quantity: 1,
    })
  }

  // Enqueue worker job (fire-and-forget, non-blocking)
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
    console.error("Failed to enqueue worker job:", e)
    // Non-fatal — document saved, job can be retried
  }

  revalidatePath("/")
  return { documentId: document.id }
}
