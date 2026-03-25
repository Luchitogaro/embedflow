"use client"

import { useId } from "react"
import { useRouter } from "next/navigation"
import { setUserLocale } from "@/app/actions/locale"
import { LOCALES, type Locale } from "@/lib/i18n/config"
import { cn } from "@/lib/utils"

type LanguageCopy = {
  switchLabel: string
  en: string
  es: string
  pt: string
}

export function LanguageSwitcher({
  locale,
  language,
  variant = "dark",
}: {
  locale: Locale
  language: LanguageCopy
  variant?: "dark" | "light"
}) {
  const router = useRouter()
  const localeId = useId()

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs",
        variant === "dark" ? "text-slate-400" : "text-muted-foreground"
      )}
    >
      <label htmlFor={localeId} className="sr-only">
        {language.switchLabel}
      </label>
      <span className="hidden sm:inline" aria-hidden>
        {language.switchLabel}
      </span>
      <select
        id={localeId}
        value={locale}
        onChange={(e) => {
          const next = e.target.value as Locale
          void (async () => {
            await setUserLocale(next)
            router.refresh()
          })()
        }}
        className={cn(
          "rounded-md border bg-transparent px-2 py-1.5 text-xs font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          variant === "dark"
            ? "border-white/20 text-slate-100"
            : "border-border bg-background text-foreground"
        )}
        aria-label={language.switchLabel}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {language[code]}
          </option>
        ))}
      </select>
    </div>
  )
}
