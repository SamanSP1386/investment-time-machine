"""Orchestrator: the only place that wires Provider -> Validation ->
Normalization -> Storage -> Audit together. Each public function here is one
"import" as the Founder Specification defines it: retrieve, validate,
normalize, store, audit, and always return a structured ImportReport —
whether the import succeeds, partially succeeds, fails outright, or runs as
a dry run.

The Simulation Engine (a later milestone) never imports anything from this
module directly — it only ever reads already-stored, already-validated rows
via the database. This module is the sole writer of market-data tables.
"""

import logging
import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.ingestion.audit import record_import_audit
from app.ingestion.exceptions import (
    DatabaseConstraintError,
    InvalidSymbolError,
    NetworkTimeoutError,
    ProviderUnavailableError,
    UnexpectedProviderResponseError,
)
from app.ingestion.normalization import (
    normalize_dividend_record,
    normalize_indicator_observation,
    normalize_price_record,
    normalize_split_record,
    normalize_symbol,
)
from app.ingestion.providers import get_provider
from app.ingestion.providers.base import DividendProvider, SplitProvider
from app.ingestion.providers.coingecko_provider import COINGECKO_OHLC_APPROXIMATION_WARNING
from app.ingestion.reports import ImportReport
from app.ingestion.storage import IngestionRepository
from app.ingestion.validation import (
    find_duplicate_keys,
    validate_dividend_record,
    validate_indicator_observation,
    validate_price_record,
    validate_split_record,
)
from app.models.enums import AssetType

logger = logging.getLogger(__name__)

# Errors the Provider Layer is documented to raise (providers/base.py,
# exceptions.py) — handled explicitly here, never via a bare `except
# Exception`. Anything else escaping a provider adapter is a programming
# error in that adapter, not an ingestion-runtime condition, and is allowed
# to propagate rather than being silently absorbed.
_PROVIDER_FAILURE_TYPES = (
    ProviderUnavailableError,
    NetworkTimeoutError,
    InvalidSymbolError,
    UnexpectedProviderResponseError,
)


def import_asset_prices(
    session: Session,
    *,
    symbol: str,
    name: str,
    asset_type: AssetType,
    provider_name: str,
    start: date,
    end: date,
    dry_run: bool = False,
) -> ImportReport:
    symbol = normalize_symbol(symbol)
    report = ImportReport(provider=provider_name, target=symbol, dry_run=dry_run)
    provider = get_provider(provider_name)

    logger.info(
        "import start: kind=prices provider=%s target=%s start=%s end=%s dry_run=%s",
        provider_name,
        symbol,
        start,
        end,
        dry_run,
    )

    repository: IngestionRepository | None = None
    asset_id: uuid.UUID | None = None
    if not dry_run:
        repository = IngestionRepository(session)
        asset = repository.get_or_create_asset(
            symbol=symbol, name=name, asset_type=asset_type, data_source=provider.name
        )
        asset_id = asset.id

    try:
        raw_records = provider.fetch_prices(symbol, start, end)
    except _PROVIDER_FAILURE_TYPES as exc:
        report.errors.append(str(exc))
        report.finish()
        if not dry_run:
            record_import_audit(
                session,
                entity_type="asset",
                entity_id=asset_id,
                succeeded=False,
                details=report.to_dict(),
            )
        logger.error(
            "import failed: kind=prices provider=%s target=%s error=%s", provider_name, symbol, exc
        )
        return report

    report.rows_downloaded = len(raw_records)
    if provider_name == "coingecko":
        report.warnings.append(COINGECKO_OHLC_APPROXIMATION_WARNING)

    duplicate_dates = find_duplicate_keys(raw_records, key_fn=lambda r: r.price_date)

    for raw in raw_records:
        if raw.price_date in duplicate_dates:
            report.rows_rejected += 1
            report.warnings.append(f"{raw.price_date}: duplicate within provider response, skipped")
            continue

        validation_errors = validate_price_record(raw)
        if validation_errors:
            report.rows_rejected += 1
            report.warnings.append(f"{raw.price_date}: rejected ({', '.join(validation_errors)})")
            continue

        if dry_run:
            report.rows_imported += 1
            continue

        normalized = normalize_price_record(raw, asset_id=asset_id, data_source=provider.name)
        try:
            inserted = repository.upsert_price(normalized)
        except DatabaseConstraintError as exc:
            report.rows_rejected += 1
            report.errors.append(f"{raw.price_date}: {exc}")
            continue

        if inserted:
            report.rows_imported += 1
        else:
            report.rows_rejected += 1
            report.warnings.append(f"{raw.price_date}: already stored, skipped")

    report.finish()

    if not dry_run:
        record_import_audit(
            session,
            entity_type="asset",
            entity_id=asset_id,
            succeeded=(report.status != "failed"),
            details=report.to_dict(),
        )

    logger.info(
        "import complete: kind=prices provider=%s target=%s status=%s downloaded=%d imported=%d "
        "rejected=%d duration=%.2fs",
        provider_name,
        symbol,
        report.status,
        report.rows_downloaded,
        report.rows_imported,
        report.rows_rejected,
        report.duration_seconds,
    )
    return report


