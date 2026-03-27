# Evaluation suite (analysis quality)

Manual regression harness until automated scoring exists. **Not legal review** — product QA only.

## 1. Fixture set

Place **non-confidential** sample contracts under `eval/fixtures/` (gitignored patterns: `*.pdf`, `*.docx` in that folder so you do not commit client data).

Suggested mix:

| # | Type | What to check |
|---|------|----------------|
| A | Clean digital PDF (10–30 pages) | Parties, dates, pricing, key terms populated; few false risk flags |
| B | Long contract (>50k chars extracted) | Chunked path runs; no crash; merge coherent; `source_quality.truncated` if tail dropped |
| C | Scan / image-only PDF | Worker error *or* OCR’d replacement: user sees clear failure or acceptable text |
| D | Noisy export (encoding garbage) | `weak_text` banner; model prefers nulls over hallucinated clauses |
| E | DOCX / TXT | Same as A |

## 2. Pass / fail criteria

For each fixture after a **fresh analysis** (`status = done`):

1. **Schema**: JSON fields parse; no empty executive summary *unless* source text is under 50 chars / failed extraction.
2. **Hallucinations**: Spot-check 3–5 claims against PDF text (clause numbers, party names, amounts).
3. **Risk flags**: Each HIGH/MEDIUM has a clause reference or clear “unclear” wording; no duplicate spam.
4. **Locales**: Re-run with UI `en`, `es`, `pt`; summaries readable in target language; enums stay HIGH/MEDIUM/LOW in JSON.
5. **Share + dashboard**: Same `source_quality` banner on document page and `/share/[token]` when applicable.

Record results in a spreadsheet or issue template (date, model names, pass/fail notes).

## 3. i18n parity (release checklist)

When adding UI strings:

1. Add keys to `web/src/messages/en.ts`, `es.ts`, and `pt.ts` under the same object path.
2. Grep the new key name across `web/src/messages/` — expect **three** hits.

## 4. Legal / commercial prompt review

Schedule with counsel **outside** this repo: enum labels, disclaimer copy, and “sales pitch” tone. Tracked as an external task in `docs/PENDING_INTEGRATION.md` §6.
