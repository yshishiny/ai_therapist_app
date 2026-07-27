"""
DISABLED — this script used to destroy the database.

What it did: dropped every table in the public schema, then replayed
schema.sql and one migration. Its own comment said "nuclear reset — DB
currently has no real data". That was true when it was written. It stopped
being true a long time ago, and the script was never updated. Running it
against production today would delete every patient, clinician, assessment
result, session note and resource, and it took its connection straight from
DATABASE_URL with no confirmation and no environment check.

It has been replaced by backend/migrate.py, which applies ordered,
recorded, one-time migrations and never drops anything:

    python backend/migrate.py --status     what is applied, what is pending
    python backend/migrate.py --apply      apply everything pending
    python backend/migrate.py --baseline   record as applied without running

There is deliberately no reset command. If you genuinely need an empty
database, create a new one and point DATABASE_URL at it — that way the
blast radius is a database you just made, not the one serving the clinic.
"""

import sys

print(__doc__)
sys.exit(1)