def import_asset_dividends(
    session: Session,
    *,
    symbol: str,
    provider_name: str,
    start: date,
    end: date,
    dry_run: bool = False,
) -> ImportReport:
    symbol = normalize_symbol(symbol)
    report = ImportReport(provider=provider_name, target=symbol, dry_run=dry_run)
    provider = get_provider(provider_name)

    if not isinstance(provider, DividendProvider):
        report.errors.append(f"provider '{provider_name}' does not support dividends")
        report.finish()
        return report

    repository = IngestionRepository(session) if not dry_run else None
    asset_id: uuid.UUID | None = None
    if not dry_run:
        asset = repository.get_asset_by_symbol(symbol)
        if asset is None:
            report.errors.append(
                f"asset '{symbol}' does not exist yet — import prices first to register it"
            )
            report.finish()
            return report
        asset_id = asset.id

    try:
        raw_records = provider.fetch_dividends(symbol, start, end)
    except _PROVIDER_FAILURE_TYPES as exc:
        report.errors.append(str(exc))
        report.finish()
        if not dry_run:
            record_import_audit(
                session,
                entity_type="asset",
                entity_id=asset_id,
                succeeded=False,
                details=report.to_dict(),
            )
        return report

    report.rows_downloaded = len(raw_records)
    duplicate_keys = find_duplicate_keys(
        raw_records, key_fn=lambda r: (r.ex_dividend_date, r.amount)
    )

    for raw in raw_records:
        key = (raw.ex_dividend_date, raw.amount)
        if key in duplicate_keys:
            report.rows_rejected += 1
            report.warnings.append(
                f"{raw.ex_dividend_date}: duplicate within provider response, skipped"
            )
            continue

        validation_errors = validate_dividend_record(raw)
        if validation_errors:
            report.rows_rejected += 1
            report.warnings.append(
                f"{raw.ex_dividend_date}: rejected ({', '.join(validation_errors)})"
            )
            continue

        if dry_run:
            report.rows_imported += 1
            continue

        normalized = normalize_dividend_record(raw, asset_id=asset_id, data_source=provider.name)
        try:
            inserted = repository.upsert_dividend(normalized)
        except DatabaseConstraintError as exc:
            report.rows_rejected += 1
            report.errors.append(f"{raw.ex_dividend_date}: {exc}")
            continue

        if inserted:
            report.rows_imported += 1
        else:
            report.rows_rejected += 1
            report.warnings.append(f"{raw.ex_dividend_date}: already stored, skipped")

    report.finish()
    if not dry_run:
        record_import_audit(
            session,
            entity_type="asset",
            entity_id=asset_id,
            succeeded=(report.status != "failed"),
            details=report.to_dict(),
        )
    return report


def import_asset_splits(
    session: Session,
    *,
    symbol: str,
    provider_name: str,
    start: date,
    end: date,
    dry_run: bool = False,
) -> ImportReport:
    symbol = normalize_symbol(symbol)
    report = ImportReport(provider=provider_name, target=symbol, dry_run=dry_run)
    provider = get_provider(provider_name)

    if not isinstance(provider, SplitProvider):
        report.errors.append(f"provider '{provider_name}' does not support stock splits")
        report.finish()
        return report

    repository = IngestionRepository(session) if not dry_run else None
    asset_id: uuid.UUID | None = None
    if not dry_run:
        asset = repository.get_asset_by_symbol(symbol)
        if asset is None:
            report.errors.append(
                f"asset '{symbol}' does not exist yet — import prices first to register it"
            )
            report.finish()
            return report
        asset_id = asset.id

    try:
        raw_records = provider.fetch_splits(symbol, start, end)
    except _PROVIDER_FAILURE_TYPES as exc:
        report.errors.append(str(exc))
        report.finish()
        if not dry_run:
            record_import_audit(
                session,
                entity_type="asset",
                entity_id=asset_id,
                succeeded=False,
                details=report.to_dict(),
            )
        return report

    report.rows_downloaded = len(raw_records)
    duplicate_dates = find_duplicate_keys(raw_records, key_fn=lambda r: r.split_date)

    for raw in raw_records:
        if raw.split_date in duplicate_dates:
            report.rows_rejected += 1
            report.warnings.append(f"{raw.split_date}: duplicate within provider response, skipped")
            continue

        validation_errors = validate_split_record(raw)
        if validation_errors:
            report.rows_rejected += 1
            report.warnings.append(f"{raw.split_date}: rejected ({', '.join(validation_errors)})")
            continue

        if dry_run:
            report.rows_imported += 1
            continue

        normalized = normalize_split_record(raw, asset_id=asset_id, data_source=provider.name)
        try:
            inserted = repository.upsert_split(normalized)
        except DatabaseConstraintError as exc:
            report.rows_rejected += 1
            report.errors.append(f"{raw.split_date}: {exc}")
            continue

        if inserted:
            report.rows_imported += 1
        else:
            report.rows_rejected += 1
            report.warnings.append(f"{raw.split_date}: already stored, skipped")

    report.finish()
    if not dry_run:
        record_import_audit(
            session,
            entity_type="asset",
            entity_id=asset_id,
            succeeded=(report.status != "failed"),
            details=report.to_dict(),
        )
    return report


