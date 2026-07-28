"""
enrich_library_open_access.py — attach legal full text where it exists
------------------------------------------------------------------------
The library holds 30 papers and 32 books as references only: title, author,
description, no file. That is deliberate for the books, which are commercially
published and which the practice has no licence to copy.

A meaningful share of the PAPERS, though, are legitimately free. Europe PMC
indexes open-access articles and marks them; where an article is genuinely OA
we can store its full-text link and Dr Heba can read it in the app without
anyone's rights being infringed.

What this does NOT do, on purpose:
  - It does not touch books. There is no lawful free full text for a Guilford
    or APA title, and a link claiming otherwise would point at a pirated copy.
  - It does not follow paywalled articles to any third-party mirror.
  - It stores a link ONLY when Europe PMC reports isOpenAccess = Y. A "maybe
    free" guess in a clinical reference library is worse than an honest
    reference, because it invites someone to rely on a source they cannot open.

Matching is deliberately conservative: an exact-title query, and the result is
only accepted when the returned title matches what we hold after normalisation.
Attaching the wrong paper to a citation is worse than attaching none.

Usage:
    DATABASE_HOST=... DB_PASSWORD=... python backend/enrich_library_open_access.py [--apply]
Without --apply it only reports.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
import urllib.parse
import urllib.request

import asyncpg

EUROPE_PMC = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"


def normalise(text: str) -> str:
    """Loose comparison key: case, punctuation and spacing should not decide a match."""
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


def lookup(title: str) -> dict | None:
    """Return the Europe PMC record only if it is open access AND the title matches."""
    query = urllib.parse.quote(f'TITLE:"{title[:120]}"')
    url = f"{EUROPE_PMC}?query={query}&format=json&pageSize=3&resultType=core"
    try:
        with urllib.request.urlopen(url, timeout=25) as response:
            data = json.load(response)
    except Exception:
        return None

    ours = normalise(title)
    for hit in (data.get("resultList") or {}).get("result") or []:
        theirs = normalise(hit.get("title") or "")
        # Require a real title match, not merely the top search hit.
        if not (theirs.startswith(ours[:60]) or ours.startswith(theirs[:60])):
            continue
        if hit.get("isOpenAccess") != "Y":
            return {"open": False, "title": hit.get("title")}
        pmcid = hit.get("pmcid")
        if not pmcid:
            return {"open": False, "title": hit.get("title")}
        return {
            "open": True,
            "title": hit.get("title"),
            "url": f"https://europepmc.org/article/PMC/{pmcid}",
            "pmcid": pmcid,
        }
    return None


async def main() -> None:
    apply_changes = "--apply" in sys.argv

    conn = await asyncpg.connect(
        user=os.getenv("DB_USER", "appuser"),
        password=os.environ["DB_PASSWORD"],
        database=os.getenv("DB_NAME", "ai_therapist"),
        host=os.environ["DATABASE_HOST"],
        ssl="require",
    )
    papers = await conn.fetch(
        "SELECT id, title FROM resources WHERE category = 'PAPER' AND file_url IS NULL ORDER BY title"
    )
    print(f"{len(papers)} papers with no full-text link\n")

    found = paywalled = unmatched = 0
    for row in papers:
        result = lookup(row["title"])
        if result is None:
            unmatched += 1
            print(f"  no match     | {row['title'][:66]}")
        elif not result["open"]:
            paywalled += 1
            print(f"  paywalled    | {row['title'][:66]}")
        else:
            found += 1
            print(f"  OPEN ACCESS  | {row['title'][:66]}")
            print(f"                 {result['url']}")
            if apply_changes:
                await conn.execute(
                    "UPDATE resources SET file_url = $1 WHERE id = $2",
                    result["url"],
                    row["id"],
                )

    print()
    print(f"open access: {found}   paywalled: {paywalled}   not found: {unmatched}")
    if found and not apply_changes:
        print("\nRe-run with --apply to attach those links.")
    elif apply_changes:
        print(f"\nAttached {found} full-text links.")
    print(
        "\nBooks are untouched by design: there is no lawful free full text for a "
        "commercially published title, and a link claiming otherwise would point at "
        "a pirated copy."
    )
    await conn.close()


asyncio.run(main())
