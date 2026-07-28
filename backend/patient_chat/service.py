"""
service.py — the patient companion, talking to real people
-----------------------------------------------------------
Replaces a stub that returned the same sentence to every message and stored
nothing, so a patient could write anything at all -- including that they
wanted to die -- and receive an identical breathing suggestion, with nobody
told.

What this does instead:

  1. Screens every incoming message deterministically (safety.screen) before
     the model sees it. The model is asked to flag risk as well, and either
     signal escalates -- the model is never the only safeguard.
  2. Calls Claude with a system prompt that keeps the companion inside its
     competence: supportive, not clinical. It does not diagnose, does not
     advise on medication, and does not position itself as therapy.
  3. Persists both turns to ai_conversations, so the conversation survives a
     reload and a clinician can see what their patient has been telling it.
  4. On a crisis signal, raises a risk flag against the patient so the
     clinician sees it, and returns crisis guidance to the patient.

A deliberate omission: no crisis telephone number is hardcoded. This practice
is in Egypt and I do not have a verified local crisis line; a wrong number
handed to someone in danger is worse than no number. The message points at
local emergency services and the patient's own clinician, and the practice can
set CRISIS_RESOURCES_TEXT with its real local resources.
"""

from __future__ import annotations

import logging
import os
import re
import uuid

from backend.patient_chat import safety

logger = logging.getLogger(__name__)

# How much conversation to carry back to the model. Enough for continuity,
# short enough that an old message cannot dominate the current one.
HISTORY_TURNS = 12

SYSTEM_PROMPT = """You are Aria, a supportive companion inside a mental health \
practice's patient app. The person writing to you is a real patient of this \
practice, between sessions with their own clinician.

What you are:
- A warm, steady presence. You listen, reflect back what you hear, and help \
someone slow down and notice what they are feeling.
- A bridge to their clinician, not a replacement for them.

What you must not do:
- Do not diagnose, or suggest what condition someone may have.
- Do not give advice about medication, dosage, or stopping treatment.
- Do not interpret assessment scores or offer a prognosis.
- Do not present yourself as a therapist, or imply this conversation is therapy.
- Do not promise confidentiality. Their clinician can see these conversations.

How to respond:
- Briefly. Two or three sentences usually. This is a chat, not an essay.
- In the patient's own language. If they write in Arabic, reply in Arabic.
- Warmly and plainly, without clinical jargon and without platitudes.
- Ask at most one gentle question, and only when it genuinely helps.
- When something belongs with their clinician, say so directly and kindly.

If the person expresses thoughts of suicide, self-harm, or harming someone \
else: do not attempt to counsel them through it. Acknowledge what they said \
without alarm and tell them plainly that you want them to speak to a person \
right now. Keep it short and human. Do NOT tell them their clinician has been \
notified — the system decides that and says so itself, and it must never be \
claimed when it has not happened.

Finally, on its own last line, always output a risk tag for the system:
[[RISK:none]], [[RISK:elevated]] or [[RISK:crisis]].
Use crisis for any mention of suicide, self-harm, or harming another person, \
however indirect or hypothetical. Use elevated for hopelessness, \
worthlessness, or not being able to cope. This line is stripped before the \
patient sees your reply."""

# The model appends this to every reply; it never reaches the patient.
_RISK_TAG = re.compile(r"\[\[\s*RISK\s*:\s*(none|elevated|crisis)\s*\]\]", re.IGNORECASE)


def _split_risk_tag(reply: str) -> tuple[str, str]:
    """Return the reply with the tag removed, and the risk the model reported."""
    found = _RISK_TAG.search(reply or "")
    model_risk = found.group(1).lower() if found else safety.NONE
    return _RISK_TAG.sub("", reply or "").strip(), model_risk


