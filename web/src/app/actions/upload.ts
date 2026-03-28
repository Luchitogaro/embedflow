"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { ensureUserAndOrg } from "@/lib/ensure-user-org"
import { recordAiProcessingConsentNow } from "@/lib/ai-consent-server"
import { getLocale, getMessagesForRequest } from "@/lib/i18n/server"
import { localeForWorkerAnalysis } from "@/lib/worker-locale"
import { getWorkerUrl, workerAuthHeaders } from "@/lib/worker-auth"
import { interpolate } from "@/lib/i18n/interpolate"
import { uploadPlanLimitMessageIfExceeded } from "@/lib/upload-plan-limit"
import { UPLOAD_MAX_FILE_BYTES, UPLOAD_MAX_FILE_MB } from "@/lib/upload-limits"
import { messageForStorageUploadError } from "@/lib/storage-upload-errors"

export type UploadDocumentResult =
  | { documentId: string; enqueueFailed?: boolean }
  | { error: string }

export async function uploadDocument(formData: FormData): Promise<UploadDocumentResult> {
  const { messages } = await getMessagesForRequest()
  const e = messages.dashboard.upload.errors

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { error: e.unauthorized }

    let userData: Awaited<ReturnType<typeof ensureUserAndOrg>>
    try {
      userData = await ensureUserAndOrg(user.id, user.email ?? "", user)
    } catch {
      return { error: e.setupFailed }
    }

    const formConsentAck = formData.get("aiProcessingConsent") === "true"
    if (!userData.ai_processing_consent_at) {
      if (!formConsentAck) {
        return { error: e.consentRequired }
      }
      const ok = await recordAiProcessingConsentNow(supabase, user.id)
      if (!ok) return { error: e.saveFailed }
    }

    const file = formData.get("file") as File | null
    if (!file) return { error: e.noFile }

    if (file.size > UPLOAD_MAX_FILE_BYTES) {
      return { error: interpolate(e.tooLarge, { maxMb: UPLOAD_MAX_FILE_MB }) }
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]
    if (!allowedTypes.includes(file.type)) return { error: e.unsupportedType }

    const limitErr = await uploadPlanLimitMessageIfExceeded(
      supabase,
      user.id,
      userData.org_id,
      user.email,
      messages
    )
    if (limitErr) return { error: limitErr }

    const fileBuffer = await file.arrayBuffer()
    const filePath = `${user.id}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from("contracts")
      .upload(filePath, fileBuffer, { contentType: file.type })

    if (uploadError) {
      console.error("storage upload:", uploadError)
      return {
        error: messageForStorageUploadError(
          {
            message: uploadError.message,
            statusCode: (uploadError as { statusCode?: string }).statusCode,
          },
          e
        ),
      }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("contracts").getPublicUrl(filePath)

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

    if (dbError) {
      console.error("documents insert:", dbError)
      return { error: e.saveFailed }
    }

    if (userData.org_id) {
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
          org_id: userData.org_id,
          locale: wLocale,
        }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => "")
        console.error("Worker enqueue failed:", res.status, body)
        enqueueFailed = true
      }
    } catch (err) {
      console.error("Failed to enqueue worker job:", err)
      enqueueFailed = true
    }

    revalidatePath("/dashboard")
    return { documentId: document.id, ...(enqueueFailed ? { enqueueFailed: true } : {}) }
  } catch (err) {
    console.error("uploadDocument:", err)
    return { error: e.generic }
  }
}
