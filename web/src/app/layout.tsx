import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { getLocale } from "@/lib/i18n/server"
import type { Locale } from "@/lib/i18n/config"
import { getSiteUrl } from "@/lib/site-url"

const inter = Inter({ subsets: ["latin"] })

const siteUrl = getSiteUrl()

function htmlLang(locale: Locale): string {
  if (locale === "pt") return "pt-BR"
  if (locale === "es") return "es"
  return "en"
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Embedflow — AI Contract Intelligence for Sales Teams",
  description:
    "Upload a contract, get key terms, risk flags, and a 10-second pitch in seconds. Stop reading contracts. Start understanding deals.",
  keywords: ["contract analysis", "AI", "sales", "document intelligence", "risk assessment"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Embedflow — AI Contract Intelligence",
    description: "Stop reading contracts. Start understanding deals.",
    type: "website",
    url: siteUrl,
    siteName: "Embedflow",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Embedflow — AI Contract Intelligence",
    description: "Stop reading contracts. Start understanding deals.",
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  return (
    <html lang={htmlLang(locale)} suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
