import Link from "next/link"
import { FileText, Eye, ChevronRight } from "lucide-react"
import { DocumentDeleteButton } from "@/components/document-delete-button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { interpolate } from "@/lib/i18n/interpolate"
import { cn } from "@/lib/utils"
import type { Messages } from "@/messages/en"

export type DocumentListRow = {
  id: string
  filename: string
  createdAtIso: string
  formattedDate: string
  statusLabel: string
  statusKind: "done" | "processing" | "error" | "pending"
  topRisk: "HIGH" | "MEDIUM" | "LOW" | null
  riskLabel: string | null
  riskFlagsCount: number
}

type DeleteCopy = Pick<
  Messages["documentDetail"],
  "deleteConfirm" | "deleteFailed" | "delete" | "deleting"
>

type Props = {
  rows: DocumentListRow[]
  documents: Messages["documents"]
  deleteCopy: DeleteCopy
}

function statusBadgeClass(kind: DocumentListRow["statusKind"]) {
  switch (kind) {
    case "done":
      return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-600/20 border-0 dark:text-emerald-400"
    case "processing":
      return "bg-primary/15 text-primary ring-1 ring-primary/30 border-0"
    case "error":
      return "bg-destructive/10 text-destructive ring-1 ring-destructive/30 border-0"
    default:
      return "bg-muted text-foreground ring-1 ring-border border-0"
  }
}

function riskBadgeClass(risk: "HIGH" | "MEDIUM" | "LOW") {
  switch (risk) {
    case "HIGH":
      return "bg-destructive/10 text-destructive ring-1 ring-destructive/30"
    case "MEDIUM":
      return "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-400"
    default:
      return "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-600/20 dark:text-emerald-400"
  }
}

export function DocumentsList({ rows, documents: d, deleteCopy }: Props) {
  return (
    <>
      {/* Mobile-first: stacked cards */}
      <ul className="lg:hidden m-0 list-none space-y-3 p-0" role="list">
        {rows.map((row) => (
          <li key={row.id}>
            <article className="group rounded-2xl border border-border bg-card p-4 shadow-sm shadow-slate-900/[0.04] transition-[box-shadow,transform] duration-200 hover:shadow-md hover:shadow-slate-900/[0.06] active:scale-[0.998]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/15 text-primary"
                    aria-hidden
                  >
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h2 className="text-[15px] font-semibold leading-snug text-foreground line-clamp-2">
                      {row.filename}
                    </h2>
                    <time className="mt-1 block text-xs text-muted-foreground" dateTime={row.createdAtIso}>
                      {row.formattedDate}
                    </time>
                  </div>
                </div>
                <Badge
                  className={cn(
                    "shrink-0 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                    statusBadgeClass(row.statusKind)
                  )}
                >
                  {row.statusLabel}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/60 pt-4">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs">
                  <span className="font-medium text-muted-foreground">{d.colRisk}</span>
                  {row.riskLabel ? (
                    <Badge className={cn("border-0 px-2 py-0.5 text-[11px] font-medium", riskBadgeClass(row.topRisk!))}>
                      {row.riskLabel}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">{d.riskEmpty}</span>
                  )}
                  <span className="hidden min-[380px]:inline text-muted-foreground/70" aria-hidden>
                    ·
                  </span>
                  <span className="font-medium text-muted-foreground">{d.colFlags}</span>
                  <span className="text-muted-foreground">
                    {row.riskFlagsCount > 0
                      ? interpolate(d.flagsFound, { n: row.riskFlagsCount })
                      : d.alertsEmpty}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-stretch gap-2">
                <Link
                  href={`/dashboard/documents/${row.id}`}
                  className={cn(
                    "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors",
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  )}
                >
                  <Eye className="h-4 w-4 opacity-90" aria-hidden />
                  {d.openAnalysis}
                  <ChevronRight className="h-4 w-4 opacity-70" aria-hidden />
                </Link>
                <div className="flex min-h-11 items-center justify-center rounded-xl border border-border bg-muted/40 px-1">
                  <DocumentDeleteButton
                    documentId={row.id}
                    copy={deleteCopy}
                    variant="icon"
                    refreshOnly
                    className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-lg lg:min-h-0 lg:min-w-0"
                  />
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {/* Large screens: data table */}
      <div className="hidden lg:block">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-slate-900/[0.04]">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[36%] py-3.5 pl-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {d.colDocument}
                </TableHead>
                <TableHead className="py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {d.colStatus}
                </TableHead>
                <TableHead className="py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {d.colRisk}
                </TableHead>
                <TableHead className="py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {d.colFlags}
                </TableHead>
                <TableHead className="py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {d.colDate}
                </TableHead>
                <TableHead className="w-28 py-3.5 pr-5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {d.colActions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-border/60 transition-colors hover:bg-muted/40"
                >
                  <TableCell className="py-4 pl-5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-foreground text-sm leading-snug line-clamp-2">
                        {row.filename}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="align-middle">
                    <Badge
                      className={cn(
                        "px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                        statusBadgeClass(row.statusKind)
                      )}
                    >
                      {row.statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-middle">
                    {row.riskLabel ? (
                      <Badge
                        className={cn(
                          "border-0 px-2 py-0.5 text-[11px] font-medium",
                          riskBadgeClass(row.topRisk!)
                        )}
                      >
                        {row.riskLabel}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">{d.riskEmpty}</span>
                    )}
                  </TableCell>
                  <TableCell className="align-middle">
                    <span className="text-sm text-muted-foreground">
                      {row.riskFlagsCount > 0
                        ? interpolate(d.flagsFound, { n: row.riskFlagsCount })
                        : d.alertsEmpty}
                    </span>
                  </TableCell>
                  <TableCell className="align-middle">
                    <span className="text-sm text-muted-foreground tabular-nums">{row.formattedDate}</span>
                  </TableCell>
                  <TableCell className="py-4 pr-5 text-right align-middle">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/documents/${row.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={d.viewDetailsAria}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <DocumentDeleteButton
                        documentId={row.id}
                        copy={deleteCopy}
                        variant="icon"
                        refreshOnly
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
