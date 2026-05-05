import type { SupabaseClient } from '@supabase/supabase-js'
import { wompiPlanPeriodDays } from '@/lib/billing-config'

/** Emisor acordado — validar NIT/DV con contador antes de producción fiscal plena. */
const DEFAULT_ISSUER = {
  legal_name: 'GARSaas Colombia S.A.S.',
  tax_id_type: 'NIT',
  tax_id: '902056629',
} as const

type NotifyParams = {
  reference: string
  transactionId: string
  paidAtIso?: string
}

/**
 * Registra el cobro en el servicio central GarSaaS para la cola DIAN (factura electrónica).
 * No lanza: errores solo log para no romper el webhook Wompi.
 */
export async function notifyGarsaasDianBilling(admin: SupabaseClient, params: NotifyParams): Promise<void> {
  const url = process.env.GARSAAS_BILLING_URL?.trim()
  const secret = process.env.GARSAAS_INTERNAL_BILLING_SECRET?.trim()
  if (!url || !secret) {
    console.info(
      '[billing] notify GarSaaS DIAN skipped (set GARSAAS_BILLING_URL + GARSAAS_INTERNAL_BILLING_SECRET)'
    )
    return
  }

  const { data: intent, error: ie } = await admin
    .from('payment_intents')
    .select('reference, amount_in_cents, currency, customer_email, target_plan, org_id')
    .eq('reference', params.reference)
    .maybeSingle()

  if (ie || !intent) {
    console.warn('[billing] notify GarSaaS: intent not found for reference', params.reference, ie)
    return
  }

  const { data: org } = await admin.from('organizations').select('name').eq('id', intent.org_id).maybeSingle()

  const periodStart = new Date()
  const periodEnd = new Date(periodStart)
  periodEnd.setUTCDate(periodEnd.getUTCDate() + wompiPlanPeriodDays())

  const body = {
    schema_version: '1' as const,
    source_app: 'embedflow' as const,
    source_env: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    emitted_at: new Date().toISOString(),
    issuer: DEFAULT_ISSUER,
    payment: {
      provider: 'wompi' as const,
      status: 'APPROVED' as const,
      reference: intent.reference,
      transaction_id: params.transactionId,
      amount_in_cents: intent.amount_in_cents,
      currency: intent.currency || 'COP',
      paid_at: params.paidAtIso,
      customer_email: intent.customer_email ?? undefined,
    },
    subscription_or_product: {
      plan_code: intent.target_plan,
      description_line: `Suscripción Embedflow — plan ${intent.target_plan} — periodo mensual`,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
    },
    buyer_org: {
      external_id: intent.org_id as string,
      billing_profile_snapshot: {
        organization_name: org?.name ?? null,
        note: 'Completar datos tributarios del adquiriente en la app antes de emisión DIAN final.',
      },
    },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    const text = await res.text()
    if (!res.ok) {
      console.error('[billing] GarSaaS DIAN notify failed', res.status, text)
      return
    }
    console.info('[billing] GarSaaS DIAN notify ok', text)
  } catch (e) {
    console.error('[billing] GarSaaS DIAN notify error', e)
  }
}
