"""
ai_service.py — LLM integration for AI Therapist
──────────────────────────────────────────────────
Provides a single AiService class used by:
  1. POST /patients/{id}/report/generate  (clinical synthesis)
  2. POST /me/ai-chat                     (patient AI companion)

Supports Google Gemini (preferred) and OpenAI GPT as fallback.

Environment variables:
  AI_PROVIDER        — "gemini" (default) or "openai"
  GEMINI_API_KEY     — Google AI Studio key
  OPENAI_API_KEY     — OpenAI key (used if provider=openai)
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

_GEMINI_MODEL = os.getenv("AI_MODEL", "gemini-2.0-flash")
_OPENAI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")

_GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{_GEMINI_MODEL}:generateContent"
_OPENAI_URL = "https://api.openai.com/v1/chat/completions"


class AiService:
    """Thin async wrapper around Gemini / OpenAI chat completions."""

    def __init__(self, provider: Optional[str] = None):
        self._provider = (provider or _PROVIDER).lower()
        self._client = httpx.AsyncClient(timeout=60.0)

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
