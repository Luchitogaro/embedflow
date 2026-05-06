"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Messages } from "@/messages/en"
import { BILLING_TAX_ID_TYPES } from "@/lib/billing/org-invoice-profile-schema"
import { updateOrgBillingInvoiceProfile } from "./billing-invoice-profile-actions"
import { cn } from "@/lib/utils"

const HINT_ID = "embedflow-billing-invoice-profile-hint"

const selectClassName = cn(
  "flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50"
)

const inputClassName =
  "w-full px-3.5 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const labelClassName = "block text-sm font-medium text-foreground mb-1.5"

export type EmbedOrgInvoiceProfileInitial = {
  billingTaxIdType: string | null
  billingTaxId: string | null
  billingLegalName: string | null
  billingInvoiceEmail: string | null
  billingPhone: string | null
  billingCountry: string
  billingAddressLine: string | null
}

export function BillingInvoiceProfileForm({
  strings,
  initial,
  auditNote,
}: {
  strings: Messages["billing"]["invoiceProfile"]
  initial: EmbedOrgInvoiceProfileInitial
  auditNote?: string | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [billingTaxIdType, setBillingTaxIdType] = useState(initial.billingTaxIdType ?? "")
  const [billingTaxId, setBillingTaxId] = useState(initial.billingTaxId ?? "")
  const [billingLegalName, setBillingLegalName] = useState(initial.billingLegalName ?? "")
  const [billingInvoiceEmail, setBillingInvoiceEmail] = useState(initial.billingInvoiceEmail ?? "")
  const [billingPhone, setBillingPhone] = useState(initial.billingPhone ?? "")
  const [billingAddressLine, setBillingAddressLine] = useState(initial.billingAddressLine ?? "")

  useEffect(() => {
    setBillingTaxIdType(initial.billingTaxIdType ?? "")
    setBillingTaxId(initial.billingTaxId ?? "")
    setBillingLegalName(initial.billingLegalName ?? "")
    setBillingInvoiceEmail(initial.billingInvoiceEmail ?? "")
    setBillingPhone(initial.billingPhone ?? "")
    setBillingAddressLine(initial.billingAddressLine ?? "")
  }, [initial])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const fd = new FormData(e.currentTarget)
      const result = await updateOrgBillingInvoiceProfile(fd)
      if ("error" in result && result.error) {
        setFormError(result.error)
        return
      }
      toast.success(strings.savedToast)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card id="billing-fiscal-profile" className="scroll-mt-4 rounded-2xl border-primary/10 shadow-sm mb-10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15" aria-hidden>
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle>{strings.cardTitle}</CardTitle>
            <CardDescription id={HINT_ID}>{strings.cardDescription}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-describedby={HINT_ID} suppressHydrationWarning>
          <input type="hidden" name="billingCountry" value={initial.billingCountry || "CO"} />

          {formError ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          ) : null}

          <fieldset className="space-y-4 border-0 p-0">
            <legend className="sr-only">{strings.fieldsetLegend}</legend>

            <div className="space-y-2">
              <label htmlFor="billingTaxIdType" className={labelClassName}>
                {strings.taxIdTypeLabel}
              </label>
              <select
                id="billingTaxIdType"
                name="billingTaxIdType"
                required
                value={billingTaxIdType}
                onChange={(e) => setBillingTaxIdType(e.target.value)}
                className={selectClassName}
                autoComplete="off"
              >
                <option value="">{strings.taxIdTypePlaceholder}</option>
                {BILLING_TAX_ID_TYPES.map((code) => (
                  <option key={code} value={code}>
                    {(strings as unknown as Record<string, string>)[`taxIdType_${code}`]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="billingTaxId" className={labelClassName}>
                {strings.taxIdLabel}
              </label>
              <input
                id="billingTaxId"
                name="billingTaxId"
                value={billingTaxId}
                onChange={(e) => setBillingTaxId(e.target.value)}
                required
                maxLength={32}
                className={cn(inputClassName, "rounded-xl")}
                autoComplete="off"
                inputMode="numeric"
                aria-describedby="tax-id-hint"
              />
              <p id="tax-id-hint" className="text-xs text-muted-foreground">
                {strings.taxIdHint}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="billingLegalName" className={labelClassName}>
                {strings.legalNameLabel}
              </label>
              <input
                id="billingLegalName"
                name="billingLegalName"
                value={billingLegalName}
                onChange={(e) => setBillingLegalName(e.target.value)}
                required
                maxLength={200}
                className={cn(inputClassName, "rounded-xl")}
                autoComplete="organization"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="billingInvoiceEmail" className={labelClassName}>
                {strings.invoiceEmailLabel}
              </label>
              <input
                id="billingInvoiceEmail"
                name="billingInvoiceEmail"
                type="email"
                value={billingInvoiceEmail}
                onChange={(e) => setBillingInvoiceEmail(e.target.value)}
                required
                maxLength={255}
                className={cn(inputClassName, "rounded-xl")}
                autoComplete="email"
                inputMode="email"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="billingPhone" className={labelClassName}>
                {strings.phoneLabel}
              </label>
              <input
                id="billingPhone"
                name="billingPhone"
                type="tel"
                value={billingPhone}
                onChange={(e) => setBillingPhone(e.target.value)}
                required
                maxLength={40}
                className={cn(inputClassName, "rounded-xl")}
                autoComplete="tel"
                inputMode="tel"
                placeholder={strings.phonePlaceholder}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="billingAddressLine" className={labelClassName}>
                {strings.addressLabel}
              </label>
              <input
                id="billingAddressLine"
                name="billingAddressLine"
                value={billingAddressLine}
                onChange={(e) => setBillingAddressLine(e.target.value)}
                required
                maxLength={255}
                className={cn(inputClassName, "rounded-xl")}
                autoComplete="street-address"
              />
            </div>
          </fieldset>

          <p className="text-xs text-muted-foreground">{strings.countryNote}</p>

          {auditNote ? (
            <p className="text-xs text-muted-foreground/90" role="status">
              {auditNote}
            </p>
          ) : null}

          <Button type="submit" className="w-full rounded-xl" disabled={saving}>
            {saving ? strings.saving : strings.save}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
