import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { shouldShowSourceQualityAlert } from "@/lib/analysis-source-quality"
import type { Messages } from "@/messages/en"

type Copy = Pick<
  Messages["documentDetail"],
  "weakSourceTitle" | "weakSourceTruncated" | "weakSourceLowQuality"
>

export function AnalysisWeakSourceAlert({
  sourceQuality,
  copy,
  className,
}: {
  sourceQuality: unknown
  copy: Copy
  /** e.g. share page uses different surface colors */
  className?: string
}) {
  if (!shouldShowSourceQualityAlert(sourceQuality)) return null

  const o =
    sourceQuality && typeof sourceQuality === "object" && !Array.isArray(sourceQuality)
      ? (sourceQuality as Record<string, unknown>)
      : {}

  const truncated = Boolean(o.truncated_before_analysis)
  const weak = Boolean(o.weak_text)

  return (
    <Alert
      className={
        className ??
        "border-amber-500/40 bg-amber-500/5 text-foreground [&>svg]:text-amber-600"
      }
    >
      <AlertTriangle />
      <AlertTitle>{copy.weakSourceTitle}</AlertTitle>
      <AlertDescription className="space-y-2 text-muted-foreground">
        {truncated ? <p>{copy.weakSourceTruncated}</p> : null}
        {weak ? <p>{copy.weakSourceLowQuality}</p> : null}
      </AlertDescription>
    </Alert>
  )
}
