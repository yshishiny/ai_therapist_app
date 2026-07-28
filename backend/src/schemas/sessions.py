from datetime import datetime

from pydantic import BaseModel


class SessionNoteOut(BaseModel):
    id: str
    patient_id: str
    template: str
    subjective: str | None
    objective: str | None
    assessment: str | None
    plan: str | None
    free_text: str | None
    ai_draft_summary: str | None
    # Whether the clinician has signed the note off. The dashboard's "Notes due"
    # counter is driven entirely off this column, so it has to be visible on the
    # note itself -- a client cannot show "awaiting sign-off" against a field it
    # never receives. Defaults to False because the column is nullable in
    # deployed databases and a null there means "not signed off".
    therapist_approved: bool = False
    created_at: datetime


class SessionNoteIn(BaseModel):
    template: str = 'SOAP'
    subjective: str | None = None
    objective: str | None = None
    assessment: str | None = None
    plan: str | None = None
    free_text: str | None = None
    ai_draft_summary: str | None = None


class SessionNoteApprovalIn(BaseModel):
    """Sign-off (or un-sign-off) of a session note.

    Deliberately the only writable field on the PATCH: approving a note is a
    clinical attestation, not a content edit, and the two must not travel in
    the same request.
    """

    therapist_approved: bool
