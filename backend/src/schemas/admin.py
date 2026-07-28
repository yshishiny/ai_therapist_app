from datetime import datetime

from pydantic import BaseModel

# The only values resources.review_status may hold. Kept here so the route and
# the migration's CHECK constraint cannot drift apart.
REVIEW_STATUSES = ('UNREVIEWED', 'CONFIRMED', 'NEEDS_CORRECTION', 'REJECTED')


class ResourceOut(BaseModel):
    id: str
    title: str
    author: str | None
    category: str
    description: str | None
    file_url: str | None
    # Carries the topic slug and the provenance marker (verified / unverified).
    # The repository has always returned this; omitting it here made FastAPI
    # strip it from every response, so a clinician could not tell a
    # citation-checked reading list from an unchecked one.
    tags: list[str] = []
    created_at: datetime
    # A clinician's own decision, as distinct from the collector's claim in tags.
    review_status: str = 'UNREVIEWED'
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_note: str | None = None
    # Where to go to check this item. Only the videos carry a file_url; for a
    # book or a paper the honest answer is a search, and lookup_kind says which
    # of the two this is:
    #   "source"  the item itself, from file_url
    #   "search"  a search FOR the item -- the result still has to be checked
    # The UI must label a "search" as a search. Never present one as the item.
    lookup_url: str
    lookup_kind: str


class ContactOut(BaseModel):
    id: str
    full_name: str
    email: str | None
    phone: str | None
    role: str
    organisation: str | None


class ResourceIn(BaseModel):
    title: str
    author: str | None = None
    description: str | None = None
    category: str = 'BOOK'
    file_url: str | None = None
    tags: list = []


class ResourceReviewIn(BaseModel):
    # Plain str, not a Literal: an unknown value should come back as a 400 that
    # names the four allowed statuses, not a 422 the clinician cannot read.
    status: str
    note: str | None = None


class ContactIn(BaseModel):
    full_name: str
    email: str | None = None
    phone: str | None = None
    role: str = 'REFERRER'
    organisation: str | None = None
    notes: str | None = None


class AssessmentQuestionIn(BaseModel):
    assessment_id: str
    question_index: int
    question_text: str
    response_type: str = 'LIKERT'
    options: list | None = None
    reverse_scored: bool = False


class AssessmentQuestionOut(BaseModel):
    id: str
    assessment_id: str
    question_index: int
    question_text: str
    response_type: str
    options: list | None
