"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { Messages } from "@/messages/en"

type AnalysisCopy = Messages["analysis"]

type Props = {
  documentId: string
  status: "pending" | "processing" | "error" | "done"
  copy: AnalysisCopy
}

export function AnalysisStatusWatcher({ documentId, status, copy }: Props) {
  const router = useRouter()
  const [isRetrying, startRetry] = useTransition()
  const [retryError, setRetryError] = useState("")

  useEffect(() => {
    if (status !== "pending" && status !== "processing") return

    let cancelled = false

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}`, { cache: "no-store" })
        if (!response.ok || cancelled) return

        const payload = await response.json()
        const nextStatus = payload?.document?.status as string | undefined
        if (!cancelled && (nextStatus === "done" || nextStatus === "error")) {
          router.refresh()
        }
      } catch {
        // Ignore transient polling failures.
      }
    }

    pollStatus()
    const timer = window.setInterval(pollStatus, 3000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [documentId, status, router])

  const enqueueAnalysis = () => {
    setRetryError("")
    startRetry(async () => {
      try {
        const response = await fetch(`/api/analyze/${documentId}/refresh`, {
          method: "POST",
        })

        if (!response.ok) {
          setRetryError(copy.retryError)
          return
        }

        router.refresh()
      } catch {
        setRetryError(copy.retryError)
      }
    })
  }

  return (
    <div className="mt-4 space-y-2">
      {(status === "pending" || status === "processing") && (
        <p className="text-xs text-muted-foreground">{copy.autoRefresh}</p>
      )}

      {(status === "pending" || status === "error") && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isRetrying}
          onClick={enqueueAnalysis}
        >
          {isRetrying ? copy.requeueing : copy.requeue}
        </Button>
      )}

      {retryError && <p className="text-xs text-destructive">{retryError}</p>}
    </div>
  )
}
