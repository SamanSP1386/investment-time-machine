"""Operational entrypoint for manually running an import. Not an API
endpoint — no HTTP, no auth, just a thin argparse wrapper around the
orchestrator for local/operator use. A scheduler (cron, worker queue) is
infrastructure work for a future milestone; this only makes the pipeline
runnable today.

Examples:
    python -m app.ingestion.cli prices AAPL --provider yfinance \\
        --start 2020-01-01 --end 2024-01-01
    python -m app.ingestion.cli prices AAPL --provider yfinance \\
        --start 2020-01-01 --end 2024-01-01 --dry-run
    python -m app.ingestion.cli indicator CPIAUCSL --provider fred \\
        --name "CPI for All Urban Consumers" --unit index \\
        --start 2020-01-01 --end 2024-01-01
"""

import argparse
import json
import sys
from datetime import date

from app.core.database import session_scope
from app.ingestion.orchestrator import (
    import_asset,
    import_economic_indicator,
)
from app.models.enums import AssetType


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m app.ingestion.cli")
    subparsers = parser.add_subparsers(dest="command", required=True)

    asset_parser = subparsers.add_parser(
        "prices", help="Import prices (+ dividends/splits if supported)"
    )
    asset_parser.add_argument("symbol")
    asset_parser.add_argument("--name", default=None, help="Display name (defaults to the symbol)")
    asset_parser.add_argument(
        "--asset-type", choices=[t.value for t in AssetType], default=AssetType.STOCK.value
    )
    asset_parser.add_argument("--provider", required=True, choices=["yfinance", "coingecko"])
    asset_parser.add_argument("--start", required=True, type=_parse_date)
    asset_parser.add_argument("--end", required=True, type=_parse_date)
    asset_parser.add_argument("--dry-run", action="store_true")

    indicator_parser = subparsers.add_parser(
        "indicator", help="Import an economic indicator series"
    )
    indicator_parser.add_argument("indicator_code")
    indicator_parser.add_argument("--name", required=True)
    indicator_parser.add_argument("--unit", required=True)
    indicator_parser.add_argument("--provider", required=True, choices=["fred"])
    indicator_parser.add_argument("--start", required=True, type=_parse_date)
    indicator_parser.add_argument("--end", required=True, type=_parse_date)
    indicator_parser.add_argument("--dry-run", action="store_true")

    return parser


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

    if args.command == "prices":
        with session_scope() as session:
            reports = import_asset(
                session,
                symbol=args.symbol,
                name=args.name or args.symbol,
                asset_type=AssetType(args.asset_type),
                provider_name=args.provider,
                start=args.start,
                end=args.end,
                dry_run=args.dry_run,
            )
        output = {kind: report.to_dict() for kind, report in reports.items()}
        print(json.dumps(output, indent=2))
        return 0 if all(r.status != "failed" for r in reports.values()) else 1

    if args.command == "indicator":
        with session_scope() as session:
            report = import_economic_indicator(
                session,
                indicator_code=args.indicator_code,
                name=args.name,
                unit=args.unit,
                provider_name=args.provider,
                start=args.start,
                end=args.end,
                dry_run=args.dry_run,
            )
        print(json.dumps(report.to_dict(), indent=2))
        return 0 if report.status != "failed" else 1

    return 1


if __name__ == "__main__":
    sys.exit(main())
