import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileForm } from "./profile-form"
import { SessionTools } from "./session-tools"
import type { Plan } from "@/lib/plan-limits"
import { ensureUserAndOrg } from "@/lib/ensure-user-org"
import { getMessagesForRequest } from "@/lib/i18n/server"
import { effectiveOrgPlan } from "@/lib/org-plan"
import { getEffectivePlanForAuthUser } from "@/lib/server-org-plan"

export default async function SettingsPage() {
  const { locale, messages } = await getMessagesForRequest()
  const s = messages.settings

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) redirect("/login")

  await ensureUserAndOrg(user.id, user.email)

  const { data: profile } = await supabase
    .from("users")
    .select("name, org_id")
    .eq("id", user.id)
    .single()

  let planSlug: Plan = "free"
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("plan, plan_expires_at")
      .eq("id", profile.org_id)
      .single()
    planSlug = effectiveOrgPlan(org?.plan, org?.plan_expires_at)
  }

  const effPlan = await getEffectivePlanForAuthUser(supabase, user.id)
  const showIntegrationsCard = effPlan !== "free"

  const planKey = planSlug as keyof typeof messages.planLabels
  const planLabel = messages.planLabels[planKey] ?? messages.planLabels.free

  const initialName = profile?.name ?? ""
  const email = user.email ?? ""

  const profileCopy = {
    emailLabel: messages.auth.email,
    emailManaged: s.emailManaged,
    displayName: s.displayName,
    namePlaceholder: s.namePlaceholder,
    save: s.save,
    saving: s.saving,
    saveFailed: s.saveFailed,
  }

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">{s.title}</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{s.profileTitle}</CardTitle>
          <CardDescription>{s.profileDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
              {(initialName || email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-foreground">{initialName || email.split("@")[0]}</p>
              <p className="text-sm text-muted-foreground">{planLabel}</p>
            </div>
          </div>
          <ProfileForm initialName={initialName} email={email} copy={profileCopy} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{s.billingCardTitle}</CardTitle>
          <CardDescription>{s.billingCardDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/settings/billing">
            <Button variant="outline" size="sm">{s.openBilling}</Button>
          </Link>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{s.sessionTitle}</CardTitle>
          <CardDescription>{s.sessionDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <SessionTools
            theme={messages.theme}
            language={messages.language}
            locale={locale}
            logOutLabel={messages.nav.logOut}
          />
        </CardContent>
      </Card>

      {showIntegrationsCard ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">{messages.nav.integrations}</CardTitle>
            <CardDescription>{messages.integrationsPage.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings/integrations">
              <Button variant="outline" size="sm">{messages.nav.integrations}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6 border-border bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">{s.growthTitle}</CardTitle>
          <CardDescription>{s.growthIntro}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">{s.referralsTitle}</p>
            <p className="mt-1">{s.referralsDesc}</p>
            <Button variant="secondary" size="sm" className="mt-2" disabled>
              {s.referralsCta}
            </Button>
          </div>
          <ul className="list-disc space-y-1 pl-4 text-xs sm:text-sm">
            <li>{s.roadmapAb}</li>
            <li>{s.roadmapEmail}</li>
            <li>{s.roadmapSoc2}</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">{s.dangerTitle}</CardTitle>
          <CardDescription>{s.dangerDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" disabled>
            {s.deleteAccount}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
