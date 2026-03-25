/** Normalize API / JSONB oddities for key_terms display. */
export function isEmptyKeyTermValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") {
    const s = value.trim().toLowerCase()
    return s === "" || s === "null" || s === "undefined" || s === "none"
  }
  return false
}

export type KeyTermLabels = {
  yes: string
  no: string
  notSpecified: string
}

export function formatKeyTermDisplay(value: unknown, labels: KeyTermLabels): string {
  if (value === true) return labels.yes
  if (value === false) return labels.no
  if (isEmptyKeyTermValue(value)) return labels.notSpecified
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return String(value).trim() || labels.notSpecified
}

export function keyTermBadgeClass(value: unknown): string {
  if (value === true) return "bg-green-100 text-green-700"
  if (value === false) return "bg-slate-100 text-slate-600"
  if (isEmptyKeyTermValue(value)) return "bg-slate-50 text-slate-500 border border-slate-200 font-normal"
  return "bg-blue-50 text-blue-800"
}
