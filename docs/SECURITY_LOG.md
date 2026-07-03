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
