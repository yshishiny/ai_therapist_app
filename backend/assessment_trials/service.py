"""Trial Mode state machine and enforcement gates.

Every rule that protects a publisher's content lives here rather than in
the UI, so that a client that ignores the banners still cannot administer
an expired trial, exceed an administration cap, or push a synthetic
instrument at a real patient.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

TRIAL_BANNER = "TRIAL MODE — Not licensed for routine clinical use."
SYNTHETIC_BANNER = (
    "SYNTHETIC DEMONSTRATION — This is not the authentic instrument and "
    "cannot be used for diagnosis or clinical decisions."
)

# States an instrument can occupy.
RESERVED = "RESERVED"
EDUCATIONAL_PREVIEW = "EDUCATIONAL_PREVIEW"
TRIAL = "TRIAL"
LICENSED_ACTIVE = "LICENSED_ACTIVE"
AVAILABLE = "AVAILABLE"  # genuinely free / public-domain instruments


class TrialError(ValueError):
    """A trial rule was violated. Surfaced to the caller as a 4xx."""


def effective_today(now: datetime | None = None) -> date:
    """The date to judge expiry against.

    expiry_date is a calendar date, but the server runs in UTC while the
    clinic does not. A practice in Cairo is already on the 28th while UTC
    still reads the 27th, so comparing against UTC alone would keep a
    lapsed trial usable for several more hours locally.

    For a licensing gate the safe direction is to end access early rather
    than permit unlicensed use, so we compare against the furthest-ahead
    civil date in use anywhere (UTC+14). The cost is that a practice west
    of UTC may lose up to ~22h of its window; that trade is deliberate.
    """
    now = now or datetime.now(timezone.utc)
    return (now + timedelta(hours=14)).date()


def days_remaining(expiry: date, today: date | None = None) -> int:
    today = today or effective_today()
    return max(0, (expiry - today).days)


def administrations_remaining(row: dict[str, Any]) -> int:
    return max(0, int(row.get("maximum_administrations") or 0) - int(row.get("administrations_used") or 0))


def is_expired(row: dict[str, Any], today: date | None = None) -> bool:
    """A trial is dead when its date passes OR its administration cap is
    reached -- whichever comes first."""
    today = today or effective_today()
    if row.get("status") in ("expired", "revoked", "converted"):
        return True
    if row.get("expiry_date") and row["expiry_date"] < today:
        return True
    return administrations_remaining(row) <= 0


def banner_for(row: dict[str, Any]) -> str:
    return SYNTHETIC_BANNER if row.get("trial_source") == "synthetic" else TRIAL_BANNER


def trial_to_dict(row: Any, instrument_name: str = "") -> dict[str, Any]:
    data = dict(row)
    data["id"] = str(data["id"])
    data["catalog_id"] = str(data["catalog_id"])
    data["instrument_name"] = instrument_name
    data["mode"] = "trial"
    data["approved_users"] = _as_list(data.get("approved_users"))
    data["days_remaining"] = days_remaining(data["expiry_date"]) if data.get("expiry_date") else 0
    data["administrations_remaining"] = administrations_remaining(data)
    data["banner"] = banner_for(data)
    data["is_synthetic"] = data.get("trial_source") == "synthetic"
    if is_expired(data) and data.get("status") == "active":
        data["status"] = "expired"
    return data


def _as_list(value: Any) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        import json

        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except ValueError:
            return []
    return []


# ── Gates ──────────────────────────────────────────────────────────────


def assert_can_activate(catalog: dict[str, Any], body: Any, governance_approved: bool) -> None:
    """Called before a trial is created."""
    state = catalog.get("availability_state") or AVAILABLE

    if state == LICENSED_ACTIVE:
        raise TrialError("This instrument is already licensed for clinical use; a trial is not needed.")
    if state not in (RESERVED, EDUCATIONAL_PREVIEW):
        raise TrialError(
            "Trial Mode applies only to reserved or preview instruments. "
            "This instrument is already available for use."
        )

    # BSS special rule: suicide-ideation trials default to synthetic
    # clinician-training scenarios. Anything beyond that needs BOTH a
    # publisher authorization and a clinical governance sign-off.
    if catalog.get("requires_governance_approval"):
        if body.trial_source != "synthetic" and not governance_approved:
            raise TrialError(
                "This instrument requires clinical governance approval before a "
                "non-synthetic trial can begin. Start a Synthetic Trial instead, "
                "or obtain governance sign-off."
            )
        if body.real_patient_use_allowed and not governance_approved:
            raise TrialError(
                "Real-patient trial use of this instrument is prohibited without "
                "explicit publisher authorization and clinical governance approval."
            )


def assert_can_administer(
    trial: dict[str, Any],
    *,
    user_id: str,
    is_real_patient: bool,
) -> None:
    """Called before every single trial administration."""
    if trial.get("status") != "active":
        raise TrialError(f"This trial is {trial.get('status')} and cannot be administered.")

    if is_expired(trial):
        raise TrialError(
            "Trial Expired — no further administrations are permitted. "
            "Request a license or enter an existing one to continue."
        )

    approved = _as_list(trial.get("approved_users"))
    if approved and user_id not in approved:
        raise TrialError("You are not an approved evaluator on this trial.")

    if is_real_patient and not trial.get("real_patient_use_allowed"):
        raise TrialError(
            "This trial is not authorized for use with real patients. "
            "Use a training scenario instead."
        )

    if trial.get("trial_source") == "synthetic" and is_real_patient:
        raise TrialError(
            "Synthetic demonstration content cannot be administered to a real patient."
        )


def assert_can_export_report(trial: dict[str, Any]) -> None:
    if not trial.get("report_export_allowed"):
        raise TrialError("Report export is not permitted under this trial.")
    if is_expired(trial):
        raise TrialError("Trial Expired — protected reports can no longer be opened or exported.")


def assert_can_send_to_ai(trial: dict[str, Any]) -> None:
    """Publisher content must never be shipped to a model. Only normalised
    results (severity + topics) may inform AI features during a trial."""
    if trial.get("trial_source") != "synthetic":
        raise TrialError(
            "Protected trial content cannot be sent to an AI model. "
            "Only the normalised result (severity and topics) may be used."
        )


def expiry_actions(trial: dict[str, Any]) -> dict[str, Any]:
    """What the system must do once a trial dies. Synthetic demonstrations
    survive (we authored them); publisher-supplied content does not."""
    synthetic = trial.get("trial_source") == "synthetic"
    return {
        "stop_new_administrations": True,
        "status": "expired",
        "retain_audit_record": True,           # legally permitted audit info only
        "purge_publisher_content": not synthetic,
        "retain_synthetic_demonstrations": synthetic,
        "block_protected_reports": True,
        "convert_to_clinical_records": False,  # never automatic
        "available_actions": ["Request License", "Enter License"],
    }


# ── Recommendation demonstration ───────────────────────────────────────


def recommendation_from_normalized(result: Any, resources: list[dict[str, Any]]) -> dict[str, Any]:
    """Build a book + video + worksheet bundle from a NORMALISED result.

    Takes only an assessment key, a severity band and topic tags -- never
    questions, item responses or scoring logic. That is what makes the
    recommendation engine demonstrable under trial without touching
    anything proprietary.
    """
    topics = {t.lower() for t in (result.topics or [])}

    def pick(category: str) -> dict[str, Any] | None:
        matches = [
            r
            for r in resources
            if (r.get("category") or "").upper() == category
            and topics & {str(t).lower() for t in (r.get("tags") or [])}
        ]
        return matches[0] if matches else None

    bundle = {
        "book": pick("BOOK"),
        "video": pick("VIDEO"),
        "worksheet": pick("WORKSHEET"),
    }

    return {
        "assessment_key": result.assessment_key,
        "result_source": result.result_source,
        "severity": result.severity,
        "topics": sorted(topics),
        "clinical_use_permitted": bool(result.clinical_use_permitted),
        "recommendations": bundle,
        "requires_clinician_review": True,
        "notice": (
            None
            if result.clinical_use_permitted
            else "Demonstration only — this bundle is not a clinical recommendation."
        ),
        "missing": [k for k, v in bundle.items() if v is None],
    }
