import Stripe from "stripe"

let stripeSingleton: Stripe | null = null

/** Returns null when STRIPE_SECRET_KEY is not configured (e.g. local dev without billing). */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) return null
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    })
  }
  return stripeSingleton
}
