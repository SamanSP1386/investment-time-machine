"""Audit Layer: one audit_logs row per real (non-dry-run) import attempt,
success or failure. Dry runs never call this — persisting an audit row is
itself a database write, which dry run mode must not perform (see
orchestrator.py). The full structured summary (provider, row counts,
duration, warnings/errors) is embedded in `details`, so this single row is
sufficient for monitoring/debugging without a separate "import started"
row — there is no natural entity to attach a start-of-import event to before
the asset/indicator is resolved.
"""

import logging
import uuid

from sqlalchemy.orm import Session

from app.models import AuditLog
from app.models.enums import AuditEventType

logger = logging.getLogger(__name__)


def record_import_audit(
    session: Session,
    *,
    entity_type: str,
    entity_id: uuid.UUID,
    succeeded: bool,
    details: dict,
) -> AuditLog:
    event_type = (
        AuditEventType.DATA_IMPORT_SUCCEEDED if succeeded else AuditEventType.DATA_IMPORT_FAILED
    )
    audit_log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=event_type,
        details=details,
    )
    session.add(audit_log)
    session.flush()
    logger.info(
        "ingestion audit recorded: entity_type=%s entity_id=%s event_type=%s",
        entity_type,
        entity_id,
        event_type.value,
    )
    return audit_log
