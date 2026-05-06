"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type EmbedBillingInvoiceRow = {
  id: string
  reference: string
  targetPlan: "starter" | "pro" | "team"
  amountInCents: number
  currency: string
  updatedAtIso: string
  wompiTransactionId: string | null
  garsaasInvoiceId: string | null
  garsaasNotifyLastError: string | null
  garsaasNotifyNextAtIso: string | null
  garsaasNoUpstream: boolean
}

/** Strings desde messages.billing.invoiceHistory (misma estrategia que BabyFirst). */
export type EmbedBillingInvoiceHistoryStrings = {
  title: string
  description: string
  empty: string
  emptyHint: string
  footerLimit: string
  filterAll: string
  filterPending: string
  filterError: string
  filterSynced: string
  filterEmpty: string
  filterEmptyHint: string
  lineAmountPlan: string
  linePaidAt: string
  lineReference: string
  lineInvoiceId: string
  lineTransactionId: string
  statusSynced: string
  statusNoUpstream: string
  statusPendingSync: string
  statusSyncError: string
  statusRetryScheduled: string
  paginationRange: string
  paginationPage: string
  paginationPrev: string
  paginationNext: string
  paginationPrevAria: string
  paginationNextAria: string
  exportCsv: string
  exportCsvAria: string
}

type InvoiceFilter = "all" | "pending" | "error" | "synced"

const PAGE_SIZE = 8

function formatMoney(locale: string, amountInCents: number, currency: string): string {
  const amount = amountInCents / 100
  const lang = locale === "en" ? "en-CO" : locale === "pt" ? "pt-BR" : "es-CO"
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency: currency || "COP",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(locale: string, iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const loc = locale === "en" ? "en-CO" : locale === "pt" ? "pt-BR" : "es-CO"
  return new Intl.DateTimeFormat(loc, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  let out = template
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v))
  }
  return out
}

type SyncVisual = { label: string; badgeClassName: string }

