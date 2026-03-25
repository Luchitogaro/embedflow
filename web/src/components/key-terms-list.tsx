import { Badge } from "@/components/ui/badge"
import {
  formatKeyTermDisplay,
  keyTermBadgeClass,
  type KeyTermLabels,
} from "@/lib/key-terms"

type Props = {
  keyTerms: Record<string, boolean | string | number | null | undefined>
  labels: KeyTermLabels
  /** Optional UI labels per field key (e.g. i18n); falls back to humanized key. */
  fieldLabels?: Record<string, string>
}

export function KeyTermsList({ keyTerms, labels, fieldLabels }: Props) {
  const entries = Object.entries(keyTerms)
  if (entries.length === 0) return null

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600 shrink min-w-0">
            {fieldLabels?.[key] ?? key.replace(/_/g, " ")}
          </span>
          <Badge className={`shrink-0 text-xs ${keyTermBadgeClass(value)}`}>
            {formatKeyTermDisplay(value, labels)}
          </Badge>
        </div>
      ))}
    </div>
  )
}
