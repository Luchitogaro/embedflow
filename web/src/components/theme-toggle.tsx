"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { Messages } from "@/messages/en"
import {
  preferenceLabelClass,
  preferenceSegmentButton,
  preferenceSegmentTrack,
} from "@/components/preference-styles"
import { recordPreferenceChange } from "@/lib/preferences-analytics"

type ThemeCopy = Messages["theme"]

const OPTIONS = [
  { value: "light" as const, icon: Sun, labelKey: "light" as const },
  { value: "dark" as const, icon: Moon, labelKey: "dark" as const },
  { value: "system" as const, icon: Monitor, labelKey: "system" as const },
]

export function ThemeToggle({
  copy,
  variant = "light",
  layout = "default",
  /** Show text under each option (e.g. Settings) for clearer affordance */
  labeled = false,
}: {
  copy: ThemeCopy
  variant?: "light" | "dark"
  /** compact: sr-only section label (use when space is tight, e.g. landing nav) */
  layout?: "default" | "compact"
  labeled?: boolean
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div
        className={cn(
          "rounded-lg",
          layout === "compact" ? "h-9 w-[7.25rem]" : labeled ? "h-[4.5rem] w-full max-w-[17rem]" : "h-16 w-full max-w-[15rem]"
        )}
        aria-hidden
      />
    )
  }

  const current = theme ?? "system"

  return (
    <div className={cn("flex w-full max-w-xs flex-col gap-2", layout === "compact" && "max-w-none w-auto")}>
      <span className={cn(preferenceLabelClass(variant), layout === "compact" && "sr-only")}>{copy.label}</span>
      <div role="radiogroup" aria-label={copy.label} className={preferenceSegmentTrack(variant)}>
        {OPTIONS.map(({ value, icon: Icon, labelKey }) => {
          const active = current === value
          const label = copy[labelKey]
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              title={label}
              onClick={() => {
                if (current === value) return
                setTheme(value)
                recordPreferenceChange("theme", value)
              }}
              className={cn(
                preferenceSegmentButton(variant, active),
                labeled ? "min-h-[3.25rem] flex-col gap-1 py-2 sm:min-h-9 sm:flex-row sm:gap-1.5 sm:py-1.5" : "min-h-9 min-w-0 px-2.5"
              )}
            >
              <Icon className={cn("shrink-0", labeled ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-4 w-4")} aria-hidden />
              {labeled ? (
                <span className="max-w-[4.5rem] truncate text-center text-[10px] font-semibold leading-tight sm:max-w-none sm:text-xs">
                  {copy[labelKey]}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
