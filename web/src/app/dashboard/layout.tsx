import { Sidebar } from "@/components/sidebar"
import { MobileDashboardNav } from "@/components/mobile-dashboard-nav"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Plan } from "@/lib/plan-limits"
import { getMessagesForRequest } from "@/lib/i18n/server"
import { getEffectivePlanForAuthUser } from "@/lib/server-org-plan"

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

  const planSlug = await getEffectivePlanForAuthUser(supabase, user.id)
  const showIntegrationsNav = planSlug !== "free"

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
        showIntegrationsNav={showIntegrationsNav}
      />
      <Sidebar
        displayName={displayName}
        email={email}
        planLabel={planLabel}
        nav={messages.nav}
        locale={locale}
        language={messages.language}
        theme={messages.theme}
        showIntegrationsNav={showIntegrationsNav}
      />
      <main className="flex-1 w-full min-w-0 pt-14 md:pt-0 md:ml-64">
        {children}
      </main>
    </div>
  )
}
