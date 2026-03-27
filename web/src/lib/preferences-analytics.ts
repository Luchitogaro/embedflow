export type PreferenceAnalyticsType = "theme" | "locale"

export type PreferenceChangePayload = {
  type: PreferenceAnalyticsType
  value: string
  ts: number
}

const STORAGE_KEY = "embedflow_preference_events_v1"
const MAX_EVENTS = 80

type AnalyticsWindow = Window &
  Partial<{
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
    plausible: (eventName: string, options?: { props?: Record<string, string> }) => void
  }>

function persistLocal(payload: PreferenceChangePayload) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const prev: PreferenceChangePayload[] = raw ? JSON.parse(raw) : []
    const next = [...(Array.isArray(prev) ? prev : []), payload].slice(-MAX_EVENTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota or private mode */
  }
}

/**
 * Records theme/locale changes: optional GTM dataLayer, gtag, Plausible;
 * persists a bounded queue in localStorage; dispatches embedflow:preference-change.
 */
export function recordPreferenceChange(type: PreferenceAnalyticsType, value: string) {
  if (typeof window === "undefined") return

  const payload: PreferenceChangePayload = { type, value, ts: Date.now() }
  const w = window as AnalyticsWindow

  try {
    window.dispatchEvent(new CustomEvent("embedflow:preference-change", { detail: payload }))
  } catch {
    /* ignore */
  }

  if (Array.isArray(w.dataLayer)) {
    w.dataLayer.push({
      event: "embedflow_preference_change",
      preference_type: type,
      preference_value: value,
    })
  }

  if (typeof w.gtag === "function") {
    w.gtag("event", "embedflow_preference_change", {
      preference_type: type,
      preference_value: value,
    })
  }

  if (typeof w.plausible === "function") {
    w.plausible("Embedflow Preference", {
      props: { type, value },
    })
  }

  persistLocal(payload)
}
