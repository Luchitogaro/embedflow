"use client"

import { ThemeToggle } from "@/components/theme-toggle"
import { LogoutButton } from "@/components/logout-button"
import type { Messages } from "@/messages/en"

export function SessionTools({
  theme,
  logOutLabel,
}: {
  theme: Messages["theme"]
  logOutLabel: string
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
      <ThemeToggle copy={theme} variant="light" />
      <LogoutButton label={logOutLabel} variant="settings" />
    </div>
  )
}
