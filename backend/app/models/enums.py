import enum


class AssetType(str, enum.Enum):
    """MVP-scoped asset types. Market indexes are cataloged for future benchmark/
    comparison use even though asset search (MVP_RULES.md) exposes only stocks,
    ETFs, and crypto today — the DB layer is intentionally broader than the
    current feature surface, per Part 2.6.28 Future Database Expansion."""

    STOCK = "stock"
    ETF = "etf"
    CRYPTO = "crypto"
    MARKET_INDEX = "market_index"


class SimulationStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class AIGenerationStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class AuthMethod(str, enum.Enum):
    """email_password is the only method implemented at MVP (Auth milestone);
    OAuth values exist now so users.password_hash can be correctly nullable
    from the first migration rather than requiring a later migration to relax
    it — see .claude/DATABASE_RULES.md and ADR-003 in docs/ARCHITECTURE_DECISIONS.md."""

    EMAIL_PASSWORD = "email_password"
    GOOGLE_OAUTH = "google_oauth"
    GITHUB_OAUTH = "github_oauth"


class AuditEventType(str, enum.Enum):
    """Conservative starting set covering the audit categories required by
    .claude/SECURITY_POLICY.md (login attempts, admin actions, data imports,
    AI generations). Adding a value later is a migration (ALTER TYPE ... ADD
    VALUE) — expand deliberately, not speculatively."""

    USER_REGISTERED = "user_registered"
    USER_LOGIN_SUCCEEDED = "user_login_succeeded"
    USER_LOGIN_FAILED = "user_login_failed"
    USER_LOGOUT = "user_logout"
    ADMIN_ACTION = "admin_action"
    DATA_IMPORT_SUCCEEDED = "data_import_succeeded"
    DATA_IMPORT_FAILED = "data_import_failed"
    SIMULATION_CREATED = "simulation_created"
    AI_EXPLANATION_GENERATED = "ai_explanation_generated"
    AI_EXPLANATION_FAILED = "ai_explanation_failed"
