"""
PDF parser service — extracts plain text from contract PDFs.
Uses pdfplumber (Python) for server-side parsing.
"""

import os
import logging
import httpx
from io import BytesIO
from urllib.parse import urlsplit, urlunsplit, quote, unquote

logger = logging.getLogger(__name__)


async def extract_text_from_url(file_url: str) -> str:
    """
    Download a PDF from Supabase Storage and extract its text.
    Supabase Storage requires Authorization header even for public buckets.
    """
    anon_key = os.getenv("SUPABASE_ANON_KEY", "")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    primary_key = service_key or anon_key

    headers = {}
    if primary_key:
        headers["Authorization"] = f"Bearer {primary_key}"
        headers["apikey"] = primary_key

    original_url = _normalize_url(file_url)
    authenticated_url = _to_authenticated_storage_url(original_url)

    # Try authenticated endpoint first (private buckets), then fallback to original URL.
    candidate_urls = [authenticated_url]
    if authenticated_url != original_url:
        candidate_urls.append(original_url)

    async with httpx.AsyncClient(timeout=60.0) as client:
        last_error = None
        for candidate_url in candidate_urls:
            try:
                response = await client.get(candidate_url, headers=headers)
                response.raise_for_status()
                pdf_bytes = response.content
                break
            except Exception as e:
                last_error = e
                logger.warning(f"Failed fetch attempt for {candidate_url}: {e}")
        else:
            logger.error(f"Failed to fetch {file_url}: {last_error}")
            raise ValueError(f"Could not download file: {last_error}")

    return extract_text_from_bytes(pdf_bytes)


def _normalize_url(file_url: str) -> str:
    """Normalize URL path encoding to avoid malformed requests."""
    parsed = urlsplit(file_url)
    normalized_path = quote(unquote(parsed.path), safe="/")
    return urlunsplit((parsed.scheme, parsed.netloc, normalized_path, parsed.query, parsed.fragment))


def _to_authenticated_storage_url(file_url: str) -> str:
    """Convert Supabase public object URL to authenticated endpoint when needed."""
    marker = "/storage/v1/object/public/"
    if marker in file_url:
        return file_url.replace(marker, "/storage/v1/object/authenticated/", 1)
    return file_url


def extract_text_from_bytes(pdf_bytes: bytes) -> str:
    """Extract plain text from PDF bytes using pdfplumber."""
    try:
        import pdfplumber
    except ImportError:
        logger.warning("pdfplumber not installed, using fallback text extraction")
        return _fallback_extract(pdf_bytes)

    text_parts = []
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

    full_text = "\n\n".join(text_parts)
    return full_text


def _fallback_extract(pdf_bytes: bytes) -> str:
    """Minimal fallback — try to extract raw text from PDF stream."""
    import re
    # Very naive: extract strings between stream/endstream
    content = pdf_bytes.decode("latin-1", errors="ignore")
    strings = re.findall(r'\(([^\)]{3,})\)', content)
    return " ".join(strings)
