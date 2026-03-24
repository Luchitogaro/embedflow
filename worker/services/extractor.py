"""
AI Extractor service — core contract analysis using Claude.
"""

import os
import json
import logging
import anthropic
from services.pdf_parser import extract_text_from_url
from services.db import update_analysis, mark_document_done
from prompts.extraction import EXTRACTION_PROMPT, PITCH_PROMPT

logger = logging.getLogger(__name__)

anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


async def run_analysis(document_id: str, file_url: str, user_id: str) -> dict:
    """
    Main analysis pipeline:
    1. Fetch + parse PDF
    2. Extract text
    3. Send to Claude for extraction + risk classification
    4. Generate pitch
    5. Store results in Supabase
    """

    # Step 1: Parse PDF → plain text
    logger.info(f"[{document_id}] Fetching document from {file_url}")
    text = await extract_text_from_url(file_url)
    if not text or len(text.strip()) < 50:
        raise ValueError(f"Could not extract text from document (got {len(text)} chars)")

    # Truncate to Claude context limit (100K tokens ≈ 75K chars, leave room for prompts)
    text = text[:60_000]
    logger.info(f"[{document_id}] Extracted {len(text)} chars of text")

    # Step 2: Run extraction + risk analysis
    extraction_result = await _call_claude(
        prompt=EXTRACTION_PROMPT.format(contract_text=text),
        system="You are Embedflow, an expert contracts analyst. Return ONLY valid JSON.",
        max_tokens=4096,
    )
    
    parsed = json.loads(extraction_result)
    logger.info(f"[{document_id}] Extraction complete: {list(parsed.keys())}")

    # Step 3: Generate deal pitch
    pitch_result = await _call_claude(
        prompt=PITCH_PROMPT.format(contract_text=text[:30_000], extracted=json.dumps(parsed)),
        system="You are Embedflow, a smart sales rep assistant. Keep pitch to 3-5 sentences max.",
        max_tokens=1024,
    )
    parsed["pitch_text"] = pitch_result.strip()

    # Step 4: Store results
    await update_analysis(document_id=document_id, data=parsed)

    return parsed


async def _call_claude(prompt: str, system: str = "", max_tokens: int = 4096) -> str:
    """Make a Claude API call and return the text response."""
    message = anthropic_client.messages.create(
        model="claude-opus-4-20250514",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


async def estimate_tokens(text: str) -> int:
    """Rough estimate: ~4 chars per token."""
    return len(text) // 4