function syncVisual(
  locale: string,
  row: EmbedBillingInvoiceRow,
  s: EmbedBillingInvoiceHistoryStrings
): SyncVisual {
  if (row.garsaasInvoiceId) {
    return {
      label: s.statusSynced,
      badgeClassName:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    }
  }
  if (row.garsaasNoUpstream) {
    return {
      label: s.statusNoUpstream,
      badgeClassName: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    }
  }
  if (row.garsaasNotifyLastError && row.garsaasNotifyNextAtIso) {
    return {
      label: interpolate(s.statusRetryScheduled, {
        date: formatDate(locale, row.garsaasNotifyNextAtIso),
      }),
      badgeClassName:
        "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    }
  }
  if (row.garsaasNotifyLastError) {
    return {
      label: s.statusSyncError,
      badgeClassName: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
    }
  }
  return {
    label: s.statusPendingSync,
    badgeClassName: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  }
}

function rowMatches(row: EmbedBillingInvoiceRow, filter: InvoiceFilter): boolean {
  const synced = Boolean(row.garsaasInvoiceId)
  const hasError = Boolean(row.garsaasNotifyLastError)
  const pending = !synced && !hasError
  switch (filter) {
    case "all":
      return true
    case "synced":
      return synced
    case "error":
      return hasError
    case "pending":
      return pending
    default:
      return true
  }
}

export function BillingInvoiceHistory({
  locale,
  strings,
  planLabels,
  rows,
  historyLimit,
  csvHref,
}: {
  locale: string
  strings: EmbedBillingInvoiceHistoryStrings
  planLabels: Record<string, string>
  rows: EmbedBillingInvoiceRow[]
  historyLimit: number
  csvHref?: string | null
}) {
  const [filter, setFilter] = useState<InvoiceFilter>("all")
  const [page, setPage] = useState(1)

  const counts = useMemo(() => {
    let synced = 0
    let error = 0
    let pending = 0
    for (const r of rows) {
      if (r.garsaasInvoiceId) synced++
      else if (r.garsaasNotifyLastError) error++
      else pending++
    }
    return { all: rows.length, synced, error, pending }
  }, [rows])

  const filtered = useMemo(() => rows.filter((r) => rowMatches(r, filter)), [rows, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [filter])

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const pageSlice = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const rangeFrom = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeTo = filtered.length === 0 ? 0 : Math.min(page * PAGE_SIZE, filtered.length)

  const showGlobalEmpty = rows.length === 0
  const showFilterEmpty = rows.length > 0 && filtered.length === 0

  return (
    <Card className="mt-10 overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/30 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{strings.title}</CardTitle>
            <CardDescription>{strings.description}</CardDescription>
          </div>
          {csvHref ? (
            <Link
              href={csvHref}
              prefetch={false}
              aria-label={strings.exportCsvAria}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "inline-flex shrink-0 gap-1.5 rounded-xl"
              )}
            >
              <Download className="size-4" aria-hidden />
              {strings.exportCsv}
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {!showGlobalEmpty ? (
          <Tabs value={filter} onValueChange={(v) => setFilter(v as InvoiceFilter)} className="w-full">
            <TabsList className="mb-3 grid h-auto w-full grid-cols-2 gap-1.5 rounded-xl p-1 sm:flex sm:flex-wrap sm:justify-start">
              <TabsTrigger
                value="all"
                className="min-h-10 whitespace-normal rounded-lg px-2 py-2 text-center text-[11px] leading-snug sm:min-h-9 sm:px-2.5 sm:text-sm"
              >
                {interpolate(strings.filterAll, { count: counts.all })}
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="min-h-10 whitespace-normal rounded-lg px-2 py-2 text-center text-[11px] leading-snug sm:min-h-9 sm:px-2.5 sm:text-sm"
              >
                {interpolate(strings.filterPending, { count: counts.pending })}
              </TabsTrigger>
              <TabsTrigger
                value="error"
                className="min-h-10 whitespace-normal rounded-lg px-2 py-2 text-center text-[11px] leading-snug sm:min-h-9 sm:px-2.5 sm:text-sm"
              >
                {interpolate(strings.filterError, { count: counts.error })}
              </TabsTrigger>
              <TabsTrigger
                value="synced"
                className="min-h-10 whitespace-normal rounded-lg px-2 py-2 text-center text-[11px] leading-snug sm:min-h-9 sm:px-2.5 sm:text-sm"
              >
                {interpolate(strings.filterSynced, { count: counts.synced })}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

        {showGlobalEmpty ? (
          <div className="rounded-xl border border-dashed border-border p-4">
            <p className="text-sm text-muted-foreground">{strings.empty}</p>
            <p className="mt-1 text-xs text-muted-foreground">{strings.emptyHint}</p>
          </div>
        ) : showFilterEmpty ? (
          <div className="rounded-xl border border-dashed border-border p-4">
            <p className="text-sm text-muted-foreground">{strings.filterEmpty}</p>
            <p className="mt-1 text-xs text-muted-foreground">{strings.filterEmptyHint}</p>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {pageSlice.map((row) => {
                const status = syncVisual(locale, row, strings)
                const planLabel = planLabels[row.targetPlan] ?? row.targetPlan
                return (
                  <li key={row.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
                        {interpolate(strings.lineAmountPlan, {
                          amount: formatMoney(locale, row.amountInCents, row.currency),
                          plan: planLabel,
                        })}
                      </p>
                      <span
                        className={cn(
                          "inline-flex max-w-full self-start rounded-full border px-2 py-1 text-[11px] font-medium leading-snug sm:shrink-0 sm:self-auto sm:py-0.5 sm:text-[11px]",
                          status.badgeClassName
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {interpolate(strings.linePaidAt, {
                        date: formatDate(locale, row.updatedAtIso),
                      })}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {interpolate(strings.lineReference, { reference: row.reference })}
                    </p>
                    {row.garsaasInvoiceId ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {interpolate(strings.lineInvoiceId, { id: row.garsaasInvoiceId })}
                      </p>
                    ) : null}
                    {row.wompiTransactionId ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {interpolate(strings.lineTransactionId, { id: row.wompiTransactionId })}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
            {totalPages > 1 ? (
              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {interpolate(strings.paginationRange, {
                    from: rangeFrom,
                    to: rangeTo,
                    total: filtered.length,
                  })}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 rounded-lg"
                    disabled={page <= 1}
                    aria-label={strings.paginationPrevAria}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4 shrink-0" />
                    {strings.paginationPrev}
                  </Button>
                  <span className="min-w-28 text-center text-xs text-muted-foreground">
                    {interpolate(strings.paginationPage, { page, totalPages })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 rounded-lg"
                    disabled={page >= totalPages}
                    aria-label={strings.paginationNextAria}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {strings.paginationNext}
                    <ChevronRight className="size-4 shrink-0" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                {interpolate(strings.paginationRange, {
                  from: rangeFrom,
                  to: rangeTo,
                  total: filtered.length,
                })}
              </p>
            )}
          </>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {interpolate(strings.footerLimit, { max: historyLimit })}
        </p>
      </CardContent>
    </Card>
  )
}
