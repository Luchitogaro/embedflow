import { FileText, TrendingUp, AlertTriangle, Clock, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { UploadButton } from "./upload-button"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

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
    .select("id, filename, status, created_at, analyses(status, risk_flags)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5)

  return data ?? []
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const stats = await getStats(user.id, supabase)
  const recentDocs = await getRecentDocuments(user.id, supabase)

  const statCards = [
    { label: "Total Analyses", value: stats.totalAnalyses, icon: FileText, color: "text-blue-600 bg-blue-50" },
    { label: "This Month", value: stats.thisMonth, icon: TrendingUp, color: "text-green-600 bg-green-50" },
    { label: "Risk Flags Found", value: stats.riskFlagsFound, icon: AlertTriangle, color: "text-red-500 bg-red-50" },
    { label: "Avg. Analysis Time", value: stats.avgTime, icon: Clock, color: "text-purple-600 bg-purple-50" },
  ]

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Upload a contract to get started with AI analysis</p>
      </div>

      {/* Upload */}
      <div className="mb-10">
        <UploadButton />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</span>
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{card.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Documents */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent Analyses</h2>
        <Link href="/documents">
          <button className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
            View all <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

      {recentDocs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No analyses yet</p>
            <p className="text-slate-400 text-sm mt-1">Upload your first contract above to get started</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-slate-100">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{doc.filename}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                  doc.status === "done" ? "bg-green-100 text-green-700" :
                  doc.status === "processing" ? "bg-blue-100 text-blue-700" :
                  doc.status === "error" ? "bg-red-100 text-red-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {doc.status}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
