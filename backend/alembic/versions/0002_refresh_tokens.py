"""Refresh tokens: the durable half of the M5 session model.

Adds a single new table, `refresh_tokens`. No changes to any existing table
or enum. `token_hash` stores a SHA-256 digest of the opaque refresh token
issued to the client — the raw token itself is never persisted, matching the
existing `users.password_hash` discipline of never storing a usable secret
directly. `replaced_by_id` (self-referential FK) supports refresh-token
rotation and reuse detection (see `app/auth/service.py`); `user_agent`/
`ip_address` are captured now for a future device-list/multi-device-logout
feature (schema-ready, not yet exposed via any route — see
docs/ARCHITECTURE_DECISIONS.md ADR-017 and docs/KNOWN_ISSUES.md).

Revision ID: 0002_refresh_tokens
Revises: 0001_initial_schema
Create Date: 2026-07-11

"""

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_refresh_tokens"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE refresh_tokens (
            user_id UUID NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            revoked_at TIMESTAMP WITH TIME ZONE,
            replaced_by_id UUID,
            user_agent VARCHAR(255),
            ip_address VARCHAR(45),
            id UUID DEFAULT gen_random_uuid() NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT pk_refresh_tokens PRIMARY KEY (id),
            CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash),
            CONSTRAINT fk_refresh_tokens_users FOREIGN KEY(user_id) REFERENCES users (id),
            CONSTRAINT fk_refresh_tokens_refresh_tokens
                FOREIGN KEY(replaced_by_id) REFERENCES refresh_tokens (id)
        )
        """
    )
    op.execute("CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS refresh_tokens")
