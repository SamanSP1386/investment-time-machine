"""One-shot operator script: permanently removes every `dev_seed`-sourced
asset and its dependent rows (KI-044 resolution, "wipe seed assets" option
— the counterpart to keeping them, clearly named "DEMO — ", via
`seed_dev_data.py`'s prefix). Scoped strictly to `assets.data_source =
'dev_seed'` — this never touches a real, provider-ingested asset, and
`DevSeedProvider` itself already refuses to run outside a development/test
`ENVIRONMENT` (`dev_seed_provider.py`), so this script's target set is
always fixture data, never anything "Historical Truth Is Sacred" protects.

`Asset` (`app/models/asset.py`) documents a deliberate "never deleted, only
deactivated" policy for *real* market data — every asset-referencing FK
defaults to `ON DELETE NO ACTION` specifically so an ORM-level delete can't
silently cascade through real historical data. That policy does not apply
to fixture data a founder has explicitly asked to remove, so this script
performs a real, explicit, FK-order-respecting delete rather than reusing
`is_active` (which nothing in the current API layer actually filters on —
`asset_service.search_assets` returns inactive rows unchanged, so
deactivating a `dev_seed` asset would not hide it from search anyway; a
real delete is the only lever that does what "wipe" means here).

Usage:
    cd backend
    python -m app.ingestion.wipe_seed_assets                # dry run (default, safe)
    python -m app.ingestion.wipe_seed_assets --yes           # actually deletes

Deletion order (matching each table's FK to `assets.id`/`simulations.id`,
all `ON DELETE NO ACTION`): ai_explanations -> simulations -> {historical_prices,
dividends, stock_splits} -> assets.
"""

import argparse
import sys

from sqlalchemy import delete, func, select

from app.core.database import session_scope
from app.models import AIExplanation, Asset, Dividend, HistoricalPrice, Simulation, StockSplit

SEED_DATA_SOURCE = "dev_seed"


def _count(session, model, column, ids: list) -> int:
    if not ids:
        return 0
    return session.execute(
        select(func.count()).select_from(model).where(column.in_(ids))
    ).scalar_one()


def _counts(session) -> dict[str, int]:
    asset_ids = list(
        session.execute(select(Asset.id).where(Asset.data_source == SEED_DATA_SOURCE)).scalars()
    )
    if not asset_ids:
        return {
            "assets": 0,
            "historical_prices": 0,
            "dividends": 0,
            "stock_splits": 0,
            "simulations": 0,
            "ai_explanations": 0,
        }

    simulation_ids = list(
        session.execute(select(Simulation.id).where(Simulation.asset_id.in_(asset_ids))).scalars()
    )

    return {
        "assets": len(asset_ids),
        "historical_prices": _count(session, HistoricalPrice, HistoricalPrice.asset_id, asset_ids),
        "dividends": _count(session, Dividend, Dividend.asset_id, asset_ids),
        "stock_splits": _count(session, StockSplit, StockSplit.asset_id, asset_ids),
        "simulations": len(simulation_ids),
        "ai_explanations": _count(
            session, AIExplanation, AIExplanation.simulation_id, simulation_ids
        ),
    }


def wipe_seed_assets(session, *, execute: bool) -> dict[str, int]:
    """Returns row counts (that would be / were) deleted per table. `execute=False`
    (the default via the CLI) only counts — nothing is deleted."""
    counts = _counts(session)
    if not execute or counts["assets"] == 0:
        return counts

    asset_ids = list(
        session.execute(select(Asset.id).where(Asset.data_source == SEED_DATA_SOURCE)).scalars()
    )
    simulation_ids = list(
        session.execute(select(Simulation.id).where(Simulation.asset_id.in_(asset_ids))).scalars()
    )

    if simulation_ids:
        session.execute(
            delete(AIExplanation).where(AIExplanation.simulation_id.in_(simulation_ids))
        )
        session.execute(delete(Simulation).where(Simulation.id.in_(simulation_ids)))
    session.execute(delete(HistoricalPrice).where(HistoricalPrice.asset_id.in_(asset_ids)))
    session.execute(delete(Dividend).where(Dividend.asset_id.in_(asset_ids)))
    session.execute(delete(StockSplit).where(StockSplit.asset_id.in_(asset_ids)))
    session.execute(delete(Asset).where(Asset.id.in_(asset_ids)))

    return counts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.ingestion.wipe_seed_assets")
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Actually perform the delete. Without this flag, only reports what would be deleted.",
    )
    args = parser.parse_args(argv)

    with session_scope() as session:
        counts = wipe_seed_assets(session, execute=args.yes)

    if args.yes:
        print(f"Deleted (data_source={SEED_DATA_SOURCE!r}): {counts}")
    else:
        print(f"Dry run — would delete (data_source={SEED_DATA_SOURCE!r}): {counts}")
        print("Re-run with --yes to actually delete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
