import { cookies } from "next/headers"
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config"
import { messagesEn, type Messages } from "@/messages/en"
import { messagesEs } from "@/messages/es"
import { messagesPt } from "@/messages/pt"

const byLocale: Record<Locale, Messages> = {
  en: messagesEn,
  es: messagesEs,
  pt: messagesPt,
}

export async function getLocale(): Promise<Locale> {
  const jar = await cookies()
  const raw = jar.get(LOCALE_COOKIE)?.value
  return isLocale(raw) ? raw : DEFAULT_LOCALE
}

export function getMessages(locale: Locale): Messages {
  return byLocale[locale] ?? messagesEn
}

export async function getMessagesForRequest(): Promise<{ locale: Locale; messages: Messages }> {
  const locale = await getLocale()
  return { locale, messages: getMessages(locale) }
}
