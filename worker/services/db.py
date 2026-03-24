"""
Database service — reads/writes analyses to Supabase.
Uses service role key (bypasses RLS) for worker access.
"""

import os
import logging
from supabase import create_client, Client

logger = logging.getLogger(__name__)

_supabase_client: Client | None = None


def get_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        _supabase_client = create_client(url, key)
    return _supabase_client


async def update_analysis(document_id: str, data: dict) -> None:
    """Store analysis results in Supabase."""
    client = get_client()

    # Update document status
    client.table("documents").update({"status": "done"}).eq("id", document_id).execute()

    # Upsert analysis record
    analysis_data = {
        "document_id": document_id,
        "status": "done",
        "summary": data.get("summary"),
        "parties": data.get("parties", []),
        "dates": data.get("dates", {}),
        "pricing": data.get("pricing", {}),
        "key_terms": data.get("key_terms", {}),
        "risk_flags": data.get("risk_flags", []),
        "pitch_text": data.get("pitch_text"),
        "tokens_used": data.get("tokens_used", 0),
    }

    client.table("analyses").upsert(analysis_data).eq("document_id", document_id).execute()
    logger.info(f"Stored analysis for document {document_id}")


async def mark_document_done(document_id: str) -> None:
    client = get_client()
    client.table("documents").update({"status": "done"}).eq("id", document_id).execute()


async def record_usage(org_id: str, event_type: str, quantity: int = 1) -> None:
    """Record a usage event for billing."""
    client = get_client()
    client.table("usage_events").insert({
        "org_id": org_id,
        "event_type": event_type,
        "quantity": quantity,
    }).execute()
    logger.info(f"Recorded usage: {org_id} {event_type} x{quantity}")
