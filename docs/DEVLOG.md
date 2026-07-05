# DEVLOG.md

Permanent engineering journal. One entry is appended per completed milestone. **Never modify a previous entry — only append.** See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md) for the policy governing this file.

---

## 2026-07-02 — M0: Repository & Environment Foundation

**Version**: 0.1.0

**Objective**: Establish a working, disciplined repository foundation — local dev loop, migrations tooling, and CI — that every later milestone builds on, without any product logic yet.

**Scope**: Backend FastAPI skeleton, PostgreSQL via Docker Compose, Alembic initialized (no models), `/health` endpoint, pytest smoke test, ruff/black/pre-commit, GitHub Actions CI with gitleaks secret scanning, `.env.example`, `.gitignore`, setup guide. Explicitly excluded from scope: database models, ingestion, simulation logic, auth, frontend logic, Redis.

**Implementation Summary**: Built a minimal FastAPI app (`app/main.py`) backed by a `pydantic-settings`-based Core Configuration Layer (`app/core/config.py`, `app/core/logging.py`) that centralizes all environment-variable reads and startup logging — no module reads `os.environ` directly outside this layer, and FastAPI `Depends` is the intended DI mechanism going forward. Alembic was initialized pointed at `DATABASE_URL` via `Settings`, with `target_metadata = None` as an explicit placeholder until the Database Schema milestone introduces models. Docker Compose defines Postgres and the backend only — Redis was deliberately left out (see ADR-004 in `ARCHITECTURE_DECISIONS.md`). CI runs ruff, black --check, pytest, and a gitleaks secret scan on every push/PR; pre-commit mirrors the same checks locally.

**Files Created**: `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/core/logging.py`, `backend/app/__init__.py`, `backend/app/core/__init__.py`, `backend/tests/test_health.py`, `backend/tests/__init__.py`, `backend/pyproject.toml`, `backend/requirements.txt`, `backend/requirements-dev.txt`, `backend/Dockerfile`, `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/script.py.mako`, `backend/alembic/versions/.gitkeep`, `docker-compose.yml`, `.pre-commit-config.yaml`, `.github/workflows/ci.yml`, `.env.example`, `.gitignore`, `docs/setup_guide.md`.

**Files Modified**: `.claude/SYSTEM.md` (Redis wording), `.claude/CODING_STANDARDS.md` (tooling + Core Configuration Layer section), `.claude/GIT_WORKFLOW.md` (Conventional Commits), `.claude/MVP_RULES.md` (Financial Analytics milestone split).

**Architecture Decisions**: See `ARCHITECTURE_DECISIONS.md` ADR-001 through ADR-007 (deploy trigger resolution, `calculation_version` non-negotiable, nullable output columns, Redis deferral, Conventional Commits adoption, Auth-before-Frontend reordering, Financial Analytics milestone split). ADR-004 and ADR-005 were made during this milestone; ADR-001, 002, 003, 006, 007 were made during the preceding architecture-review pass and are logged here retroactively per the new documentation policy.

**Problems Encountered**: (1) `ruff` flagged an unsorted import block in `alembic/env.py`. (2) No Docker daemon available in the working sandbox, so `docker compose up` could not be executed end-to-end in this session.

**Solutions**: (1) Fixed via `ruff check --fix .`, re-verified clean. (2) Backend verified independently instead — dependencies installed into a local venv, `ruff check .`, `black --check .`, and `pytest -v` all run and passed directly against the FastAPI app; `docker-compose.yml` and `Dockerfile` follow a standard, widely-used pattern but a real `docker compose up --build` pass is still owed before M1 begins (tracked as KI-001).

**Lessons Learned**: Wiring CI + pre-commit + secret scanning at commit #1, rather than deferring them as "future workflow expansion" (as the Founder Specification itself allows), costs almost nothing and closes the "Documentation Drift" / "Secret Exposure" threat-model gaps before any real secret or feature exists to leak.

**Security Review Summary**: See `SECURITY_LOG.md` M0 entry. No secrets committed; gitleaks active in CI and pre-commit; all configuration flows through `Settings`.

**Testing Summary**: See `TESTING_REPORT.md` M0 entry. 1 unit test (`test_health_check_returns_success`), 1/1 passing, 100% coverage of the only endpoint that exists.

**Technical Debt Introduced**: `alembic/env.py` has `target_metadata = None` — documented, intentional, temporary placeholder until the Database Schema milestone. No other debt introduced.

**Performance Notes**: See `PERFORMANCE_LOG.md` M0 entry. No meaningful performance surface yet (single health-check endpoint, no DB queries).

**Recruiter Value**: Medium. Demonstrates Docker/CI/tooling discipline from the first commit — the foundation that makes later, higher-value milestones (Simulation Engine, Data Ingestion) credible rather than ad hoc. Not itself a differentiator.

**Production Readiness Score**: 2/10 — appropriate for a foundation milestone with zero product logic. Blocking items before this number moves: real database schema (M1), and a verified (not just authored) Docker Compose run (KI-001).

**Next Milestone**: M1 — Database Schema & Migrations.

---

## 2026-07-05 — M1: Database Schema & Migrations

**Version**: 0.2.0

**Objective**: Implement the nine Founder Specification database domains as SQLAlchemy 2.0 models and a corresponding Alembic migration, with the three founder-approved fixes (nullable simulation/AI-explanation outputs, `calculation_version` from migration 1, conservative Economic Indicators design) applied, plus derived ERD documentation.

**Scope**: SQLAlchemy models, one initial Alembic migration, PostgreSQL native enums, UUID PKs, UTC timestamps, relationships, constraints, indexes, tests, ERD, and this documentation update. Explicitly excluded: ingestion, API endpoints, simulation logic, authentication, frontend logic.

