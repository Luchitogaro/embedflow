import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { KeyTermsList } from "@/components/key-terms-list"
import {
  AnalysisComplianceExposureCard,
  AnalysisEssentialsCard,
  AnalysisKeyPointsCard,
  AnalysisObligationsCard,
} from "@/components/analysis-rich-sections"
import { loadSharedAnalysisByToken } from "@/lib/load-shared-analysis"
import { AnalysisWeakSourceAlert } from "@/components/analysis-weak-source-alert"
import { parseJsonField } from "@/lib/parse-json-field"
import { getMessagesForRequest } from "@/lib/i18n/server"
import { interpolate } from "@/lib/i18n/interpolate"
import { formatDate } from "@/lib/utils"
import type { Messages } from "@/messages/en"
import Link from "next/link"
import { Calendar, DollarSign, FileText, Globe } from "lucide-react"

export const metadata: Metadata = {
  title: "Shared analysis — Embedflow",
  robots: { index: false, follow: false },
}

function RiskLine({
  level,
  riskLevel,
}: {
  level: string | null | undefined
  riskLevel: Messages["riskLevel"]
}) {
  if (!level) return null
  const cls =
    level === "HIGH"
      ? "bg-red-100 text-red-700"
      : level === "MEDIUM"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-green-100 text-green-700"
  const label = riskLevel[level as keyof typeof riskLevel] ?? level
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
}

export default async function SharedAnalysisPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await loadSharedAnalysisByToken(token)
  if (!data) notFound()

  const { locale, messages } = await getMessagesForRequest()
  const t = messages.documentDetail
  const sv = messages.shareView
  const riskLevel = messages.riskLevel

  const riskFlags = parseJsonField<
    Array<{ clause: string; risk_level: string; explanation: string; recommendation: string }>
  >(data.riskFlags, [])
  const parties = parseJsonField<Array<{ name: string; role: string }>>(data.parties, [])
  const dates = parseJsonField<Record<string, string | number | null>>(data.dates, {})
  const pricing = parseJsonField<Record<string, string | null>>(data.pricing, {})
  const keyTerms = parseJsonField<Record<string, unknown>>(data.keyTerms, {})

  const keyLabels = {
    yes: t.keyTermYes,
    no: t.keyTermNo,
    notSpecified: t.keyTermNotSpecified,
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Badge variant="outline" className="mb-2 text-slate-600">
              {sv.badge}
            </Badge>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-7 h-7 text-blue-600" />
              {data.filename}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {formatDate(data.createdAt, locale)} · {sv.subtitle}
            </p>
          </div>
          <Link href="/" className="text-sm text-blue-600 hover:underline shrink-0">
            {sv.poweredBy}
          </Link>
        </div>

        <AnalysisWeakSourceAlert
          sourceQuality={data.sourceQuality}
          copy={{
            weakSourceTitle: t.weakSourceTitle,
            weakSourceTruncated: t.weakSourceTruncated,
            weakSourceLowQuality: t.weakSourceLowQuality,
          }}
          className="border-amber-200 bg-amber-50/90 text-slate-900 [&>svg]:text-amber-700 [&_[data-slot=alert-description]]:text-slate-700"
        />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.execSummary}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 leading-relaxed">{data.summary ?? t.noSummary}</p>
          </CardContent>
        </Card>

        <AnalysisKeyPointsCard title={t.keyPointsTitle} rawPoints={data.keyPoints} />
        <AnalysisEssentialsCard copy={t} rawEssentials={data.essentials} />
        <AnalysisComplianceExposureCard copy={t} rawEssentials={data.essentials} />

        {data.pitchText ? (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-blue-900">{t.pitchTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 leading-relaxed">{data.pitchText}</p>
            </CardContent>
          </Card>
        ) : null}

        <div>
          <h2 className="text-base font-semibold text-slate-900 mb-3">
            {interpolate(t.riskSection, { n: riskFlags.length })}
          </h2>
          {riskFlags.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-slate-500 text-sm">{t.noRisks}</p>
                <p className="text-slate-400 text-xs mt-1">{t.noRisksSub}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {riskFlags.map((flag, i) => (
                <Card
                  key={i}
                  className={
                    flag.risk_level === "HIGH"
                      ? "border-red-200 bg-red-50"
                      : flag.risk_level === "MEDIUM"
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-green-200 bg-green-50"
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <p className="font-medium text-slate-900 text-sm">{flag.clause}</p>
                      <RiskLine level={flag.risk_level} riskLevel={riskLevel} />
                    </div>
                    <p className="text-slate-600 text-sm mb-2">{flag.explanation}</p>
                    {flag.recommendation ? (
                      <p className="text-blue-700 text-sm bg-white/60 px-3 py-2 rounded border border-blue-200">
                        💡 {flag.recommendation}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.keyInfo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 text-sm">
              <div className="flex gap-2 py-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">{t.effective}</p>
                  <p className="font-medium">{String(dates.effective ?? "—")}</p>
                </div>
              </div>
              <Separator />
              <div className="flex gap-2 py-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">{t.renewal}</p>
                  <p className="font-medium">{String(dates.renewal ?? "—")}</p>
                </div>
              </div>
              <Separator />
              <div className="flex gap-2 py-2">
                <DollarSign className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">{t.contractValue}</p>
                  <p className="font-medium">{String(pricing.total_value ?? "—")}</p>
                </div>
              </div>
              <Separator />
              <div className="flex gap-2 py-2">
                <Globe className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">{t.currencyLabel}</p>
                  <p className="font-medium">{String(pricing.currency ?? "—")}</p>
                </div>
              </div>
              <Separator />
              <div className="flex gap-2 py-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">{t.billing}</p>
                  <p className="font-medium">{String(pricing.billing_cycle ?? "—")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {Object.keys(keyTerms).length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.keyTerms}</CardTitle>
              </CardHeader>
              <CardContent>
                <KeyTermsList
                  keyTerms={keyTerms as Record<string, boolean | string | number | null | undefined>}
                  labels={keyLabels}
                  fieldLabels={t.keyTermFieldLabels}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <AnalysisObligationsCard copy={t} rawObligations={data.obligations} />

        {parties.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t.parties}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {parties.map((party) => (
                <div key={party.name} className="flex justify-between text-sm">
                  <span className="font-medium text-slate-800">{party.name}</span>
                  <span className="text-slate-500 capitalize">{party.role}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
