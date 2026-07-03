from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin, pg_enum
from app.models.enums import AuthMethod

if TYPE_CHECKING:
    from app.models.simulation import Simulation


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Minimal MVP account model. password_hash is nullable because OAuth
    accounts (google_oauth, github_oauth) have no password — auth_method is
    the discriminator. OAuth login itself is not implemented until the
    Authentication milestone; the column exists now to avoid a later migration
    that would need to relax a NOT NULL constraint on live data."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    auth_method: Mapped[AuthMethod] = mapped_column(
        pg_enum(AuthMethod, "auth_method_enum"),
        nullable=False,
        server_default=AuthMethod.EMAIL_PASSWORD.value,
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    simulations: Mapped[list["Simulation"]] = relationship(back_populates="user")

    def __repr__(self) -> str:
        return f"User(email={self.email!r})"
