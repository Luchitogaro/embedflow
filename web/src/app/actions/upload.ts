"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

async function ensureUserAndOrg(userId: string, userEmail: string) {
  const supabase = await createClient()

  // Check if user record exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, org_id")
    .eq("id", userId)
    .single()

  if (existingUser) return existingUser

  // Need service role to bypass RLS for initial user+org creation
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")

  const adminClient = createSupabaseClient(serviceUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Create org for user
  const orgName = userEmail ? `${userEmail.split("@")[0]}'s Org` : "My Organization"
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({ name: orgName, plan: "free" })
    .select()
    .single()

  if (orgError) throw new Error(`Failed to create org: ${orgError.message}`)

  // Create user record
  const { data: newUser, error: userError } = await adminClient
    .from("users")
    .insert({
      id: userId,
      email: userEmail,
      org_id: org.id,
      role: "owner",
    })
    .select()
    .single()

  if (userError) throw new Error(`Failed to create user record: ${userError.message}`)

  return { id: newUser.id, org_id: newUser.org_id }
}

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

  // Ensure user + org exist in public schema
  const userData = await ensureUserAndOrg(user.id, user.email ?? "")

  // Upload to Supabase Storage (using user's anon key - RLS allows own files)
  const fileBuffer = await file.arrayBuffer()
  const filePath = `${user.id}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from("contracts")
    .upload(filePath, fileBuffer, { contentType: file.type })

  if (uploadError) throw new Error(uploadError.message)

  const { data: { publicUrl } } = supabase.storage
    .from("contracts")
    .getPublicUrl(filePath)

  // Create document record
  const { data: document, error: dbError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      org_id: userData.org_id,
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
  if (userData.org_id) {
    try {
      await supabase.rpc("record_usage", {
        p_org_id: userData.org_id,
        p_event_type: "doc_upload",
        p_quantity: 1,
      })
    } catch { /* non-fatal */ }
  }

  // Enqueue worker job (fire-and-forget)
  try {
    await fetch(`${process.env.WORKER_URL || "http://localhost:8000"}/jobs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_id: document.id,
        file_url: publicUrl,
        user_id: user.id,
        org_id: userData.org_id,
      }),
    })
  } catch (e) {
    console.error("Failed to enqueue worker job:", e)
  }

  revalidatePath("/dashboard")
  return { documentId: document.id }
}
