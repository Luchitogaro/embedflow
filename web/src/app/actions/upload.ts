"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { normalizePlan } from "@/lib/plan-limits"
import { ensureUserAndOrg } from "@/lib/ensure-user-org"
import { countMonthlyQuotaDocuments, getEffectiveMonthlyDocLimit } from "@/lib/monthly-upload-quota"
import { getLocale } from "@/lib/i18n/server"
import { localeForWorkerAnalysis } from "@/lib/worker-locale"
import { getWorkerUrl, workerAuthHeaders } from "@/lib/worker-auth"

async function planLimitErrorIfExceeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orgId: string | null,
  email: string | null | undefined
): Promise<string | null> {
  let plan = "free"
  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("plan")
      .eq("id", orgId)
      .single()
    plan = normalizePlan(org?.plan)
  }

  const monthlyLimit = getEffectiveMonthlyDocLimit(plan, userId, email)
  if (monthlyLimit == null) return null

  const used = await countMonthlyQuotaDocuments(supabase, { orgId, userId })
  if (used >= monthlyLimit) {
    return `Monthly upload limit reached for ${plan} plan (${monthlyLimit} documents).`
  }
  return null
}

export type UploadDocumentResult = { documentId: string } | { error: string }

export async function uploadDocument(formData: FormData): Promise<UploadDocumentResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized" }

  const file = formData.get("file") as File | null
  if (!file) return { error: "No file provided" }

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ]
  if (!allowedTypes.includes(file.type)) throw new Error("Unsupported file type")

  // Ensure user + org exist in public schema
  const userData = await ensureUserAndOrg(user.id, user.email ?? "")
  const limitErr = await planLimitErrorIfExceeded(supabase, user.id, userData.org_id, user.email)
  if (limitErr) return { error: limitErr }

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
      await supabase.rpc("record_document_upload_usage", {
        p_org_id: userData.org_id,
        p_user_id: user.id,
        p_document_id: document.id,
      }).throwOnError()
    } catch {
      // Backward compatibility if migration 009 is not applied yet.
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

  // Enqueue worker job (fire-and-forget)
  try {
    const wLocale = localeForWorkerAnalysis(await getLocale())
    await fetch(`${getWorkerUrl()}/jobs/`, {
      method: "POST",
      headers: workerAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        document_id: document.id,
        file_url: publicUrl,
        user_id: user.id,
        org_id: userData.org_id,
        locale: wLocale,
      }),
    })
  } catch (e) {
    console.error("Failed to enqueue worker job:", e)
  }

  revalidatePath("/dashboard")
  return { documentId: document.id }
}
