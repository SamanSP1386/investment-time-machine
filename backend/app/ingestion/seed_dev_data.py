"""One-shot operator script: seeds the full `dev_seed` fixture dataset in a
single command, with correct display names — closing a real gap the
per-symbol CLI (`python -m app.ingestion.cli prices ...`) left open (M7 Phase
3D-1, task F): `IngestionRepository.get_or_create_asset` only sets
`name`/`asset_type` on first creation, never on an existing row, so any
symbol previously seeded without an explicit `--name` (AAPL/SPY in the
documented examples) is permanently stuck with its raw ticker as a display
name unless something corrects it directly. This script is that correction,
plus the actual seed step, in one idempotent, re-runnable place.

Usage:
    cd backend
    python -m app.ingestion.seed_dev_data
    python -m app.ingestion.seed_dev_data --dry-run

Not an API endpoint, not scheduled — a manual/local-dev operator tool only,
mirroring `app.ingestion.cli`'s own "thin argparse wrapper, no HTTP, no
auth" shape and `app.simulation.backfill_growth_series`'s own
session-scope-owned-by-the-caller convention.
"""

import argparse
import json
import sys
from datetime import date

from sqlalchemy import select, update

from app.core.database import session_scope
from app.ingestion.orchestrator import import_asset
from app.models import Asset
from app.models.enums import AssetType

# The full seeded fixture, one entry per symbol `DevSeedProvider`
# (`providers/dev_seed_provider.py`) knows how to generate prices for.
# AAPL/SPY/BTC-USD are the original three (M7 Phase 2, ADR-035); KO
# (dividend payer), PTON (overall loss), TSLA (disclosed stock split), and
# QQQ (ETF) are new this pass, chosen specifically to give the frontend
# fixture data for scenarios it previously had none for.
SEED_ASSETS: dict[str, tuple[str, AssetType]] = {
    "AAPL": ("Apple Inc.", AssetType.STOCK),
    "SPY": ("SPDR S&P 500 ETF Trust", AssetType.ETF),
    "BTC-USD": ("Bitcoin", AssetType.CRYPTO),
    "KO": ("The Coca-Cola Company", AssetType.STOCK),
    "PTON": ("Peloton Interactive, Inc.", AssetType.STOCK),
    "TSLA": ("Tesla, Inc.", AssetType.STOCK),
    "QQQ": ("Invesco QQQ Trust", AssetType.ETF),
}

DEFAULT_START = date(2020, 1, 1)
DEFAULT_END = date(2024, 12, 31)


def _correct_existing_names(session, *, dry_run: bool) -> list[str]:
    """Directly UPDATEs `name`/`asset_type` for any already-seeded row in
    `SEED_ASSETS` whose stored value doesn't match — the one, explicit,
    narrowly-scoped exception to `get_or_create_asset`'s create-only
    behavior, safe specifically because it's limited to this fixed, known
    symbol list rather than a blanket ingestion-repository policy change
    that could silently overwrite a real provider's curated asset metadata.
    Returns the list of symbols actually corrected (empty on a dry run,
    which reports what *would* change without writing).
    """
    corrected: list[str] = []
    for symbol, (name, asset_type) in SEED_ASSETS.items():
        existing = session.execute(select(Asset).where(Asset.symbol == symbol)).scalar_one_or_none()
        if existing is None:
            continue
        if existing.name != name or existing.asset_type != asset_type:
            corrected.append(symbol)
            if not dry_run:
                session.execute(
                    update(Asset)
                    .where(Asset.symbol == symbol)
                    .values(name=name, asset_type=asset_type)
                )
    return corrected


def seed_all(
    session, *, start: date = DEFAULT_START, end: date = DEFAULT_END, dry_run: bool = False
) -> dict:
    corrected_names = _correct_existing_names(session, dry_run=dry_run)

    results: dict[str, dict] = {}
    for symbol, (name, asset_type) in SEED_ASSETS.items():
        reports = import_asset(
            session,
            symbol=symbol,
            name=name,
            asset_type=asset_type,
            provider_name="dev_seed",
            start=start,
            end=end,
            dry_run=dry_run,
        )
        results[symbol] = {kind: report.to_dict() for kind, report in reports.items()}

    return {"corrected_names": corrected_names, "imports": results}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.ingestion.seed_dev_data")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    with session_scope() as session:
        summary = seed_all(session, dry_run=args.dry_run)

    print(json.dumps(summary, indent=2, default=str))

    all_reports = [
        report
        for symbol_reports in summary["imports"].values()
        for report in symbol_reports.values()
    ]
    return 0 if all(report["status"] != "failed" for report in all_reports) else 1


if __name__ == "__main__":
    sys.exit(main())
