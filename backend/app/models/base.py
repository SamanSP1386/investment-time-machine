import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, MetaData, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Enforces the .claude/DATABASE_RULES.md naming convention (idx_<table>_<column>,
# fk_<table>_<referenced_table>) automatically for every index/constraint, so it
# never depends on a developer remembering to name things by hand.
NAMING_CONVENTION = {
    "ix": "idx_%(table_name)s_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class UUIDPrimaryKeyMixin:
    """UUID primary key, DB-generated. Mandatory on every table per DATABASE_RULES.md."""

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )


def pg_enum(enum_cls: type[enum.Enum], name: str) -> Enum:
    """Native Postgres ENUM using each member's .value (e.g. "stock") as the
    stored/DDL label, not the member .name (e.g. "STOCK") — SQLAlchemy's
    Enum() defaults to .name, which would silently diverge from the lowercase
    string values documented throughout .claude/DATABASE_RULES.md and the
    Founder Specification."""
    return Enum(
        enum_cls,
        name=name,
        native_enum=True,
        values_callable=lambda cls: [member.value for member in cls],
    )


class TimestampMixin:
    """created_at/updated_at, TIMESTAMPTZ, UTC. Mandatory on every table per
    DATABASE_RULES.md, except audit_logs (immutable by convention: created_at only)."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
