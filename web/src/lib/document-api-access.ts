import { NextResponse } from "next/server"
import type { Plan } from "@/lib/plan-limits"
import { planSupportsProgrammaticDocumentApi } from "@/lib/plan-features"

/**
 * Heuristic: real browsers send Fetch Metadata on `fetch()` and top-level navigations.
 * Typical CLI (curl, scripts) omits it — treated as programmatic access (Pro+ only).
 * Determined clients can spoof headers; API keys would be the hard guarantee later.
 */
export function requestLooksLikeBrowserFetch(req: Request): boolean {
  const mode = (req.headers.get("sec-fetch-mode") ?? req.headers.get("Sec-Fetch-Mode") ?? "")
    .toLowerCase()
    .trim()
  const site = (req.headers.get("sec-fetch-site") ?? req.headers.get("Sec-Fetch-Site") ?? "")
    .toLowerCase()
    .trim()
  if (!mode || !site) return false
  if (site === "cross-site") return false
  if (mode !== "cors" && mode !== "navigate") return false
  return (
    site === "same-origin" ||
    site === "same-site" ||
    (site === "none" && mode === "navigate")
  )
}

export function programmaticDocumentApiBlockedResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Programmatic access to this endpoint requires Pro, Team, or Enterprise. Use the web app, or upgrade and retry from scripts or curl.",
      code: "plan_api",
    },
    { status: 403 }
  )
}

/** Block non-browser clients for Free/Starter; always allow Pro+ and browser sessions. */
export function guardProgrammaticDocumentApi(req: Request, effectivePlan: Plan): NextResponse | null {
  if (planSupportsProgrammaticDocumentApi(effectivePlan)) return null
  if (requestLooksLikeBrowserFetch(req)) return null
  return programmaticDocumentApiBlockedResponse()
}
