"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileText, Settings, CreditCard, Zap, Plug } from "lucide-react"
import { cn } from "@/lib/utils"
import { LanguageSwitcher } from "@/components/language-switcher"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"
import type { Locale } from "@/lib/i18n/config"
import type { Messages } from "@/messages/en"

function navItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  if (href === "/dashboard/settings") return pathname === "/dashboard/settings"
  if (href === "/dashboard/settings/integrations") {
    return pathname.startsWith("/dashboard/settings/integrations")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

type SidebarProps = {
  displayName: string
  email: string
  planLabel: string
  nav: Messages["nav"]
  locale: Locale
  language: Messages["language"]
  theme: Messages["theme"]
  showIntegrationsNav: boolean
}

export function Sidebar({
  displayName,
  email,
  planLabel,
  nav,
  locale,
  language,
  theme,
  showIntegrationsNav,
}: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard", label: nav.dashboard, icon: LayoutDashboard },
    { href: "/dashboard/documents", label: nav.documents, icon: FileText },
    { href: "/dashboard/settings/billing", label: nav.billing, icon: CreditCard },
    ...(showIntegrationsNav
      ? [{ href: "/dashboard/settings/integrations" as const, label: nav.integrations, icon: Plug }]
      : []),
    { href: "/dashboard/settings", label: nav.settings, icon: Settings },
  ]

  return (
    <aside className="no-print hidden md:flex w-64 h-screen bg-[#0A1628] text-white flex-col fixed left-0 top-0 z-30">
      <div className="p-6 flex items-start justify-between gap-2">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight truncate">Embedflow</span>
        </Link>
      </div>

      <div className="mx-4 mb-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 shadow-inner space-y-3">
        <ThemeToggle copy={theme} variant="dark" />
        <LanguageSwitcher locale={locale} language={language} variant="dark" />
      </div>

      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = navItemActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1",
                isActive
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-xs font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-slate-400 truncate">{planLabel}</p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
        </div>
        <LogoutButton label={nav.logOut} variant="sidebar" />
      </div>
    </aside>
  )
}
