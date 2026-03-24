"""
AI Extractor service — core contract analysis using OpenAI GPT-4o.
"""

import os
import json
import logging
from openai import OpenAI
from services.pdf_parser import extract_text_from_url
from services.db import update_analysis

logger = logging.getLogger(__name__)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def run_analysis(document_id: str, file_url: str, user_id: str) -> dict:
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
    if not text or len(text.strip()) < 50:
        raise ValueError(f"Could not extract text from document (got {len(text)} chars)")

    # Truncate to ~600K chars (well within GPT-4o context)
    text = text[:600_000]
    logger.info(f"[{document_id}] Extracted {len(text)} chars of text")

    # Step 2: Run extraction + risk analysis
    from prompts.extraction import EXTRACTION_PROMPT, PITCH_PROMPT

    extraction_result = await _call_openai(
        prompt=EXTRACTION_PROMPT.format(contract_text=text),
        system="You are Embedflow, an expert contracts analyst. Return ONLY valid JSON.",
        max_tokens=4096,
    )

    parsed = json.loads(extraction_result)
    logger.info(f"[{document_id}] Extraction complete: {list(parsed.keys())}")

    # Step 3: Generate deal pitch
    pitch_result = await _call_openai(
        prompt=PITCH_PROMPT.format(contract_text=text[:30_000], extracted=json.dumps(parsed)),
        system="You are Embedflow, a smart sales rep assistant. Keep pitch to 3-5 sentences max.",
        max_tokens=1024,
    )
    parsed["pitch_text"] = pitch_result.strip()

    # Step 4: Store results
    await update_analysis(document_id=document_id, data=parsed)

    return parsed


async def _call_openai(prompt: str, system: str = "", max_tokens: int = 4096) -> str:
    """Make an OpenAI API call and return the text response."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = openai_client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


async def estimate_tokens(text: str) -> int:
    """Rough estimate: ~4 chars per token."""
    return len(text) // 4
