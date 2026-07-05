"""M6 — Educational AI System: extends ai_explanations to support Financial
Tutor follow-up questions alongside the Explanation Engine's existing
initial-explanation rows. No new table, no change to any other domain — the
Simulation Engine and every other table are untouched (Founder Specification
Principle 4).

Adds `explanation_type` (native enum: 'initial' | 'follow_up', NOT NULL,
defaulting existing/new rows to 'initial' so no M1-era row or assumption
breaks) and `question_text` (nullable — only populated for a 'follow_up'
row). Also adds a composite index supporting the M6 caching/regeneration-cap
lookups (`WHERE simulation_id = ... AND explanation_type = ...`), which did
not exist as an access pattern before this milestone.

Revision ID: 0003_ai_explanation_type
Revises: 0002_refresh_tokens
Create Date: 2026-07-12

"""

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_ai_explanation_type"
down_revision: str | None = "0002_refresh_tokens"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("CREATE TYPE ai_explanation_type_enum AS ENUM ('initial', 'follow_up')")
    op.execute(
        """
        ALTER TABLE ai_explanations
            ADD COLUMN explanation_type ai_explanation_type_enum DEFAULT 'initial' NOT NULL,
            ADD COLUMN question_text TEXT
        """
    )
    op.execute(
        "CREATE INDEX idx_ai_explanations_simulation_type "
        "ON ai_explanations (simulation_id, explanation_type)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_ai_explanations_simulation_type")
    op.execute("ALTER TABLE ai_explanations DROP COLUMN IF EXISTS question_text")
    op.execute("ALTER TABLE ai_explanations DROP COLUMN IF EXISTS explanation_type")
    op.execute("DROP TYPE IF EXISTS ai_explanation_type_enum")
