/**
 * Envío vía Resend HTTP (sin SDK), alineado con BabyFirst.
 */

const RESEND_API_URL = "https://api.resend.com/emails"

function getEmailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || "Embedflow <noreply@garsaas.io>"
}

export async function sendResendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    console.warn("[email] RESEND_API_KEY no configurado; no se envía el correo.")
    return
  }
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error("[email] Resend error:", res.status, err)
    throw new Error(`Resend: ${res.status} ${err}`)
  }
}