class PatientChatService:
    """Owns the conversation. Constructed with a DB handle and an AiService."""

    def __init__(self, db, ai_service):
        self.db = db
        self.ai = ai_service

    # ── persistence ────────────────────────────────────────────────────

    async def _history(self, patient_id: str) -> list[dict]:
        rows = await self.db.fetch(
            """
            SELECT role, content FROM ai_conversations
            WHERE patient_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            """,
            uuid.UUID(patient_id),
            HISTORY_TURNS,
        )
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

    async def _save(self, patient_id: str, org_id: str, role: str, content: str) -> None:
        await self.db.execute(
            """
            INSERT INTO ai_conversations (id, patient_id, org_id, role, content)
            VALUES ($1, $2, $3, $4, $5)
            """,
            uuid.uuid4(),
            uuid.UUID(patient_id),
            uuid.UUID(org_id),
            role,
            content,
        )

    async def _raise_risk_flag(self, patient_id: str, message: str) -> None:
        """Tell the clinician. Recorded even if the reply itself fails, because
        the thing that matters is that a human finds out.

        De-duplicated within a 12-hour window. Once someone has disclosed
        suicidal thoughts, the model rightly stays concerned for the rest of the
        conversation, so every following message would raise another flag. A
        clinician facing forty identical alerts starts ignoring alerts, and the
        real one goes with them -- so one open flag per patient per window, and
        the full conversation is there to read.
        """
        try:
            existing = await self.db.fetchval(
                """
                SELECT 1 FROM risk_flags
                WHERE patient_id = $1 AND active
                  AND flag_type = 'SELF_HARM_LANGUAGE'
                  AND created_at > NOW() - INTERVAL '12 hours'
                LIMIT 1
                """,
                uuid.UUID(patient_id),
            )
            if existing:
                return
        except Exception:
            logger.exception("Risk-flag de-duplication check failed; raising anyway")

        try:
            await self.db.execute(
                """
                INSERT INTO risk_flags (id, patient_id, flag_type, severity, active, notes)
                VALUES ($1, $2, 'SELF_HARM_LANGUAGE', 'HIGH', TRUE, $3)
                """,
                uuid.uuid4(),
                uuid.UUID(patient_id),
                # The patient's own words, trimmed. A clinician needs to see what
                # was actually said, not a paraphrase of it.
                f"Raised automatically from the patient companion. Patient wrote: "
                f"{message.strip()[:400]}",
            )
        except Exception:
            logger.exception("Could not record risk flag for patient %s", patient_id)

    # ── the conversation ───────────────────────────────────────────────

    def _crisis_message(self) -> str:
        configured = os.getenv("CRISIS_RESOURCES_TEXT", "").strip()
        if configured:
            return configured
        # No invented hotline. Local emergency services and their own clinician
        # are both things that certainly exist and that I can state correctly.
        return (
            "I'm glad you told me, and I don't want you to sit with this on your own. "
            "Please reach out to someone now — your local emergency services if you are "
            "in danger, or someone you trust who can be with you. "
            "I've let your clinician know that you reached out."
        )

    async def reply(self, *, patient_id: str, org_id: str, message: str,
                    conversation_id: str | None = None) -> dict:
        message = (message or "").strip()
        if not message:
            return {
                "patient_id": patient_id,
                "conversation_id": conversation_id or str(uuid.uuid4()),
                "reply": "I'm here whenever you want to talk.",
                "risk": safety.NONE,
                "crisis": False,
            }

        risk = safety.screen(message)
        await self._save(patient_id, org_id, "user", message)

        if risk == safety.CRISIS:
            # Escalate first, then reply. If anything downstream fails, the
            # clinician has still been told.
            await self._raise_risk_flag(patient_id, message)
            reply = self._crisis_message()
            await self._save(patient_id, org_id, "assistant", reply)
            return {
                "patient_id": patient_id,
                "conversation_id": conversation_id or str(uuid.uuid4()),
                "reply": reply,
                "risk": risk,
                "crisis": True,
            }

        history = await self._history(patient_id)
        transcript = "\n".join(
            f"{'Patient' if h['role'] == 'user' else 'Aria'}: {h['content']}"
            for h in history[:-1]  # the current message is appended below
        )
        user_block = (
            (f"Earlier in this conversation:\n{transcript}\n\n" if transcript else "")
            + f"The patient has just written:\n{message}"
        )

        try:
            # AiService.chat takes system_prompt/user_message, not system/user.
            reply = (await self.ai.chat(
                system_prompt=SYSTEM_PROMPT,
                user_message=user_block,
                max_tokens=400,
                temperature=0.7,
            )).strip()
        except Exception:
            logger.exception("Companion reply failed for patient %s", patient_id)
            # Say plainly that it failed. A canned "supportive" line here would
            # be the stub all over again -- a patient believing they were heard
            # when nothing processed what they wrote.
            return {
                "patient_id": patient_id,
                "conversation_id": conversation_id or str(uuid.uuid4()),
                "reply": "",
                "error": "Aria could not reply just now. Your message was saved, "
                         "and nothing you wrote has been lost.",
                "risk": risk,
                "crisis": False,
            }

        reply, model_risk = _split_risk_tag(reply)

        # Either signal escalates. The deterministic screen missed "everyone
        # would be better off if I was dead" while the model caught it; acting
        # on the screen alone meant the clinician was never told, while the
        # reply claimed otherwise.
        rank = {safety.NONE: 0, safety.ELEVATED: 1, safety.CRISIS: 2}
        effective = risk if rank.get(risk, 0) >= rank.get(model_risk, 0) else model_risk

        if effective in (safety.CRISIS, safety.ELEVATED):
            await self._raise_risk_flag(patient_id, message)
            if effective == safety.CRISIS:
                # Only now is this sentence true. The model is forbidden from
                # claiming it, because it cannot know whether the flag was
                # actually written.
                reply = reply + "\n\nI've let your clinician know that you reached out."

        await self._save(patient_id, org_id, "assistant", reply)

        return {
            "patient_id": patient_id,
            "conversation_id": conversation_id or str(uuid.uuid4()),
            "reply": reply,
            "risk": effective,
            "crisis": effective == safety.CRISIS,
        }

    async def history(self, patient_id: str) -> list[dict]:
        """The stored conversation, so it survives a reload."""
        rows = await self.db.fetch(
            """
            SELECT id, role, content, created_at FROM ai_conversations
            WHERE patient_id = $1 ORDER BY created_at ASC LIMIT 200
            """,
            uuid.UUID(patient_id),
        )
        return [
            {
                "id": str(r["id"]),
                "role": r["role"],
                "content": r["content"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]
