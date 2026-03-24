"""
PDF parser service — extracts plain text from contract PDFs.
Uses pdfplumber (Python) for server-side parsing.
"""

import os
import logging
import httpx
from io import BytesIO

logger = logging.getLogger(__name__)


async def extract_text_from_url(file_url: str) -> str:
    """
    Download a PDF from Supabase Storage and extract its text.
    Falls back to a simple HTTP fetch for remote URLs.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.get(file_url)
            response.raise_for_status()
            pdf_bytes = response.content
        except Exception as e:
            logger.error(f"Failed to fetch {file_url}: {e}")
            raise ValueError(f"Could not download file: {e}")

    return extract_text_from_bytes(pdf_bytes)


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
