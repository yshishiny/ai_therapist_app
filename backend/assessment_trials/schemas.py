"""Pydantic contracts for controlled Trial Mode.

The types here are deliberately strict about the things that matter
legally: where trial content came from, who may administer it, when the
trial dies, and whether any of it may touch a real patient. Defaults are
always the restrictive value -- widening a permission has to be an
explicit act recorded against an authorization reference.
"""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

# The only places trial content may legitimately come from. There is
# deliberately no option meaning "we transcribed the real instrument".
TrialSource = str  # 'publisher_sandbox' | 'authorized_demo' | 'synthetic'


class TrialActivationIn(BaseModel):
    """The activation gate. Every field here is a question that must be
    answered before an evaluation can start."""

    trial_source: TrialSource
    publisher: str | None = None
    authorization_reference: str | None = None

    organization: str
    approved_users: list[str] = Field(default_factory=list)

    start_date: date
    expiry_date: date
    maximum_administrations: int = 0

    allowed_country: str | None = None
    allowed_language: str | None = None

    real_patient_use_allowed: bool = False
    result_storage_allowed: bool = False
    report_export_allowed: bool = False
    content_storage_allowed: bool = False

    accept_publisher_terms: bool = False

    @model_validator(mode="after")
    def _enforce_trial_rules(self) -> "TrialActivationIn":
        if self.trial_source not in ("publisher_sandbox", "authorized_demo", "synthetic"):
            raise ValueError(
                "trial_source must be publisher_sandbox, authorized_demo, or synthetic."
            )

        # Without publisher authorization, the ONLY permitted trial is synthetic.
        if self.trial_source != "synthetic" and not (self.authorization_reference or "").strip():
            raise ValueError(
                "An authorization reference is required for a publisher trial. "
                "Without publisher authorization, only a Synthetic Trial may be started."
            )

        # Synthetic content is fictional, so it can never be administered to a
        # real patient no matter what the requester ticks.
        if self.trial_source == "synthetic" and self.real_patient_use_allowed:
            raise ValueError(
                "A synthetic trial uses fictional items and cannot be used with real patients."
            )

        if self.expiry_date < self.start_date:
            raise ValueError("expiry_date cannot be before start_date.")

        if self.maximum_administrations < 0:
            raise ValueError("maximum_administrations cannot be negative.")

        if not self.accept_publisher_terms:
            raise ValueError("The publisher's terms must be accepted to start a trial.")

        if not self.approved_users:
            raise ValueError("At least one approved evaluator is required.")

        if not self.organization.strip():
            raise ValueError("An organization is required.")

        return self


class TrialOut(BaseModel):
    id: str
    catalog_id: str
    instrument_name: str
    mode: str = "trial"
    trial_source: str
    publisher: str | None = None
    authorization_reference: str | None = None
    organization: str
    approved_users: list[str] = Field(default_factory=list)
    start_date: date
    expiry_date: date
    maximum_administrations: int
    administrations_used: int
    real_patient_use_allowed: bool
    report_export_allowed: bool
    content_storage_allowed: bool
    result_storage_allowed: bool
    allowed_country: str | None = None
    allowed_language: str | None = None
    status: str

    # Derived, for the trial counter in the UI.
    days_remaining: int
    administrations_remaining: int
    banner: str
    is_synthetic: bool


class TrialAdministrationIn(BaseModel):
    """Records one trial administration. Only the normalised outcome is
    accepted -- never item text, per-item scores, or a publisher scoring
    key, none of which we are entitled to store."""

    result_source: str  # 'synthetic' | 'publisher_trial'
    severity: str
    topics: list[str] = Field(default_factory=list)
    was_real_patient: bool = False

    @model_validator(mode="after")
    def _check(self) -> "TrialAdministrationIn":
        if self.result_source not in ("synthetic", "publisher_trial"):
            raise ValueError("result_source must be 'synthetic' or 'publisher_trial'.")
        return self


class NormalizedResultIn(BaseModel):
    """What the recommendation engine consumes. Note it needs no access to
    the instrument's questions or scoring logic -- only a severity band and
    topic tags -- which is exactly why recommendations can be demonstrated
    during a trial without touching protected content."""

    assessment_key: str
    result_source: str = "synthetic"
    severity: str
    topics: list[str] = Field(default_factory=list)
    clinical_use_permitted: bool = False


class LicenseConversionIn(BaseModel):
    """'Convert Trial to Licensed'. Submitting this does NOT grant access;
    it opens a compliance review that an administrator must approve."""

    license_reference: str
    licensed_organization: str
    publisher: str | None = None
    proof_document_url: str | None = None

    qualified_users: list[str] = Field(default_factory=list)
    permitted_instrument: str | None = None
    permitted_version: str | None = None
    permitted_languages: list[str] = Field(default_factory=list)
    permitted_territories: list[str] = Field(default_factory=list)
    embedding_rights: bool = False
    administration_limit: int | None = None
    valid_from: date | None = None
    valid_until: date | None = None
    data_retention_terms: str | None = None

    @model_validator(mode="after")
    def _check(self) -> "LicenseConversionIn":
        if not self.license_reference.strip():
            raise ValueError("A license number or account reference is required.")
        if not self.licensed_organization.strip():
            raise ValueError("The licensed organization is required.")
        if not self.qualified_users:
            raise ValueError("At least one qualified user must be named on the license.")
        if self.valid_from and self.valid_until and self.valid_until < self.valid_from:
            raise ValueError("valid_until cannot be before valid_from.")
        return self


class LicenseOut(BaseModel):
    id: str
    catalog_id: str
    license_reference: str
    licensed_organization: str
    publisher: str | None = None
    status: str
    compliance_reviewed_by: str | None = None
    compliance_reviewed_at: datetime | None = None
    compliance_notes: str | None = None
    valid_from: date | None = None
    valid_until: date | None = None
    created_at: datetime


class ComplianceReviewIn(BaseModel):
    approve: bool
    notes: str | None = None
