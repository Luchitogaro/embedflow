"""
Chunked extraction: small model calls per excerpt → aggregate → one merge to full schema.

Operational notes (TPM / cost):
- Each map call sends one window (up to ``hard_max_chunk`` chars, default 80k) to ``chunk_model``.
- ``map_concurrency`` (default 2) controls parallel map calls; raising it speeds long docs but
  multiplies peak tokens-per-minute and often triggers 429s on standard OpenAI tiers.
- If the document still exceeds ``max_chunks`` after widening windows, the tail is truncated
  (see ``split_text_into_chunks``); logs include ``OPENAI_CHUNK_MAX_COUNT`` for grep.
- Tune via env vars documented in ``worker/.env.example`` and ``README.md`` (worker section).
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from prompts.chunked_extraction import (
    build_chunk_extraction_system,
    build_chunk_extraction_user,
    build_merge_system,
    build_merge_user,
)
from services.extraction_response_guard import validate_chunk_partial, validate_full_extraction

logger = logging.getLogger(__name__)


def max_chars_under_chunk_cap(
    hard_max_chunk: int, max_chunks: int, overlap: int
) -> int:
    """
    Maximum characters the chunked map phase can cover without tail truncation,
    when windows are widened to hard_max_chunk (same formula as split_text_into_chunks).
    """
    max_chunks = max(2, max_chunks)
    hard_max_chunk = max(8_000, hard_max_chunk)
    overlap = max(0, overlap)
    o = max(0, min(overlap, hard_max_chunk // 2))
    step = max(1, hard_max_chunk - o)
    return hard_max_chunk + (max_chunks - 1) * step


def _split_text_core(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Fixed window split; overlap capped to chunk_size // 2."""
    n = len(text)
    overlap = max(0, min(overlap, chunk_size // 2))
    step = max(1, chunk_size - overlap)
    chunks: list[str] = []
    i = 0
    while i < n:
        end = min(i + chunk_size, n)
        chunks.append(text[i:end])
        if end >= n:
            break
        i += step
    return chunks


def _chunk_count(n: int, chunk_size: int, overlap: int) -> int:
    if n == 0:
        return 0
    if chunk_size <= 0:
        return 1
    o = max(0, min(overlap, chunk_size // 2))
    if n <= chunk_size:
        return 1
    step = max(1, chunk_size - o)
    return 1 + (n - chunk_size + step - 1) // step


def split_text_into_chunks(
    text: str,
    chunk_size: int,
    overlap: int,
    *,
    max_chunks: int = 72,
    hard_max_chunk: int = 80000,
    document_id: str = "",
) -> list[str]:
    """
    Split contract text into overlapping windows.

    If the document would produce more than ``max_chunks`` calls, chunk windows are
    widened up to ``hard_max_chunk``. If it still would not fit, the tail is truncated
    (logged) so map-step API cost stays bounded.
    """
    if chunk_size <= 0:
        return [text]

    n = len(text)
    max_chunks = max(2, max_chunks)
    hard_max_chunk = max(8_000, hard_max_chunk)
    overlap = max(0, overlap)
    chunk_size = max(8_000, min(hard_max_chunk, chunk_size))

    def count_for(c: int) -> int:
        return _chunk_count(n, c, overlap)

    working = text
    if count_for(chunk_size) <= max_chunks:
        final_c = chunk_size
    elif count_for(hard_max_chunk) > max_chunks:
        max_len = max_chars_under_chunk_cap(hard_max_chunk, max_chunks, overlap)
        logger.warning(
            "[%s] Contract text is %s chars; truncating to %s chars so chunked extraction "
            "stays within OPENAI_CHUNK_MAX_COUNT=%s (hard_max_chunk=%s). Consider OCR noise or "
            "raising limits if this is a legitimate megadoc.",
            document_id or "—",
            n,
            max_len,
            max_chunks,
            hard_max_chunk,
        )
        working = text[:max_len]
        final_c = hard_max_chunk
    else:
        # Largest window in [chunk_size, hard_max] that stays within max_chunks (minimizes map calls).
        lo, hi = chunk_size, hard_max_chunk
        best = hard_max_chunk
        while lo <= hi:
            mid = (lo + hi) // 2
            if count_for(mid) <= max_chunks:
                best = mid
                lo = mid + 1
            else:
                hi = mid - 1
        final_c = best

    return _split_text_core(working, final_c, overlap)


def _dedupe_str(seq: list[Any], cap: int) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in seq:
        if not isinstance(x, str):
            continue
        s = x.strip()
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
        if len(out) >= cap:
            break
    return out


def _dedupe_risk_flags(rows: list[Any], cap: int) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for x in rows:
        if not isinstance(x, dict):
            continue
        clause = str(x.get("clause") or "").strip()[:200]
        key = clause.lower() or json.dumps(x, sort_keys=True)[:120]
        if key in seen:
            continue
        seen.add(key)
        lvl = str(x.get("risk_level") or "MEDIUM").upper()
        if lvl not in ("HIGH", "MEDIUM", "LOW"):
            lvl = "MEDIUM"
        out.append(
            {
                "clause": str(x.get("clause") or "")[:500],
                "risk_level": lvl,
                "explanation": str(x.get("explanation") or "")[:2000],
                "recommendation": str(x.get("recommendation") or "")[:2000],
            }
        )
        if len(out) >= cap:
            break
    return out


def _dedupe_obligations(rows: list[Any], cap: int) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for x in rows:
        if not isinstance(x, dict):
            continue
        party = str(x.get("party") or "").strip()
        ob = str(x.get("obligation") or "").strip()
        key = f"{party}|{ob}"[:300].lower()
        if not ob or key in seen:
            continue
        seen.add(key)
        out.append({"party": party[:200], "obligation": ob[:500]})
        if len(out) >= cap:
            break
    return out


def _dedupe_parties(rows: list[Any], cap: int) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for x in rows:
        if not isinstance(x, dict):
            continue
        name = str(x.get("name") or "").strip()
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "name": name[:300],
                "role": str(x.get("role") or "")[:200],
            }
        )
        if len(out) >= cap:
            break
    return out


def aggregate_chunk_partials(partials: list[dict]) -> dict:
    """Merge list outputs from chunk calls into one structure for the final merge prompt."""
    key_points: list[str] = []
    risk_flags: list[dict] = []
    obligations: list[dict] = []
    parties: list[dict] = []
    compliance: list[str] = []
    fragments: list[str] = []
    dates_list: list[dict] = []
    pricing_list: list[dict] = []

    for p in partials:
        if not isinstance(p, dict):
            continue
        key_points.extend(p.get("key_points") or [])
        risk_flags.extend(p.get("risk_flags") or [])
        obligations.extend(p.get("obligations") or [])
        parties.extend(p.get("parties") or [])
        compliance.extend(p.get("compliance_exposure_points") or [])
        frag = p.get("essentials_fragment")
        if isinstance(frag, str) and frag.strip():
            fragments.append(frag.strip()[:4000])
        d = p.get("dates")
        if isinstance(d, dict) and any(d.get(k) for k in d):
            dates_list.append(d)
        pr = p.get("pricing")
        if isinstance(pr, dict) and any(pr.get(k) for k in pr):
            pricing_list.append(pr)

    return {
        "source": "chunk_aggregated",
        "essentials_fragments": fragments[:30],
        "key_points": _dedupe_str(key_points, 45),
        "risk_flags": _dedupe_risk_flags(risk_flags, 35),
        "obligations": _dedupe_obligations(obligations, 35),
        "parties": _dedupe_parties(parties, 25),
        "compliance_exposure_points": _dedupe_str(compliance, 30),
        "dates_candidates": dates_list[:15],
        "pricing_candidates": pricing_list[:15],
    }


async def run_chunked_extraction(
    document_id: str,
    text: str,
    locale: str,
    *,
    chunk_size: int,
    overlap: int,
    chunk_model: str,
    merge_model: str,
    call_openai,
    parse_extraction_json,
    normalize_extraction_dict,
    max_chunks: int = 72,
    hard_max_chunk: int = 80000,
    map_concurrency: int = 2,
) -> dict:
    """
    call_openai: async (prompt, system, max_tokens, require_json, model) -> str
    """
    chunks = split_text_into_chunks(
        text,
        chunk_size,
        overlap,
        max_chunks=max_chunks,
        hard_max_chunk=hard_max_chunk,
        document_id=document_id,
    )
    total = len(chunks)
    approx_c = max(len(c) for c in chunks) if chunks else 0
    map_concurrency = max(1, min(32, map_concurrency))
    logger.info(
        "[%s] Chunked extraction: %s chunks (window up to ~%s chars, requested chunk_size=%s, overlap %s, max_chunks=%s, map_concurrency=%s)",
        document_id,
        total,
        approx_c,
        chunk_size,
        overlap,
        max_chunks,
        map_concurrency,
    )

    sem = asyncio.Semaphore(map_concurrency)
    progress_lock = asyncio.Lock()
    completed = 0

    async def map_one(idx: int, chunk: str) -> tuple[int, dict]:
        nonlocal completed
        user = build_chunk_extraction_user(chunk, idx, total, locale)
        system = build_chunk_extraction_system(locale)
        async with sem:
            raw = await call_openai(
                user,
                system=system,
                max_tokens=4096,
                require_json=True,
                model=chunk_model,
            )
        parsed = parse_extraction_json(raw)
        validate_chunk_partial(parsed, context=f"Chunk map {idx + 1}/{total}")
        async with progress_lock:
            completed += 1
            step = max(1, total // 8)
            if completed == 1 or completed == total or completed % step == 0:
                logger.info("[%s] Chunk map progress %s/%s", document_id, completed, total)
        return idx, parsed

    pairs = await asyncio.gather(*(map_one(i, c) for i, c in enumerate(chunks)))
    pairs.sort(key=lambda x: x[0])
    partials = [p for _, p in pairs]

    aggregated = aggregate_chunk_partials(partials)
    merge_user = build_merge_user(aggregated, locale)
    merge_system = build_merge_system(locale)
    merged_raw = await call_openai(
        merge_user,
        system=merge_system,
        max_tokens=8192,
        require_json=True,
        model=merge_model,
    )
    merged_dict = parse_extraction_json(merged_raw)
    validate_full_extraction(merged_dict, context="Chunked merge")
    merged = normalize_extraction_dict(merged_dict)
    logger.info("[%s] Merge step complete", document_id)
    return merged
