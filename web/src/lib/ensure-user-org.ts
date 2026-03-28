import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { User } from "@supabase/supabase-js"
import { consentPayloadFromAuthMetadata } from "@/lib/ai-consent-server"

export type EnsuredUserRow = {
  id: string
  org_id: string | null
  ai_processing_consent_at: string | null
}

/** Ensures `public.users` row + org exist (needed before billing or uploads). */
export async function ensureUserAndOrg(
  userId: string,
  userEmail: string,
  authUser?: Pick<User, "user_metadata"> | null
): Promise<EnsuredUserRow> {
  const supabase = await createClient()
  const consentMeta = consentPayloadFromAuthMetadata(authUser?.user_metadata)

  const { data: existingUser } = await supabase
    .from("users")
    .select("id, org_id, ai_processing_consent_at")
    .eq("id", userId)
    .single()

  if (existingUser) {
    if (!existingUser.ai_processing_consent_at && consentMeta) {
      await supabase
        .from("users")
        .update({
          ai_processing_consent_at: consentMeta.at,
          ai_processing_consent_version: consentMeta.version,
        })
        .eq("id", userId)
      const { data: synced } = await supabase
        .from("users")
        .select("id, org_id, ai_processing_consent_at")
        .eq("id", userId)
        .single()
      return (synced ?? { ...existingUser, ai_processing_consent_at: consentMeta.at }) as EnsuredUserRow
    }
    return existingUser as EnsuredUserRow
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")

  const adminClient = createSupabaseClient(serviceUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const orgName = userEmail ? `${userEmail.split("@")[0]}'s Org` : "My Organization"
  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({ name: orgName, plan: "free" })
    .select()
    .single()

  if (orgError) throw new Error(`Failed to create org: ${orgError.message}`)

  const { data: newUser, error: userError } = await adminClient
    .from("users")
    .insert({
      id: userId,
      email: userEmail,
      org_id: org.id,
      role: "owner",
      ...(consentMeta
        ? {
            ai_processing_consent_at: consentMeta.at,
            ai_processing_consent_version: consentMeta.version,
          }
        : {}),
    })
    .select("id, org_id, ai_processing_consent_at")
    .single()

  if (userError) throw new Error(`Failed to create user record: ${userError.message}`)

  return newUser as EnsuredUserRow
}
