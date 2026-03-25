import { createHmac, timingSafeEqual } from "crypto"

/**
 * Validate Mercado Pago webhook `x-signature` (HMAC-SHA256 over manifest).
 * @see https://www.mercadopago.com/developers/en/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoWebhookSignature(params: {
  rawBody: string
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
  secret: string
}): boolean {
  if (!params.xSignature || !params.xRequestId || !params.dataId) return false

  let ts = ""
  let v1 = ""
  for (const part of params.xSignature.split(",")) {
    const [k, ...rest] = part.trim().split("=")
    const v = rest.join("=").trim()
    if (k?.trim() === "ts") ts = v
    if (k?.trim() === "v1") v1 = v
  }
  if (!ts || !v1) return false

  const manifest = `id:${params.dataId};request-id:${params.xRequestId};ts:${ts};`
  const expected = createHmac("sha256", params.secret).update(manifest).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(v1, "utf8"))
  } catch {
    return false
  }
}

export function extractMercadoPagoNotificationDataId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const o = body as Record<string, unknown>
  const data = o.data
  if (data && typeof data === "object") {
    const id = (data as Record<string, unknown>).id
    if (typeof id === "string" || typeof id === "number") return String(id)
  }
  const idTop = o.id
  if (typeof idTop === "string" || typeof idTop === "number") return String(idTop)
  return null
}

export function extractMercadoPagoNotificationType(body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const o = body as Record<string, unknown>
  const t = o.type ?? o.topic
  return typeof t === "string" ? t : null
}
