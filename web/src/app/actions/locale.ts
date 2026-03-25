"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config"

export async function setUserLocale(locale: string) {
  if (!isLocale(locale)) return

  const jar = await cookies()
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })

  revalidatePath("/", "layout")
}
