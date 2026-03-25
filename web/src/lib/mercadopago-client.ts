import { mercadopagoCurrencyId, mercadopagoUnitPriceForPlan } from "@/lib/mercadopago-prices"
import { mercadopagoPlanPeriodDays } from "@/lib/billing-config"
import type { Plan } from "@/lib/plan-limits"

const MP_API = "https://api.mercadopago.com"

function getAccessToken(): string | null {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  return t || null
}

export type MercadoPagoPreference = {
  id: string
  init_point: string
  sandbox_init_point?: string
}

export async function createCheckoutPreference(params: {
  orgId: string
  plan: Plan
  payerEmail: string
  appUrl: string
}): Promise<{ preference: MercadoPagoPreference; redirectUrl: string }> {
  const token = getAccessToken()
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured")
  }

  const unitPrice = mercadopagoUnitPriceForPlan(params.plan)
  if (unitPrice == null) {
    throw new Error(`Missing MERCADOPAGO_AMOUNT_* env for plan: ${params.plan}`)
  }

  const currencyId = mercadopagoCurrencyId()
  const days = mercadopagoPlanPeriodDays()
  const base = params.appUrl.replace(/\/$/, "")
  const success = `${base}/dashboard/settings/billing?mp=success`
  const failure = `${base}/dashboard/settings/billing?mp=failure`
  const pending = `${base}/dashboard/settings/billing?mp=pending`

  const body = {
    items: [
      {
        id: params.plan,
        title: `Embedflow — plan ${params.plan}`,
        description: `Acceso al plan ${params.plan} por ${days} días`,
        quantity: 1,
        currency_id: currencyId,
        unit_price: unitPrice,
      },
    ],
    payer: { email: params.payerEmail },
    external_reference: `${params.orgId}::${params.plan}`,
    metadata: { org_id: params.orgId, plan: params.plan },
    back_urls: {
      success,
      failure,
      pending,
    },
    auto_return: "approved",
  }

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Mercado Pago preferences error ${res.status}: ${errText.slice(0, 500)}`)
  }

  const preference = (await res.json()) as MercadoPagoPreference
  if (!preference.init_point) {
    throw new Error("Mercado Pago preference missing init_point")
  }

  const useSandbox =
    process.env.MERCADOPAGO_USE_SANDBOX_INIT_POINT === "true" && preference.sandbox_init_point

  return {
    preference,
    redirectUrl: useSandbox ? preference.sandbox_init_point! : preference.init_point,
  }
}

export type MercadoPagoPayment = {
  id: number | string
  status?: string
  external_reference?: string | null
  metadata?: Record<string, unknown> | null
}

export async function fetchPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const token = getAccessToken()
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured")
  }
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Mercado Pago payment GET ${res.status}: ${errText.slice(0, 400)}`)
  }
  return (await res.json()) as MercadoPagoPayment
}
