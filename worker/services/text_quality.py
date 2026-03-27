"""
Heuristics for PDF text extraction quality (UI disclaimers, not legal signals).
"""

from __future__ import annotations


def assess_extracted_text_quality(text: str, *, truncated_before_analysis: bool = False) -> dict:
    """
    Flag likely noisy or thin extractions (scans, encoding garbage, huge punctuation runs).
    """
    stripped = (text or "").strip()
    n = len(stripped)
    if n == 0:
        return {
            "weak_text": True,
            "char_count": 0,
            "text_sample_ratio_alnumish": 0.0,
            "truncated_before_analysis": truncated_before_analysis,
        }

    sample = stripped[: min(8000, n)]
    sl = len(sample)
    letters = sum(1 for c in sample if c.isalpha())
    digits = sum(1 for c in sample if c.isdigit())
    space = sum(1 for c in sample if c.isspace())
    alnumish = letters + digits + space
    ratio = alnumish / sl if sl else 0.0
    punct = sl - alnumish
    punct_ratio = punct / sl if sl else 0.0

    weak = n < 400 or ratio < 0.5 or punct_ratio > 0.35

    return {
        "weak_text": weak,
        "char_count": n,
        "text_sample_ratio_alnumish": round(ratio, 4),
        "truncated_before_analysis": truncated_before_analysis,
    }
