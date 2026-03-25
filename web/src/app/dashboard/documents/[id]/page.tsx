import { FileText, Calendar, DollarSign, Globe, Loader2, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { AnalysisStatusWatcher } from "./analysis-status-watcher"
import { AnalysisProgressSteps } from "@/components/analysis-progress-steps"
import { DocumentDeleteButton } from "@/components/document-delete-button"
import { AnalysisActions } from "@/components/analysis-actions"
import { KeyTermsList } from "@/components/key-terms-list"
import {
  AnalysisComplianceExposureCard,
  AnalysisEssentialsCard,
  AnalysisKeyPointsCard,
  AnalysisObligationsCard,
} from "@/components/analysis-rich-sections"
import { parseJsonField } from "@/lib/parse-json-field"
import { getMessagesForRequest } from "@/lib/i18n/server"
import { interpolate } from "@/lib/i18n/interpolate"
import type { Messages } from "@/messages/en"

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

const InfoRow = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | null | undefined }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="p-1.5 bg-muted rounded">
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
    </div>
  </div>
)

function RiskBadge({
  level,
  riskLevel,
}: {
  level: string | null | undefined
  riskLevel: Messages["riskLevel"]
}) {
  if (!level) return null
  const cls = level === "HIGH" ? "bg-destructive/10 text-destructive"
    : level === "MEDIUM" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
  const label = riskLevel[level as keyof typeof riskLevel] ?? level
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
}

