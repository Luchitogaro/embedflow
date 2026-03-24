import Link from "next/link"
import { Upload, Shield, Mic, Zap, ArrowRight, Check, FileText, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: Upload,
    title: "Drag & Drop Upload",
    description: "Upload PDF, DOCX, or paste text. No formatting required — AI handles it all.",
  },
  {
    icon: FileText,
    title: "Key Term Extraction",
    description: "Instantly identifies parties, dates, pricing, renewal clauses, SLAs, and liability terms.",
  },
  {
    icon: AlertTriangle,
    title: "Risk Flagging",
    description: "Red/yellow/green indicators on problematic clauses with plain-English explanations.",
  },
  {
    icon: Mic,
    title: "10-Second Pitch",
    description: "One-click generation of a verbal summary you can use in your next deal review.",
  },
]

const testimonials = [
  {
    quote: "I used to spend 2 hours reading contracts before calls. Now I get the full picture in 30 seconds.",
    name: "Sarah Chen",
    title: "Account Executive, TechScale",
    metric: "2hrs saved per contract",
  },
  {
    quote: "Caught an unlimited liability clause that my previous tool missed completely. This paid for itself in one deal.",
    name: "Marcus Rivera",
    title: "Sales Director, CloudOps",
    metric: "$180K deal protected",
  },
  {
    quote: "Finally something that actually understands SaaS contracts. The pitch feature is genius.",
    name: "Priya Patel",
    title: "VP Sales, DataFlow",
    metric: "3 deals closed faster",
  },
]

