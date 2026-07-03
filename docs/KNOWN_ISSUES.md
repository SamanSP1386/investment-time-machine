# KNOWN_ISSUES.md

Tracks all unresolved issues. Resolved issues remain in this document with a Resolution Date — never deleted. See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md).

---

### KI-001

- **Description**: `docker compose up --build` has not been executed end-to-end against a running Docker daemon; the backend was instead verified independently (venv, ruff, black, pytest) because no Docker daemon was available in the session that authored `docker-compose.yml`.
- **Severity**: Low
- **Status**: Open — Partially Verified
- **Update (M1, 2026-07-05)**: A live Postgres 16 instance matching `docker-compose.yml`'s exact credentials (`itm_user`/`itm_dev`) was reachable at `localhost:5432` during the M1 session, and `alembic upgrade head` was run against it successfully (all 10 tables created, verified via introspection, then a full upgrade/downgrade round-trip confirmed zero drift against the models). This strongly indicates the Postgres service in `docker-compose.yml` is functioning correctly. It does not confirm the **backend container image** builds and runs correctly, since the `docker` CLI itself remains unavailable in this environment — only the Postgres service has been indirectly exercised.
- **Planned Resolution**: Run `docker compose up --build` (the full stack, including the backend image) and confirm `/health` responds before or during M2.
- **Resolution Date**: —

### KI-002

- **Description**: Local development Python observed as 3.11.9; the project targets 3.12+ (ruff/black configured for `py312`, CI pins `3.12`).
- **Severity**: Low
- **Status**: Open
- **Planned Resolution**: Ensure all local dev environments and CI runners use Python 3.12+; CI already pins this correctly.
- **Resolution Date**: —

### KI-003

- **Description**: Founder Specification Part 2.9 — API Architecture was never written in the source document (referenced twice as "Next:" but the document jumps straight to Part 2.10). `.claude/API_STANDARDS.md` fills the gap conservatively but it is provisional, not founder-approved.
- **Severity**: Medium
- **Status**: Open — Pending Founder Approval
- **Planned Resolution**: Founder review of `.claude/API_STANDARDS.md` at or before the API Layer milestone (M4).
- **Resolution Date**: —

### KI-004

- **Description**: Founder Specification Part 2.6.27 — Entity Relationship Design was never written. No consolidated ERD exists in the source spec.
- **Severity**: Low
- **Status**: Derived Artifact Produced — Pending Founder Approval
- **Update (M1, 2026-07-05)**: A derived ERD was produced at `docs/erd.md`, generated from the actual `backend/app/models/` SQLAlchemy models (Mermaid diagram + relationship notes). It is implementation-complete but not founder-reviewed.
- **Planned Resolution**: Founder review of `docs/erd.md`; supersede this status once approved or amended.
- **Resolution Date**: —

### KI-005

- **Description**: The Economic Indicators domain is named in Part 2.6.3 with a required index (2.6.13) but has no physical table specification anywhere in the source document.
- **Severity**: Medium
- **Status**: Implemented Conservatively — Pending Founder Approval
- **Update (M1, 2026-07-05)**: Implemented as a two-table catalog + time-series pair (`economic_indicators`, `economic_indicator_values`), structurally mirroring `assets`/`historical_prices` rather than folding indicators into the asset catalog — see ADR-008 in `docs/ARCHITECTURE_DECISIONS.md`.
- **Planned Resolution**: Founder review of the design at ADR-008; supersede this status once approved or amended.
- **Resolution Date**: —

### KI-006

- **Description**: Token/session lifecycle (JWT vs. cookie, expiry, refresh, revocation) is entirely unspecified in the Founder Specification despite `JWT_SECRET` being named as a required env var.
- **Severity**: Medium-High
- **Status**: Open — Pending Founder Approval
- **Planned Resolution**: Resolve explicitly before the Authentication milestone (M5) begins; recommended default documented in `.claude/SECURITY_POLICY.md`.
- **Resolution Date**: —

### KI-007

- **Description**: PRD (Part 3.1.13, 7 core features) and Functional Requirements (Part 3.3.16) disagree on whether Asset Comparison and Report Generation are core MVP features.
- **Severity**: Low
- **Status**: Open — Pending Founder Approval
- **Planned Resolution**: Confirm with founder before investing significant effort in either feature.
- **Resolution Date**: —

### KI-008

- **Description**: `historical_prices` stores both `close_price` and `adjusted_close_price`, but the schema (M1) does not decide which one feeds the growth/return formula. Using `adjusted_close_price` while also manually reinvesting dividends (Founder Specification Part 2.14.10) would double-count dividends.
- **Severity**: Medium
- **Status**: Open
- **Planned Resolution**: Resolve explicitly at the start of the Simulation Engine milestone (M3) — documented in `.claude/DATABASE_RULES.md`.
- **Resolution Date**: —

### KI-009

- **Description**: `tests/test_migrations.py` applies and then downgrades the migration against whatever `DATABASE_URL` points to. Run locally against the `docker compose` dev database (`itm_dev`), this leaves the dev database schema-less after `pytest` completes. CI is unaffected (it targets a dedicated `itm_test` Postgres service).
- **Severity**: Low
- **Status**: Open
- **Planned Resolution**: Either re-run `alembic upgrade head` after local test runs, or create a dedicated local `itm_test` database and point `DATABASE_URL` at it for test runs — documented in `docs/setup_guide.md`.
- **Resolution Date**: —

### KI-010

- **Description**: `.gitattributes` (added during the Repository Hygiene pass) explicitly sets line-ending rules only for the file types that exist in the repository today (`.py`, `.md`, `.yml`/`.yaml`, `Dockerfile`, `.sh`, `.bat`, `.ps1`). New source file types introduced by future milestones (e.g. `.json`, `.toml`, `.tsx`/`.ts` at the Frontend milestone) will fall back to the `* text=auto eol=lf` catch-all rather than an explicit rule.
- **Severity**: Low
- **Status**: Open
- **Planned Resolution**: Add explicit `.gitattributes` entries for each new source file type as it's introduced, per ADR-010 (`docs/ARCHITECTURE_DECISIONS.md`), rather than relying on the catch-all indefinitely.
- **Resolution Date**: —

### KI-011

- **Description**: The `secret-scan` CI job (`gitleaks/gitleaks-action@v2`) failed intermittently with a non-zero exit after a merge / unrelated-history pull, even though its own log reported "no leaks found." Root cause: the action infers a commit range from the GitHub push/PR event refs to scan only the diff; that range becomes ambiguous once local and remote histories are merged (e.g. after a merge commit or a pull that combines unrelated history), and the action fails to resolve it rather than falling back to a full scan.
- **Severity**: Medium (blocked CI on a false-positive failure — no actual secret was ever found or missed).
- **Status**: Resolved
- **Resolution**: Replaced the wrapper action with a direct `gitleaks detect --source . --redact --verbose` CLI invocation (`.github/workflows/ci.yml`), installed at the pinned version already used in `.pre-commit-config.yaml` (v8.18.4). `gitleaks detect` scans the full git history of the checked-out repository unconditionally rather than diffing two refs, so there is no commit range to resolve and this failure mode cannot recur. Scan strength is unchanged (full history, not weakened to a working-tree-only scan).
- **Resolution Date**: 2026-07-07
