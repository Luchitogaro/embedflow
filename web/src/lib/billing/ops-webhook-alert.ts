/**
 * Alertas operativas cuando falla el notify a GarSaaS (cola DIAN).
 * Sin dependencias: POST opcional a Slack/Zapier/Make con JSON.
 *
 * Env:
 * - BILLING_OPS_WEBHOOK_URL — si está vacío, no se envía nada.
 * - BILLING_OPS_WEBHOOK_SECRET — opcional; si existe, Authorization: Bearer …
 */
export type BillingOpsNotifyFailedPayload = {
  event: "garsaas_notify_failed"
  source_app: string
  reference: string
  attempts: number
  error: string
  http_status?: number
  next_retry_at?: string
  emitted_at: string
}

/** Evita spam: primer fallo y escalación en el intento 10. */
export function shouldSendBillingOpsAlert(attempts: number): boolean {
  return attempts === 1 || attempts === 10
}

export async function sendBillingOpsWebhookAlert(payload: BillingOpsNotifyFailedPayload): Promise<void> {
  const url = process.env.BILLING_OPS_WEBHOOK_URL?.trim()
  if (!url) return

  const secret = process.env.BILLING_OPS_WEBHOOK_SECRET?.trim()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (secret) headers.Authorization = `Bearer ${secret}`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.warn("[billing] ops webhook non-OK", res.status, await res.text().catch(() => ""))
    }
  } catch (e) {
    console.warn("[billing] ops webhook error", e instanceof Error ? e.message : e)
  }
}
