import { cn } from "@/lib/utils"

export function preferenceSegmentTrack(variant: "light" | "dark") {
  return cn(
    "inline-flex w-full max-w-full rounded-lg p-0.5 gap-0.5",
    "motion-safe:transition-[box-shadow,background-color] motion-safe:duration-200 motion-safe:ease-out",
    variant === "dark"
      ? "bg-black/30 ring-1 ring-white/[0.12] shadow-inner"
      : "bg-muted/90 ring-1 ring-border/70 shadow-sm"
  )
}

export function preferenceSegmentButton(variant: "light" | "dark", active: boolean) {
  return cn(
    "flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-2 sm:py-1.5 text-xs font-semibold",
    "motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out",
    "motion-safe:active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    variant === "dark"
      ? active
        ? "bg-white/[0.14] text-white shadow-md ring-1 ring-white/25"
        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
      : active
        ? "bg-background text-foreground shadow-md ring-1 ring-border/90"
        : "text-muted-foreground hover:text-foreground hover:bg-background/60"
  )
}

export function preferenceLabelClass(variant: "light" | "dark") {
  return cn(
    "text-xs font-semibold tracking-wide",
    variant === "dark" ? "text-slate-300" : "text-foreground"
  )
}
