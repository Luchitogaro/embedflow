import type Stripe from "stripe"
import type { Plan } from "@/lib/plan-limits"
import { normalizePlan } from "@/lib/plan-limits"
import { planFromStripePriceId } from "@/lib/stripe-prices"

export function parsePlanMetadata(value: string | null | undefined): Plan | null {
  if (!value) return null
  const p = normalizePlan(value)
  if (p === "free" && value.toLowerCase() !== "free") return null
  return p
}

/**
 * Stripe Price ID (from env STRIPE_PRICE_*) is the source of truth.
 * Metadata is optional fallback; if both exist and disagree, we log and keep the price mapping.
 */
export function resolvePlanFromPriceAndMetadata(
  priceId: string | undefined,
  metadataPlan: string | null | undefined,
  context: string
): Plan | null {
  const fromPrice = planFromStripePriceId(priceId)
  const fromMeta = parsePlanMetadata(metadataPlan)

  if (fromPrice && fromMeta && fromPrice !== fromMeta) {
    console.warn(
      `[stripe] Plan mismatch in ${context}: price→${fromPrice}, metadata→${fromMeta}; using price`
    )
  }

  return fromPrice ?? fromMeta ?? null
}

async function extractSubscriptionPriceId(
  stripe: Stripe,
  full: Stripe.Checkout.Session
): Promise<string | undefined> {
  const sub = full.subscription
  if (sub && typeof sub === "object" && "items" in sub) {
    const stripeSub = sub as Stripe.Subscription
    return stripeSub.items?.data?.[0]?.price?.id
  }
  if (typeof full.subscription === "string") {
    const stripeSub = await stripe.subscriptions.retrieve(full.subscription, {
      expand: ["items.data.price"],
    })
    return stripeSub.items?.data?.[0]?.price?.id
  }
  return undefined
}

/**
 * Load checkout session line items / subscription and resolve plan from Price ID first.
 */
export async function resolvePlanFromCheckoutSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<Plan | null> {
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items.data.price", "subscription"],
  })

  const firstLine = full.line_items?.data?.[0]
  const linePrice = firstLine?.price
  const linePriceId = typeof linePrice === "string" ? linePrice : linePrice?.id

  let priceId = linePriceId
  if (!priceId) {
    priceId = await extractSubscriptionPriceId(stripe, full)
  }

  return resolvePlanFromPriceAndMetadata(
    priceId,
    full.metadata?.plan ?? session.metadata?.plan,
    "checkout.session.completed"
  )
}
