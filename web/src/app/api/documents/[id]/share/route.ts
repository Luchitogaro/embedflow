import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: doc, error: fetchError } = await supabase
    .from("documents")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (doc.status !== "done") {
    return NextResponse.json({ error: "Analysis must be complete" }, { status: 400 })
  }

  let body: { action?: string } = {}
  try {
    body = await req.json()
  } catch {
    /* empty body */
  }
  const action = body.action

  if (action === "revoke") {
    const { error } = await supabase.from("documents").update({ share_token: null }).eq("id", id).eq("user_id", user.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ shareToken: null })
  }

  if (action === "create") {
    const token = randomUUID()
    const { error } = await supabase
      .from("documents")
      .update({ share_token: token })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ shareToken: token })
  }

  return NextResponse.json({ error: "Invalid action. Use create or revoke." }, { status: 400 })
}
