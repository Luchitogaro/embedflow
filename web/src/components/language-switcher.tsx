"use client"

import { Globe } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { setUserLocale } from "@/app/actions/locale"
import { LOCALES, type Locale } from "@/lib/i18n/config"
import { cn } from "@/lib/utils"
import type { Messages } from "@/messages/en"
import {
  preferenceLabelClass,
  preferenceSegmentButton,
  preferenceSegmentTrack,
} from "@/components/preference-styles"
import { recordPreferenceChange } from "@/lib/preferences-analytics"

const SHORT: Record<Locale, string> = {
  en: "EN",
  es: "ES",
  pt: "PT",
}

type LanguageCopy = Messages["language"]

export function LanguageSwitcher({
  locale,
  language,
  variant = "dark",
  layout = "default",
  /** Stacked code + native name (e.g. Settings) */
  labeled = false,
}: {
  locale: Locale
  language: LanguageCopy
  variant?: "dark" | "light"
  layout?: "default" | "compact"
  labeled?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className={cn("flex w-full max-w-xs flex-col gap-2", layout === "compact" && "max-w-none w-auto")}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5",
          preferenceLabelClass(variant),
          layout === "compact" && "sr-only"
        )}
      >
        <Globe className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        {language.switchLabel}
      </span>
      <div
        role="radiogroup"
        aria-label={language.switchLabel}
        aria-busy={pending}
        className={preferenceSegmentTrack(variant)}
      >
        {LOCALES.map((code) => {
          const active = locale === code
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={language[code]}
              title={language[code]}
              disabled={pending}
              onClick={() => {
                if (pending || code === locale) return
                startTransition(async () => {
                  await setUserLocale(code)
                  recordPreferenceChange("locale", code)
                  router.refresh()
                })
              }}
              className={cn(
                preferenceSegmentButton(variant, active),
                labeled
                  ? "min-h-[3.25rem] flex-col gap-0.5 py-2 sm:min-h-9 sm:flex-row sm:gap-1.5 sm:py-1.5"
                  : "min-h-9 min-w-0 px-2.5",
                "tabular-nums tracking-wide",
                pending && !active && "opacity-50"
              )}
            >
              <span className="text-xs font-bold sm:text-sm">{SHORT[code]}</span>
              {labeled ? (
                <span className="max-w-[4.75rem] truncate text-center text-[10px] font-medium leading-tight opacity-85 sm:max-w-none sm:text-xs">
                  {language[code]}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
