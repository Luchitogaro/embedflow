import { FileText } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatDate } from "@/lib/utils"
import { parseJsonField } from "@/lib/parse-json-field"
import { getMessagesForRequest } from "@/lib/i18n/server"
import { interpolate } from "@/lib/i18n/interpolate"
import type { Messages } from "@/messages/en"
import { DocumentsList, type DocumentListRow } from "./documents-list"

function formatDocStatusLabel(
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

function statusKindFor(
  status: string
): DocumentListRow["statusKind"] {
  if (status === "done") return "done"
  if (status === "error") return "error"
  if (status === "processing") return "processing"
  return "pending"
}

export default async function DocumentsPage() {
  const { locale, messages } = await getMessagesForRequest()
  const d = messages.documents
  const docStatus = messages.docStatus
  const riskLevel = messages.riskLevel

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Same core query as the dashboard (no nested embed). Nested `analyses(...)` embeds can return
  // empty rows under PostgREST/RLS edge cases even when documents exist; fetch analyses separately.
  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("id, filename, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (documentsError) {
    console.error("documents list:", documentsError.message)
  }

  const docs = documents ?? []
  const docIds = docs.map((d) => d.id)

  const analysesByDocId = new Map<
    string,
    { status: string; risk_flags: unknown }
  >()
  if (docIds.length > 0) {
    const { data: analysisRows } = await supabase
      .from("analyses")
      .select("document_id, status, risk_flags, created_at")
      .in("document_id", docIds)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    for (const row of analysisRows ?? []) {
      if (!analysesByDocId.has(row.document_id)) {
        analysesByDocId.set(row.document_id, {
          status: row.status,
          risk_flags: row.risk_flags,
        })
      }
    }
  }

  const deleteCopy = {
    deleteConfirm: messages.documentDetail.deleteConfirm,
    deleteFailed: messages.documentDetail.deleteFailed,
    delete: messages.documentDetail.delete,
    deleting: messages.documentDetail.deleting,
  }

  const rows: DocumentListRow[] = docs.map((doc) => {
    const analysis = analysesByDocId.get(doc.id)
    const rawFlags = parseJsonField<unknown>(analysis?.risk_flags, [])
    const riskFlags = Array.isArray(rawFlags)
      ? (rawFlags as Array<{ risk_level: string }>)
      : []
    const topRisk = riskFlags.find((f) => f.risk_level === "HIGH")
      ? "HIGH"
      : riskFlags.find((f) => f.risk_level === "MEDIUM")
        ? "MEDIUM"
        : riskFlags.length > 0
          ? "LOW"
          : null

    const riskLabel = topRisk
      ? riskLevel[topRisk as keyof typeof riskLevel]
      : null

    const sk = statusKindFor(doc.status)
    const statusLabel =
      doc.status === "done"
        ? docStatus.analysisComplete
        : formatDocStatusLabel(doc.status, docStatus)

    return {
      id: doc.id,
      filename: doc.filename,
      createdAtIso: doc.created_at,
      formattedDate: formatDate(doc.created_at, locale),
      statusLabel,
      statusKind: sk,
      topRisk,
      riskLabel,
      riskFlagsCount: riskFlags.length,
    }
  })

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {d.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {interpolate(d.subtitle, { count: docs.length })}
        </p>
      </header>

      {docs.length === 0 ? (
        <Card className="overflow-hidden rounded-2xl border-border shadow-sm shadow-slate-900/[0.04]">
          <CardContent className="px-6 py-14 text-center sm:py-16">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="h-7 w-7" />
            </div>
            <p className="font-medium text-foreground">{d.emptyTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {d.emptySub}{" "}
              <Link href="/dashboard" className="font-medium text-primary hover:underline">
                {d.emptyLink}
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <DocumentsList rows={rows} documents={d} deleteCopy={deleteCopy} />
      )}
    </div>
  )
}
