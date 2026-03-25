import type { Locale } from "@/lib/i18n/config"

/** Locale sent to the analysis worker (must match worker/prompts `normalize_locale`). */
export function localeForWorkerAnalysis(locale: Locale): "en" | "es" | "pt" {
  if (locale === "es" || locale === "pt") return locale
  return "en"
}
