const WOMPI_CHECKOUT_BASE = "https://checkout.wompi.co/p/"

export function buildWompiWebCheckoutUrl(params: {
  publicKey: string
  currency: string
  amountInCents: number
  reference: string
  integritySignature: string
  redirectUrl: string
}): string {
  const search = new URLSearchParams()
  search.append("public-key", params.publicKey)
  search.append("currency", params.currency)
  search.append("amount-in-cents", String(params.amountInCents))
  search.append("reference", params.reference)
  search.append("signature:integrity", params.integritySignature)
  search.append("redirect-url", params.redirectUrl)
  return `${WOMPI_CHECKOUT_BASE}?${search.toString()}`
}