const faqs = [
  { q: "Is my contract data used for training?", a: "No. Your documents are never used to train AI models. They are processed solely to deliver the analysis you request." },
  { q: "What contract types do you support?", a: "MSAs, NDAs, SOWs, SaaS agreements, RFPs, procurement contracts, and most standard B2B contract formats." },
  { q: "How accurate is the analysis?", a: "Our AI achieves 95%+ accuracy on standard contracts. For unusual or highly complex agreements, we recommend a human legal review as a complement." },
  { q: "Do I need a credit card to start?", a: "No. The free tier gives you 3 analyses per month with no credit card required." },
  { q: "Can I integrate with Salesforce or HubSpot?", a: "Yes — Pro and Team plans include full CRM sync with both Salesforce and HubSpot." },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#0A1628]">Embedflow</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <button className="text-sm text-slate-600 hover:text-slate-900 font-medium">
              Sign in
            </button>
          </Link>
          <Link href="/login">
            <Button size="sm">Start free</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden gradient-animated text-white py-28 px-8">
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/20 rounded-full text-sm mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Now in public beta — 3 free analyses/month
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Stop reading contracts.<br />
            <span className="text-blue-400">Start understanding deals.</span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Embedflow uses AI to extract key terms, flag risk, and generate a 10-second pitch — in under 60 seconds. Built for sales teams who can't afford to miss the fine print.
          </p>
          <div className="flex items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white px-8 h-12">
              Start free — no credit card
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 h-12">
              See how it works
            </Button>
          </Link>
          </div>
          <p className="text-sm text-slate-400 mt-4">3 docs free per month · No credit card required</p>
        </div>

        {/* Floating UI preview */}
        <div className="absolute right-8 top-16 hidden lg:block">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 w-72 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-green-500/20 rounded">
                <FileText className="w-4 h-4 text-green-400" />
              </div>
              <span className="text-sm font-medium text-white">Acme_MSA_2024.pdf</span>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-white/10 rounded-full w-full" />
              <div className="h-2 bg-white/10 rounded-full w-5/6" />
              <div className="h-2 bg-white/10 rounded-full w-4/6" />
            </div>
            <div className="mt-3 flex gap-2">
              <div className="h-6 px-2 bg-red-500/20 border border-red-500/30 rounded-full text-xs text-red-300 flex items-center">
                1 HIGH risk
              </div>
              <div className="h-6 px-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-xs text-yellow-300 flex items-center">
                1 MEDIUM risk
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-12 border-b border-slate-100">
        <p className="text-center text-sm text-slate-400 mb-6 font-medium">Trusted by sales teams at</p>
        <div className="flex items-center justify-center gap-12 flex-wrap">
          {["TechScale", "CloudOps", "DataFlow", "Nexus SaaS", "Streamline"].map((name) => (
            <span key={name} className="text-slate-300 font-bold text-lg">{name}</span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-8 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-[#0A1628] mb-4">Everything you need to close faster</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Upload. Analyze. Understand. No legal degree required.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 stagger-children">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="p-6 rounded-2xl border border-slate-100 hover:border-blue-100 card-hover bg-white">
                <div className="p-3 bg-blue-50 rounded-xl w-fit mb-4">
                  <Icon className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-[#0A1628] mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[#0A1628] mb-4 text-center">How it works</h2>
          <p className="text-slate-500 text-center mb-16 max-w-xl mx-auto">
            Three steps from uploaded contract to deal intelligence.
          </p>
          <div className="grid grid-cols-3 gap-8 stagger-children">
            {[
              { step: "1", title: "Upload", desc: "Drag & drop your PDF, DOCX, or paste text directly. Takes 5 seconds." },
              { step: "2", title: "Analyze", desc: "AI reads every clause — extracts terms, flags risk, identifies red flags." },
              { step: "3", title: "Understand", desc: "Get a structured analysis, risk summary, and a 10-second verbal pitch." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-[#0A1628] mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-8 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-[#0A1628] mb-12 text-center">Loved by sales teams</h2>
        <div className="grid grid-cols-3 gap-6 stagger-children">
          {testimonials.map((t) => (
            <div key={t.name} className="p-6 rounded-2xl border border-slate-100 bg-white card-hover">
              <p className="text-slate-700 text-sm leading-relaxed mb-4">"{t.quote}"</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.title}</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">
                <Check className="w-3 h-3" /> {t.metric}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[#0A1628] mb-4 text-center">Simple, transparent pricing</h2>
          <p className="text-slate-500 text-center mb-12">Start free. Upgrade when you need more.</p>
          <div className="grid grid-cols-4 gap-4 stagger-children">
            {[
              { name: "Free", price: "$0", highlight: false, badge: null, features: ["3 docs/month", "Basic extraction", "Risk flags", "Email support"] },
              { name: "Starter", price: "$29", highlight: false, badge: "Most popular", per: "/user/mo", features: ["20 docs/month", "Full extraction", "Risk flags", "Pitch generator", "Email support"] },
              { name: "Pro", price: "$49", highlight: true, badge: null, per: "/user/mo", features: ["Unlimited docs", "CRM sync (SF + HubSpot)", "Slack alerts", "Priority AI", "API access"] },
              { name: "Team", price: "$149", highlight: false, badge: null, per: "/month", features: ["5 seats", "Org dashboard", "Custom risk rules", "SSO", "Dedicated support"] },
            ].map((plan) => (
              <div key={plan.name} className={`p-6 rounded-2xl ${plan.highlight ? "bg-[#0A1628] text-white glow-blue" : "bg-white border border-slate-200"}`}>
                {plan.badge && (
                  <span className="inline-block text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full mb-3">
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-slate-400">{plan.per || "/month"}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className={`w-4 h-4 ${plan.highlight ? "text-blue-400" : "text-green-500"}`} />
                      <span className={plan.highlight ? "text-slate-300" : "text-slate-600"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <button className={`w-full ${plan.highlight ? "bg-blue-500 hover:bg-blue-600 text-white" : "border border-slate-200 hover:bg-slate-50"} rounded-lg px-4 py-2 text-sm font-medium transition-colors`}>
                    {plan.price === "$0" ? "Start free" : "Get started"}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-8 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-[#0A1628] mb-12 text-center">Frequently asked questions</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="p-5 rounded-xl border border-slate-100">
              <h3 className="font-semibold text-[#0A1628] mb-2">{faq.q}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-8 gradient-animated text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Start understanding your deals today.</h2>
          <p className="text-slate-300 text-lg mb-8">3 free analyses per month. No credit card. Cancel anytime.</p>
          <Link href="/login">
            <button className="inline-flex items-center gap-2 bg-white text-[#0A1628] hover:bg-slate-100 px-10 h-14 text-base font-semibold rounded-lg transition-colors">
              Get started free <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-8">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-500 rounded">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[#0A1628]">Embedflow</span>
          </div>
          <p className="text-sm text-slate-400">© 2026 Embedflow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
