"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Link2, Printer, Copy, Ban, FileDown } from "lucide-react"
import Link from "next/link"
import { getSiteUrl } from "@/lib/site-url"
import { cn } from "@/lib/utils"
import type { Messages } from "@/messages/en"

type Copy = Pick<
  Messages["documentDetail"],
  | "shareHeading"
  | "shareCreate"
  | "shareCopy"
  | "shareRevoke"
  | "shareCopied"
  | "shareHint"
  | "shareOnlyWhenDone"
  | "printSavePdf"
  | "downloadPdf"
  | "downloadPdfBusy"
  | "downloadPdfFailed"
  | "planGatedSharePdfHint"
  | "planGatedBillingLink"
>

type Props = {
  documentId: string
  status: string
  initialShareToken: string | null
  initialShareExpiresAt?: string | null
  copy: Copy
  /** Pro, Team, Enterprise — billing-aligned */
  allowShareLinks: boolean
  allowOfficialPdf: boolean
}

export function AnalysisActions({
  documentId,
  status,
  initialShareToken,
  initialShareExpiresAt = null,
  copy,
  allowShareLinks,
  allowOfficialPdf,
}: Props) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(initialShareToken)
  const [expiresAt, setExpiresAt] = useState<string | null>(initialShareExpiresAt)
  const [busy, setBusy] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const canShare = status === "done"
  const pdfDownloadAllowed = canShare && allowOfficialPdf

  async function postShare(action: "create" | "revoke") {
    setBusy(true)
    setToast(null)
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = (await res.json()) as {
        shareToken?: string | null
        shareExpiresAt?: string | null
        error?: string
      }
      if (!res.ok) {
        setToast(data.error || "Error")
        return
      }
      setToken(data.shareToken ?? null)
      setExpiresAt(data.shareExpiresAt ?? null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  function copyLink() {
    if (!token) return
    const url = `${getSiteUrl()}/share/${token}`
    void navigator.clipboard.writeText(url).then(() => {
      setToast(copy.shareCopied)
      window.setTimeout(() => setToast(null), 2500)
    })
  }

  function printAnalysis() {
    window.print()
  }

  async function downloadOfficialPdf() {
    setPdfBusy(true)
    setToast(null)
    try {
      const res = await fetch(`/api/documents/${documentId}/pdf`, { cache: "no-store" })
      if (!res.ok) {
        setToast(
          (await res.json().catch(() => ({})) as { error?: string }).error || copy.downloadPdfFailed
        )
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get("Content-Disposition")
      const match = cd?.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `embedflow-analysis-${documentId.slice(0, 8)}.pdf`
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.rel = "noopener"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setToast(copy.downloadPdfFailed)
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className={cn("no-print space-y-3 rounded-lg border border-slate-200 bg-white p-4")}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{copy.shareHeading}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={busy || !canShare || (!token && !allowShareLinks)}
          onClick={() => void postShare(token ? "revoke" : "create")}
          title={
            !canShare
              ? copy.shareOnlyWhenDone
              : !token && !allowShareLinks
                ? copy.planGatedSharePdfHint
                : undefined
          }
        >
          {token ? <Ban className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
          {token ? copy.shareRevoke : copy.shareCreate}
        </Button>
        {token && allowShareLinks ? (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={copyLink}>
            <Copy className="w-4 h-4" />
            {copy.shareCopy}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!canShare}
          onClick={printAnalysis}
          title={!canShare ? copy.shareOnlyWhenDone : undefined}
        >
          <Printer className="w-4 h-4" />
          {copy.printSavePdf}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!pdfDownloadAllowed || pdfBusy}
          onClick={() => void downloadOfficialPdf()}
          title={
            !canShare ? copy.shareOnlyWhenDone : !allowOfficialPdf ? copy.planGatedSharePdfHint : undefined
          }
        >
          <FileDown className="w-4 h-4" />
          {pdfBusy ? copy.downloadPdfBusy : copy.downloadPdf}
        </Button>
      </div>
      {canShare && (!allowShareLinks || !allowOfficialPdf) ? (
        <p className="text-xs text-amber-800 dark:text-amber-200/90">
          {copy.planGatedSharePdfHint}{" "}
          <Link href="/dashboard/settings/billing" className="font-medium underline underline-offset-2">
            {copy.planGatedBillingLink}
          </Link>
        </p>
      ) : null}
      <p className="text-xs text-slate-500">
        {copy.shareHint}
        {expiresAt ? ` Expires: ${new Date(expiresAt).toLocaleDateString()}.` : ""}
      </p>
      {toast ? <p className="text-xs text-green-700">{toast}</p> : null}
    </div>
  )
}
