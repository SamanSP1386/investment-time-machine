import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class RefreshToken(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One row per issued refresh token — the durable half of the M5 session
    model (the access token is a short-lived, stateless JWT and is never
    persisted). `created_at` (from TimestampMixin) is the issue time.

    Never stores the raw token value: `token_hash` is a SHA-256 digest, so a
    database read (or leak) alone cannot be replayed as a working credential
    — matching the same "never store the secret itself" discipline already
    applied to `users.password_hash`.

    Rotation and reuse detection (Founder Decision: "Refresh Token
    Rotation"): each successful `/auth/refresh` call revokes the presented
    row (`revoked_at` set) and creates a new one, chained via
    `replaced_by_id`. If a caller ever presents a token whose row is already
    revoked, that is a reuse signal — see `app.auth.service.refresh_tokens`
    — and every active token for that user is revoked as a precaution.

    Multiple rows may exist per user at once (no uniqueness on `user_id`) —
    this is deliberate: it is what lets a future milestone support multiple
    logged-in devices, individual device logout (revoke one row by id), and
    logout-all-devices (revoke every row for a user_id) without a schema
    change. `user_agent`/`ip_address` are captured now, for exactly that
    future device-list UI, even though no route exposes them yet (M5 scope:
    schema and repository primitives only, not a device-management API).
    """

    __tablename__ = "refresh_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replaced_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("refresh_tokens.id"), nullable=True
    )
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")

    __table_args__ = (Index("idx_refresh_tokens_user_id", "user_id"),)

    def __repr__(self) -> str:
        return f"RefreshToken(user_id={self.user_id!r}, revoked={self.revoked_at is not None!r})"
