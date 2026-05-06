/**
 * Optional POST to GarSaaS landing for commercial signup visibility (central dedupe).
 * Requires `GARSAAS_LEADS_URL` + `GARSAAS_INTERNAL_LEADS_SECRET` (same value as on GarSaaS).
 * Call only from server code (Route Handler or Server Action), never from the browser.
 */
export async function notifyGarsaasLeadSignup(params: {
  email: string
  displayName?: string
}): Promise<void> {
  const url = process.env.GARSAAS_LEADS_URL?.trim()
  const secret = process.env.GARSAAS_INTERNAL_LEADS_SECRET?.trim()
  if (!url || !secret) return

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
        'X-Correlation-Id': `embedflow:signup:${params.email}`,
      },
      body: JSON.stringify({
        schema_version: '1',
        source_app: 'embedflow',
        email: params.email,
        display_name: params.displayName,
        registered_at: new Date().toISOString(),
        metadata: {},
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[garsaas] lead signup notify failed', res.status, text.slice(0, 300))
    }
  } catch (e) {
    console.error('[garsaas] lead signup notify error', e)
  }
}
