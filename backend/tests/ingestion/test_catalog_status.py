"""DB-integration tests for `catalog_is_seeded` — the real-query idempotency
check `backend/scripts/start.sh` uses to decide whether the one-time
starter-catalog ingestion needs to run on this boot (Milestone 8 follow-up:
Render's free tier has no Shell/One-Off Jobs access, so this must happen
automatically on container startup, and must not re-run once it has already
succeeded once).

Uses the shared `db_session` fixture (tests/ingestion/conftest.py): a real
Postgres connection wrapped in a transaction that's rolled back after each
test, so nothing here ever commits an Asset row for real — but the query
itself runs for real, against the identical path `start.sh` exercises, not a
mock. Assumes the target database is a scratch test database with no
independently-committed Asset rows of its own (the same assumption
`tests/test_migrations.py`/KI-009 already document for this project's test
database).
"""

from app.ingestion.catalog_status import catalog_is_seeded
from app.models import Asset
from app.models.enums import AssetType


def test_false_when_assets_table_is_empty(db_session):
    assert catalog_is_seeded(db_session) is False


def test_true_when_at_least_one_asset_exists(db_session):
    db_session.add(
        Asset(
            symbol="AAPL",
            name="Apple Inc.",
            asset_type=AssetType.STOCK,
            data_source="test",
        )
    )
    db_session.flush()

    assert catalog_is_seeded(db_session) is True
