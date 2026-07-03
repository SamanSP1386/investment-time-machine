"""DB-integration test: applies the real Alembic migration to a real Postgres
instance and asserts the resulting schema has zero drift from app.models —
the strongest possible guarantee that the hand-assembled migration (see
alembic/versions/0001_initial_schema.py) matches the ORM models exactly.

Skips gracefully if no Postgres is reachable (e.g. this repo's sandbox, which
has no Docker daemon — see docs/KNOWN_ISSUES.md). Runs for real in CI, which
provisions a postgres service (.github/workflows/ci.yml), and locally once
`docker compose up -d postgres` has been run.
"""

import os

import pytest
import sqlalchemy as sa

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from app.core.config import get_settings
from app.models import Base

pytestmark = pytest.mark.integration


def _database_reachable(url: str) -> bool:
    try:
        engine = sa.create_engine(url)
        with engine.connect():
            pass
        engine.dispose()
        return True
    except Exception:
        return False


@pytest.fixture(scope="module")
def alembic_config() -> Config:
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cfg = Config(os.path.join(backend_dir, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    return cfg


def test_migration_upgrade_matches_models_with_zero_drift(alembic_config: Config) -> None:
    database_url = get_settings().database_url

    if not _database_reachable(database_url):
        pytest.skip("Postgres not reachable in this environment — see docs/KNOWN_ISSUES.md")

    command.upgrade(alembic_config, "head")

    engine = sa.create_engine(database_url)
    try:
        with engine.connect() as connection:
            context = MigrationContext.configure(connection)
            diff = compare_metadata(context, Base.metadata)
        assert diff == [], f"Migration schema drifted from app.models: {diff}"
    finally:
        command.downgrade(alembic_config, "base")
        engine.dispose()


def test_migration_downgrade_is_clean(alembic_config: Config) -> None:
    database_url = get_settings().database_url

    if not _database_reachable(database_url):
        pytest.skip("Postgres not reachable in this environment — see docs/KNOWN_ISSUES.md")

    command.upgrade(alembic_config, "head")
    command.downgrade(alembic_config, "base")

    engine = sa.create_engine(database_url)
    try:
        with engine.connect() as connection:
            inspector = sa.inspect(connection)
            remaining_tables = set(inspector.get_table_names()) & set(Base.metadata.tables.keys())
        assert remaining_tables == set(), f"downgrade left tables behind: {remaining_tables}"
    finally:
        engine.dispose()
