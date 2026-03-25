import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import type { Plan } from "@/lib/plan-limits"
import {
  resolvePlanFromCheckoutSession,
  resolvePlanFromPriceAndMetadata,
} from "@/lib/stripe-resolve-plan"

export const runtime = "nodejs"

async function syncOrgFromSubscription(
  orgId: string,
  customerId: string,
  subscriptionId: string | null,
  plan: Plan | null,
  clearSubscription: boolean
) {
  const admin = createServiceRoleClient()
  const updates: Record<string, string | null> = {
    stripe_customer_id: customerId,
  }
  if (clearSubscription) {
    updates.stripe_subscription_id = null
    updates.plan = "free"
  } else if (subscriptionId) {
    updates.stripe_subscription_id = subscriptionId
    if (plan) updates.plan = plan
  }
  await admin.from("organizations").update(updates).eq("id", orgId)
}

async function findOrgIdBySubscriptionId(subscriptionId: string): Promise<string | null> {
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from("organizations")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle()
  return data?.id ?? null
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 })
  }

  const body = await req.text()
  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as import("stripe").Stripe.Checkout.Session
        if (session.mode !== "subscription") break

        const orgId =
          session.metadata?.org_id?.trim() ||
          session.client_reference_id?.trim() ||
          null

        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id

        const plan = await resolvePlanFromCheckoutSession(stripe, session)

        if (orgId && customerId && subscriptionId && plan) {
          await syncOrgFromSubscription(orgId, customerId, subscriptionId, plan, false)
        } else {
          console.error("checkout.session.completed: missing orgId, customer, subscription, or plan", {
            orgId: !!orgId,
            customerId: !!customerId,
            subscriptionId: !!subscriptionId,
            plan: !!plan,
          })
        }
        break
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as import("stripe").Stripe.Subscription
        let orgId: string | null = sub.metadata?.org_id ?? null
        if (!orgId) {
          orgId = await findOrgIdBySubscriptionId(sub.id)
        }
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null
        const priceId = sub.items.data[0]?.price?.id
        const plan = resolvePlanFromPriceAndMetadata(
          priceId,
          sub.metadata?.plan,
          "customer.subscription.updated"
        )
        if (orgId && customerId && plan) {
          const active = sub.status === "active" || sub.status === "trialing"
          if (active) {
            await syncOrgFromSubscription(orgId, customerId, sub.id, plan, false)
          }
        }
        break
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as import("stripe").Stripe.Subscription
        let orgId: string | null = sub.metadata?.org_id ?? null
        if (!orgId) {
          orgId = await findOrgIdBySubscriptionId(sub.id)
        }
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null
        if (orgId && customerId) {
          await syncOrgFromSubscription(orgId, customerId, null, null, true)
        }
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error("Stripe webhook handler error:", e)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
