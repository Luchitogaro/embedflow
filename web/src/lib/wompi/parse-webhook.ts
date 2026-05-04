export type ParsedWompiTransaction = {
  transactionId: string
  reference: string
  status: string
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null
}

export function parseTransactionFromWebhookBody(body: unknown): ParsedWompiTransaction | null {
  const root = asRecord(body)
  if (!root) return null

  const data = asRecord(root.data)
  let tx = data ? (asRecord(data.transaction) ?? asRecord(data)) : null
  if (!tx && data) {
    tx = asRecord(data["object"])
  }
  if (!tx) {
    tx = asRecord(root.transaction)
  }
  if (!tx) return null

  const transactionId = String(tx.id ?? tx["transaction_id"] ?? "")
  const reference = String(tx.reference ?? "")
  const status = String(tx.status ?? "")
  if (!transactionId || !reference || !status) return null

  return { transactionId, reference, status: status.toUpperCase() }
}
