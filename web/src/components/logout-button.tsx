"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Variant = "sidebar" | "mobile" | "settings"

export function LogoutButton({
  label,
  variant = "settings",
  className,
}: {
  label: string
  variant?: Variant
  className?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onLogout() {
    setPending(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (variant === "sidebar" || variant === "mobile") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => void onLogout()}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
          "text-slate-400 hover:bg-white/5 hover:text-white",
          pending && "pointer-events-none opacity-50",
          className
        )}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {label}
      </button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-2 text-slate-700", className)}
      disabled={pending}
      onClick={() => void onLogout()}
    >
      <LogOut className="h-4 w-4" />
      {label}
    </Button>
  )
}
