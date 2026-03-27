"use client"

import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { LogoutButton } from "@/components/logout-button"
import { Separator } from "@/components/ui/separator"
import type { Locale } from "@/lib/i18n/config"
import type { Messages } from "@/messages/en"

export function SessionTools({
  theme,
  language,
  locale,
  logOutLabel,
}: {
  theme: Messages["theme"]
  language: Messages["language"]
  locale: Locale
  logOutLabel: string
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/80 bg-muted/25 p-4 shadow-sm sm:p-5">
        <div className="grid gap-6 sm:grid-cols-2 sm:items-start sm:gap-8">
          <ThemeToggle copy={theme} variant="light" labeled />
          <LanguageSwitcher locale={locale} language={language} variant="light" labeled />
        </div>
      </div>

      <Separator className="bg-border/80" />

      <LogoutButton label={logOutLabel} variant="settings" />
    </div>
  )
}
