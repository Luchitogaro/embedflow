import { createClient } from "@/lib/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/** Ensures `public.users` row + org exist (needed before billing or uploads). */
export async function ensureUserAndOrg(userId: string, userEmail: string) {
  const supabase = await createClient()

  const { data: existingUser } = await supabase
    .from("users")
    .select("id, org_id")
    .eq("id", userId)
    .single()

  if (existingUser) return existingUser

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
    })
    .select()
    .single()

  if (userError) throw new Error(`Failed to create user record: ${userError.message}`)

  return { id: newUser.id, org_id: newUser.org_id }
}
