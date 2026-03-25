import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { getMessagesForRequest } from "@/lib/i18n/server"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { locale, messages } = await getMessagesForRequest()
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/40 px-4 py-16 dark:bg-background">
      <div className="absolute right-4 top-4 flex flex-wrap items-center justify-end gap-3 sm:right-6 sm:top-6">
        <ThemeToggle copy={messages.theme} variant="light" />
        <LanguageSwitcher locale={locale} language={messages.language} variant="light" />
      </div>
      {children}
    </div>
  )
}
