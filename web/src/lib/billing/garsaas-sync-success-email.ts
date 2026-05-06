import type { SupabaseClient } from "@supabase/supabase-js"
import { sendResendEmail } from "@/lib/email/resend"
import type { GarsaasNotifyResult } from "@/lib/billing/notify-garsaas-dian"

/**
 * Correo al billing_invoice_email de la org cuando GarSaaS confirma factura.
 * `BILLING_GARSAAS_SYNC_SUCCESS_EMAIL=true` y `RESEND_API_KEY`.
 */
export async function maybeSendEmbedflowGarsaasInvoiceSyncedEmail(
  admin: SupabaseClient,
  reference: string,
  outcome: Extract<GarsaasNotifyResult, { kind: "success" }>
): Promise<void> {
  if (outcome.duplicate) return
  if (process.env.BILLING_GARSAAS_SYNC_SUCCESS_EMAIL !== "true") return

  const { data: intent, error: ie } = await admin
    .from("payment_intents")
    .select("org_id")
    .eq("reference", reference)
    .maybeSingle()

  if (ie || !intent?.org_id) return

  const { data: org, error: oe } = await admin
    .from("organizations")
    .select("name, billing_invoice_email")
    .eq("id", intent.org_id)
    .maybeSingle()

  if (oe || !org) return
  const to = org.billing_invoice_email?.trim()
  if (!to) return

  const orgName = org.name?.trim() || "Embedflow"
  await sendResendEmail({
    to,
    subject: `Factura registrada en GarSaaS — ${orgName}`,
    html: `
      <p>Hola,</p>
      <p>El pago con referencia <strong>${reference}</strong> quedó registrado en la cola central de facturación (GarSaaS).</p>
      <p><strong>ID factura:</strong> ${outcome.invoiceId}</p>
      <p>Este aviso se envía al correo fiscal configurado en tu organización cuando la sincronización termina correctamente.</p>
    `,
  })
}
