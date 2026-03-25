"use client"

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Messages } from "@/messages/en"

type Copy = Pick<
  Messages["analysis"],
  "progressLabel" | "stepQueue" | "stepExtract" | "stepAi" | "stepFinalize"
>

type Props = {
  status: "pending" | "processing"
  copy: Copy
}

const STEP_KEYS = ["stepQueue", "stepExtract", "stepAi", "stepFinalize"] as const

export function AnalysisProgressSteps({ status, copy }: Props) {
  const [phase, setPhase] = useState(() => (status === "processing" ? 1 : 0))

  useEffect(() => {
    if (status === "pending") {
      setPhase(0)
      return
    }
    setPhase(1)
    const t1 = window.setTimeout(() => setPhase(2), 4500)
    const t2 = window.setTimeout(() => setPhase(3), 12000)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [status])

  const activeIndex = status === "pending" ? 0 : Math.max(1, phase)

  return (
    <div className="mt-8 max-w-md mx-auto text-left">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{copy.progressLabel}</p>
      <ol className="space-y-3">
        {STEP_KEYS.map((key, i) => {
          const label = copy[key]
          const done = i < activeIndex
          const current = i === activeIndex
          return (
            <li key={key} className="flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-green-500 bg-green-50 text-green-700",
                  current && !done && "border-blue-500 bg-blue-50 text-blue-700",
                  !done && !current && "border-slate-200 bg-white text-slate-400"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : current ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : i + 1}
              </div>
              <div className="pt-0.5">
                <p
                  className={cn(
                    "text-sm font-medium",
                    done || current ? "text-slate-900" : "text-slate-400"
                  )}
                >
                  {label}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
