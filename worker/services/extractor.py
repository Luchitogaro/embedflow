"""
AI Extractor service — core contract analysis using OpenAI GPT-4o.
"""

import os
import re
import json
import asyncio
import logging
from json import JSONDecodeError
from openai import OpenAI, APIError, APIConnectionError, APITimeoutError, RateLimitError
from services.chunked_pipeline import run_chunked_extraction
from services.pdf_parser import extract_text_from_url
from services.document_text_safety import sanitize_extracted_text
from services.db import update_analysis

logger = logging.getLogger(__name__)

openai_client: OpenAI | None = None

OPENAI_RETRIES = max(1, int(os.getenv("OPENAI_MAX_RETRIES", "5")))
OPENAI_TIMEOUT_SEC = float(os.getenv("OPENAI_CALL_TIMEOUT_SEC", "180"))
# Single-shot path: contracts up to this length use one extraction call (full text, no truncation).
# Longer contracts use chunked map → aggregate → merge (full document, multiple smaller API calls).
OPENAI_EXTRACTION_MAX_INPUT_CHARS = max(
    5_000, int(os.getenv("OPENAI_EXTRACTION_MAX_INPUT_CHARS", "45000"))
)
OPENAI_EXTRACTION_CHUNK_THRESHOLD = max(
    OPENAI_EXTRACTION_MAX_INPUT_CHARS,
    int(os.getenv("OPENAI_EXTRACTION_CHUNK_THRESHOLD", "45000")),
)
OPENAI_PITCH_CONTEXT_CHARS = max(
    1_000, int(os.getenv("OPENAI_PITCH_CONTEXT_CHARS", "30000"))
)
OPENAI_CHUNK_CHAR_SIZE = max(8_000, int(os.getenv("OPENAI_CHUNK_CHAR_SIZE", "52000")))
OPENAI_CHUNK_OVERLAP = max(0, int(os.getenv("OPENAI_CHUNK_OVERLAP", "2000")))
OPENAI_CHUNK_HARD_MAX = max(
    OPENAI_CHUNK_CHAR_SIZE,
    int(os.getenv("OPENAI_CHUNK_HARD_MAX", "80000")),
)
OPENAI_CHUNK_MAX_COUNT = max(2, int(os.getenv("OPENAI_CHUNK_MAX_COUNT", "72")))
# Large chunk windows × high concurrency exhausts TPM quickly (e.g. 6×33k ≈ 200k in one burst).
OPENAI_CHUNK_MAP_CONCURRENCY = max(
    1, min(32, int(os.getenv("OPENAI_CHUNK_MAP_CONCURRENCY", "2")))
)
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
OPENAI_MODEL_CHUNK = os.getenv("OPENAI_MODEL_CHUNK", "gpt-4o-mini")
OPENAI_MODEL_MERGE = os.getenv("OPENAI_MODEL_MERGE", "gpt-4o")


def _parse_openai_max_extracted_chars() -> int:
    """Bound pathological PDF text before chunking; auto = same cover as chunked map cap."""
    from services.chunked_pipeline import max_chars_under_chunk_cap

    raw = os.getenv("OPENAI_MAX_EXTRACTED_CHARS", "auto").strip().lower()
    if raw in ("", "auto"):
        return max_chars_under_chunk_cap(
            OPENAI_CHUNK_HARD_MAX,
            OPENAI_CHUNK_MAX_COUNT,
            OPENAI_CHUNK_OVERLAP,
        )
    if raw in ("0", "off", "none"):
        return 0
    return max(OPENAI_EXTRACTION_CHUNK_THRESHOLD, int(raw))


OPENAI_MAX_EXTRACTED_CHARS = _parse_openai_max_extracted_chars()


_RETRY_AFTER_HINT_RE = re.compile(r"try again in ([\d.]+)\s*s", re.IGNORECASE)


