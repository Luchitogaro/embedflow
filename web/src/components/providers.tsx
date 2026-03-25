"use client"

import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"

// next-themes injects <script> for FOUC; React 19 dev logs that and Next can show a full-page error overlay.
const g = globalThis as typeof globalThis & { __embedflowFilterScriptTagConsole?: boolean }
if (process.env.NODE_ENV === "development" && !g.__embedflowFilterScriptTagConsole) {
  g.__embedflowFilterScriptTagConsole = true
  const orig = console.error
  console.error = (...args: unknown[]) => {
    const msg = args[0]
    if (typeof msg === "string" && msg.includes("Encountered a script tag while rendering")) return
    orig.apply(console, args)
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster />
    </ThemeProvider>
  )
}
