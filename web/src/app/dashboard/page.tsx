import { FileText, TrendingUp, AlertTriangle, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { UploadButton } from "./upload-button"
import { DashboardOnboardingBanner } from "@/components/dashboard-onboarding"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getMessagesForRequest } from "@/lib/i18n/server"
import { interpolate } from "@/lib/i18n/interpolate"
import { UPLOAD_MAX_FILE_MB } from "@/lib/upload-limits"
import { formatDate } from "@/lib/utils"

function formatDocStatusLabel(
  status: string,
  labels: { pending: string; processing: string; done: string; error: string }
): string {
  const map: Record<string, string> = {
    pending: labels.pending,
    processing: labels.processing,
    done: labels.done,
    error: labels.error,
  }
  const raw = map[status] ?? status
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

async function getStats(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { count: totalAnalyses } = await supabase
    .from("analyses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: thisMonth } = await supabase
    .from("analyses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "done")
    .gte("created_at", startOfMonth.toISOString())

  return {
    totalAnalyses: totalAnalyses ?? 0,
    thisMonth: thisMonth ?? 0,
    riskFlagsFound: 0,
    avgTime: "18s",
  }
}

async function getRecentDocuments(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("documents")
    .select("id, filename, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5)

  return data ?? []
}

export default async function DashboardPage() {
  const { locale, messages } = await getMessagesForRequest()
  const m = messages.dashboard
  const docStatus = messages.docStatus

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const stats = await getStats(user.id, supabase)
  const recentDocs = await getRecentDocuments(user.id, supabase)

  const statCards = [
    { label: m.stats.totalAnalyses, value: stats.totalAnalyses, icon: FileText, color: "text-primary bg-primary/10" },
    { label: m.stats.thisMonth, value: stats.thisMonth, icon: TrendingUp, color: "text-green-600 bg-emerald-500/10" },
    { label: m.stats.riskFlagsFound, value: stats.riskFlagsFound, icon: AlertTriangle, color: "text-red-500 bg-destructive/10" },
    { label: m.stats.avgTime, value: stats.avgTime, icon: Clock, color: "text-purple-600 bg-purple-50" },
  ]

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-foreground">{m.title}</h1>
        <p className="text-muted-foreground text-sm mt-1">{m.subtitle}</p>
      </div>

      <DashboardOnboardingBanner copy={m.onboarding} />

      <div className="mb-8 sm:mb-10">
        <UploadButton
          upload={{
            ...m.upload,
            fileTypes: interpolate(m.upload.fileTypes, { maxMb: UPLOAD_MAX_FILE_MB }),
          }}
        />
      </div>

      <div className="mb-8 sm:mb-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.label}
              className="border-border shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="flex h-full min-h-[5.5rem] flex-col justify-center p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${card.color}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground sm:text-3xl">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-snug text-muted-foreground">
                      {card.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">{m.recentTitle}</h2>
        <Link href="/dashboard/documents">
          <button type="button" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
            {m.viewAll} <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

      {recentDocs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/70 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{m.emptyTitle}</p>
            <p className="text-muted-foreground text-sm mt-1">{m.emptySub}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border/60">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/dashboard/documents/${doc.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors"
              >
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(doc.created_at, locale)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                  doc.status === "done" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                  doc.status === "processing" ? "bg-primary/15 text-primary" :
                  doc.status === "error" ? "bg-destructive/10 text-destructive" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {doc.status === "done"
                    ? docStatus.analysisComplete
                    : formatDocStatusLabel(doc.status, docStatus)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
