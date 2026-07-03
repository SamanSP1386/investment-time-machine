import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDPrimaryKeyMixin, pg_enum
from app.models.enums import AuditEventType

if TYPE_CHECKING:
    from app.models.user import User


class AuditLog(UUIDPrimaryKeyMixin, Base):
    """Immutable record of platform events. Deliberately does NOT use
    TimestampMixin: there is no updated_at, by convention, since audit rows
    are never modified after creation.

    entity_id is a polymorphic reference (paired with entity_type) with no DB
    foreign key — a documented, intentional exception to the "FK mandatory
    wherever a relationship exists" rule, because entity_type varies per row
    (simulation, asset, user, ai_explanation, ...). Do not repeat this
    FK-less pattern elsewhere without the same justification.

    user_id IS a real, single-table FK (who triggered the event) and uses
    ON DELETE SET NULL: the audit trail must survive even if the user account
    that generated it is later deleted.

    ip_address is PII. Retention/redaction policy is an application-level
    concern (see .claude/SECURITY_POLICY.md) — not enforced by this schema.
    """

    __tablename__ = "audit_logs"

    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    event_type: Mapped[AuditEventType] = mapped_column(
        pg_enum(AuditEventType, "audit_event_type_enum"), nullable=False
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[Optional["User"]] = relationship()

    __table_args__ = (
        Index("idx_audit_logs_entity_type_entity_id", "entity_type", "entity_id"),
        Index("idx_audit_logs_event_type", "event_type"),
        Index("idx_audit_logs_created_at", "created_at"),
        Index("idx_audit_logs_user_id", "user_id"),
    )

    def __repr__(self) -> str:
        return f"AuditLog(entity_type={self.entity_type!r}, event_type={self.event_type!r})"
