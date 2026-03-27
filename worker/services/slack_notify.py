"""Optional Slack Incoming Webhook when an analysis completes."""

import logging
import os

import httpx

from services.db import get_client
from services.org_plan import effective_org_plan

logger = logging.getLogger(__name__)

_PRO_SLACK_PLANS = frozenset({"pro", "team", "enterprise"})


async def try_slack_analysis_complete(document_id: str) -> None:
    """Post a short message if the org has slack_webhook_url set."""
    client = get_client()
    doc_res = (
        client.table("documents")
        .select("filename, org_id")
        .eq("id", document_id)
        .limit(1)
        .execute()
    )
    rows = doc_res.data or []
    if not rows:
        return
    doc = rows[0]
    org_id = doc.get("org_id")
    if not org_id:
        return

    org_res = (
        client.table("organizations")
        .select("slack_webhook_url, plan, plan_expires_at")
        .eq("id", org_id)
        .limit(1)
        .execute()
    )
    org_rows = org_res.data or []
    if not org_rows:
        return
    org_row = org_rows[0]
    eff = effective_org_plan(org_row.get("plan"), org_row.get("plan_expires_at"))
    if eff not in _PRO_SLACK_PLANS:
        return
    url = org_row.get("slack_webhook_url")
    if not url or not str(url).strip().startswith("https://hooks.slack.com/"):
        return

    filename = doc.get("filename") or "Document"
    base = (os.getenv("APP_URL") or "").rstrip("/")
    link = f"{base}/dashboard/documents/{document_id}" if base else ""
    text = f"Embedflow: analysis ready for *{filename}*."
    if link:
        text += f" {link}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as http:
            r = await http.post(str(url).strip(), json={"text": text})
            r.raise_for_status()
    except Exception as e:
        logger.warning("Slack webhook failed: %s", e)
