import type { SupabaseClient, User } from "@supabase/supabase-js"
import { AI_PROCESSING_CONSENT_VERSION } from "@/lib/ai-processing-consent"

export type AuthConsentPayload = { at: string; version: string }

export function consentPayloadFromAuthMetadata(
  meta: User["user_metadata"] | undefined
): AuthConsentPayload | null {
  if (!meta || typeof meta !== "object") return null
  const at = meta.ai_processing_consent_at
  const version = meta.ai_processing_consent_version
  if (typeof at !== "string" || typeof version !== "string") return null
  if (version !== AI_PROCESSING_CONSENT_VERSION) return null
  return { at, version }
}

export async function recordAiProcessingConsentNow(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("users")
    .update({
      ai_processing_consent_at: new Date().toISOString(),
      ai_processing_consent_version: AI_PROCESSING_CONSENT_VERSION,
    })
    .eq("id", userId)
  if (error) console.error("ai_processing_consent update:", error.message)
  return !error
}
