import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { Messages } from "@/messages/en"
import {
  COMPLIANCE_ESSENTIAL_FIELD_ORDER,
  ESSENTIAL_FIELD_ORDER,
  isPresentEssentialValue,
  normalizeKeyPoints,
  normalizeObligations,
} from "@/lib/analysis-display"

type DocumentDetailCopy = Messages["documentDetail"]

export function AnalysisKeyPointsCard({
  title,
  rawPoints,
}: {
  title: string
  rawPoints: unknown
}) {
  const points = normalizeKeyPoints(rawPoints)
  if (!points.length) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-5 space-y-2 text-slate-700 text-sm leading-relaxed">
          {points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function essentialsRecord(rawEssentials: unknown): Record<string, unknown> {
  if (rawEssentials && typeof rawEssentials === "object" && !Array.isArray(rawEssentials)) {
    return rawEssentials as Record<string, unknown>
  }
  return {}
}

export function AnalysisEssentialsCard({
  copy,
  rawEssentials,
  title,
  fieldOrder = ESSENTIAL_FIELD_ORDER,
}: {
  copy: DocumentDetailCopy
  rawEssentials: unknown
  title?: string
  fieldOrder?: readonly string[]
}) {
  const essentials = essentialsRecord(rawEssentials)

  const rows: { key: string; label: string; value: string }[] = []
  for (const key of fieldOrder) {
    const raw = essentials[key]
    if (!isPresentEssentialValue(raw)) continue
    const label =
      copy.essentialsLabels[key as keyof typeof copy.essentialsLabels] ?? key.replace(/_/g, " ")
    rows.push({ key, label, value: String(raw).trim() })
  }

  if (!rows.length) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title ?? copy.essentialsTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.key}>
            <p className="text-xs text-slate-500 mb-0.5">{row.label}</p>
            <p className="text-sm text-slate-800 leading-snug">{row.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** Breach, prórrogas, penalties, disputes, regulatory exposure + focused bullet list. */
export function AnalysisComplianceExposureCard({
  copy,
  rawEssentials,
}: {
  copy: DocumentDetailCopy
  rawEssentials: unknown
}) {
  const essentials = essentialsRecord(rawEssentials)
  const rows: { key: string; label: string; value: string }[] = []
  for (const key of COMPLIANCE_ESSENTIAL_FIELD_ORDER) {
    const raw = essentials[key]
    if (!isPresentEssentialValue(raw)) continue
    const label =
      copy.essentialsLabels[key as keyof typeof copy.essentialsLabels] ?? key.replace(/_/g, " ")
    rows.push({ key, label, value: String(raw).trim() })
  }
  const bullets = normalizeKeyPoints(essentials.compliance_exposure_points)

  if (!rows.length && !bullets.length) return null

  return (
    <Card className="border-amber-100 bg-amber-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-amber-950">{copy.complianceExposureTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length > 0 ? (
          <div className="space-y-4">
            {rows.map((row) => (
              <div key={row.key}>
                <p className="text-xs text-amber-900/70 mb-0.5">{row.label}</p>
                <p className="text-sm text-slate-900 leading-snug">{row.value}</p>
              </div>
            ))}
          </div>
        ) : null}
        {bullets.length > 0 ? (
          <>
            {rows.length > 0 ? <Separator className="bg-amber-200/80" /> : null}
            <div>
              <p className="text-xs font-semibold text-amber-900/80 mb-2">
                {copy.complianceExposureBulletsSubtitle}
              </p>
              <ul className="list-disc pl-5 space-y-2 text-slate-800 text-sm leading-relaxed">
                {bullets.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function AnalysisObligationsCard({
  copy,
  rawObligations,
}: {
  copy: DocumentDetailCopy
  rawObligations: unknown
}) {
  const obligations = normalizeObligations(rawObligations)
  if (!obligations.length) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{copy.obligationsTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {obligations.map((row, i) => (
          <div key={i} className="text-sm border-b border-slate-100 last:border-0 pb-3 last:pb-0">
            <p className="font-medium text-slate-800">{row.party}</p>
            <p className="text-slate-600 mt-0.5 leading-snug">{row.obligation}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
