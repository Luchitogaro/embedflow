"use client"

import { useTheme } from "next-themes"
import { useEffect, useId, useState } from "react"
import { cn } from "@/lib/utils"
import type { Messages } from "@/messages/en"

type ThemeCopy = Messages["theme"]

export function ThemeToggle({
  copy,
  variant = "light",
}: {
  copy: ThemeCopy
  variant?: "light" | "dark"
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const themeId = useId()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className="h-7 min-w-[7.5rem] rounded-md border border-transparent bg-transparent"
        aria-hidden
      />
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        variant === "dark" ? "text-slate-400" : "text-muted-foreground"
      )}
    >
      <label htmlFor={themeId} className="sr-only">
        {copy.label}
      </label>
      <span className="hidden sm:inline" aria-hidden>
        {copy.label}
      </span>
      <select
        id={themeId}
        value={theme ?? "system"}
        onChange={(e) => setTheme(e.target.value)}
        className={cn(
          "rounded-md border px-2 py-1.5 text-xs font-medium cursor-pointer",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          variant === "dark"
            ? "border-white/20 bg-[#0A1628] text-slate-100"
            : "border-border bg-background text-foreground"
        )}
        aria-label={copy.label}
      >
        <option value="system">{copy.system}</option>
        <option value="light">{copy.light}</option>
        <option value="dark">{copy.dark}</option>
      </select>
    </div>
  )
}
