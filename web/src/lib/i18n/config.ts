export const LOCALE_COOKIE = "EF_LOCALE"

export const LOCALES = ["en", "es", "pt"] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}

/** BCP 47 for `toLocaleDateString` */
export function dateLocaleFor(locale: Locale): string {
  if (locale === "es") return "es-ES"
  if (locale === "pt") return "pt-BR"
  return "en-US"
}
