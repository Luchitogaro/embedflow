/** Backoff en ms tras cada intento fallido (1-indexed dentro del cron). */
const DELAY_SECONDS = [30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 86400] as const

export function nextGarsaasRetryDelayMs(attemptAfterThisFailure: number): number {
  const i = Math.min(Math.max(attemptAfterThisFailure - 1, 0), DELAY_SECONDS.length - 1)
  return DELAY_SECONDS[i]! * 1000
}
