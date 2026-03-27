"""
Mitigations for prompt injection via PDF-extracted text.

We cannot reliably "filter" adversarial prose (arms race). Defense is layered:
1. Sanitize transport artifacts (NUL, odd control chars) so prompts stay well-formed.
2. Wrap untrusted body in rare delimiters so the model can separate instructions from data.
3. System prompts state explicitly that delimited regions are untrusted and must not be obeyed as instructions.
4. Prompts in ``prompts/output_policy.py`` forbid generating code/scripts/SQL/software steps; outputs stay JSON or plain pitch text (not a substitute for deterministic guardrails).

See: https://owasp.org/www-community/attacks/PromptInjection
"""

from __future__ import annotations

# Rare ASCII markers; collision with real contracts is extremely unlikely.
UNTRUSTED_DOC_BEGIN = "[[[EMBEDFLOW_UNTRUSTED_DOCUMENT_BEGIN]]]"
UNTRUSTED_DOC_END = "[[[EMBEDFLOW_UNTRUSTED_DOCUMENT_END]]]"
UNTRUSTED_EXCERPT_BEGIN = "[[[EMBEDFLOW_UNTRUSTED_EXCERPT_BEGIN]]]"
UNTRUSTED_EXCERPT_END = "[[[EMBEDFLOW_UNTRUSTED_EXCERPT_END]]]"


def sanitize_extracted_text(text: str) -> str:
    """Remove bytes/control characters that should not reach the model; normalize newlines."""
    if not text:
        return ""
    # PDF streams sometimes embed NUL; strip so prompts and JSON stay stable.
    text = text.replace("\x00", "")
    text = text.replace("\ufeff", "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    out: list[str] = []
    for ch in text:
        o = ord(ch)
        if o in (9, 10):  # tab, newline
            out.append(ch)
        elif o < 32 or o == 127:
            continue
        else:
            out.append(ch)
    return "".join(out)


def wrap_untrusted_full_document(body: str) -> str:
    return f"{UNTRUSTED_DOC_BEGIN}\n{body}\n{UNTRUSTED_DOC_END}"


def wrap_untrusted_excerpt(body: str) -> str:
    return f"{UNTRUSTED_EXCERPT_BEGIN}\n{body}\n{UNTRUSTED_EXCERPT_END}"
