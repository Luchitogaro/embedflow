"use client"

import { useEffect, useState } from "react"
import { Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Messages } from "@/messages/en"

const STORAGE_KEY = "embedflow_dashboard_onboarding_v1"

type Copy = Messages["dashboard"]["onboarding"]

export function DashboardOnboardingBanner({ copy }: { copy: Copy }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !window.localStorage.getItem(STORAGE_KEY)) {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className={cn(
        "mb-6 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/80 p-4 sm:p-5 shadow-sm"
      )}
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border border-blue-100">
          <Sparkles className="h-5 w-5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900 sm:text-base">{copy.title}</h2>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-md p-1 text-slate-400 hover:bg-white/80 hover:text-slate-600"
              aria-label={copy.dismiss}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">{copy.intro}</p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-700 sm:text-sm">
            <li className="flex gap-2">
              <span className="font-semibold text-blue-600">1.</span>
              <span>{copy.step1}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-blue-600">2.</span>
              <span>{copy.step2}</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-blue-600">3.</span>
              <span>{copy.step3}</span>
            </li>
          </ul>
          <Button type="button" size="sm" className="mt-4" onClick={dismiss}>
            {copy.dismiss}
          </Button>
        </div>
      </div>
    </div>
  )
}