**Implementation Summary**: Built `backend/app/models/base.py` with a shared `Base` (naming-convention-enforced `MetaData`), `UUIDPrimaryKeyMixin`, `TimestampMixin`, and a `pg_enum()` helper. Defined five native Postgres enums (`app/models/enums.py`) and ten tables across nine domains (`assets`, `historical_prices`, `dividends`, `stock_splits`, `economic_indicators` + `economic_indicator_values`, `users`, `simulations`, `audit_logs`, `ai_explanations`). Applied all three approved fixes directly in the models rather than as follow-up patches. Since no Docker/live Postgres was expected to be available (per M0's KI-001), the initial migration's DDL was generated mechanically from the models via SQLAlchemy's offline DDL compiler (`create_mock_engine`) rather than hand-retyped, to guarantee zero drift — this turned out to matter less than expected, because a live Postgres 16 instance (matching the M0 `docker-compose.yml` credentials exactly) was unexpectedly reachable in this session, so the migration was additionally verified end-to-end: applied, diffed against the models (zero drift), downgraded cleanly, and re-applied to leave the dev database at `head`.

**Files Created**: `backend/app/models/__init__.py`, `base.py`, `enums.py`, `asset.py`, `historical_price.py`, `dividend.py`, `stock_split.py`, `economic_indicator.py`, `user.py`, `simulation.py`, `audit_log.py`, `ai_explanation.py`; `backend/alembic/versions/0001_initial_schema.py`; `backend/tests/test_models.py` (25 tests), `backend/tests/test_migrations.py` (2 tests); `docs/erd.md`.

**Files Modified**: `backend/alembic/env.py` (`target_metadata = Base.metadata`, replacing the M0 placeholder), `backend/pyproject.toml` (registered `integration` pytest marker), `.github/workflows/ci.yml` (added a Postgres service + `alembic upgrade head` step), `docs/setup_guide.md` (migration commands, test/dev-DB interaction note), `.claude/DATABASE_RULES.md` (updated from "gaps to fill" to "as implemented"), `docs/KNOWN_ISSUES.md` (KI-001 updated, KI-004/KI-005 updated, KI-008/KI-009 added), `docs/ARCHITECTURE_DECISIONS.md` (ADR-008, ADR-009 added).

**Architecture Decisions**: ADR-008 (Economic Indicators as a separate catalog + time-series pair, not folded into `assets`) and ADR-009 (`audit_logs.user_id` uses `ON DELETE SET NULL`) — both in `docs/ARCHITECTURE_DECISIONS.md`. ADR-002 and ADR-003 (from the M0 entry) were implemented, not just planned, in this milestone.

**Problems Encountered**: (1) SQLAlchemy's `Enum(PyEnum)` defaults to storing the Python enum member **name** (`"STOCK"`) rather than the `.value` (`"stock"`) I'd defined — would have silently diverged from every lowercase value documented in `.claude/DATABASE_RULES.md` and the Founder Specification. (2) `historical_prices` initially carried a standalone `asset_id` index in addition to a composite `(asset_id, price_date)` index — redundant, since the composite's leading column already serves asset-only lookups. (3) Minor ruff/black issues (line length, one unused test variable) on first pass.

**Solutions**: (1) Added a `pg_enum()` helper (`app/models/base.py`) with an explicit `values_callable` forcing `.value` usage — caught by inspecting the generated DDL directly before it ever reached a migration file, specifically because a live Postgres was reachable and I dumped real DDL to check it. (2) Dropped the redundant index, documented the reasoning inline. (3) `ruff --fix` / `black .`, re-verified clean.

**Lessons Learned**: Generating migration DDL mechanically from the models (via a mock engine) rather than hand-typing it eliminates an entire class of drift bugs, and is worth doing even when a live database *might* be available — it removes the question entirely rather than trusting careful manual transcription. Separately: always dump and read the actual generated DDL for enum/default-heavy schemas before trusting an ORM's defaults — the enum name-vs-value behavior is a well-known but easy-to-miss SQLAlchemy gotcha that would have shipped silently wrong otherwise.

**Security Review Summary**: See `SECURITY_LOG.md` M1 entry. No new exploitable risk (no code reads/writes this schema yet); structural risks noted for carry-forward: `audit_logs.ip_address` PII retention/redaction is an application-layer responsibility, `users.password_hash` nullability requires future application-level invariant enforcement.

**Testing Summary**: See `TESTING_REPORT.md` M1 entry. 27 tests total (1 from M0 + 25 metadata-only model tests + 2 DB-integration tests), all passing. The DB-integration tests ran for real against a live Postgres 16 instance in this session (not skipped) and confirmed zero schema drift.

**Technical Debt Introduced**: None judged unintentional. Two items are explicitly flagged pending founder review rather than treated as settled: the Economic Indicators two-table design (ADR-008, KI-005) and the derived ERD (KI-004). One new minor operational note: running `pytest` locally against the same database as `docker compose`'s dev Postgres will downgrade it — documented in `docs/setup_guide.md` and KI-009, not treated as a blocking issue.

**Performance Notes**: See `PERFORMANCE_LOG.md` M1 entry. No representative query workload exists yet; one proactive indexing decision made (dropped redundant `historical_prices.asset_id`-only index) given this table's ~50M-row projection.

**Recruiter Value**: High. This milestone is a strong, concrete artifact: a financial-domain schema with deliberate NUMERIC precision, native enum handling (including catching a real ORM footgun), a documented FK-less exception, delete-behavior reasoning (ON DELETE SET NULL for audit integrity), and a migration verified against a live database with an automated zero-drift check — the kind of detail that reads well in a technical interview.

**Production Readiness Score**: 4/10 — the schema itself is solid and verified, but nothing yet reads or writes through it in a real workflow (no ingestion, no API, no auth), and two design choices (Economic Indicators shape, ERD) remain pending founder sign-off. Blocking items before this number moves: Data Ingestion (M2) actually exercising this schema at volume, and founder review of KI-004/KI-005.

**Next Milestone**: M2 — Historical Data Ingestion Pipeline.

---

## 2026-07-06 — Repository Hygiene Pass (not a feature milestone)

**Version**: 0.2.1

**Objective**: Improve repository consistency and developer experience ahead of M2 — no application logic, no architecture change. Standardize line endings across Windows/Linux/Docker/CI, add editor defaults, and clean up structural issues found along the way.

**Scope**: `.gitattributes`, `.editorconfig`, `.gitignore` review, pre-commit hygiene hooks, a stray nested git repository, and documentation of the LF-standardization rationale. Explicitly excluded: any change to application behavior, database schema, or architecture.

**Implementation Summary**: Added `.gitattributes` forcing LF for `.py`/`.md`/`.yml`/`.yaml`/`Dockerfile`/`.sh`, CRLF for `.bat`/`.ps1` (neither of which exist in the repo yet, but the rule is now in place for when they do), and explicit `binary` declarations for `.pdf`/`.docx`/common image formats. Added `.editorconfig` mirroring the same line-ending rules plus UTF-8, 4-space indentation, required final newline, and trailing-whitespace trimming (except Markdown, where trailing double-spaces are an intentional line-break marker). Ran `git add --renormalize .` to confirm the existing tree was already fully LF-consistent (it was — no files changed). Extended `.gitignore` with a few generically useful entries (`.mypy_cache/`, `.coverage.*`, `*.log`, `*.bak`, `*.orig`, `*.rej`) not currently exercised by the toolchain but harmless and standard. Added five hygiene hooks from `pre-commit/pre-commit-hooks` (trailing-whitespace, end-of-file-fixer, mixed-line-ending, check-merge-conflict, check-added-large-files, check-yaml, check-toml) so the new `.editorconfig`/`.gitattributes` rules are enforced automatically, not just documented. While reviewing directory structure, found and removed an empty, commit-less, remote-less nested `.git` directory inside `backend/` — almost certainly an accidental `git init` from earlier tooling, verified to contain zero history before deletion.

**Files Created**: `.gitattributes`, `.editorconfig`.

**Files Modified**: `.gitignore` (additional ignore patterns), `.pre-commit-config.yaml` (hygiene hooks added), `docs/ARCHITECTURE_DECISIONS.md` (ADR-010), `docs/KNOWN_ISSUES.md` (KI-010).

**Files Removed**: `backend/.git/` (stray nested repository — zero commits, zero refs, zero remotes; confirmed empty before removal).

**Architecture Decisions**: ADR-010 — Standardize on LF line endings, CRLF only for Windows-native scripts (`docs/ARCHITECTURE_DECISIONS.md`). Not an architecture change in the application sense; recorded as an ADR because it's a deliberate, project-wide, hard-to-reverse-cheaply convention.

**Problems Encountered**: (1) A stray nested `.git` directory inside `backend/` was discovered during directory-consistency review — not caused by this pass, but surfaced by it. (2) None of the line-ending rules actually changed any file content, since the repository was already LF-consistent — the risk the ADR addresses was latent, not yet manifested.

**Solutions**: (1) Verified the nested repo had no commits (`git log` inside it: "does not have any commits yet"), no refs, and no configured remote, before deleting it — nothing of value was at risk. (2) `git add --renormalize .` confirmed zero content changes; the new `.gitattributes`/`.editorconfig` are preventative, not corrective.

**Lessons Learned**: A hygiene pass is a good moment to check for structural artifacts (nested `.git` folders, accidentally-tracked build output) that don't show up in day-to-day feature work — nobody notices a stray nested repo until it causes a confusing `git add` warning or submodule-like behavior down the line.

**Security Review Summary**: No security surface touched. `check-added-large-files` (new pre-commit hook) incidentally guards against accidentally committing an oversized binary (e.g. a database dump) in the future.

**Testing Summary**: No new tests (none applicable to configuration files). Full existing suite re-run to confirm no regression: `ruff check .`, `black --check .`, `pytest -v` — 27/27 passed, unchanged from the M1 baseline. `.pre-commit-config.yaml` validated as well-formed YAML.

**Technical Debt Introduced**: None. One debt-adjacent note recorded (KI-010): `.gitattributes` only covers file types that exist today; future milestones must extend it deliberately rather than relying on the catch-all rule indefinitely.

**Performance Notes**: Not applicable.

**Recruiter Value**: Low-to-Medium on its own, but signals exactly the kind of engineering discipline (cross-platform consistency, catching a stray nested repo, enforcing conventions via tooling rather than tribal knowledge) that reads well alongside the higher-value milestones.

**Production Readiness Score**: Not applicable to a hygiene pass — does not change the M1 score (4/10).

**Next Milestone**: M2 — Historical Data Ingestion Pipeline.

---

## 2026-07-07 — CI Reliability Fix: Stable Secret Scanning (not a feature milestone)

**Version**: 0.2.2

**Objective**: Fix a GitHub Actions failure in the `secret-scan` job — `gitleaks/gitleaks-action@v2` was failing intermittently on an ambiguous commit range after a merge, despite reporting "no leaks found." No secret leak was ever involved; this is a CI reliability fix only.

**Scope**: `.github/workflows/ci.yml` `secret-scan` job only. `lint-and-test` job left unchanged. No application logic touched.

**Implementation Summary**: The wrapper action `gitleaks/gitleaks-action@v2` infers a commit range from the GitHub event's push/PR refs to scan only the diff — that inference fails once local/remote history is merged (a merge commit or an unrelated-history pull leaves no single unambiguous range), and the action exits non-zero even when the underlying scan found nothing. Replaced it with a direct `gitleaks detect --source . --redact --verbose` CLI call: `detect` scans the full git history of the checked-out repository unconditionally, so there is no ref-to-ref range to resolve and this failure mode cannot occur. Installed gitleaks by downloading the pinned v8.18.4 Linux release binary directly (matching the version already pinned in `.pre-commit-config.yaml`, so local pre-commit scans and CI scans are now on the same version). No SARIF upload existed before this fix and none was added, per the "keep tests/lint/format unchanged, CI-reliability-only" scope.

**Files Modified**: `.github/workflows/ci.yml` (secret-scan job only), `docs/KNOWN_ISSUES.md` (KI-011, logged and resolved in the same entry).

**Architecture Decisions**: None — this is a CI implementation detail, not a design decision warranting an ADR.

**Problems Encountered**: The prior CI approach (a maintained wrapper action) offered less control over exactly how the commit range was computed, and no documented flag was reachable to force a full-repository scan instead of an event-based range within that action.

**Solutions**: Bypassed the wrapper entirely in favor of the underlying `gitleaks` CLI, which has always supported unconditional full-history scanning via `detect --source .` — verified the exact release download URL, archive contents, and extraction command locally before committing to this approach (the Linux binary itself couldn't be executed in this Windows-based session, but the download/extract steps were confirmed to produce a valid Linux ELF executable matching what the `ubuntu-latest` runner needs).

**Lessons Learned**: Wrapper GitHub Actions that infer scan scope from event context are convenient in the common case but introduce a failure mode (ambiguous ref resolution) that a direct CLI invocation with an explicit, unconditional scope avoids entirely. When a CI tool's automatic behavior is the source of flakiness, replacing "automatic" with "explicit and unconditional" is usually the more stable fix, even at the cost of a slightly longer workflow step.

**Security Review Summary**: Secret-scanning coverage is unchanged or arguably stronger — the new command scans full git history every run rather than depending on a correctly-resolved event diff range. No secrets were exposed by the original bug; it was a false-positive CI failure, not a missed scan.

**Testing Summary**: `lint-and-test` job unaffected (not modified). Locally re-ran `ruff check .`, `black --check .`, `pytest -v` (27/27 passed) to confirm the CI-only change had zero effect on the application test suite, as expected. CI YAML re-validated as well-formed; the gitleaks download URL, archive structure, and extraction command were verified locally against the exact pinned version and platform CI will use.

**Technical Debt Introduced**: None.

**Performance Notes**: Not applicable — CI-step change only, no measurable effect on application performance. The new step adds a small, one-time binary download to the `secret-scan` job's runtime.

**Recruiter Value**: Low-to-Medium on its own, but demonstrates the ability to diagnose a CI tool's actual failure mechanism (not just retry-and-hope) and fix it at the right layer.

**Production Readiness Score**: Not applicable — CI-only fix, does not change the M1 score.

**Next Milestone**: M2 — Historical Data Ingestion Pipeline.

---

## 2026-07-07 — M2: Historical Data Ingestion Pipeline

**Version**: 0.3.0

**Objective**: Build the Historical Data Ingestion Pipeline — Retrieve → Validate → Normalize → Store → Audit — for yfinance (stocks/ETFs), CoinGecko (crypto), and FRED (economic indicators), with dry-run support, structured Import Reports, and explicit error handling. No simulation logic, no API endpoints, no auth, no frontend.

**Scope**: Five independent layers (Provider, Validation, Normalization, Storage, Audit), an orchestrator tying them together, a CLI entrypoint, and the Core Configuration Layer addition needed to support it (`app/core/database.py`). Full test suite across all layers. Explicitly excluded: simulation calculations, API endpoints, business logic beyond ingestion, authentication, frontend, AI.

**Implementation Summary**: Provider Layer adapters (`app/ingestion/providers/`) communicate only — no validation, no DB access — using capability protocols (`PriceProvider`, `DividendProvider`, `SplitProvider`, `IndicatorProvider`, ADR-011) rather than one forced-uniform interface, since CoinGecko has no dividends/splits and FRED has no prices at all. yfinance is wrapped via a single isolated `_fetch_history` method (patchable in tests without touching yfinance internals); CoinGecko and FRED use injectable `httpx.Client` instances (`httpx.MockTransport` in tests — zero live network calls anywhere in the suite). CoinGecko's free-tier date-range endpoint only returns one price point per day, not true OHLC — rather than fabricate High/Low, the adapter sets O=H=L=C and the orchestrator attaches an explicit disclosure warning to every affected report (ADR-012). Validation (`app/ingestion/validation/rules.py`) returns rejection reasons instead of raising, so one bad record never aborts an entire import; malformed values are coerced-and-checked via `Decimal(str(value))`, never silently zeroed (FRED's "." missing-value marker is preserved as `None`, not 0). Normalization converts to platform-standard, Decimal-typed dicts matching the M1 schema exactly. Storage (`IngestionRepository`) resolves/creates `Asset`/`EconomicIndicator` rows and performs idempotent `INSERT ... ON CONFLICT DO NOTHING ... RETURNING` upserts per table, each wrapped in its own SAVEPOINT (ADR-013) so a genuine constraint violation can't silently discard rows already upserted earlier in the same batch. Audit (`app/ingestion/audit/`) writes exactly one `audit_logs` row per real (non-dry-run) import attempt — success or failure — with the full Import Report embedded in `details`; dry runs write none, since persisting an audit row would itself violate "dry run must not modify the database" (ADR-014). The orchestrator (`app/ingestion/orchestrator.py`) wires all five layers together for `import_asset_prices`/`import_asset_dividends`/`import_asset_splits`/`import_economic_indicator`, plus an `import_asset` convenience wrapper that includes dividends/splits only for capability-checked providers. A thin `argparse` CLI (`app/ingestion/cli.py`) makes the pipeline runnable today without inventing an API endpoint or scheduler.

**Files Created**: `backend/app/core/database.py`; `backend/app/ingestion/__init__.py`, `exceptions.py`, `orchestrator.py`, `cli.py`; `backend/app/ingestion/providers/{__init__,base,yfinance_provider,coingecko_provider,fred_provider}.py`; `backend/app/ingestion/validation/{__init__,rules}.py`; `backend/app/ingestion/normalization/{__init__,normalizers}.py`; `backend/app/ingestion/storage/{__init__,repository}.py`; `backend/app/ingestion/audit/{__init__,recorder}.py`; `backend/app/ingestion/reports/{__init__,import_report}.py`; `backend/tests/ingestion/` — `conftest.py`, `test_providers_{yfinance,coingecko,fred}.py`, `test_validation.py`, `test_normalization.py`, `test_import_report.py`, `test_storage.py`, `test_audit.py`, `test_orchestrator.py` (63 new tests total); `docs/MILESTONE_REPORTS/M2_REPORT.md`.

**Files Modified**: `backend/app/core/config.py` (`fred_api_key`, `ingestion_http_timeout_seconds`), `.env.example`, `backend/requirements.txt` (`yfinance`, `httpx`, `requests`), `backend/requirements-dev.txt` (removed now-redundant `httpx` line), `docs/ARCHITECTURE_DECISIONS.md` (ADR-011–014), `docs/KNOWN_ISSUES.md` (KI-012–015).

**Architecture Decisions**: ADR-011 (provider capability protocols over one uniform interface), ADR-012 (CoinGecko OHLC approximation disclosed, not fabricated), ADR-013 (per-record SAVEPOINT in storage upserts), ADR-014 (single audit row per real import, none for dry runs) — all in `docs/ARCHITECTURE_DECISIONS.md`.

**Problems Encountered**: (1) A naive Storage Layer implementation would have let one genuine constraint violation mid-batch silently discard every row already upserted in the same transaction (Postgres aborts the whole transaction on the first unhandled statement error). (2) CoinGecko's only arbitrary-date-range endpoint doesn't provide true OHLC, only a single daily price point — discovered while researching the API, before any code was written against a wrong assumption. (3) Running the full test suite (which includes M1's `test_migrations.py` upgrade/downgrade cycle) left the dev database schema-less, causing 13 otherwise-passing ingestion tests to fail with "relation does not exist" on a subsequent standalone run.

**Solutions**: (1) Wrapped each upsert in a SAVEPOINT (`session.begin_nested()`) so a failure rolls back only that one insert, not the whole import — directly verified by a dedicated test. (2) Designed the CoinGecko adapter around the honest constraint from the start (O=H=L=C, explicit disclosure) rather than discovering the limitation after building something that assumed real OHLC was available. (3) Re-ran `alembic upgrade head` — the same known, already-documented M1 behavior (KI-009), not a new defect.

**Lessons Learned**: Designing dry-run support and the Import Report *together* with the real-execution path (rather than bolting dry-run on afterward as a special case) meant the two code paths share almost all logic, differing only at the exact point of a database write — this structural approach is what makes the dry-run/real-run parity guarantees checkable by tests rather than just asserted by comment. Separately: researching a third-party API's actual constraints (CoinGecko's OHLC limitation) before writing the adapter avoided building something that would have silently fabricated data — worth the extra research time up front.

**Security Review Summary**: See `docs/SECURITY_LOG.md` M2 entry. No provider adapter has database access (structural, not just conventional); all writes are parameterized (no raw SQL); `FRED_API_KEY` sourced from environment only, never logged; idempotent upserts + per-record SAVEPOINTs mean a malformed record can be rejected but never corrupt or discard prior legitimate work.

**Testing Summary**: See `docs/TESTING_REPORT.md` M2 entry. 63 new tests (47 non-DB, mocked/isolated; 14 DB-integration, transaction-isolated and rolled back). Full suite: 93/93 passing. Every required error-handling category has dedicated coverage.

**Technical Debt Introduced**: Documented and tracked, not silent — KI-012 (TOCTOU race in asset/indicator get-or-create, acceptable for single-process MVP ingestion), KI-013 (CoinGecko OHLC fidelity limitation), KI-014 (no ticker-to-CoinGecko-id mapping), KI-015 (no retry/backoff or rate-limit awareness — a scheduler-milestone concern, not this one's).

**Performance Notes**: See `docs/PERFORMANCE_LOG.md` M2 entry. No representative production-scale import has been run; in-memory (non-streaming) record handling is a known, documented scale limitation (KI-015-adjacent), not yet a problem at MVP asset-catalog volumes.

**Recruiter Value**: High. This is a genuine data-engineering artifact: multi-provider abstraction via capability protocols (not a single leaky interface), idempotent storage design with a real, subtle correctness bug (batch-wide rollback) caught and fixed via SAVEPOINT, an honest engineering tradeoff disclosed rather than papered over (CoinGecko OHLC), and dry-run support that is structurally guaranteed rather than a bolted-on flag.

**Production Readiness Score**: 5/10 — the pipeline mechanism is solid, tested, and idempotent, but has never ingested a real multi-year dataset, has no scheduler/automation, no retry/backoff, and one real data-fidelity compromise (CoinGecko OHLC) that a future Financial Analytics milestone must account for. Blocking items before this number moves: a real backfill run against production-scale date ranges, and resolution of KI-012 before any concurrent ingestion path is introduced.

**Next Milestone**: M3 — Simulation Engine.

---

## 2026-07-08 — M3 Design Review & Founder Decision 001 (not a coding milestone)

**Version**: 0.3.1

**Objective**: Before implementing the Simulation Engine, re-validate the proposed calculation model directly against the Founder Specification (not memory), formalize the founder's decision to use `close_price` instead of the specification's own stated `adjusted_close_price` recommendation, and complete a design review (weaknesses, edge cases, risks, testing challenges) before any code was written.

**Scope**: Documentation only — `docs/simulation_formulas.md` (rewritten to APPROVED status), `docs/FOUNDER_DECISIONS.md` (new, Founder Decision 001), ADR-015, `docs/KNOWN_ISSUES.md` (KI-016 through KI-018 added), `.claude/DATABASE_RULES.md` updated. No application code.

**Implementation Summary**: Re-read Part 2.14 (Simulation Engine Architecture, full), Parts 2.6.7/2.6.20/2.6.21/2.6.22/2.6.24 (Database Architecture sections), Parts 3.3.2–3.3.4 (Functional Requirements), and Part 3.5 (Financial Analytics) directly from the extracted specification text. Discovered that the specification's own text recommends `adjusted_close_price` as the MVP default in three separate places (2.6.7, 2.6.20, 2.6.22) — a genuine, repeated deviation the founder's decision explicitly overrides. Recorded as Founder Decision 001, with the full citation trail, in `docs/FOUNDER_DECISIONS.md`; the engineering implementation rationale recorded separately as ADR-015. The design review surfaced three concrete open items, tracked as KI-016 (the split-consistency assumption underlying `close_price`-based calculation is empirically unverified — no network access was available), KI-017 (no trading-day resolution policy), and KI-018 (precision/rounding convention specified but not yet implemented or tested).

**Files Created**: `docs/FOUNDER_DECISIONS.md`.

**Files Modified**: `docs/simulation_formulas.md` (status DRAFT → APPROVED, every formula cross-referenced to its exact spec citation), `docs/ARCHITECTURE_DECISIONS.md` (ADR-015), `docs/KNOWN_ISSUES.md` (KI-008 resolved, KI-016/017/018 added), `.claude/DATABASE_RULES.md` (close_price vs. adjusted_close_price question marked resolved).

**Architecture Decisions**: ADR-015 (`docs/ARCHITECTURE_DECISIONS.md`) — engineering rationale for building the Simulation Engine around `close_price` rather than `adjusted_close_price`, implementing Founder Decision 001.

**Problems Encountered**: None — this was a research and documentation pass, not implementation.

**Solutions**: N/A.

**Lessons Learned**: Re-reading the actual specification text (rather than relying on the summarized understanding carried over from the M0 planning pass) surfaced a real, three-times-repeated deviation that a memory-based review would very likely have missed or under-weighted. "Always consult the source, never rely on memory" earned its keep here.

**Security Review Summary**: Not applicable — no code changed.

**Testing Summary**: Not applicable — no code changed.

**Technical Debt Introduced**: None — KI-016/017/018 are pre-existing design gaps made explicit, not new debt created by this pass.

**Performance Notes**: Not applicable.

**Recruiter Value**: Medium — demonstrates the discipline of re-validating a design against its source of truth before writing code, and formally recording a founder-level specification override with full traceability (a real-world pattern: specs get amended, and the amendment itself needs to be as well-documented as the original).

**Production Readiness Score**: Not applicable — documentation-only pass.

**Next Milestone**: M3 — Simulation Engine (implementation).

---

## 2026-07-09 — M3: Simulation Engine (Implementation)

**Version**: 0.4.0

**Objective**: Implement the Simulation Engine per the approved design (Founder Decision 001, ADR-015, `docs/simulation_formulas.md`): `close_price` as the sole calculation input, explicit one-time dividend processing, `stock_splits` disclosure-only, `Decimal` precision with `prec=38`/`ROUND_HALF_EVEN`, exact-date historical data requirements, controlled error handling, determinism tests, known-answer tests, and a documented verification path for KI-016.

**Scope**: `backend/app/simulation/` (exceptions, precision, formulas, repository, engine) and `backend/tests/simulation/` (36 tests). No API endpoints, no frontend, no portfolio simulation, no advanced analytics beyond the six MVP-required calculations.

**Implementation Summary**: Built five focused modules. `exceptions.py` implements the exact error taxonomy from Founder Specification 2.14.14 plus the 3.3.2 investment-amount/date-range split. `precision.py` provides a scoped `decimal.localcontext()` (never mutating the global context) and explicit `ROUND_HALF_EVEN` quantization helpers matching the `NUMERIC(20,8)`/`NUMERIC(10,6)` column scales. `formulas.py` holds every calculation as a pure, DB-free function — shares purchased, final value, total return %, CAGR (with an independent `math`-module cross-check in tests), inflation adjustment, and the dividend-reinvestment loop (price lookup injected as a callable, keeping the function testable without a database). `repository.py` is read-only, deliberately separate from the M2 `IngestionRepository`, with exact-date price lookups (never nearest-trading-day), ordered dividend/split retrieval, and as-of (never interpolated) CPI lookups. `engine.py`'s `run_simulation` is the sole entry point, implementing a deliberate error-handling asymmetry discovered while writing it: pre-flight validation failures (asset not found, invalid date range, invalid investment amount) never persist a `Simulation` row, because there is no valid `asset_id` to reference and the Founder Specification's own error table classifies these as "Validation error"; mid-simulation failures (missing historical data) persist a failed `Simulation` row with a descriptive `error_message`, per Founder Specification 2.6.24's explicit instruction to store failed simulations for debugging.

One design correction was made during test-writing, before it became a bug: `docs/simulation_formulas.md`'s original draft described dividends being "collected as uninvested cash" when `dividends_reinvested = false`. Re-reading Founder Specification 2.14.10/3.3.3 while writing the corresponding test showed the specification describes only two modes — reinvest, or ignore entirely — with no middle ground. Corrected in both the code and the design note before any test asserted the invented behavior.

**Files Created**: `backend/app/simulation/__init__.py`, `exceptions.py`, `precision.py`, `formulas.py`, `repository.py`, `engine.py`; `backend/tests/simulation/__init__.py`, `conftest.py`, `test_formulas.py`, `test_precision.py`, `test_engine_known_answer.py`, `test_engine_errors.py`, `test_engine_determinism.py`, `test_split_disclosure.py`; `docs/MILESTONE_REPORTS/M3_REPORT.md`.

**Files Modified**: `docs/simulation_formulas.md` (dividends-disabled correction, implementation status), `docs/KNOWN_ISSUES.md` (KI-016 updated with a concrete manual verification runbook, KI-017/018 resolved, KI-019/020 added).

**Architecture Decisions**: No new ADR — this milestone implements ADR-015 and Founder Decision 001 exactly as designed, with one documented correction (dividends-disabled behavior) rather than a new architectural decision.

**Problems Encountered**: (1) Postgres was unreachable at the start of this session — Docker Desktop's engine was not running (unlike prior sessions where it happened to already be up). (2) The dividends-disabled design imprecision described above. (3) The known M1/M2 full-suite-run behavior (KI-009: `test_migrations.py`'s upgrade/downgrade cycle leaves the dev database schema-less) recurred twice during this session's verification passes.

**Solutions**: (1) Started Docker Desktop directly (`Start-Process`) and brought up the `postgres` service via `docker compose up -d postgres`, confirmed healthy, then ran all 36 new tests for real against a live database rather than relying solely on the (still fully passing) DB-independent pure-math suite. (2) Corrected before any test encoded the wrong behavior, per the Lessons Learned above. (3) Re-ran `alembic upgrade head` each time; DB left at `head` with zero residual rows (transaction-rollback isolation confirmed) at the end of the session.

**Lessons Learned**: The pure-math formula tests (no DB required) and the DB-integration engine tests caught the same categories of correctness by design, but for genuinely different reasons — the pure tests are fast and always runnable regardless of environment state; the DB-integration tests are what actually prove the full stack (repository queries, precision context, persistence, error-path branching) works together. Neither layer alone would have been sufficient. Separately: attempting to bring up the actual database environment (rather than reporting "DB unavailable" and stopping) paid off directly — it upgraded the known-answer verification from "formulas are correct in isolation" to "the whole engine is correct end-to-end against a real Postgres instance."

**Security Review Summary**: See `docs/SECURITY_LOG.md` M3 entry. No new attack surface; `adjusted_close_price`-never-read is verified by a dedicated test, not just documented; all queries parameterized.

**Testing Summary**: See `docs/TESTING_REPORT.md` M3 entry. 36 new tests (18 non-DB, 18 DB-integration), all passing against a live Postgres instance. Full project suite: 129/129 passing.

**Technical Debt Introduced**: None new. KI-016 (split-consistency empirical verification) remains the one substantive open item, now with a concrete, actionable manual runbook rather than a vague "should verify eventually" note. KI-020 (Dividend Contribution metric) explicitly deferred, matching this milestone's scope boundary.

**Performance Notes**: See `docs/PERFORMANCE_LOG.md` M3 entry. Query shape (bounded, indexed point/range lookups) is designed to meet the <2s target by construction; not yet benchmarked against production-scale data.

**Recruiter Value**: Very High. This is the platform's centerpiece: a deterministic financial calculation engine with formulas cited line-by-line to a founder specification, known-answer tests reproducing the specification's own worked examples, a caught-before-shipping design correction (dividends-disabled behavior), an explicit and tested error-handling asymmetry grounded in the spec's own error taxonomy, and a documented, honest boundary between "verified by test" and "verified against live data" (KI-016) — exactly the kind of nuanced, defensible engineering judgment that reads well in a technical interview.

**Production Readiness Score**: 6/10 — the engine is correct against every known-answer test available, fully deterministic, and precisely scoped, but carries one unverified empirical dependency (KI-016) that should be closed before production use, and has no caller yet (no API layer exists until M4). Blocking items before this number moves: the KI-016 live-data verification runbook, and M4 (API Layer) actually exercising this engine end-to-end.

**Next Milestone**: M4 — API Layer.

---

## 2026-07-10 — M4: API Layer

**Version**: 0.5.0

**Objective**: Give the Simulation Engine (M3) its first real caller — a public HTTP API for asset search/lookup and simulation creation/retrieval — following a founder-approved design review with five explicit decisions on auth posture, growth-chart placement, deferred endpoints, field naming, and the asset exchange field.

**Scope**: `GET /api/v1/assets`, `GET /api/v1/assets/{symbol}`, `GET /api/v1/assets/{symbol}/availability`, `POST /api/v1/simulations`, `GET /api/v1/simulations/{id}`; response envelope + exception-handler mapping; Redis-backed rate limiting; a Simulation Engine extension for the Growth Chart output. Explicitly excluded per the founder's instruction: authentication, frontend, AI, portfolio simulation, admin routes, Simulation History (designed in `docs/api_design.md`, not implemented — deferred to M5).

**Implementation Summary**: Extended the Simulation Engine first, before touching the API layer at all — `app/simulation/formulas.py::calculate_growth_series` replays the existing dividend-reinvestment event loop at every stored price date in range (not just the two endpoints), added a `SimulationRepository.get_prices_ordered` method to support it, and threaded the result through `SimulationOutcome.growth_series`. This kept "no financial calculation logic in the API layer" a structural fact rather than a convention. Built the API layer in the standard router → service → engine/repository order: Pydantic schemas first (external field names matching the Founder Specification's own vocabulary, `include_dividends`/`adjust_for_inflation`, mapped internally to the existing `dividends_reinvested`/`inflation_adjusted` at the service boundary), then `asset_service`/`simulation_service`, then thin routers, then a Redis-backed fixed-window `RateLimiter` (fails open on Redis unreachability, logged), then `exception_handlers.py` mapping ten named exception types plus one legitimate catch-all to the standard envelope, then wired all of it into `app/main.py` alongside a request-ID middleware and CORS. The one subtle correctness issue requiring real design work: `run_simulation` flushes (never commits) and, for `MissingHistoricalDataError`/`CalculationError`, persists a failed `Simulation` row before re-raising — so the FastAPI DB-session dependency deliberately does *not* auto-rollback on exception (only `close()`s), and `simulation_service.create_simulation` explicitly commits or rolls back per exception type, preserving Founder Specification Part 2.6.24's "failed simulations should be stored" guarantee. Documented as ADR-016.

**Files Created**: `backend/app/api/__init__.py`, `v1/__init__.py`, `v1/errors.py`, `v1/exception_handlers.py`, `v1/dependencies.py`, `v1/schemas/{common,assets,simulations}.py`, `v1/services/{asset_service,simulation_service}.py`, `v1/routers/{assets,simulations}.py`; `backend/app/core/rate_limit.py`, `request_id.py`; `backend/tests/api/{conftest,test_assets,test_simulations}.py`, `backend/tests/core/{__init__,test_rate_limit}.py`, `backend/tests/simulation/test_growth_series.py`; `docs/MILESTONE_REPORTS/M4_REPORT.md`.

**Files Modified**: `backend/app/main.py` (mounts `/api/v1`, registers exception handlers, adds request-ID + CORS middleware — `/health` unchanged); `backend/app/simulation/exceptions.py` (`SimulationError.simulation_id`), `formulas.py` (`calculate_growth_series`, `PricePoint`/`GrowthSeriesPoint`), `repository.py` (`get_prices_ordered`), `engine.py` (wires `growth_series` into `SimulationOutcome`, sets `exc.simulation_id` on the failed-simulation path); `backend/app/core/config.py`, `.env.example`, `backend/requirements.txt`, `docker-compose.yml` (Redis); `backend/pyproject.toml` (`flake8-bugbear` FastAPI `Depends`/`Query` exemption); `docs/api_design.md`, `docs/KNOWN_ISSUES.md` (KI-021 resolved with a documented remaining gap, KI-022/023/024 resolved per founder decision, KI-025/026 added).

**Architecture Decisions**: ADR-016 (`docs/ARCHITECTURE_DECISIONS.md`) — service-owned transaction boundary (not a framework-default auto-commit/rollback), engine-computed growth series (not route-handler-computed), and SQLAlchemy 2.0 `join_transaction_mode="create_savepoint"` for API-layer DB-integration tests whose code-under-test itself commits/rolls back.

**Problems Encountered**: (1) An early draft of `simulation_service.create_simulation` used a bare `except Exception: session.commit()` "for safety," which would have committed the session on a genuinely unexpected error — caught before finalizing, since it violates this project's "no generic exception handling" rule and risks persisting corrupted state. (2) An early draft of `routers/assets.py` invented a duplicate `AssetNotFoundHTTPError` class instead of reusing `app.simulation.exceptions.AssetNotFoundError`, which already fit exactly — caught and removed before finalizing. (3) Running the API-layer DB-integration tests initially produced a real (non-fatal) `SAWarning: transaction already deassociated from connection` for every test whose request path called `session.commit()`/`session.rollback()`, because the test fixture's outer `connection.begin()` transaction was the same one being ended by the service layer. (4) After a full local `pytest` run (which includes `tests/test_migrations.py`'s upgrade/downgrade cycle), a second full run failed 45 tests with "relation does not exist" / duplicate-key errors — the same known M1/M2/M3 behavior (KI-009), not a new bug. (5) `ruff`'s `flake8-bugbear` rule B008 flagged every FastAPI route using the standard `param: X = Depends(...)` pattern.

**Solutions**: (1) Removed the bare `except Exception`, replaced with a specific `except (MissingHistoricalDataError, CalculationError): session.commit(); raise` — truly unexpected exceptions now propagate with no explicit commit/rollback at this layer, which is safe because `get_db_session` only ever `close()`s. (2) Rewrote `routers/assets.py` to import and reuse the existing `AssetNotFoundError`. (3) Bound API test sessions with `join_transaction_mode="create_savepoint"` (`tests/api/conftest.py`) so a service-layer commit/rollback operates on a nested SAVEPOINT, leaving the fixture's outer transaction intact for its own final rollback. (4) Re-ran `alembic upgrade head` to restore the schema before continuing. (5) Added `[tool.ruff.lint.flake8-bugbear] extend-immutable-calls = ["fastapi.Depends", "fastapi.Query"]` to `pyproject.toml` — the documented, standard way to tell ruff this is FastAPI's DI idiom, not the mutable-default-value bug B008 exists to catch.

**Lessons Learned**: Extending the Simulation Engine with `calculate_growth_series` *before* writing any route or service code (rather than reaching for a "quick" route-handler calculation first) made "no financial calculation logic in the API layer" free to verify by inspection rather than something to remember to check later. Separately: a design document produced during an approved design-review turn (`docs/api_design.md`'s audit-logging requirement) can still drift from what actually gets implemented in the following implementation turn if it isn't re-checked line-by-line against the final code — caught only during this documentation pass, now tracked as KI-026 rather than silently dropped.

**Security Review Summary**: See `SECURITY_LOG.md` M4 entry. Rate limiting is the MVP-appropriate control for the public, unauthenticated simulation-creation endpoint (founder decision, KI-022); every named exception maps to an explicit status/code with no internal detail leaked to the client; no admin or auth-requiring routes implemented or exposed.

**Testing Summary**: See `TESTING_REPORT.md` M4 entry. 26 new tests (155 total across the full project: 129 from M0–M3 + 26 new from M4), all passing against live Postgres and Redis instances.

**Technical Debt Introduced**: KI-026 (audit-logging requirement from `docs/api_design.md` not implemented for simulation creation) is the one genuine gap discovered in this milestone, not a deliberate scope cut. KI-021/023/024 close as founder-approved scope decisions, not debt. KI-025 (asset `exchange` field) remains open, non-blocking, founder-acknowledged.

**Performance Notes**: See `PERFORMANCE_LOG.md` M4 entry. No load testing performed; query shape unchanged from M3's already-bounded design (the growth series adds one ordered range read over `historical_prices`, not a full scan).

**Recruiter Value**: High. This milestone demonstrates full-stack API design discipline: a founder design-review-then-implement workflow, a real (not hypothetical) transaction-boundary bug avoided by design rather than caught in production, Redis-backed rate limiting with an explicit fail-open policy, and an honest post-implementation documentation audit that caught and disclosed its own scope drift (KI-026) rather than only reporting what went right.

**Production Readiness Score**: 6/10 — the API surface is functionally complete for its declared M4 scope, fully tested, and cleanly layered, but carries one undisclosed-until-now implementation gap (KI-026), no load testing, and still depends on KI-016 (M3's unverified split-consistency assumption) being closed before real user-facing use.

**Next Milestone**: M5 — Authentication (unblocks Simulation History and Admin Import endpoint implementation, both already designed in `docs/api_design.md`).

---

## 2026-07-10 — M4 Follow-Up: Simulation Audit Logging (KI-026)

**Version**: 0.5.1

**Objective**: Close KI-026 before M4 merges — `POST /api/v1/simulations` must write an `audit_logs` entry for every request (success, missing historical data, validation failure where possible, and calculation error), without implementing authentication, simulation history, admin routes, or any other M5 work.

**Scope**: One new module (`app/api/v1/audit.py`), wiring into `simulation_service.create_simulation` and the `RequestValidationError` exception handler, and tests proving the audit trail is written for both success and every failure category. Explicitly excluded, per the founder's instruction: authentication, simulation history, admin routes, M5.

**Implementation Summary**: Added `record_simulation_audit` — called from `simulation_service.create_simulation` after every commit/rollback decision already established in M4 (ADR-016), so the audit write never risks the already-durable `Simulation` row for the mid-simulation failure paths. It reuses the existing `AuditEventType.SIMULATION_CREATED` enum value rather than adding a `SIMULATION_FAILED` counterpart — `app/models/enums.py`'s own docstring says to "expand deliberately, not speculatively," and a schema migration (`ALTER TYPE ... ADD VALUE`) was judged a larger, riskier change than this fix warranted; `details.status`/`details.error_code` (JSONB) carry the outcome instead, so every literal field the requirement listed is still present. The one genuinely new problem: Pydantic-level request validation failures (e.g. a non-positive `investment_amount`) never reach `simulation_service.create_simulation` at all — FastAPI rejects the request before the endpoint function runs — so there is no request-scoped DB session available to reuse at that point. Solved with a second, narrowly-scoped function, `record_simulation_request_validation_audit`, called from the `RequestValidationError` handler, opening a short-lived session directly and guarded to only fire for `POST /api/v1/simulations` (not every validated route in the API).

**Files Created**: `backend/app/api/v1/audit.py`, `backend/tests/api/test_simulation_audit.py`.

**Files Modified**: `backend/app/api/v1/services/simulation_service.py` (audit call on every path, new required `request_id` parameter), `backend/app/api/v1/routers/simulations.py` (threads `X-Request-ID` into the service call), `backend/app/api/v1/exception_handlers.py` (`RequestValidationError` handler now audits), `docs/KNOWN_ISSUES.md` (KI-026 resolved).

**Architecture Decisions**: No new ADR — this follows the transaction-boundary and failure-isolation reasoning already established in ADR-016 (SAVEPOINT-isolated writes, fail-open on `SQLAlchemyError`, mirroring the Redis rate-limiter's own fail-open policy).

**Problems Encountered**: (1) Testing the request-validation-failure audit path (the one that opens its own session) meant that path's write is genuinely, permanently committed on a separate DB connection — not covered by the test suite's usual rollback-based isolation, since nothing in that specific code path touches the request-scoped, rollback-isolated test session at all. (2) `session.begin_nested()` (SAVEPOINT) needed to compose correctly with the API test fixtures' own `join_transaction_mode="create_savepoint"` binding (ADR-016) — a savepoint nested inside a savepoint.

**Solutions**: (1) The affected test (`test_audit_log_written_on_request_validation_failure`) explicitly deletes the row it caused via a second, separate session-and-commit in a `finally` block, with a comment explaining why this one test deviates from the suite's normal "everything rolls back" pattern — verified with a direct `psql` row-count check after the full suite ran (`audit_logs`, `assets`, `simulations` all at 0 rows). (2) Confirmed by running the full suite: nested SAVEPOINTs composed correctly with no errors or warnings.

**Lessons Learned**: A design note's audit-logging requirement is easy to defer accidentally when it sits orthogonal to the "main" success-path work (schemas, routers, calculation) — this is the second time in this milestone (after KI-021's growth-chart gap) that treating the Founder Specification/design note as the actual acceptance criteria, not just a starting outline, caught something the test suite alone wouldn't have (there's no way for a test to fail against a requirement nobody wrote a test for). Going forward: when a design note lists a cross-cutting requirement (audit, logging, rate limiting) alongside the main feature, write its test first, not last.

**Security Review Summary**: See `SECURITY_LOG.md`'s updated M4 entry. Every simulation-creation attempt is now audited, including pre-execution validation failures; the audit write cannot become a new availability risk (SAVEPOINT-isolated, fails safe).

**Testing Summary**: See `TESTING_REPORT.md`'s updated M4 entry. 4 new tests (159 total across the full project), all passing against a live Postgres instance; DB confirmed empty of leaked test data after the full suite run.

**Technical Debt Introduced**: None new. KI-026 closes with one disclosed, deliberate deviation from the original design note (no new enum value) rather than a silent one.

**Performance Notes**: One additional small `INSERT` per simulation request (inside a SAVEPOINT, same transaction as the simulation write it's attached to) — not expected to be measurable against `.claude/PERFORMANCE_BUDGET.md`'s targets, not benchmarked.

**Recruiter Value**: Medium-High. Demonstrates responding to review feedback precisely — implementing exactly what was asked, documenting exactly where the implementation diverges from the letter of the request (no new enum value) and why, and catching a subtle test-isolation wrinkle (a code path that legitimately needs its own DB session) rather than either ignoring it or leaving the dev database dirty.

**Production Readiness Score**: 7/10 for the API Layer overall (up from 6/10) — the one disclosed gap from the M4 report is now closed; KI-016 (carried from M3) remains the platform's highest-priority open item before production use.

**Next Milestone**: M5 — Authentication.

---

## 2026-07-11 — M5: Identity Management (Authentication)

**Version**: 0.6.0

**Objective**: Implement the Identity Management system — registration, login, logout, refresh, password hashing/validation, role-based authorization, session management, and authentication middleware — per a founder-approved design review (Founder Decision 002) that resolved every Founder Specification silence on token lifecycle, cookie strategy, anonymous-use boundaries, roles, and lifecycles (see `docs/KNOWN_ISSUES.md` KI-006). OAuth, MFA, email verification, and password reset are explicitly excluded, per direct instruction.

**Scope**: `backend/app/auth/` (the Identity domain: exceptions, password hashing, tokens, account lockout, repository, orchestrating service), a new `refresh_tokens` table (migration `0002`), the API layer (`schemas/auth.py`, `services/auth_service.py`, `routers/auth.py`), authentication middleware (`get_current_user_optional`/`_required`, `get_current_admin_user`) wired into the existing simulation routes, and a startup-time secret-misconfiguration guard added during self-review. Explicitly excluded: OAuth, MFA, email verification, password reset, Simulation History/Admin Import endpoints (auth middleware for them now exists; the endpoints themselves remain future work per KI-023), and M6 (AI Explanations).

**Implementation Summary**: Built `app/auth/` as a domain module mirroring `app.simulation`'s shape exactly — pure business logic, no HTTP/cookie/audit concerns, following the same "engine computes, API-layer service commits and audits" split established by `simulation_service`/`simulation.engine`. `password.py` uses Argon2 (`argon2-cffi`), an 8-character minimum floor (the Founder Specification's own "must meet requirements" is undefined — a documented, not spec-derived, choice), and a fixed dummy-hash comparison so `verify_password` runs the same Argon2 cost whether or not a real user/hash exists, closing a login-timing side channel between "unknown email" and "wrong password." `tokens.py` issues a 15-minute stateless JWT access token (`pyjwt`) and generates/hashes (SHA-256) opaque 256-bit refresh tokens — the raw refresh token is never persisted, only its hash, matching the existing `password_hash` discipline. `lockout.py` is a Redis-backed, per-account (keyed by normalized email) failure counter — deliberately distinct from the existing per-IP `RateLimiter`, since a per-IP-only control cannot stop a distributed credential-stuffing attempt against one target account (Founder Specification 3.6.7). `service.py`'s `authenticate()` enforces a specific, security-motivated ordering: lockout is checked before any password verification (so a locked account never scores another guess), and `is_active` is checked only *after* a correct password is verified (so a wrong-password attempt against a suspended account still yields the same generic `InvalidCredentialsError` as any other failure, never leaking that the account exists and is merely suspended). `refresh_session()` implements rotation-with-reuse-detection: every refresh revokes the presented token and issues a new one chained via `replaced_by_id`; presenting an already-rotated token is treated as a theft signal and revokes every active session for that user. The API layer (`auth_service.py`) mirrors `simulation_service`'s transaction-boundary discipline exactly, with one new wrinkle: `RefreshTokenReuseDetectedError` must be caught and *committed* (not rolled back) separately from a plain `InvalidRefreshTokenError`, because the domain layer's precautionary "revoke everything" write happens before the exception is raised and must survive. Both tokens are delivered exclusively via httpOnly, Secure, `SameSite=Strict` cookies (access token path `/`, refresh token path-scoped to `/api/v1/auth` only) — never in a JSON body, matching the approved Cookie Strategy decision. `get_current_user_optional` (new in `app.api.v1.dependencies`) re-loads the user from the database on every request rather than trusting the JWT's `is_admin` claim, so a mid-session privilege change or suspension takes effect immediately rather than after the token's full lifetime. Wired into the existing M4 routes: `POST /api/v1/simulations` now attaches `user_id` opportunistically when authenticated (anonymous creation remains fully supported, per the approved "Anonymous Users may run simulations" decision), and `GET /api/v1/simulations/{id}` now enforces real ownership instead of M4's fail-closed placeholder.

**Files Created**: `backend/app/models/refresh_token.py`; `backend/alembic/versions/0002_refresh_tokens.py`; `backend/app/auth/{__init__,exceptions,password,tokens,lockout,repository,service}.py`; `backend/app/api/v1/schemas/auth.py`, `services/auth_service.py`, `routers/auth.py`; `backend/tests/auth/{__init__,conftest,test_password,test_tokens,test_lockout,test_service}.py`; `backend/tests/api/{test_auth,test_dependencies}.py`; `backend/tests/core/test_config.py`; `docs/MILESTONE_REPORTS/M5_REPORT.md`.

**Files Modified**: `backend/app/models/{__init__,user}.py` (register `RefreshToken`, add the `user.refresh_tokens` relationship); `backend/app/api/v1/__init__.py` (mount the auth router); `backend/app/api/v1/dependencies.py` (`get_current_user_optional`/`_required`, `get_current_admin_user`, `rate_limit_auth`); `backend/app/api/v1/errors.py` (`UnauthorizedError`, updated `ForbiddenError` docstring); `backend/app/api/v1/audit.py` (`record_auth_audit`); `backend/app/api/v1/exception_handlers.py` (seven new handlers); `backend/app/api/v1/routers/simulations.py` (wired `get_current_user_optional` into both routes); `backend/app/core/config.py` (M5 settings + the JWT-secret startup guard); `backend/requirements.txt` (`argon2-cffi`, `pyjwt`, `email-validator`); `backend/tests/api/conftest.py` (added `rate_limit_auth` to the default no-op overrides); `.env.example`; `.claude/SECURITY_POLICY.md` (token-lifecycle and password-reset gap notes updated to reflect Founder Decision 002); `.claude/DATABASE_RULES.md` (`refresh_tokens` documented); `docs/FOUNDER_DECISIONS.md` (Founder Decision 002); `docs/ARCHITECTURE_DECISIONS.md` (ADR-017–020); `docs/KNOWN_ISSUES.md` (KI-006 resolved, KI-023 updated, KI-027–031 added); `docs/PROJECT_STATE.md`.

**Architecture Decisions**: ADR-017 (opaque, hashed, rotation-chained refresh tokens over a second JWT), ADR-018 (httpOnly/Secure/SameSite=Strict cookie delivery over response-body/`localStorage`), ADR-019 (account lockout as a distinct, email-keyed mechanism alongside IP-based rate limiting), ADR-020 (reject the default `JWT_SECRET` outside development at startup) — all in `docs/ARCHITECTURE_DECISIONS.md`, all implementing Founder Decision 002.

**Problems Encountered**: (1) A genuine transaction-boundary bug drafted and caught before finalizing: an early version of `auth_service.refresh` rolled back on every `InvalidRefreshTokenError`, including `RefreshTokenReuseDetectedError` (a subclass) — since the domain layer's reuse-detection precaution (`revoke_all_for_user`) had already been flushed before raising, a blanket rollback would have silently discarded the very security response the detection exists to perform. (2) `tests/auth/conftest.py`'s `make_user()` originally defaulted to a fixed email (`jane@example.com`); since account-lockout state lives in real Redis, not the per-test-rolled-back database transaction, multiple tests sharing that default email silently accumulated failed-login counts against each other, causing two lockout tests to fail with a lockout the test itself didn't cause. (3) `TestClient`'s cookie jar (httpx-based) correctly refuses to *resend* a `Secure`-flagged cookie over the plain-http scheme it uses internally (`http://testserver`) — the same behavior a real browser exhibits over non-TLS — which silently broke every multi-request auth test relying on automatic cookie persistence. (4) A test asserting JWT tamper-detection flipped only the token's very last character, which occasionally lands on a base64url "don't-care" padding bit some decoders (including PyJWT, per RFC 7515) tolerate without changing the decoded signature bytes — an intermittently no-op tamper, not a real test of the rejection path. (5) The default `argon2-cffi`/`pyjwt`/`email-validator` dependencies needed installing into the existing project venv before anything could run.

**Solutions**: (1) Split the `except` handling in `auth_service.refresh` into two clauses — `RefreshTokenReuseDetectedError` (caught first, since it subclasses the other) now commits before auditing and re-raising; the plain `InvalidRefreshTokenError`/`AccountInactiveError` case still rolls back, since nothing was written in that branch. Directly verified by `test_refresh_reuse_is_detected_and_revokes_every_active_session`, which asserts a second, uninvolved "device"'s session is also revoked. (2) Changed `make_user()`'s default to a fresh `uuid4()`-suffixed email per call, isolating every test's Redis-backed lockout state unless a test explicitly requests a shared email. (3) Tests now pass `cookies=dict(client.cookies)` explicitly on follow-up requests, bypassing the jar's (correct, browser-accurate) automatic scheme filtering — tracked as KI-030, a test-infrastructure-only wrinkle, not a production concern (verified separately that the actual `Secure` attribute is present on the real Set-Cookie header). (4) The tamper test now flips a character ten positions from the end (solidly within the signature's non-boundary bytes), confirmed reliable across five repeated runs. (5) Installed into `backend/.venv` directly; verified via a clean `app.main` import before writing any test.

**Lessons Learned**: The M4-established pattern of "the domain layer only flushes, the API-layer service owns commit/rollback per exception type" needed a genuine new case this milestone (reuse detection's precautionary write), not just a repetition of the existing pattern — a reminder that "matches an existing pattern" and "is exactly the existing pattern with zero new reasoning required" are different claims, and the former still needs to be checked, not assumed. Separately: any test involving Redis-backed state needs the same "isolate per test" discipline as the database gets from transaction rollback — Redis has no such automatic isolation, and a shared fixture default (a fixed email) that looks harmless for stateless tests becomes a genuine cross-test bug the moment any test touches accumulating external state.

**Security Review Summary**: See `docs/SECURITY_LOG.md`'s M5 entry for the full Red Team Review. One finding was fixed during this milestone rather than merely documented: a forgotten `JWT_SECRET` env var in a real deployment would silently allow token forgery (including forged `is_admin: true` claims) with no error anywhere — now a hard startup failure outside `development`/`test` environments (ADR-020). Four residual risks were identified and documented, not fixed, as deliberate, tracked technical debt: a low-severity refresh-token rotation race under concurrent use (KI-027), the inherent 15-minute non-revocability window of a stateless access token (KI-028), an unsurfaced lockout retry-after duration (KI-029), and the deferred password-reset flow itself (KI-031).

**Testing Summary**: See `docs/TESTING_REPORT.md`'s M5 entry. 62 new tests (221 total across the full project: 159 from M0–M4 + 62 new), all passing against live Postgres and Redis instances. Covers unit (password, tokens, lockout), DB-integration (the full `app.auth.service` behavior matrix, including the reuse-detection multi-device scenario), HTTP-integration (all four endpoints, cookie attributes, the enumeration-resistance property, wiring into the existing simulation routes), and direct authorization-dependency tests (`get_current_admin_user`'s rejection path, untestable via HTTP since no admin route exists yet — the same honest gap M4 disclosed for `ForbiddenError`).

**Technical Debt Introduced**: KI-027 (refresh-token rotation race, low severity, mirrors KI-012's precedent), KI-028 (stateless access token's inherent non-revocability window, an accepted architectural tradeoff not a bug), KI-029 (lockout retry-after not surfaced to the client, a minor UX gap), KI-030 (a deprecated httpx test parameter used as a workaround, test-only), KI-031 (password reset itself, deliberately deferred per direct instruction — must ship before production per `.claude/SECURITY_POLICY.md`). All five documented in `docs/KNOWN_ISSUES.md`, none silent.

**Performance Notes**: See `docs/PERFORMANCE_LOG.md`'s M5 entry. Every authenticated request now does one additional database lookup (`get_current_user_optional` loading the user fresh, rather than trusting the JWT claim) — a deliberate correctness-over-marginal-performance choice, consistent with this project's engineering priority order. Login/refresh add a Redis round-trip (lockout check) and register/login/refresh each add one `Argon2`/token operation — none benchmarked against `.claude/PERFORMANCE_BUDGET.md`'s targets yet.

**Recruiter Value**: Very High. This milestone demonstrates full-stack identity-system design under an explicitly incomplete specification: every token/cookie/lockout parameter traces to a documented decision resolving a confirmed spec silence, not an unstated default; a genuine transaction-boundary bug (reuse-detection's write surviving a rollback) caught and fixed via reasoning from an existing pattern rather than copying it blindly; a real, fixable security finding (the JWT-secret footgun) discovered via deliberate self-attack and closed with a hard startup guard, not just written down; and an honest, executed red-team pass distinguishing "fixed now" from "documented, deliberate residual risk" — exactly the kind of judgment call that separates a shipped auth system from a checklist implementation.

**Production Readiness Score**: 6/10 for Identity Management specifically (fully tested, no known unfixed vulnerability, but password reset — a real launch-blocking gap per this project's own security policy — is deliberately not yet built, and KI-027's rotation race is unhardened). Platform-wide production readiness remains gated primarily on KI-016 (carried from M3, still the single highest-priority open item) and the still-unbuilt Frontend/AI Explanations/Deployment milestones.

**Next Milestone**: M6 — AI Explanations (per the approved MVP build order; do not begin without a separate design review, per this milestone's own closing instruction).
