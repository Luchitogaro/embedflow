/** Safely coerce Supabase JSON/JSONB (object or string, including empty) for UI use. */
export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return fallback
    try {
      return JSON.parse(trimmed) as T
    } catch {
      return fallback
    }
  }
  if (typeof value === "object") {
    return value as T
  }
  return fallback
}
