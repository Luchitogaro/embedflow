"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import type { Messages } from "@/messages/en"
import { interpolate } from "@/lib/i18n/interpolate"

type AuthCopy = Messages["auth"]

export function LoginForm({ t }: { t: AuthCopy }) {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [magicSent, setMagicSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState("")

  const handleMagicLink = async () => {
    setLoading(true)
    setError("")
    const emailInput = document.getElementById("login-email") as HTMLInputElement | null
    const emailValue = emailInput?.value?.trim() ?? email
    const { error } = await supabase.auth.signInWithOtp({
      email: emailValue,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMagicSent(true)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const emailEl = document.getElementById("login-email") as HTMLInputElement | null
    const passwordEl = document.getElementById("login-password") as HTMLInputElement | null
    const emailValue = emailEl?.value?.trim() ?? ""
    const passwordValue = passwordEl?.value ?? ""
    const { error } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue,
    })
    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    setLoading(false)
    if (!session) {
      setError("Could not establish a session. Please try again.")
      return
    }

    // Full navigation so SSR and Playwright see the same cookies as the browser client (router.push alone can race).
    window.location.assign("/dashboard")
  }

  if (magicSent) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center text-card-foreground shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
          <span className="text-2xl">✉️</span>
        </div>
        <h1 className="mb-2 text-xl font-semibold">{t.checkEmail}</h1>
        <p className="text-sm text-muted-foreground">
          {interpolate(t.magicLinkSent, { email })}
        </p>
        <button
          type="button"
          onClick={() => setMagicSent(false)}
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          {t.useDifferentEmail}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">{t.brand}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.loginSubtitle}</p>
      </div>

      <form method="post" noValidate onSubmit={handlePasswordLogin} className="mb-6 space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-foreground">{t.email}</label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-foreground">{t.password}</label>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? t.hidePassword : t.showPassword}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {t.signIn}
        </button>
      </form>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">{t.or}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleMagicLink}
        disabled={loading || !email}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
      >
        ✉️ {t.sendMagicLink}
      </button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.noAccount}{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          {t.signUp}
        </Link>
      </p>
    </div>
  )
}
