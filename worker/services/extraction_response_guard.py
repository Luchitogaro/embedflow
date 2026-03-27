"""
Post-parse hardening for model outputs: allowlisted top-level keys and code-fence rejection.

Prompts are soft constraints; this layer fails closed on suspicious structure before DB write.
"""

from __future__ import annotations

import re
from typing import Any

# Full extraction / merge output (matches prompts.extraction.EXTRACTION_SCHEMA top-level keys).
FULL_EXTRACTION_KEYS = frozenset(
    {
        "summary",
        "key_points",
        "essentials",
        "parties",
        "dates",
        "pricing",
        "key_terms",
        "obligations",
        "risk_flags",
    }
)

# Chunk "map" step partial object (prompts.chunked_extraction.CHUNK_PARTIAL_INSTRUCTIONS).
CHUNK_PARTIAL_KEYS = frozenset(
    {
        "key_points",
        "risk_flags",
        "obligations",
        "parties",
        "dates",
        "pricing",
        "essentials_fragment",
        "compliance_exposure_points",
    }
)

# Markdown / common fence variants (model should not emit these inside parsed JSON values).
_FENCE_SNIFF = re.compile(r"```|~~~")


def _iter_string_values(obj: Any) -> Any:
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, list):
        for x in obj:
            yield from _iter_string_values(x)
    elif isinstance(obj, dict):
        for v in obj.values():
            yield from _iter_string_values(v)


def assert_no_code_fences_in_values(obj: Any, *, context: str) -> None:
    """Reject if any string in nested structure looks like a markdown or code fence."""
    for s in _iter_string_values(obj):
        if _FENCE_SNIFF.search(s):
            preview = s.strip().replace("\n", " ")[:120]
            raise ValueError(
                f"{context}: output contains fenced-code markers (rejected). Preview: {preview!r}"
            )


def assert_top_level_keys(d: dict, allowed: frozenset[str], *, context: str) -> None:
    extra = set(d.keys()) - allowed
    if extra:
        raise ValueError(f"{context}: unexpected top-level JSON keys (rejected): {sorted(extra)}")


def validate_full_extraction(parsed: dict, *, context: str = "Extraction") -> None:
    if not isinstance(parsed, dict):
        raise ValueError(f"{context}: expected JSON object")
    assert_top_level_keys(parsed, FULL_EXTRACTION_KEYS, context=context)
    assert_no_code_fences_in_values(parsed, context=context)


def validate_chunk_partial(parsed: dict, *, context: str = "Chunk map") -> None:
    if not isinstance(parsed, dict):
        raise ValueError(f"{context}: expected JSON object")
    assert_top_level_keys(parsed, CHUNK_PARTIAL_KEYS, context=context)
    assert_no_code_fences_in_values(parsed, context=context)


def validate_pitch_text(text: str, *, context: str = "Pitch") -> None:
    if not isinstance(text, str):
        raise ValueError(f"{context}: expected string")
    t = text.strip()
    if not t:
        return
    if _FENCE_SNIFF.search(t):
        preview = t.replace("\n", " ")[:160]
        raise ValueError(f"{context}: fenced code or markdown block detected (rejected): {preview!r}")
