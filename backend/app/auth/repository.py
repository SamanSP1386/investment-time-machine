"""Read/write data access for the Identity system. Deliberately separate
from `app.simulation.repository` (read-only) and `app.ingestion.storage`
(write-only, for market data) — this is its own domain's data-access layer,
matching the project's established one-repository-per-domain pattern.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import RefreshToken, User


class AuthRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_user_by_email(self, email: str) -> User | None:
        return self._session.execute(select(User).where(User.email == email)).scalar_one_or_none()

    def get_user_by_id(self, user_id: uuid.UUID) -> User | None:
        return self._session.get(User, user_id)

    def create_user(self, *, email: str, password_hash: str, display_name: str) -> User:
        user = User(email=email, password_hash=password_hash, display_name=display_name)
        self._session.add(user)
        self._session.flush()
        return user

    def create_refresh_token(
        self,
        *,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
        user_agent: str | None,
        ip_address: str | None,
    ) -> RefreshToken:
        token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        self._session.add(token)
        self._session.flush()
        return token

    def get_refresh_token_by_hash(self, token_hash: str) -> RefreshToken | None:
        return self._session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        ).scalar_one_or_none()

    def revoke_refresh_token(
        self, token: RefreshToken, *, replaced_by_id: uuid.UUID | None = None
    ) -> None:
        token.revoked_at = datetime.now(UTC)
        token.replaced_by_id = replaced_by_id
        self._session.flush()

    def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        """Bulk-revokes every currently-active refresh token for a user —
        the "logout all devices" primitive. Not called from any route yet
        (M5 scope is single-session logout only); used internally today only
        as the refresh-token-reuse-detection precaution (see
        `app.auth.service.refresh_tokens`). Kept here, not inline, so a
        future "logout all devices" endpoint can call it directly with no
        new repository method needed — see docs/ARCHITECTURE_DECISIONS.md
        ADR-017."""
        self._session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )
        self._session.flush()
