import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import {
  Upload,
  ShieldAlert,
  Zap,
  ArrowRight,
  Check,
  ClipboardList,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { getMessagesForRequest } from "@/lib/i18n/server"

const featureIcons = [Upload, ClipboardList, ShieldAlert, Share2] as const

export default async function LandingPage() {
  const { locale, messages } = await getMessagesForRequest()
  const l = messages.landing

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-4 backdrop-blur-md sm:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <div className="shrink-0 rounded-lg bg-primary p-1.5 text-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <span className="truncate text-lg font-bold tracking-tight">Embedflow</span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <ThemeToggle copy={messages.theme} variant="light" layout="compact" />
          <LanguageSwitcher locale={locale} language={messages.language} variant="light" layout="compact" />
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {l.signIn}
          </Link>
          <Link href="/login">
            <Button size="sm" className="font-semibold shadow-sm">
              {l.startFree}
            </Button>
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden gradient-animated px-6 py-24 text-white sm:px-8 sm:py-28">
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm sm:text-sm">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />
            {l.badge}
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {l.heroLine1}
            <br />
            <span className="text-sky-300">{l.heroLine2}</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-200 sm:text-xl">
            {l.heroSub}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link href="/login">
              <Button
                size="lg"
                className="h-12 border-0 bg-white px-8 font-semibold text-[#0A1628] shadow-lg shadow-black/25 hover:bg-slate-100"
              >
                {l.ctaPrimary}
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-2 border-white/70 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
              >
                {l.ctaSecondary}
              </Button>
            </Link>
          </div>
          <p className="mt-5 text-sm text-slate-400">{l.heroFootnote}</p>
        </div>
      </section>

      <section className="border-b border-border py-12">
        <p className="mb-6 text-center text-sm font-medium text-muted-foreground">{l.socialProof}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4">
          {["TechScale", "CloudOps", "DataFlow", "Nexus SaaS", "Streamline"].map((name) => (
            <span key={name} className="text-base font-bold text-foreground/25 sm:text-lg">
              {name}
            </span>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-24">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight">{l.featuresTitle}</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{l.featuresSub}</p>
        </div>
        <div className="stagger-children grid grid-cols-1 gap-6 sm:grid-cols-2">
          {l.features.map((f, i) => {
            const Icon = featureIcons[i] ?? ClipboardList
            return (
              <div
                key={f.title}
                className="card-hover rounded-2xl border border-border bg-card p-6 text-card-foreground transition-colors hover:border-primary/25"
              >
                <div className="mb-4 w-fit rounded-xl bg-primary/10 p-3 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section id="how-it-works" className="bg-muted/50 px-6 py-20 dark:bg-muted/20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">{l.howTitle}</h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-muted-foreground">{l.howSub}</p>
          <div className="stagger-children grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
            {l.howSteps.map((item, index) => (
              <div key={item.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground shadow-md shadow-primary/30">
                  {String(index + 1)}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-24">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">{l.testimonialsTitle}</h2>
        <div className="stagger-children grid grid-cols-1 gap-6 md:grid-cols-3">
          {l.testimonials.map((t) => (
            <div
              key={t.name}
              className="card-hover rounded-2xl border border-border bg-card p-6 text-card-foreground"
            >
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">&quot;{t.quote}&quot;</p>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-xs font-bold text-white">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.title}</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                <Check className="h-3 w-3" /> {t.metric}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="bg-muted/50 px-6 py-20 dark:bg-muted/20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight">{l.pricingTitle}</h2>
          <p className="mb-12 text-center text-muted-foreground">{l.pricingSub}</p>
          <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {l.pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.highlight
                    ? "glow-blue rounded-2xl border border-primary/40 bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/20"
                    : "rounded-2xl border border-border bg-card p-6 text-card-foreground"
                }
              >
                {plan.badge && (
                  <span
                    className={
                      plan.highlight
                        ? "mb-3 inline-block rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white"
                        : "mb-3 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                    }
                  >
                    {plan.badge}
                  </span>
                )}
                <h3 className="mb-1 text-lg font-bold">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span
                    className={
                      plan.highlight ? "text-sm text-primary-foreground/75" : "text-sm text-muted-foreground"
                    }
                  >
                    {plan.per}
                  </span>
                </div>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check
                        className={
                          plan.highlight
                            ? "mt-0.5 h-4 w-4 shrink-0 text-sky-200"
                            : "mt-0.5 h-4 w-4 shrink-0 text-primary"
                        }
                      />
                      <span className={plan.highlight ? "text-primary-foreground/90" : "text-muted-foreground"}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/login" className="block">
                  <Button
                    size="sm"
                    className={
                      plan.highlight
                        ? "h-9 w-full border-0 bg-white font-semibold text-[#0A1628] hover:bg-slate-100"
                        : "h-9 w-full font-semibold"
                    }
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 sm:px-8 sm:py-24">
        <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">{l.faqTitle}</h2>
        <div className="space-y-4">
          {l.faqs.map((faq) => (
            <div key={faq.q} className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-2 font-semibold">{faq.q}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="gradient-animated px-6 py-24 text-center text-white sm:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">{l.ctaTitle}</h2>
          <p className="mb-8 text-lg text-slate-200">{l.ctaSub}</p>
          <Link href="/login">
            <Button
              size="lg"
              className="inline-flex h-14 items-center gap-2 border-0 bg-white px-10 font-semibold text-[#0A1628] shadow-lg shadow-black/25 hover:bg-slate-100"
            >
              {l.ctaButton} <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded bg-primary p-1 text-primary-foreground">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-bold">Embedflow</span>
          </div>
          <div className="text-right text-sm text-muted-foreground space-y-1">
            <p>{l.footerCopyright}</p>
            <p>{l.footerTrademark}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
