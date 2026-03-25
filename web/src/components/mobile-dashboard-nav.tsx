"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  Settings,
  CreditCard,
  Zap,
  Menu,
  X,
  Plug,
} from "lucide-react"
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

type Props = {
  displayName: string
  email: string
  planLabel: string
  nav: Messages["nav"]
  locale: Locale
  language: Messages["language"]
  theme: Messages["theme"]
}

export function MobileDashboardNav({ displayName, email, planLabel, nav, locale, language, theme }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const dialogId = "mobile-dashboard-nav-dialog"
  const titleId = "mobile-dashboard-nav-title"

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const navItems = [
    { href: "/dashboard", label: nav.dashboard, icon: LayoutDashboard },
    { href: "/dashboard/documents", label: nav.documents, icon: FileText },
    { href: "/dashboard/settings/billing", label: nav.billing, icon: CreditCard },
    { href: "/dashboard/settings/integrations", label: nav.integrations, icon: Plug },
    { href: "/dashboard/settings", label: nav.settings, icon: Settings },
  ]

  return (
    <>
      <header className="no-print md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-background px-3">
        <button
          type="button"
          className="rounded-lg p-2 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen(true)}
          aria-label={nav.openMenu}
          aria-expanded={open}
          aria-controls={dialogId}
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0" onClick={() => setOpen(false)}>
          <div className="p-1 bg-blue-500 rounded-md shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="truncate text-sm font-bold text-foreground">Embedflow</span>
        </Link>
        <div className="w-9 shrink-0" aria-hidden />
      </header>

      {open ? (
        <div
          id={dialogId}
          className="no-print md:hidden fixed inset-0 z-50 bg-[#0A1628] text-white flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={nav.navigation}
          aria-labelledby={titleId}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false)
          }}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span id={titleId} className="font-semibold">{nav.menu}</span>
            <button
              type="button"
              className="p-2 rounded-lg text-slate-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              onClick={() => setOpen(false)}
              aria-label={nav.closeMenu}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3 border-b border-white/10 px-4 py-3">
            <ThemeToggle copy={theme} variant="dark" />
            <LanguageSwitcher locale={locale} language={language} variant="dark" />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = navItemActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium mb-1",
                    active ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:text-white hover:bg-white/5"
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
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-xs font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{displayName}</p>
                <p className="text-xs text-slate-400 truncate">{planLabel}</p>
                <p className="text-xs text-slate-500 truncate">{email}</p>
              </div>
            </div>
            <LogoutButton label={nav.logOut} variant="mobile" />
          </div>
        </div>
      ) : null}
    </>
  )
}
