import { createHash } from "node:crypto"

/**
 * Wompi event authenticity — {@link https://docs.wompi.co/docs/colombia/eventos/}
 * Uses Events secret (Dashboard → Secretos → eventos), NOT private key / integrity.
 */
function getByPath(root: unknown, path: string): unknown {
  const parts = path.split(".")
  let cur: unknown = root
  for (const p of parts) {
    if (cur === null || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

export function verifyWompiEventChecksum(body: Record<string, unknown>, eventsSecret: string): boolean {
  const data = body.data
  const sig = body.signature as Record<string, unknown> | undefined
  const timestamp = body.timestamp
  if (!sig || data === null || typeof data !== "object" || timestamp === undefined) {
    return false
  }
  const properties = sig.properties
  const checksum = sig.checksum
  if (!Array.isArray(properties) || typeof checksum !== "string") {
    return false
  }

  let concat = ""
  for (const prop of properties) {
    if (typeof prop !== "string") continue
    const val = getByPath(data, prop)
    concat += val === undefined || val === null ? "" : String(val)
  }
  concat += String(timestamp)
  concat += eventsSecret

  const digest = createHash("sha256").update(concat, "utf8").digest("hex").toUpperCase()
  return digest === checksum.toUpperCase()
}
