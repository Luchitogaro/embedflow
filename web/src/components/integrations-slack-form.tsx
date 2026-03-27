"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { Messages } from "@/messages/en"

type Copy = Messages["integrationsPage"]

export function IntegrationsSlackForm({
  initialUrl,
  copy,
  canEdit,
  slackPlanOk,
}: {
  initialUrl: string
  copy: Copy
  canEdit: boolean
  slackPlanOk: boolean
}) {
  const [url, setUrl] = useState(initialUrl)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const inputId = "integrations-slack-webhook-url"

  async function save(clear: boolean) {
    setPending(true)
    setMessage(null)
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slackWebhookUrl: clear ? null : url }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setMessage(data.error || "Error")
        return
      }
      if (clear) setUrl("")
      setMessage(copy.slackSaved)
    } finally {
      setPending(false)
    }
  }

  if (!canEdit) {
    return <p className="text-sm text-muted-foreground">{copy.billingNote}</p>
  }

  if (!slackPlanOk) {
    return (
      <p className="text-sm text-muted-foreground">
        {copy.slackProPlanRequired}{" "}
        <Link href="/dashboard/settings/billing" className="font-medium text-foreground underline underline-offset-2">
          {copy.slackUpgradeBilling}
        </Link>
      </p>
    )
  }

  return (
    <div className="space-y-3 max-w-xl">
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">{copy.slackUrlLabel}</label>
      <input
        id={inputId}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={copy.slackPlaceholder}
        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        autoComplete="off"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => void save(false)}>
          {copy.slackSave}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending || !url.trim()} onClick={() => void save(true)}>
          {copy.slackClear}
        </Button>
      </div>
      {message ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}
    </div>
  )
}