def import_economic_indicator(
    session: Session,
    *,
    indicator_code: str,
    name: str,
    unit: str,
    provider_name: str,
    start: date,
    end: date,
    dry_run: bool = False,
) -> ImportReport:
    indicator_code = indicator_code.strip().upper()
    report = ImportReport(provider=provider_name, target=indicator_code, dry_run=dry_run)
    provider = get_provider(provider_name)

    repository: IngestionRepository | None = None
    indicator_id: uuid.UUID | None = None
    if not dry_run:
        repository = IngestionRepository(session)
        indicator = repository.get_or_create_indicator(
            indicator_code=indicator_code, name=name, unit=unit, data_source=provider.name
        )
        indicator_id = indicator.id

    try:
        raw_records = provider.fetch_observations(indicator_code, start, end)
    except _PROVIDER_FAILURE_TYPES as exc:
        report.errors.append(str(exc))
        report.finish()
        if not dry_run:
            record_import_audit(
                session,
                entity_type="economic_indicator",
                entity_id=indicator_id,
                succeeded=False,
                details=report.to_dict(),
            )
        return report

    report.rows_downloaded = len(raw_records)
    duplicate_dates = find_duplicate_keys(raw_records, key_fn=lambda r: r.observation_date)

    for raw in raw_records:
        if raw.observation_date in duplicate_dates:
            report.rows_rejected += 1
            report.warnings.append(
                f"{raw.observation_date}: duplicate within provider response, skipped"
            )
            continue

        validation_errors = validate_indicator_observation(raw)
        if validation_errors:
            report.rows_rejected += 1
            report.warnings.append(
                f"{raw.observation_date}: rejected ({', '.join(validation_errors)})"
            )
            continue

        if dry_run:
            report.rows_imported += 1
            continue

        normalized = normalize_indicator_observation(
            raw, indicator_id=indicator_id, data_source=provider.name
        )
        try:
            inserted = repository.upsert_indicator_value(normalized)
        except DatabaseConstraintError as exc:
            report.rows_rejected += 1
            report.errors.append(f"{raw.observation_date}: {exc}")
            continue

        if inserted:
            report.rows_imported += 1
        else:
            report.rows_rejected += 1
            report.warnings.append(f"{raw.observation_date}: already stored, skipped")

    report.finish()
    if not dry_run:
        record_import_audit(
            session,
            entity_type="economic_indicator",
            entity_id=indicator_id,
            succeeded=(report.status != "failed"),
            details=report.to_dict(),
        )
    return report


def import_asset(
    session: Session,
    *,
    symbol: str,
    name: str,
    asset_type: AssetType,
    provider_name: str,
    start: date,
    end: date,
    dry_run: bool = False,
) -> dict[str, ImportReport]:
    """Convenience wrapper: prices, plus dividends/splits if the provider
    supports them (checked via the Provider Layer's capability protocols —
    see providers/base.py). Returns one ImportReport per data kind actually
    attempted, keyed by "prices" / "dividends" / "splits"."""
    provider = get_provider(provider_name)
    reports: dict[str, ImportReport] = {
        "prices": import_asset_prices(
            session,
            symbol=symbol,
            name=name,
            asset_type=asset_type,
            provider_name=provider_name,
            start=start,
            end=end,
            dry_run=dry_run,
        )
    }

    if isinstance(provider, DividendProvider):
        reports["dividends"] = import_asset_dividends(
            session,
            symbol=symbol,
            provider_name=provider_name,
            start=start,
            end=end,
            dry_run=dry_run,
        )

    if isinstance(provider, SplitProvider):
        reports["splits"] = import_asset_splits(
            session,
            symbol=symbol,
            provider_name=provider_name,
            start=start,
            end=end,
            dry_run=dry_run,
        )

    return reports
