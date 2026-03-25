import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getMessagesForRequest } from "@/lib/i18n/server"
import { IntegrationsSlackForm } from "@/components/integrations-slack-form"

export default async function IntegrationsSettingsPage() {
  const { messages } = await getMessagesForRequest()
  const c = messages.integrationsPage

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single()

  const canEdit = ["owner", "admin"].includes(profile?.role ?? "")

  let slackWebhookUrl = ""
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("slack_webhook_url")
      .eq("id", profile.org_id)
      .single()
    slackWebhookUrl = (org?.slack_webhook_url as string | null) ?? ""
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{c.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{c.subtitle}</p>
        </div>
        <Link href="/docs/api" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          {c.apiDocs}
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{c.slackTitle}</CardTitle>
          <CardDescription>{c.slackDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationsSlackForm initialUrl={slackWebhookUrl} copy={c} canEdit={canEdit && !!profile?.org_id} />
        </CardContent>
      </Card>

      <Card className="mb-6 opacity-80">
        <CardHeader>
          <CardTitle className="text-base">{c.salesforceTitle}</CardTitle>
          <CardDescription>{c.salesforceDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="secondary" disabled>
            {c.salesforceCta}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6 opacity-80">
        <CardHeader>
          <CardTitle className="text-base">{c.hubspotTitle}</CardTitle>
          <CardDescription>{c.hubspotDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="secondary" disabled>
            {c.hubspotCta}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{c.apiTitle}</CardTitle>
          <CardDescription>{c.apiDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/docs/api" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            {c.apiDocs}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
