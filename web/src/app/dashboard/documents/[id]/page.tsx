import { FileText, Calendar, DollarSign, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"

async function getDocumentWithAnalysis(docId: string, userId: string) {
  const supabase = await createClient()

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", docId)
    .eq("user_id", userId)
    .single()

  if (!doc) return null

  const { data: analysis } = await supabase
    .from("analyses")
    .select("*")
    .eq("document_id", docId)
    .eq("user_id", userId)
    .single()

  return { doc, analysis }
}

const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="p-1.5 bg-slate-100 rounded">
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value ?? "—"}</p>
    </div>
  </div>
)

function RiskBadge({ level }: { level: string | null | undefined }) {
  if (!level) return null
  const cls = level === "HIGH" ? "bg-red-100 text-red-700"
    : level === "MEDIUM" ? "bg-yellow-100 text-yellow-700"
    : "bg-green-100 text-green-700"
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{level}</span>
}

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const result = await getDocumentWithAnalysis(id, user.id)
  if (!result) notFound()

  const { doc, analysis } = result

  const riskFlags = analysis?.risk_flags
    ? (JSON.parse(analysis.risk_flags as string) as Array<{
        clause: string; risk_level: string; explanation: string; recommendation: string
      }>)
    : []

  const keyTerms = analysis?.key_terms
    ? (JSON.parse(analysis.key_terms as string) as Record<string, boolean | string | number>)
    : {}

  const parties = analysis?.parties
    ? (JSON.parse(analysis.parties as string) as Array<{ name: string; role: string }>)
    : []

  const dates = analysis?.dates
    ? (JSON.parse(analysis.dates as string) as Record<string, string | number | null>)
    : {}

  const pricing = analysis?.pricing
    ? (JSON.parse(analysis.pricing as string) as Record<string, string | null>)
    : {}

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{doc.filename}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {formatDate(doc.created_at)}
              {parties.length > 0 && ` · ${parties.length} parties identified`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Badge className={
            doc.status === "done" ? "bg-green-100 text-green-700" :
            doc.status === "processing" ? "bg-blue-100 text-blue-700" :
            doc.status === "error" ? "bg-red-100 text-red-700" :
            "bg-slate-100 text-slate-600"
          }>
            {doc.status === "done" ? "Analysis complete" : doc.status}
          </Badge>
        </div>
      </div>

      {doc.status !== "done" ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Analyzing your document...</h2>
            <p className="text-slate-500 text-sm">
              {doc.status === "pending" ? "Waiting in queue..." : "Processing with AI..."}
            </p>
            <p className="text-slate-400 text-xs mt-2">This usually takes 10-30 seconds</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Left column */}
          <div className="col-span-2 space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed">
                  {analysis?.summary ?? "No summary available."}
                </p>
              </CardContent>
            </Card>

            {/* Pitch */}
            {analysis?.pitch_text && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-blue-900">🎯 10-Second Pitch</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed">{analysis.pitch_text}</p>
                </CardContent>
              </Card>
            )}

            {/* Risk Flags */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-3">
                Risk Flags ({riskFlags.length})
              </h3>
              {riskFlags.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-slate-500 text-sm">No risk flags found ✅</p>
                    <p className="text-slate-400 text-xs mt-1">This contract looks clean</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {riskFlags.map((flag, i) => (
                    <Card key={i} className={
                      flag.risk_level === "HIGH" ? "border-red-200 bg-red-50"
                      : flag.risk_level === "MEDIUM" ? "border-yellow-200 bg-yellow-50"
                      : "border-green-200 bg-green-50"
                    }>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-slate-900 text-sm">{flag.clause}</p>
                          <RiskBadge level={flag.risk_level} />
                        </div>
                        <p className="text-slate-600 text-sm mb-2">{flag.explanation}</p>
                        {flag.recommendation && (
                          <p className="text-blue-700 text-sm bg-white/60 px-3 py-2 rounded border border-blue-200">
                            💡 {flag.recommendation}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Key Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow icon={Calendar} label="Effective Date" value={dates.effective as string} />
                <Separator />
                <InfoRow icon={Calendar} label="Renewal Date" value={dates.renewal as string} />
                <Separator />
                <InfoRow icon={DollarSign} label="Contract Value" value={pricing.total_value as string} />
                <Separator />
                <InfoRow icon={Calendar} label="Billing" value={pricing.billing_cycle as string} />
              </CardContent>
            </Card>

            {Object.keys(keyTerms).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Key Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(keyTerms).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 capitalize">
                        {key.replace(/_/g, " ")}
                      </span>
                      <Badge className={
                        value === true ? "bg-green-100 text-green-700"
                        : value === false ? "bg-slate-100 text-slate-600"
                        : "bg-blue-50 text-blue-700"
                      }>
                        {String(value)}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {parties.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Parties</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {parties.map((party) => (
                    <div key={party.name} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{party.name}</span>
                      <Badge variant="outline" className="text-xs capitalize">{party.role}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link href="/dashboard/documents">
          <Button variant="ghost" size="sm">← Back to documents</Button>
        </Link>
      </div>
    </div>
  )
}
