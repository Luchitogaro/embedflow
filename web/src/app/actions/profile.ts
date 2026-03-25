"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { ensureUserAndOrg } from "@/lib/ensure-user-org"

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error("Unauthorized")

  await ensureUserAndOrg(user.id, user.email)

  const name = (formData.get("name") as string | null)?.trim() ?? ""
  const { error } = await supabase.from("users").update({ name: name || null }).eq("id", user.id)

  if (error) throw new Error(error.message)

  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard")
}
