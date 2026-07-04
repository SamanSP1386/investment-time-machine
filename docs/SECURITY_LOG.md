# SECURITY_LOG.md

Security review record, one entry per milestone. See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md) and [.claude/SECURITY_POLICY.md](../.claude/SECURITY_POLICY.md) for the governing threat model.

---

## M0 — Repository & Environment Foundation (2026-07-02)

**Risks Found**: None new at this layer — no user data, auth, or financial calculation exists yet to attack. The relevant risk at this stage was process-level: secrets or credentials landing in source control from the very first commit.

**Severity**: N/A (no product attack surface yet).

**Mitigations Implemented**:
- gitleaks secret scanning wired into both CI (`.github/workflows/ci.yml`) and local pre-commit (`.pre-commit-config.yaml`) — active before any real credential ever exists in the repo.
- `.env` is gitignored; `.env.example` contains placeholder values only and documents reserved-but-unset future variables (`JWT_SECRET`, `AI_PROVIDER_API_KEY`, `REDIS_URL`) so their eventual introduction doesn't require guessing the variable name.
- All configuration flows through a single `Settings` class (`app/core/config.py`) — no module reads `os.environ` directly, which prevents ad hoc, unaudited secret handling from starting anywhere in the codebase.
- No direct database access exists yet from any client — not applicable until M1, but the API-mediated-access principle is documented in `.claude/SYSTEM.md` ahead of time.

**Remaining Risks**: None specific to this milestone's scope. Broader platform risks (credential stuffing, secret exposure at runtime, token lifecycle) remain tracked in `.claude/SECURITY_POLICY.md` and apply starting at the milestones that introduce the relevant surface (Auth: M5; API: M4).

**Threats Deferred**: All 13 threats in the Founder Specification's threat model (Part 3.6) remain deferred until their owning milestone is built — none are mitigated by infrastructure alone. Six future threats (prompt injection, data poisoning, model manipulation, supply chain attacks, social engineering, advanced credential theft) remain entirely unmitigated per the source spec and are not addressed by M0.

---

## M1 — Database Schema & Migrations (2026-07-05)

**Risks Found**:
- `audit_logs` records `ip_address` (PII) with no schema-level retention or redaction — a schema can't enforce redaction logic, only the application layer can.
- `audit_logs.entity_id` is a polymorphic reference with no FK, meaning the database cannot guarantee it points at a real row — an application bug could write a dangling reference.
- `users.password_hash` is nullable (to support future OAuth) — meaning the schema alone cannot guarantee every non-OAuth account has a password; that invariant must be enforced by application/service-layer logic, not the database, once Auth (M5) is built.

**Severity**: Low for all three — none are exploitable yet since no ingestion, API, or auth code exists to write through this schema. They are structural risks to carry forward into the milestones that do write to these tables.

**Mitigations Implemented**:
- `audit_logs.user_id` uses `ON DELETE SET NULL` (ADR-009) so the audit trail cannot be destroyed by a user-account deletion — directly supports the "Data Tampering"/"Loss of User Trust" risk categories in the Founder Specification's own risk register (Part 2.21).
- All financial values use `NUMERIC(20,8)`/`NUMERIC(10,6)` — no `FLOAT`/`REAL`/`DOUBLE PRECISION` anywhere (verified by `test_no_float_or_real_columns_hold_financial_values`), closing off floating-point drift as a data-integrity risk before any calculation code exists.
- All ten tables use DB-enforced FK constraints except the one documented, justified exception (`audit_logs.entity_id`) — application-level-only relationships are not used anywhere else, reducing the risk of orphaned/dangling references.
- `calculation_version` present from migration 1 — directly mitigates the Founder Specification's #1-ranked risk (incorrect/non-reproducible simulation results) at the schema level, ahead of the Simulation Engine milestone that will use it.
- Migration verified against a live Postgres instance with zero drift from the models (see Testing Summary) — reduces the risk of a schema/ORM mismatch silently causing incorrect reads/writes later.

**Remaining Risks**: PII retention/redaction policy for `audit_logs.ip_address` is still undefined at the application layer (tracked in `.claude/SECURITY_POLICY.md`, not newly introduced by M1). No row-level security or database-level access control has been configured yet — all access control is deferred to the API layer (M4) and Auth (M5), consistent with the "Simple Security First" philosophy in `.claude/SECURITY_POLICY.md`.

**Threats Deferred**: Unchanged from M0 — no new milestone-owned threats are mitigated or newly exposed by a schema-only milestone. Credential stuffing, secret exposure at runtime, and token lifecycle remain owned by Auth (M5) and API (M4).

---

## M2 — Historical Data Ingestion Pipeline (2026-07-07)

**Risks Found**:
- External providers (yfinance, CoinGecko, FRED) are, by definition, untrusted input sources — a compromised or buggy provider response could attempt to inject malformed, out-of-range, or malicious-looking data into the platform's historical record.
- `FredProvider` sends `FRED_API_KEY` as a query parameter on every request — standard for the FRED API, but means the key appears in plaintext in the request URL (sent over HTTPS; not logged by this codebase, but visible to anything that can see the outbound request, e.g. a proxy).
- The `get_or_create_asset`/`get_or_create_indicator` TOCTOU race (KI-012) is a data-integrity risk under concurrency, not currently an exploitable security risk (no concurrent ingestion paths exist).

