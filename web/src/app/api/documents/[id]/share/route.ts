import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { randomUUID } from "crypto"
import { getEffectivePlanForAuthUser } from "@/lib/server-org-plan"
import { guardProgrammaticDocumentApi } from "@/lib/document-api-access"
import { planSupportsShareLinks } from "@/lib/plan-features"

const SHARE_LINK_TTL_DAYS = Math.max(
  1,
  Number.parseInt(process.env.SHARE_LINK_TTL_DAYS || "30", 10) || 30
)

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

  const effPlanForApi = await getEffectivePlanForAuthUser(supabase, user.id)
  const apiBlocked = guardProgrammaticDocumentApi(req, effPlanForApi)
  if (apiBlocked) return apiBlocked

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
    const { error } = await supabase
      .from("documents")
      .update({
        share_token: null,
        share_revoked_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ shareToken: null, shareExpiresAt: null })
  }

  if (action === "create") {
    if (!planSupportsShareLinks(effPlanForApi)) {
      return NextResponse.json(
        { error: "Share links require Pro, Team, or Enterprise.", code: "plan_share" },
        { status: 403 }
      )
    }
    const token = randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + SHARE_LINK_TTL_DAYS * 24 * 60 * 60 * 1000)
    const { error } = await supabase
      .from("documents")
      .update({
        share_token: token,
        share_enabled_at: now.toISOString(),
        share_expires_at: expiresAt.toISOString(),
        share_revoked_at: null,
        share_shared_by: user.id,
      })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ shareToken: token, shareExpiresAt: expiresAt.toISOString() })
  }

  return NextResponse.json({ error: "Invalid action. Use create or revoke." }, { status: 400 })
}
