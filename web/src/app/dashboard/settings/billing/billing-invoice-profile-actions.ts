"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getLocale, getMessages } from "@/lib/i18n/server"
import type { Messages } from "@/messages/en"
import {
  createOrgInvoiceProfileSchema,
  translateOrgInvoiceProfileError,
} from "@/lib/billing/org-invoice-profile-schema"

function makeInvoiceProfileTranslator(messages: Messages) {
  const errors = messages.billing.invoiceProfile.errors
  return (key: string) => {
    if (key.startsWith("errors.")) {
      const k = key.slice(7) as keyof typeof errors
      return errors[k] ?? errors.generic
    }
    return key
  }
}

export async function updateOrgBillingInvoiceProfile(formData: FormData) {
  const locale = await getLocale()
  const messages = getMessages(locale)
  const t = makeInvoiceProfileTranslator(messages)
  const inv = messages.billing.invoiceProfile

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) {
    return { error: inv.errors.contextAuth }
  }

  const { data: profile } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.org_id) {
    return { error: inv.errors.contextOrg }
  }
  if (!["owner", "admin"].includes(profile.role ?? "")) {
    return { error: inv.errors.contextAdmin }
  }

  const schema = createOrgInvoiceProfileSchema()
  const raw = {
    billingTaxIdType: formData.get("billingTaxIdType"),
    billingTaxId: formData.get("billingTaxId"),
    billingLegalName: formData.get("billingLegalName"),
    billingInvoiceEmail: formData.get("billingInvoiceEmail"),
    billingPhone: formData.get("billingPhone"),
    billingCountry: formData.get("billingCountry") || "CO",
    billingAddressLine: formData.get("billingAddressLine"),
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { error: translateOrgInvoiceProfileError(t, parsed.error) }
  }

  const data = parsed.data
  const emailLower = data.billingInvoiceEmail.toLowerCase()

  const { error: upErr } = await supabase
    .from("organizations")
    .update({
      billing_tax_id_type: data.billingTaxIdType,
      billing_tax_id: data.billingTaxId,
      billing_legal_name: data.billingLegalName,
      billing_invoice_email: emailLower,
      billing_phone: data.billingPhone,
      billing_country: data.billingCountry,
      billing_address_line: data.billingAddressLine,
    })
    .eq("id", profile.org_id)

  if (upErr) {
    console.error("[billing] update org invoice profile:", upErr.message)
    return { error: inv.errors.saveFailed }
  }

  revalidatePath("/dashboard/settings/billing")
  return { success: true as const }
}
