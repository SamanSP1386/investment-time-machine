"""Import Report: the structured, reusable summary every import produces —
whether it succeeds, partially succeeds, fails outright, or runs as a dry
run. Consumed by the orchestrator's caller (CLI today; a scheduler or admin
endpoint in a future milestone), embedded verbatim into the audit log's
`details` JSONB for real imports, and asserted against directly in tests.
"""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal

ImportStatus = Literal["success", "partial", "failed"]


@dataclass
class ImportReport:
    provider: str
    target: str  # asset symbol or economic indicator code
    import_start: datetime = field(default_factory=lambda: datetime.now(UTC))
    import_end: datetime | None = None
    dry_run: bool = False

    rows_downloaded: int = 0
    rows_imported: int = 0
    rows_rejected: int = 0

    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    status: ImportStatus = "success"

    def finish(self) -> None:
        """Call once, after all records have been processed (or after a
        fatal provider error), to freeze the duration and resolve the final
        status. Idempotent-ish: calling it twice just recomputes the same
        fields from the same inputs."""
        self.import_end = datetime.now(UTC)
        if self.errors:
            self.status = "failed"
        elif self.rows_rejected > 0:
            self.status = "partial"
        else:
            self.status = "success"

    @property
    def duration_seconds(self) -> float:
        end = self.import_end or datetime.now(UTC)
        return (end - self.import_start).total_seconds()

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "target": self.target,
            "import_start": self.import_start.isoformat(),
            "import_end": self.import_end.isoformat() if self.import_end else None,
            "duration_seconds": round(self.duration_seconds, 3),
            "dry_run": self.dry_run,
            "rows_downloaded": self.rows_downloaded,
            "rows_imported": self.rows_imported,
            "rows_rejected": self.rows_rejected,
            "warnings": list(self.warnings),
            "errors": list(self.errors),
            "status": self.status,
        }
