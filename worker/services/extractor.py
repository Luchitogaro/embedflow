"""
AI Extractor service — core contract analysis using OpenAI GPT-4o.
"""

import os
import json
import asyncio
import logging
from json import JSONDecodeError
from openai import OpenAI, APIError, APIConnectionError, APITimeoutError, RateLimitError
from services.pdf_parser import extract_text_from_url
from services.document_text_safety import sanitize_extracted_text
from services.db import update_analysis

logger = logging.getLogger(__name__)

openai_client: OpenAI | None = None

OPENAI_RETRIES = max(1, int(os.getenv("OPENAI_MAX_RETRIES", "3")))
OPENAI_TIMEOUT_SEC = float(os.getenv("OPENAI_CALL_TIMEOUT_SEC", "180"))


def _openai_transient(exc: BaseException) -> bool:
    if isinstance(exc, (RateLimitError, APIConnectionError, APITimeoutError, asyncio.TimeoutError, TimeoutError)):
        return True
    if isinstance(exc, APIError):
        code = getattr(exc, "status_code", None)
        if code is not None and code in (408, 429, 502, 503, 504):
            return True
    return False

def _get_client() -> OpenAI:
    global openai_client
    if openai_client is None:
        key = os.getenv("OPENAI_API_KEY")
        if not key:
            raise RuntimeError("OPENAI_API_KEY not set")
        openai_client = OpenAI(api_key=key)
    return openai_client


def _normalize_extraction_dict(parsed: dict) -> dict:
    if not isinstance(parsed.get("essentials"), dict):
        parsed["essentials"] = {}
    ess = parsed["essentials"]
    cep = ess.get("compliance_exposure_points")
    if not isinstance(cep, list):
        ess["compliance_exposure_points"] = []
    if not isinstance(parsed.get("key_points"), list):
        parsed["key_points"] = []
    if not isinstance(parsed.get("obligations"), list):
        parsed["obligations"] = []
    parsed.setdefault("parties", [])
    parsed.setdefault("dates", {})
    parsed.setdefault("pricing", {})
    parsed.setdefault("key_terms", {})
    parsed.setdefault("risk_flags", [])
    return parsed


async def run_analysis(
    document_id: str,
    file_url: str,
    user_id: str,
    locale: str = "en",
) -> dict:
    """
    Main analysis pipeline:
    1. Fetch + parse PDF
    2. Extract text
    3. Send to OpenAI for extraction + risk classification
    4. Generate pitch
    5. Store results in Supabase
    """

    # Step 1: Parse PDF → plain text
    logger.info(f"[{document_id}] Fetching document from {file_url}")
    text = await extract_text_from_url(file_url)
    text = sanitize_extracted_text(text)
    if not text or len(text.strip()) < 50:
        raise ValueError(f"Could not extract text from document (got {len(text)} chars)")

    # Truncate to ~600K chars (well within GPT-4o context)
    text = text[:600_000]
    logger.info(f"[{document_id}] Extracted {len(text)} chars of text")

    # Step 2: Run extraction + risk analysis (locale matches app UI language)
    from prompts.extraction import (
        build_extraction_prompt,
        build_extraction_system,
        build_pitch_prompt,
        build_pitch_system,
    )

    extraction_result = await _call_openai(
        prompt=build_extraction_prompt(text, locale),
        system=build_extraction_system(locale),
        max_tokens=8192,
        require_json=True,
    )

    parsed = _normalize_extraction_dict(_parse_extraction_json(extraction_result))
    logger.info(f"[{document_id}] Extraction complete: {list(parsed.keys())}")

    # Step 3: Generate deal pitch (same locale)
    pitch_result = await _call_openai(
        prompt=build_pitch_prompt(text[:30_000], json.dumps(parsed), locale),
        system=build_pitch_system(locale),
        max_tokens=1024,
    )
    parsed["pitch_text"] = pitch_result.strip()

    # Step 4: Store results
    await update_analysis(document_id=document_id, user_id=user_id, data=parsed)

    return parsed


def _parse_extraction_json(raw: str) -> dict:
    """Parse extraction JSON robustly (handles fences/wrappers)."""
    text = (raw or "").strip()
    if not text:
        raise ValueError("Model returned empty extraction response")

    # Handle markdown code fences.
    if text.startswith("```"):
        fence_end = text.rfind("```")
        if fence_end > 3:
            inner = text[3:fence_end].strip()
            if inner.lower().startswith("json"):
                inner = inner[4:].strip()
            text = inner

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except JSONDecodeError:
        pass

    # Fallback: extract first JSON object-looking block.
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = text[start:end + 1]
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except JSONDecodeError as e:
            logger.error(f"JSON fallback parse failed: {e}")

    preview = text[:300].replace("\n", " ")
    raise ValueError(f"Could not parse extraction JSON. Response preview: {preview}")


async def _call_openai(
    prompt: str,
    system: str = "",
    max_tokens: int = 4096,
    require_json: bool = False,
) -> str:
    """Make an OpenAI API call with timeout and transient-error retries (dead-letter = final exception in job)."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    request_kwargs = {
        "model": "gpt-4o",
        "messages": messages,
        "max_tokens": max_tokens,
    }
    if require_json:
        request_kwargs["response_format"] = {"type": "json_object"}

    last_exc: BaseException | None = None

    for attempt in range(OPENAI_RETRIES):
        try:

            def _sync_call() -> str:
                response = _get_client().chat.completions.create(**request_kwargs)
                content = response.choices[0].message.content
                if not content:
                    raise ValueError("Model returned empty content")
                return content

            return await asyncio.wait_for(
                asyncio.to_thread(_sync_call),
                timeout=OPENAI_TIMEOUT_SEC,
            )
        except Exception as e:
            last_exc = e
            if attempt + 1 >= OPENAI_RETRIES or not _openai_transient(e):
                raise
            wait = min(12.0, 1.5 * (2**attempt))
            logger.warning(
                "OpenAI call failed (%s/%s), retry in %.1fs: %s",
                attempt + 1,
                OPENAI_RETRIES,
                wait,
                e,
            )
            await asyncio.sleep(wait)

    assert last_exc is not None
    raise last_exc


async def estimate_tokens(text: str) -> int:
    """Rough estimate: ~4 chars per token."""
    return len(text) // 4
