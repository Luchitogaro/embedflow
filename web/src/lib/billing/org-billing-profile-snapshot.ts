/** Campos de perfil fiscal en `organizations` (Supabase). */
export type OrgBillingProfilePick = {
  name: string
  billing_tax_id_type: string | null
  billing_tax_id: string | null
  billing_legal_name: string | null
  billing_invoice_email: string | null
  billing_phone: string | null
  billing_country: string | null
  billing_address_line: string | null
}

/** Misma regla que `profile_complete` en el snapshot enviado a GarSaaS (BabyFirst). */
export function isEmbedOrgBillingProfileComplete(org: OrgBillingProfilePick): boolean {
  const legalName = org.billing_legal_name?.trim()
  const taxType = org.billing_tax_id_type?.trim()
  const taxId = org.billing_tax_id?.trim()
  const invoiceEmail = org.billing_invoice_email?.trim()
  const phone = org.billing_phone?.trim()
  const address = org.billing_address_line?.trim()
  return Boolean(legalName && taxType && taxId && invoiceEmail && phone && address)
}

/** Snapshot para GarSaaS (`buyer_org.billing_profile_snapshot`). */
export function embedOrgBillingProfileSnapshotForGarsaas(org: OrgBillingProfilePick): Record<string, unknown> {
  const profileComplete = isEmbedOrgBillingProfileComplete(org)

  const legalName = org.billing_legal_name?.trim()
  const taxType = org.billing_tax_id_type?.trim()
  const taxId = org.billing_tax_id?.trim()
  const invoiceEmail = org.billing_invoice_email?.trim()
  const phone = org.billing_phone?.trim()
  const address = org.billing_address_line?.trim()

  const snapshot: Record<string, unknown> = {
    organization_name: legalName || org.name,
    space_display_name: org.name,
    tax_id_type: taxType ?? null,
    tax_id: taxId ?? null,
    invoice_email: invoiceEmail ?? null,
    phone: phone ?? null,
    country: org.billing_country?.trim() || "CO",
    address_line: address ?? null,
    profile_complete: profileComplete,
  }

  if (!profileComplete) {
    snapshot.note =
      "Perfil fiscal incompleto en Embedflow (Ajustes → Facturación → datos para factura electrónica)."
  }

  return snapshot
}
