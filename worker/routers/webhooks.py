"""
Webhook router — receives events from external services (Supabase, Stripe, etc.)
"""

import logging
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()


class StripeWebhook(BaseModel):
    type: str
    data: dict


@router.post("/stripe")
async def stripe_webhook(req: Request):
    """Handle Stripe webhook events."""
    body = await req.body()
    # In production: verify signature with stripe.webhooks.construct_event
    logger.info(f"Stripe webhook received: {body}")
    # Process: customer.subscription.created, invoice.payment_succeeded, etc.
    return {"received": True}


@router.post("/supabase")
async def supabase_webhook(req: Request):
    """Handle Supabase realtime events (e.g., new document uploaded)."""
    body = await req.json()
    logger.info(f"Supabase webhook: {body}")
    return {"received": True}
