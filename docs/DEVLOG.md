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
