import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getEffectivePlanForAuthUser } from "@/lib/server-org-plan"
import { guardProgrammaticDocumentApi } from "@/lib/document-api-access"
import { planSupportsSlackIntegration } from "@/lib/plan-features"

function normalizeSlackUrl(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== "string") return null
  const t = raw.trim()
  if (!t) return null
  if (!t.startsWith("https://hooks.slack.com/")) {
    throw new Error("Slack webhook must start with https://hooks.slack.com/")
  }
  return t
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const effPlan = await getEffectivePlanForAuthUser(supabase, user.id)
  const apiBlocked = guardProgrammaticDocumentApi(req, effPlan)
  if (apiBlocked) return apiBlocked

  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.org_id || !["owner", "admin"].includes(profile.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!planSupportsSlackIntegration(effPlan)) {
    return NextResponse.json(
      { error: "Slack webhooks require Pro, Team, or Enterprise.", code: "plan_slack" },
      { status: 403 }
    )
  }

  let body: { slackWebhookUrl?: string | null } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let slackUrl: string | null
  try {
    slackUrl = normalizeSlackUrl(body.slackWebhookUrl ?? null)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid URL" }, { status: 400 })
  }

  const { error } = await supabase
    .from("organizations")
    .update({ slack_webhook_url: slackUrl })
    .eq("id", profile.org_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, slackWebhookUrl: slackUrl })
}
