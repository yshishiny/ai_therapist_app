"""
ai_service.py — LLM integration for AI Therapist
──────────────────────────────────────────────────
Provides a single AiService class used by:
  1. POST /patients/{id}/report/generate  (clinical synthesis)
  2. POST /me/ai-chat                     (patient AI companion)

Supports Google Gemini (preferred) and OpenAI GPT as fallback.

Environment variables:
  AI_PROVIDER        — "gemini" (default), "openai", or "claude"
  GEMINI_API_KEY     — Google AI Studio key
  OPENAI_API_KEY     — OpenAI key (used if provider=openai)
  ANTHROPIC_API_KEY  — Anthropic key (used if provider=claude, and always
                       used for structure_assessment_from_text regardless
                       of AI_PROVIDER — that step is Claude-only by design)
  AI_MODEL           — model name override (optional)
"""

from __future__ import annotations

import json
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger("ai_therapist.ai_service")

# ─── Config ───────────────────────────────────────────────────────────────────

_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower()
_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
_CLAUDE_KEY = os.getenv("ANTHROPIC_API_KEY", "")

_GEMINI_MODEL = os.getenv("AI_MODEL", "gemini-2.0-flash")
_OPENAI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")
_CLAUDE_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")

_GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{_GEMINI_MODEL}:generateContent"
_OPENAI_URL = "https://api.openai.com/v1/chat/completions"
_CLAUDE_URL = "https://api.anthropic.com/v1/messages"


