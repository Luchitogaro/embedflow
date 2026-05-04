export function getWompiPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY
}

export function getWompiPrivateKey(): string | undefined {
  return process.env.WOMPI_PRIVATE_KEY
}

export function getWompiIntegritySecret(): string | undefined {
  return process.env.WOMPI_INTEGRITY_SECRET
}

export function isWompiConfiguredForServer(): boolean {
  return Boolean(getWompiPrivateKey() && getWompiIntegritySecret() && getWompiPublicKey())
}
