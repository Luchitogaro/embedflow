export function getWorkerUrl(): string {
  return process.env.WORKER_URL || "http://localhost:8000"
}

export function getWorkerSecret(): string {
  const secret = process.env.WORKER_SHARED_SECRET
  if (!secret) {
    throw new Error("WORKER_SHARED_SECRET is not configured")
  }
  return secret
}

export function workerAuthHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  return {
    ...(extra ?? {}),
    "x-worker-secret": getWorkerSecret(),
  }
}