class AiService:
    """Thin async wrapper around Gemini / OpenAI chat completions."""

    def __init__(self, provider: Optional[str] = None):
        self._provider = (provider or _PROVIDER).lower()
        # Structuring a long OCR'd document can genuinely take a couple of
        # minutes; this class is currently only called from background
        # tasks (never a user-blocking request), so a generous timeout is safe.
        self._client = httpx.AsyncClient(timeout=240.0)

    # ── Public interface ──────────────────────────────────────────────────────

    async def chat(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ) -> str:
        """Send a system+user message pair and return the assistant reply text."""
        if self._provider == "gemini":
            return await self._gemini(system_prompt, user_message, max_tokens, temperature)
        elif self._provider == "openai":
            return await self._openai(system_prompt, user_message, max_tokens, temperature)
        elif self._provider == "claude":
            return await self._claude(system_prompt, user_message, max_tokens, temperature)
        else:
            raise ValueError(f"Unknown AI_PROVIDER: {self._provider}")

    async def generate_clinical_report(
        self,
        patient_name: str,
        sessions_data: list[dict],
        assessments_data: list[dict],
        homework_data: list[dict],
    ) -> str:
        """
        Generate a full clinical synthesis report in Markdown.
        This is the 'crown jewel' — it reads all context and outputs a
        professional BPS formulation.
        """
        system = """You are a senior clinical psychologist writing a professional 
clinical synthesis report. Write in third person, clinical tone. Use Markdown 
formatting with clear headers. The report MUST include these sections:

# Clinical Synthesis Report

## 1. Identifying Information
## 2. Presenting Problem & History
## 3. Assessment Summary
   - Include all assessment scores, severity bands, and trends
## 4. Session Progress
   - Summarise session themes, breakthroughs, and concerns
## 5. Homework Compliance & Observations
   - Rate engagement, identify patterns
## 6. Biopsychosocial Formulation
   - Biological, Psychological, Social factors
## 7. Risk Assessment
   - Current risk level with supporting evidence
## 8. Treatment Recommendations
   - Next steps, suggested interventions, referral needs
## 9. Clinician Notes

Be thorough, evidence-based, and clinically precise. Reference specific 
assessment scores and dates where available."""

        user_msg = f"""Generate a clinical synthesis report for patient: {patient_name}

### Session Data (last 30 days):
{json.dumps(sessions_data, indent=2, default=str)}

### Assessment Data:
{json.dumps(assessments_data, indent=2, default=str)}

### Homework Data:
{json.dumps(homework_data, indent=2, default=str)}"""

        return await self.chat(
            system_prompt=system,
            user_message=user_msg,
            max_tokens=4096,
            temperature=0.4,
        )

    async def structure_assessment_from_text(self, ocr_text: str) -> dict:
        """Turn raw OCR'd text of a clinician-uploaded document into a
        structured assessment definition. Always uses Claude regardless of
        AI_PROVIDER — this is a structured-extraction task where Claude was
        specifically chosen. Returns a dict with keys:
          - restricted_instrument_match: str | None (flag, not a block —
            e.g. "This text closely matches SCID-II, a commercially
            published/restricted instrument" if recognized, else None)
          - suggested_name: str
          - definition_json: dict (questions/options in this platform's
            existing schema)
          - scoring_rules / interpretation_rules: dict | None
          - low_confidence_notes: str | None (anything the OCR text made
            ambiguous — garbled characters, unclear scale, cut-off items)
        The caller MUST treat this as a draft for human review, never as
        publish-ready content.
        """
        if not _CLAUDE_KEY:
            raise EnvironmentError("ANTHROPIC_API_KEY not set.")

        system = """You structure raw OCR text from a clinician's uploaded assessment \
document into JSON. You do NOT invent, complete, or guess at questions that are not \
present or are illegible in the OCR text -- if the text is truncated, garbled, or a \
question is ambiguous, note it in low_confidence_notes and include only what is \
actually readable. Never pad out a scale to a "typical" item count.

If the content closely matches a well-known commercially published or restricted \
clinical instrument (e.g. MMPI, Beck scales, Hamilton scales, SCID, PDS, Y-BOCS, \
Conners, or similar), set restricted_instrument_match to the name you recognize and \
a short reason -- this is a flag for the clinician to confirm they have rights to \
digitize it, not something you should refuse to structure.

Respond with ONLY a JSON object, no prose, no markdown fences, matching this shape:
{
  "restricted_instrument_match": string | null,
  "suggested_name": string,
  "definition_json": {
    "instructions": string,
    "questions": [{"id": number, "text": string, "type": "single_choice", "options": [{"value": number, "label": string}], "reverse_scored": boolean}]
  },
  "scoring_rules": {"type": "sum" | "sum_with_reverse", "reverse_items": [number], "reverse_formula": string, "min": number, "max": number} | null,
  "interpretation_rules": {"bands": [{"min": number, "max": number, "label": string}]} | null,
  "low_confidence_notes": string | null
}"""

        raw = await self._claude(
            system=system,
            user=f"OCR text follows, extracted from a clinician-uploaded document:\n\n{ocr_text}",
            max_tokens=16000,
            temperature=0.0,
        )
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned
            cleaned = cleaned.rsplit("```", 1)[0].strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error("Claude structuring response was not valid JSON", extra={"raw": raw[:2000]})
            raise RuntimeError("AI structuring step returned non-JSON output.") from e

    # ── Claude backend ────────────────────────────────────────────────────────

    async def _claude(
        self, system: str, user: str, max_tokens: int, temperature: float
    ) -> str:
        if not _CLAUDE_KEY:
            raise EnvironmentError("ANTHROPIC_API_KEY not set.")

        payload = {
            "model": _CLAUDE_MODEL,
            "system": system,
            "messages": [{"role": "user", "content": user}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        resp = await self._client.post(
            _CLAUDE_URL,
            headers={
                "x-api-key": _CLAUDE_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

        try:
            return data["content"][0]["text"]
        except (KeyError, IndexError) as e:
            logger.error("Claude response parse error", extra={"raw": data})
            raise RuntimeError("Failed to parse Claude response.") from e

    # ── Gemini backend ────────────────────────────────────────────────────────

    async def _gemini(
        self, system: str, user: str, max_tokens: int, temperature: float
    ) -> str:
        if not _GEMINI_KEY:
            raise EnvironmentError("GEMINI_API_KEY not set.")

        payload = {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": temperature,
            },
        }
        resp = await self._client.post(
            _GEMINI_URL,
            params={"key": _GEMINI_KEY},
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as e:
            logger.error("Gemini response parse error", extra={"raw": data})
            raise RuntimeError("Failed to parse Gemini response.") from e

    # ── OpenAI backend ────────────────────────────────────────────────────────

    async def _openai(
        self, system: str, user: str, max_tokens: int, temperature: float
    ) -> str:
        if not _OPENAI_KEY:
            raise EnvironmentError("OPENAI_API_KEY not set.")

        payload = {
            "model": _OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        resp = await self._client.post(
            _OPENAI_URL,
            headers={"Authorization": f"Bearer {_OPENAI_KEY}"},
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            logger.error("OpenAI response parse error", extra={"raw": data})
            raise RuntimeError("Failed to parse OpenAI response.") from e
