"""One-shot operator script: ingests the real starter catalog (KI-044
resolution) — daily price history, plus dividends/splits where the provider
supplies them — for a fixed set of well-known symbols, via the
`yahoo_chart` provider (`YahooChartProvider`, ADR-046). Mirrors
`seed_dev_data.py`'s own shape (idempotent, re-runnable, one command), but
against real market data instead of a synthetic fixture.

Usage:
    cd backend
    python -m app.ingestion.seed_real_catalog
    python -m app.ingestion.seed_real_catalog --dry-run
    python -m app.ingestion.seed_real_catalog --symbols AAPL,MSFT

Max available range: `_MAX_RANGE_START` is set well before any of this
catalog's actual listing dates — Yahoo's chart endpoint simply returns data
starting from each symbol's real first trade date, so this one constant
naturally yields "the full available history" per asset without needing a
per-symbol start date. Crypto (BTC-USD, ETH-USD) trades every calendar day;
equities/ETFs only trade weekdays — both are ingested with the same
`start`/`end` bounds, and each asset's own `historical_prices` rows simply
reflect its own real trading calendar (weekends absent for equities/ETFs,
present for crypto). This is not a special case to handle: the Simulation
Engine's existing exact-date-match policy (KI-017) already treats "no row
for this date" as `MissingHistoricalDataError` for any asset, so a
crypto/equity calendar difference is communicated the same way a market
holiday already is — via each asset's own `GET /assets/{symbol}/availability`
response and the natural presence/absence of a row, never a fabricated or
forward/backward-shifted date.

Real-vs-seed coexistence (KI-044 resolution, item 4): if a symbol in this
catalog was previously created by `dev_seed` (e.g. AAPL/TSLA/SPY/QQQ, which
exist in both fixture sets), `get_or_create_asset` would otherwise reuse
that row as-is — including its "DEMO — " name prefix and `data_source`
column — silently leaving newly-ingested *real* rows attached to an asset
still labeled as demo/synthetic. `_correct_existing_asset_metadata` (this
module's equivalent of `seed_dev_data.py::_correct_existing_names`, scoped
the same narrow way) detects and fixes exactly that mismatch, for this
fixed catalog only — not a generic `get_or_create_asset` behavior change.
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

PROVIDER_NAME = "yahoo_chart"

# Real display names for the starter catalog (Founder-approved scope, KI-044
# resolution) — deliberately hand-specified rather than trusting the
# provider's own `meta.longName` field, matching `seed_dev_data.py`'s own
# precedent of an explicit, reviewed name table rather than a live value
# that could change or be absent.
CATALOG: dict[str, tuple[str, AssetType]] = {
    "AAPL": ("Apple Inc.", AssetType.STOCK),
    "MSFT": ("Microsoft Corporation", AssetType.STOCK),
    "TSLA": ("Tesla, Inc.", AssetType.STOCK),
    "NVDA": ("NVIDIA Corporation", AssetType.STOCK),
    "GOOGL": ("Alphabet Inc. (Class A)", AssetType.STOCK),
    "AMZN": ("Amazon.com, Inc.", AssetType.STOCK),
    "SPY": ("SPDR S&P 500 ETF Trust", AssetType.ETF),
    "QQQ": ("Invesco QQQ Trust", AssetType.ETF),
    "BTC-USD": ("Bitcoin", AssetType.CRYPTO),
    "ETH-USD": ("Ethereum", AssetType.CRYPTO),
}

# Well before any of this catalog's real listing dates (AAPL, the oldest,
# started trading 1980-12-12) — see module docstring's "max available range"
# note.
_MAX_RANGE_START = date(1970, 1, 1)


def _correct_existing_asset_metadata(session, *, dry_run: bool) -> list[str]:
    """Fixes `name`/`asset_type`/`data_source` for any already-existing row
    in `CATALOG` whose stored value doesn't match the real-catalog values —
    the one, explicit, narrowly-scoped exception to `get_or_create_asset`'s
    create-only behavior (same pattern and same justification as
    `seed_dev_data.py::_correct_existing_names`, extended to `data_source`
    since this script's whole purpose is distinguishing real from seed
    data). Returns the list of symbols actually corrected."""
    corrected: list[str] = []
    for symbol, (name, asset_type) in CATALOG.items():
        existing = session.execute(select(Asset).where(Asset.symbol == symbol)).scalar_one_or_none()
        if existing is None:
            continue
        if (
            existing.name != name
            or existing.asset_type != asset_type
            or existing.data_source != PROVIDER_NAME
        ):
            corrected.append(symbol)
            if not dry_run:
                session.execute(
                    update(Asset)
                    .where(Asset.symbol == symbol)
                    .values(name=name, asset_type=asset_type, data_source=PROVIDER_NAME)
                )
    return corrected


def seed_catalog(
    session,
    *,
    symbols: list[str] | None = None,
    start: date = _MAX_RANGE_START,
    end: date | None = None,
    dry_run: bool = False,
) -> dict:
    end = end or date.today()
    targets = {s: CATALOG[s] for s in symbols} if symbols else CATALOG

    corrected = _correct_existing_asset_metadata(session, dry_run=dry_run)

    results: dict[str, dict] = {}
    for symbol, (name, asset_type) in targets.items():
        reports = import_asset(
            session,
            symbol=symbol,
            name=name,
            asset_type=asset_type,
            provider_name=PROVIDER_NAME,
            start=start,
            end=end,
            dry_run=dry_run,
        )
        results[symbol] = {kind: report.to_dict() for kind, report in reports.items()}

    return {"corrected_metadata": corrected, "imports": results}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.ingestion.seed_real_catalog")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--symbols",
        default=None,
        help="Comma-separated subset of the catalog to ingest (default: all 10)",
    )
    parser.add_argument(
        "--end",
        default=None,
        type=date.fromisoformat,
        help="Defaults to today; a fixed value keeps runs reproducible for testing.",
    )
    args = parser.parse_args(argv)

    symbols = [s.strip().upper() for s in args.symbols.split(",")] if args.symbols else None
    if symbols:
        unknown = set(symbols) - set(CATALOG)
        if unknown:
            print(
                f"Unknown symbol(s): {sorted(unknown)}. Known: {sorted(CATALOG)}", file=sys.stderr
            )
            return 2

    with session_scope() as session:
        summary = seed_catalog(
            session, symbols=symbols, end=args.end or date.today(), dry_run=args.dry_run
        )

    print(json.dumps(summary, indent=2, default=str))

    all_reports = [
        report
        for symbol_reports in summary["imports"].values()
        for report in symbol_reports.values()
    ]
    return 0 if all(report["status"] != "failed" for report in all_reports) else 1


if __name__ == "__main__":
    sys.exit(main())
