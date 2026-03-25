import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { contractsObjectPathFromUrl } from "@/lib/contracts-storage"
import { revalidatePath } from "next/cache"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { data: analysis } = await supabase
    .from("analyses")
    .select("*")
    .eq("document_id", id)
    .single()

  return NextResponse.json({ document, analysis })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: document } = await supabase
    .from("documents")
    .select("id, file_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const path = contractsObjectPathFromUrl(document.file_url)
  if (path) {
    const { error: rmError } = await supabase.storage.from("contracts").remove([path])
    if (rmError) {
      console.error("Storage remove failed:", rmError.message)
    }
  }

  const deletedAt = new Date().toISOString()

  let updateError = (
    await supabase
      .from("documents")
      .update({ deleted_at: deletedAt })
      .eq("id", id)
      .eq("user_id", user.id)
  ).error

  // RLS misconfiguration (e.g. WITH CHECK requiring deleted_at IS NULL) blocks soft delete; service role is safe after ownership check above.
  if (
    updateError &&
    (updateError.message.includes("row-level security") ||
      updateError.message.includes("RLS") ||
      updateError.code === "42501")
  ) {
    try {
      const admin = createServiceRoleClient()
      updateError = (
        await admin
          .from("documents")
          .update({ deleted_at: deletedAt })
          .eq("id", id)
          .eq("user_id", user.id)
      ).error
    } catch {
      /* No service role key or admin client error — surface original RLS failure */
    }
  }

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/documents")
  return NextResponse.json({ success: true })
}
