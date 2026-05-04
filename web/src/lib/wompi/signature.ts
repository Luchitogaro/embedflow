import { createHash } from "crypto"

export function wompiIntegritySignature(params: {
  reference: string
  amountInCents: number
  currency: string
  integritySecret: string
}): string {
  const concat =
    params.reference + String(params.amountInCents) + params.currency + params.integritySecret
  return createHash("sha256").update(concat).digest("hex")
}
