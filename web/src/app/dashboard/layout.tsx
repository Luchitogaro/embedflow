import { Sidebar } from "@/components/sidebar"
import { MobileDashboardNav } from "@/components/mobile-dashboard-nav"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { normalizePlan, type Plan } from "@/lib/plan-limits"
import { getMessagesForRequest } from "@/lib/i18n/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { locale, messages } = await getMessagesForRequest()

  const { data: profile } = await supabase
    .from("users")
    .select("name, org_id")
    .eq("id", user.id)
    .single()

  let planSlug: Plan = "free"
  if (profile?.org_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("plan")
      .eq("id", profile.org_id)
      .single()
    planSlug = normalizePlan(org?.plan)
  }

  const displayName = profile?.name?.trim() || user.email?.split("@")[0] || "User"
  const email = user.email ?? ""
  const planKey = planSlug as keyof typeof messages.planLabels
  const planLabel = messages.planLabels[planKey] ?? messages.planLabels.free

  return (
    <div className="dashboard-shell flex min-h-screen bg-muted/30 dark:bg-background">
      <MobileDashboardNav
        displayName={displayName}
        email={email}
        planLabel={planLabel}
        nav={messages.nav}
        locale={locale}
        language={messages.language}
        theme={messages.theme}
      />
      <Sidebar
        displayName={displayName}
        email={email}
        planLabel={planLabel}
        nav={messages.nav}
        locale={locale}
        language={messages.language}
        theme={messages.theme}
      />
      <main className="flex-1 w-full min-w-0 pt-14 md:pt-0 md:ml-64">
        {children}
      </main>
    </div>
  )
}
