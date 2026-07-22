"""Startup helper (Milestone 8 follow-up — Render free-tier one-time
migration + catalog ingestion, no Shell/One-Off Jobs access there):
reports whether the `assets` table has any rows at all.

This is a real DB query, not an env flag, by design: an env flag would need
something to unset it after the first successful run, which is exactly the
kind of manual step Render's free tier has no reliable way to perform
("no Shell/One-Off Jobs access" is the whole reason this exists). Querying
`assets` directly means the check self-disables automatically the instant a
real row exists — `backend/scripts/start.sh` calls this on every boot, and
it costs one cheap `COUNT(*)` even on the fast path.

Usage:
    python -m app.ingestion.catalog_status
    # exit 0 -> at least one asset row exists (catalog already seeded)
    # exit 1 -> the assets table is empty (needs seeding)
"""

import sys

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_session_factory
from app.models import Asset


def catalog_is_seeded(session: Session) -> bool:
    """True if `assets` has at least one row. Takes a `Session` directly
    (matching `app.ingestion.orchestrator.import_asset`'s own convention)
    so this is trivially testable against a real, rolled-back transaction —
    see `tests/ingestion/test_catalog_status.py`."""
    count = session.execute(select(func.count()).select_from(Asset)).scalar_one()
    return count > 0


def main() -> int:
    session = get_session_factory()()
    try:
        seeded = catalog_is_seeded(session)
    finally:
        session.close()
    return 0 if seeded else 1


if __name__ == "__main__":
    sys.exit(main())
