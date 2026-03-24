import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Embedflow — AI Contract Intelligence for Sales Teams",
  description: "Upload a contract, get key terms, risk flags, and a 10-second pitch in seconds. Stop reading contracts. Start understanding deals.",
  keywords: ["contract analysis", "AI", "sales", "document intelligence", "risk assessment"],
  openGraph: {
    title: "Embedflow — AI Contract Intelligence",
    description: "Stop reading contracts. Start understanding deals.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
