"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import type { Messages } from "@/messages/en"
import { cn } from "@/lib/utils"

type Copy = Pick<Messages["documentDetail"], "deleteConfirm" | "deleteFailed" | "delete" | "deleting">

type Props = {
  documentId: string
  copy: Copy
  /** Icon-only row action (e.g. documents table) */
  variant?: "default" | "icon"
  /** When already on /documents, only refresh instead of navigating */
  refreshOnly?: boolean
  className?: string
}

export function DocumentDeleteButton({
  documentId,
  copy,
  variant = "default",
  refreshOnly = false,
  className,
}: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onDelete() {
    if (!window.confirm(copy.deleteConfirm)) {
      return
    }
    setPending(true)
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" })
      if (res.ok) {
        if (!refreshOnly) {
          router.push("/dashboard/documents")
        }
        router.refresh()
        return
      }
      const data = await res.json().catch(() => ({}))
      window.alert((data.error as string) || copy.deleteFailed)
    } finally {
      setPending(false)
    }
  }

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50",
          pending && "opacity-50 pointer-events-none",
          className
        )}
        disabled={pending}
        onClick={onDelete}
        aria-label={copy.delete}
        title={copy.delete}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <Button type="button" variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" disabled={pending} onClick={onDelete}>
      <Trash2 className="w-4 h-4 mr-1.5" />
      {pending ? copy.deleting : copy.delete}
    </Button>
  )
}