def _retry_wait_seconds(exc: BaseException, attempt: int) -> float:
    """Backoff for retries; use OpenAI's 'try again in Xs' when present (TPM 429)."""
    base = min(12.0, 1.5 * (2**attempt))
    is_rl = isinstance(exc, RateLimitError) or (
        isinstance(exc, APIError) and getattr(exc, "status_code", None) == 429
    )
    if not is_rl:
        return base

    sec: float | None = None
    if isinstance(exc, APIError):
        resp = getattr(exc, "response", None)
        if resp is not None:
            ra = resp.headers.get("retry-after")
            if ra is not None:
                try:
                    sec = float(ra)
                except ValueError:
                    pass
    if sec is None:
        m = _RETRY_AFTER_HINT_RE.search(str(exc))
        if m:
            sec = float(m.group(1))
    if sec is not None:
        # Small cushion so the minute bucket has cleared.
        return min(180.0, max(sec + 2.5, 6.0))
    return max(base, 65.0)


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
        # Retries and 429 backoff are handled in _call_openai (uses API "try again in Xs").
        openai_client = OpenAI(api_key=key, max_retries=0)
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
        raise ValueError(
            "No selectable text in this PDF (extracted "
            f"{len(text)} chars, need at least 50). "
            "This often happens with scanned or image-only PDFs (no text layer). "
            "Options: run OCR (e.g. Adobe, macOS Preview export), save as a text-based PDF, "
            "or upload DOCX/TXT instead."
        )

    if OPENAI_MAX_EXTRACTED_CHARS > 0 and len(text) > OPENAI_MAX_EXTRACTED_CHARS:
        prev = len(text)
        text = text[: OPENAI_MAX_EXTRACTED_CHARS]
        logger.warning(
            "[%s] Extracted text truncated from %s to %s chars (OPENAI_MAX_EXTRACTED_CHARS). "
            "Tail is omitted; often indicates PDF extraction noise or an extreme-length contract.",
            document_id,
            prev,
            OPENAI_MAX_EXTRACTED_CHARS,
        )

    raw_len = len(text)
    logger.info("[%s] Contract text length: %s chars", document_id, raw_len)

    from prompts.extraction import (
        build_extraction_prompt,
        build_extraction_system,
        build_pitch_prompt,
        build_pitch_system,
    )

    if raw_len > OPENAI_EXTRACTION_CHUNK_THRESHOLD:
        logger.info(
            "[%s] Chunked extraction (threshold=%s, chunk=%s, overlap=%s, max_chunks=%s, hard_max=%s, map_concurrency=%s, max_extracted_cap=%s, chunk_model=%s, merge_model=%s)",
            document_id,
            OPENAI_EXTRACTION_CHUNK_THRESHOLD,
            OPENAI_CHUNK_CHAR_SIZE,
            OPENAI_CHUNK_OVERLAP,
            OPENAI_CHUNK_MAX_COUNT,
            OPENAI_CHUNK_HARD_MAX,
            OPENAI_CHUNK_MAP_CONCURRENCY,
            OPENAI_MAX_EXTRACTED_CHARS,
            OPENAI_MODEL_CHUNK,
            OPENAI_MODEL_MERGE,
        )

        async def call_chunked_openai(
            prompt: str,
            *,
            system: str = "",
            max_tokens: int = 4096,
            require_json: bool = False,
            model: str | None = None,
        ) -> str:
            return await _call_openai(
                prompt,
                system=system,
                max_tokens=max_tokens,
                require_json=require_json,
                model=model,
            )

        parsed = await run_chunked_extraction(
            document_id,
            text,
            locale,
            chunk_size=OPENAI_CHUNK_CHAR_SIZE,
            overlap=OPENAI_CHUNK_OVERLAP,
            chunk_model=OPENAI_MODEL_CHUNK,
            merge_model=OPENAI_MODEL_MERGE,
            call_openai=call_chunked_openai,
            parse_extraction_json=_parse_extraction_json,
            normalize_extraction_dict=_normalize_extraction_dict,
            max_chunks=OPENAI_CHUNK_MAX_COUNT,
            hard_max_chunk=OPENAI_CHUNK_HARD_MAX,
            map_concurrency=OPENAI_CHUNK_MAP_CONCURRENCY,
        )
    else:
        extraction_result = await _call_openai(
            prompt=build_extraction_prompt(text, locale),
            system=build_extraction_system(locale),
            max_tokens=8192,
            require_json=True,
            model=OPENAI_MODEL,
        )
        parsed = _normalize_extraction_dict(_parse_extraction_json(extraction_result))

    logger.info(f"[{document_id}] Extraction complete: {list(parsed.keys())}")

    # Step 3: Generate deal pitch (same locale)
    pitch_result = await _call_openai(
        prompt=build_pitch_prompt(text[:OPENAI_PITCH_CONTEXT_CHARS], json.dumps(parsed), locale),
        system=build_pitch_system(locale),
        max_tokens=1024,
        model=OPENAI_MODEL,
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
    *,
    model: str | None = None,
) -> str:
    """Make an OpenAI API call with timeout and transient-error retries (dead-letter = final exception in job)."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    request_kwargs = {
        "model": model or OPENAI_MODEL,
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
            wait = _retry_wait_seconds(e, attempt)
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