function formatDocStatusShort(
  status: string,
  labels: Messages["docStatus"]
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

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { locale, messages } = await getMessagesForRequest()
  const t = messages.documentDetail
  const docStatus = messages.docStatus
  const analysisCopy = messages.analysis
  const riskLevel = messages.riskLevel

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const result = await getDocumentWithAnalysis(id, user.id)
  if (!result) notFound()

  const { doc, analysis } = result

  const riskFlags = parseJsonField<Array<{
    clause: string; risk_level: string; explanation: string; recommendation: string
  }>>(analysis?.risk_flags, [])
  const keyTerms = parseJsonField<Record<string, unknown>>(analysis?.key_terms, {})
  const parties = parseJsonField<Array<{ name: string; role: string }>>(analysis?.parties, [])
  const dates = parseJsonField<Record<string, string | number | null>>(analysis?.dates, {})
  const pricing = parseJsonField<Record<string, string | null>>(analysis?.pricing, {})

  const deleteCopy = {
    deleteConfirm: t.deleteConfirm,
    deleteFailed: t.deleteFailed,
    delete: t.delete,
    deleting: t.deleting,
  }

  const partiesLine = parties.length > 0
    ? ` · ${interpolate(t.partiesIdentified, { n: parties.length })}`
    : ""

  const shareToken = (doc as { share_token?: string | null }).share_token ?? null
  const shareExpiresAt = (doc as { share_expires_at?: string | null }).share_expires_at ?? null

  const keyTermLabels = {
    yes: t.keyTermYes,
    no: t.keyTermNo,
    notSpecified: t.keyTermNotSpecified,
  }

  const shareCopy = {
    shareHeading: t.shareHeading,
    shareCreate: t.shareCreate,
    shareCopy: t.shareCopy,
    shareRevoke: t.shareRevoke,
    shareCopied: t.shareCopied,
    shareHint: t.shareHint,
    shareOnlyWhenDone: t.shareOnlyWhenDone,
    printSavePdf: t.printSavePdf,
    downloadPdf: t.downloadPdf,
    downloadPdfBusy: t.downloadPdfBusy,
    downloadPdfFailed: t.downloadPdfFailed,
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="no-print flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/15 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{doc.filename}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {formatDate(doc.created_at, locale)}
              {partiesLine}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <DocumentDeleteButton documentId={id} copy={deleteCopy} />
          <Badge className={
            doc.status === "done" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
            doc.status === "processing" ? "bg-primary/15 text-primary" :
            doc.status === "error" ? "bg-destructive/10 text-destructive" :
            "bg-muted text-muted-foreground"
          }>
            {doc.status === "done" ? docStatus.analysisComplete : formatDocStatusShort(doc.status, docStatus)}
          </Badge>
        </div>
      </div>

      {doc.status === "error" ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-8 text-center">
            <h2 className="text-lg font-semibold text-red-800 mb-2">{t.analysisFailed}</h2>
            <p className="text-red-700 text-sm">
              {doc.error_message || t.workerError}
            </p>
            <AnalysisStatusWatcher documentId={id} status="error" copy={analysisCopy} />
          </CardContent>
        </Card>
      ) : doc.status !== "done" ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="w-10 h-10 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold text-foreground mb-2">{t.analyzingTitle}</h2>
            <p className="text-muted-foreground text-sm">
              {doc.status === "pending" ? t.queue : t.processing}
            </p>
            <p className="text-muted-foreground text-xs mt-2">{t.timingHint}</p>
            <AnalysisProgressSteps
              status={doc.status === "pending" ? "pending" : "processing"}
              copy={analysisCopy}
            />
            <AnalysisStatusWatcher
              documentId={id}
              status={doc.status === "pending" ? "pending" : "processing"}
              copy={analysisCopy}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="no-print mb-6">
            <AnalysisActions
              documentId={id}
              status={doc.status}
              initialShareToken={shareToken}
              initialShareExpiresAt={shareExpiresAt}
              copy={shareCopy}
            />
          </div>
          <div id="embedflow-analysis-print" className="embedflow-analysis-print space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.execSummary}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed">
                  {analysis?.summary ?? t.noSummary}
                </p>
              </CardContent>
            </Card>

            <AnalysisKeyPointsCard title={t.keyPointsTitle} rawPoints={analysis?.key_points} />
            <AnalysisEssentialsCard copy={t} rawEssentials={analysis?.essentials} />
            <AnalysisComplianceExposureCard copy={t} rawEssentials={analysis?.essentials} />

            {analysis?.pitch_text && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-blue-900">{t.pitchTitle}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed">{analysis.pitch_text}</p>
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="text-base font-semibold text-foreground mb-3">
                {interpolate(t.riskSection, { n: riskFlags.length })}
              </h3>
              {riskFlags.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground text-sm">{t.noRisks} ✅</p>
                    <p className="text-muted-foreground text-xs mt-1">{t.noRisksSub}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {riskFlags.map((flag, i) => (
                    <Card key={i} className={
                      flag.risk_level === "HIGH" ? "border-destructive/30 bg-destructive/10"
                      : flag.risk_level === "MEDIUM" ? "border-amber-500/30 bg-amber-500/10"
                      : "border-emerald-500/30 bg-emerald-500/10"
                    }>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-foreground text-sm">{flag.clause}</p>
                          <RiskBadge level={flag.risk_level} riskLevel={riskLevel} />
                        </div>
                        <p className="text-muted-foreground text-sm mb-2">{flag.explanation}</p>
                        {flag.recommendation && (
                          <p className="text-primary text-sm bg-card/60 px-3 py-2 rounded border border-primary/30">
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

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.keyInfo}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow icon={Calendar} label={t.effective} value={dates.effective as string} />
                <Separator />
                <InfoRow icon={Calendar} label={t.renewal} value={dates.renewal as string} />
                <Separator />
                <InfoRow icon={DollarSign} label={t.contractValue} value={pricing.total_value as string} />
                <Separator />
                <InfoRow icon={Globe} label={t.currencyLabel} value={pricing.currency as string} />
                <Separator />
                <InfoRow icon={Calendar} label={t.billing} value={pricing.billing_cycle as string} />
              </CardContent>
            </Card>

            {Object.keys(keyTerms).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.keyTerms}</CardTitle>
                </CardHeader>
                <CardContent>
                  <KeyTermsList
                    keyTerms={keyTerms as Record<string, boolean | string | number | null | undefined>}
                    labels={keyTermLabels}
                    fieldLabels={t.keyTermFieldLabels}
                  />
                </CardContent>
              </Card>
            )}

            <AnalysisObligationsCard copy={t} rawObligations={analysis?.obligations} />

            {parties.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.parties}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {parties.map((party) => (
                    <div key={party.name} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{party.name}</span>
                      <Badge variant="outline" className="text-xs capitalize">{party.role}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
          </div>
        </>
      )}

      <div className="no-print mt-6">
        <Link href="/dashboard/documents">
          <Button variant="ghost" size="sm">{t.back}</Button>
        </Link>
      </div>
    </div>
  )
}
