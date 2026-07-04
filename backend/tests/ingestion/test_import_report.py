from app.ingestion.reports import ImportReport


def test_report_finishes_with_success_status_when_no_errors_or_rejections() -> None:
    report = ImportReport(provider="yfinance", target="AAPL")
    report.rows_downloaded = 10
    report.rows_imported = 10

    report.finish()

    assert report.status == "success"
    assert report.import_end is not None


def test_report_finishes_with_partial_status_when_rows_rejected() -> None:
    report = ImportReport(provider="yfinance", target="AAPL")
    report.rows_downloaded = 10
    report.rows_imported = 8
    report.rows_rejected = 2

    report.finish()

    assert report.status == "partial"


def test_report_finishes_with_failed_status_when_errors_present() -> None:
    report = ImportReport(provider="yfinance", target="AAPL")
    report.errors.append("provider unavailable")

    report.finish()

    assert report.status == "failed"


def test_report_errors_take_precedence_over_rejections() -> None:
    report = ImportReport(provider="yfinance", target="AAPL")
    report.rows_rejected = 3
    report.errors.append("fatal")

    report.finish()

    assert report.status == "failed"


def test_duration_seconds_is_non_negative_before_finish() -> None:
    report = ImportReport(provider="yfinance", target="AAPL")
    assert report.duration_seconds >= 0


def test_to_dict_contains_all_required_fields() -> None:
    report = ImportReport(provider="yfinance", target="AAPL", dry_run=True)
    report.rows_downloaded = 5
    report.rows_imported = 5
    report.warnings.append("some warning")
    report.finish()

    payload = report.to_dict()

    for key in (
        "provider",
        "target",
        "import_start",
        "import_end",
        "duration_seconds",
        "dry_run",
        "rows_downloaded",
        "rows_imported",
        "rows_rejected",
        "warnings",
        "errors",
        "status",
    ):
        assert key in payload

    assert payload["provider"] == "yfinance"
    assert payload["target"] == "AAPL"
    assert payload["dry_run"] is True
    assert payload["warnings"] == ["some warning"]