**Severity**: Medium for the untrusted-provider-input risk (mitigated, see below); Low for the FRED API key exposure (standard for the API, HTTPS-protected, not logged); Low for the TOCTOU race (no concurrent execution path exists yet to trigger it).

**Mitigations Implemented**:
- Every raw provider record passes through explicit validation (`app/ingestion/validation/rules.py`) before normalization or storage — malformed, out-of-range, non-positive, or future-dated values are rejected with an explicit reason, never silently repaired, coerced, or passed through.
- No provider adapter (`app/ingestion/providers/`) imports `app.models` or `app.core.database` — a structural guarantee (not just a convention) that the Provider Layer cannot write to the database directly, enforced by module boundaries and verified by the fact that every provider test runs with zero database dependency.
- All database writes use parameterized SQLAlchemy Core/ORM constructs (`sqlalchemy.dialects.postgresql.insert`, `select`) — no string-interpolated SQL anywhere in the ingestion pipeline, closing off SQL injection via a malicious symbol/indicator code.
- `FRED_API_KEY` is sourced exclusively from `Settings` (environment variable), never hardcoded, never logged — verified by inspecting every `logger.*` call in the Provider Layer.
- Idempotent upserts (`ON CONFLICT DO NOTHING`) plus per-record SAVEPOINTs (ADR-013) mean a malformed or adversarial record can, at worst, be rejected or fail to insert — it cannot corrupt or discard previously-stored legitimate data in the same batch.
- CoinGecko's known OHLC data-fidelity limitation is disclosed (ADR-012), not hidden — a transparency measure directly serving the "Historical Truth Is Sacred" principle.

**Remaining Risks**: The TOCTOU race in asset/indicator resolution (KI-012) should be closed before any concurrent/scheduled ingestion path is introduced. No rate-limiting or backoff exists for provider requests (KI-015) — not a security risk today (single-operator, manually-triggered imports) but would become an availability concern (self-inflicted rate-limit bans) under automated, frequent scheduling.

**Threats Deferred**: "Malicious Data Import" and "Corrupted Historical Data" (Founder Specification threat model, Part 3.6) are the threats this milestone most directly addresses — validation and idempotent storage are the primary mitigations now in place. "Provider Outage" is partially mitigated (explicit `ProviderUnavailableError`/`NetworkTimeoutError` handling) but retry/backoff (KI-015) remains deferred to a future scheduler milestone.

---

## M3 — Simulation Engine (2026-07-09)

**Risks Found**:
- The Simulation Engine is the platform's "sole source of financial truth" (Founder Specification 2.14.2) — an incorrect calculation here is the single highest-impact risk in the entire platform (ranked #1 in the Founder Specification's own risk register, Part 2.21).
- The split-consistency assumption underlying `close_price`-based calculation (Founder Decision 001) remains empirically unverified against live data (KI-016) — if wrong, historical returns spanning a stock split would be silently incorrect.
- `run_simulation` accepts a caller-supplied `symbol` string used in a database query — reviewed for injection risk.

**Severity**: High for the split-consistency assumption (unverified, but code-level behavior is correct and tested); Low for the symbol-lookup path (parameterized query, no injection vector).

**Mitigations Implemented**:
- Deterministic, explicit, per-event calculation model (Founder Decision 001) — no opaque provider-adjustment black box; every dollar of return traceable to a specific stored price or dividend row, directly serving auditability.
- `adjusted_close_price` is structurally never read by any Simulation Engine code path — verified by a dedicated test (`test_adjusted_close_price_is_never_read_even_when_wildly_different`) that would fail loudly if a future change accidentally introduced a read.
- All database access in `app/simulation/repository.py` uses parameterized SQLAlchemy Core/ORM constructs (`select()`) — no string-interpolated SQL, no injection vector via `symbol` or any other caller-supplied value.
- Every controlled error path is explicit and named (Founder Specification 2.14.14) — no bare `except Exception` anywhere in the Simulation Engine; a genuine unclassified bug is allowed to propagate rather than being silently absorbed into a generic failure.
- Failed simulations are persisted with a descriptive `error_message` (Founder Specification 2.6.24) for debugging, but never with a fabricated or partially-computed result — output fields remain `NULL` on failure, never a best-guess value.
- Determinism verified directly by test (`test_engine_determinism.py`) — the same inputs against the same stored data produce byte-identical Decimal output across 3 consecutive runs, directly satisfying the Founder Specification's "non-negotiable" determinism requirement (2.14.12).

**Remaining Risks**: KI-016 (split-consistency assumption unverified against live data) is carried forward as the single most important open item before this design should be trusted with real user-facing simulations — a concrete manual verification runbook is documented, not just flagged. KI-020 (Dividend Contribution metric not yet exposed) is a scope gap, not a security risk.

**Threats Deferred**: "Incorrect Simulation Results" (Founder Specification's #1-ranked threat) is directly mitigated by this milestone's known-answer and determinism tests, but full closure depends on KI-016's live verification. No new threats introduced — the Simulation Engine has no external network calls, no user-facing endpoint yet (M4), and reads only already-validated data.
