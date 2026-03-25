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


async def update_analysis(document_id: str, user_id: str, data: dict) -> None:
    """Store analysis results in Supabase."""
    client = get_client()

    # Resolve canonical tenant ownership from the document row.
    doc_res = (
        client.table("documents")
        .select("user_id, org_id")
        .eq("id", document_id)
        .limit(1)
        .execute()
    )
    doc_rows = doc_res.data or []
    if not doc_rows:
        raise ValueError(f"Document not found: {document_id}")
    owner_user_id = doc_rows[0].get("user_id")
    owner_org_id = doc_rows[0].get("org_id")
    if owner_user_id and owner_user_id != user_id:
        raise ValueError(
            f"Refusing analysis write: document {document_id} belongs to {owner_user_id}, got {user_id}"
        )

    # Build analysis payload
    analysis_data = {
        "document_id": document_id,
        "user_id": owner_user_id or user_id,
        "org_id": owner_org_id,
        "status": "done",
        "summary": data.get("summary"),
        "parties": data.get("parties", []),
        "dates": data.get("dates", {}),
        "pricing": data.get("pricing", {}),
        "key_terms": data.get("key_terms", {}),
        "risk_flags": data.get("risk_flags", []),
        "pitch_text": data.get("pitch_text"),
        "essentials": data.get("essentials", {}),
        "key_points": data.get("key_points", []),
        "obligations": data.get("obligations", []),
        "tokens_used": data.get("tokens_used", 0),
    }

    # Supabase Python does not support .eq() chained after upsert on this builder.
    # Do explicit update-or-insert by document/user to avoid duplicate rows.
    existing = client.table("analyses").select("id").eq("document_id", document_id).eq("user_id", user_id).limit(1).execute()
    existing_rows = existing.data or []

    if existing_rows:
        analysis_id = existing_rows[0]["id"]
        client.table("analyses").update(analysis_data).eq("id", analysis_id).execute()
    else:
        client.table("analyses").insert(analysis_data).execute()

    # Mark document done and clear any prior error message.
    client.table("documents").update({"status": "done", "error_message": None}).eq("id", document_id).execute()
    logger.info(f"Stored analysis for document {document_id}")

    try:
        from services.email_notify import try_send_analysis_ready_email

        await try_send_analysis_ready_email(document_id, user_id)
    except Exception as e:
        logger.warning("Analysis complete email skipped: %s", e)

    try:
        from services.slack_notify import try_slack_analysis_complete

        await try_slack_analysis_complete(document_id)
    except Exception as e:
        logger.warning("Slack notify skipped: %s", e)


async def mark_document_done(document_id: str) -> None:
    client = get_client()
    client.table("documents").update({"status": "done"}).eq("id", document_id).execute()


async def update_document_status(document_id: str, status: str, error_message: str | None = None) -> None:
    client = get_client()
    update_data = {"status": status}
    if error_message:
        update_data["error_message"] = error_message
    client.table("documents").update(update_data).eq("id", document_id).execute()
    logger.info(f"Updated document {document_id} status to {status}")


async def record_usage(org_id: str, event_type: str, quantity: int = 1) -> None:
    """Record a usage event for billing."""
    client = get_client()
    client.table("usage_events").insert({
        "org_id": org_id,
        "event_type": event_type,
        "quantity": quantity,
    }).execute()
    logger.info(f"Recorded usage: {org_id} {event_type} x{quantity}")
