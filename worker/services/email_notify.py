"""
Optional transactional email via Resend when analysis completes.
Set RESEND_API_KEY and RESEND_FROM_EMAIL to enable.

RESEND_EMAIL_LOCALE=en|es (default en) for subject/body strings.
"""

from __future__ import annotations

import html
import logging
import os
from typing import TypedDict

import httpx

logger = logging.getLogger(__name__)


class _Strings(TypedDict):
    subject: str
    title: str
    lead: str
    cta: str
    footer: str


_STRINGS: dict[str, _Strings] = {
    "en": {
        "subject": "Analysis ready: {filename}",
        "title": "Your contract analysis is ready",
        "lead": "Embedflow finished analyzing <strong>{filename}</strong>.",
        "cta": "View results",
        "footer": "You received this because a document was analyzed in your Embedflow account.",
    },
    "es": {
        "subject": "Análisis listo: {filename}",
        "title": "Tu análisis de contrato está listo",
        "lead": "Embedflow terminó de analizar <strong>{filename}</strong>.",
        "cta": "Ver resultados",
        "footer": "Recibiste este correo porque se analizó un documento en tu cuenta de Embedflow.",
    },
}


def _locale() -> str:
    loc = os.getenv("RESEND_EMAIL_LOCALE", "en").strip().lower()
    return loc if loc in _STRINGS else "en"


def _build_email(filename: str, doc_url: str) -> tuple[str, str]:
    loc = _locale()
    t = _STRINGS[loc]
    safe_name = html.escape(filename, quote=False)
    subject = t["subject"].format(filename=filename)[:200]
    lead_html = t["lead"].format(filename=safe_name)

    # doc_url must be trusted (we build it); still escape for HTML attribute safety
    safe_url = html.escape(doc_url, quote=True)

    html_body = f"""<!DOCTYPE html>
<html lang="{loc}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:32px 28px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
              <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#0f172a;line-height:1.3;">{t["title"]}</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#475569;">{lead_html}</p>
              <a href="{safe_url}" style="display:inline-block;background-color:#2563eb;color:#ffffff !important;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">{t["cta"]}</a>
              <p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;">{t["footer"]}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, html_body


async def try_send_analysis_ready_email(document_id: str, user_id: str) -> None:
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    from_addr = os.getenv("RESEND_FROM_EMAIL", "").strip()
    if not api_key or not from_addr:
        return

    base = (
        os.getenv("APP_URL")
        or os.getenv("NEXT_PUBLIC_APP_URL")
        or "http://localhost:3000"
    ).rstrip("/")

    from services.db import get_client

    client = get_client()
    user_rows = client.table("users").select("email").eq("id", user_id).limit(1).execute()
    doc_rows = (
        client.table("documents").select("filename").eq("id", document_id).limit(1).execute()
    )
    user_data = (user_rows.data or [{}])[0]
    doc_data = (doc_rows.data or [{}])[0]
    to_email = user_data.get("email")
    filename = doc_data.get("filename") or ("your document" if _locale() == "en" else "tu documento")

    if not to_email:
        logger.warning("No email for user %s; skip analysis notification", user_id)
        return

    doc_url = f"{base}/dashboard/documents/{document_id}"
    subject, html_content = _build_email(filename, doc_url)

    try:
        async with httpx.AsyncClient(timeout=20.0) as http:
            response = await http.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_addr,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                },
            )
        if response.status_code >= 400:
            logger.warning(
                "Resend error %s: %s", response.status_code, response.text[:500]
            )
    except Exception as e:
        logger.warning("Resend request failed: %s", e)
