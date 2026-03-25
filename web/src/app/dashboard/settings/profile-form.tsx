"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { updateProfile } from "@/app/actions/profile"
import type { Messages } from "@/messages/en"

type ProfileCopy = Pick<
  Messages["settings"],
  | "emailManaged"
  | "displayName"
  | "namePlaceholder"
  | "save"
  | "saving"
  | "saveFailed"
> & { emailLabel: string }

type Props = {
  initialName: string
  email: string
  copy: ProfileCopy
}

export function ProfileForm({ initialName, email, copy }: Props) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const fd = new FormData()
    fd.set("name", name)
    startTransition(async () => {
      try {
        await updateProfile(fd)
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.saveFailed)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">{copy.emailLabel}</label>
        <p className="text-sm text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">{email}</p>
        <p className="text-xs text-muted-foreground mt-1">{copy.emailManaged}</p>
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
          {copy.displayName}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          placeholder={copy.namePlaceholder}
          autoComplete="name"
        />
      </div>
      {error && <p className="text-sm text-red-600 bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? copy.saving : copy.save}
      </Button>
    </form>
  )
}
