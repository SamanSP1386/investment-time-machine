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
- **Status**: Resolved
- **Resolution**: Founder Decision 001 (`docs/FOUNDER_DECISIONS.md`) — the Simulation Engine uses `close_price` exclusively; dividends and splits are processed explicitly from their own tables; `adjusted_close_price` is retained for validation/comparison/audit only. Full design in `docs/simulation_formulas.md`, engineering rationale in ADR-015 (`docs/ARCHITECTURE_DECISIONS.md`).
- **Resolution Date**: 2026-07-08

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

### KI-012

- **Description**: `IngestionRepository.get_or_create_asset` / `get_or_create_indicator` (`app/ingestion/storage/repository.py`) are not race-safe: a SELECT-then-INSERT pattern has a TOCTOU window where two concurrent ingestion runs for the same symbol could both attempt to create it.
- **Severity**: Low (no concurrent/background ingestion workers exist in MVP scope — ingestion runs as a single-process CLI invocation today).
- **Status**: Open
- **Planned Resolution**: Replace with an `ON CONFLICT DO NOTHING ... RETURNING` upsert (matching the pattern already used for price/dividend/split/indicator-value rows) before any scheduler or concurrent worker is introduced.
- **Resolution Date**: —

### KI-013

- **Description**: CoinGecko's free-tier `/market_chart/range` endpoint (the only one supporting arbitrary historical date ranges) returns one price observation per day, not true OHLC. `CoinGeckoProvider` sets Open=High=Low=Close to that single observed value and discloses this via a warning on every import (see ADR-012) rather than fabricating intraday variance — but any future feature computing volatility from `high_price - low_price` will silently get zero for all CoinGecko-sourced rows.
- **Severity**: Medium (data-fidelity limitation, not a bug — but consequential for any future feature relying on intraday price range for crypto assets).
- **Status**: Open
- **Planned Resolution**: Revisit if a paid CoinGecko tier or an alternative crypto data provider with genuine historical OHLC becomes available; until then, any Financial Analytics feature (future milestone) using high/low for volatility-style metrics must special-case or exclude CoinGecko-sourced rows.
- **Resolution Date**: —

### KI-014

- **Description**: `CoinGeckoProvider` requires callers to supply CoinGecko's internal coin id (e.g. "bitcoin"), not a ticker symbol (e.g. "BTC") — there is no free-tier symbol-to-id resolution endpoint, so no such mapping is implemented.
- **Severity**: Low (a real constraint of the free API surface, not a code defect; affects operator ergonomics, not correctness).
- **Status**: Open
- **Planned Resolution**: Add a small static ticker-to-CoinGecko-id lookup table (or a one-time cached call to CoinGecko's `/coins/list` endpoint) before crypto ingestion is exposed to non-technical operators or an API endpoint.
- **Resolution Date**: —

### KI-015

- **Description**: The ingestion pipeline has no retry/backoff on transient provider failures (a single timeout or 5xx ends the import immediately with `status="failed"`) and no rate-limit awareness for CoinGecko's free-tier request limits.
- **Severity**: Low (acceptable for manually-triggered, low-frequency imports; would become a real operational problem under a scheduled/high-frequency import workload).
- **Status**: Open
- **Planned Resolution**: Add a bounded retry (e.g. one retry after a timeout) and basic rate-limit-aware throttling when a scheduler/background worker milestone is built — out of scope for a pipeline-mechanism milestone.
- **Resolution Date**: —

### KI-016

- **Description**: The Simulation Engine's design (`docs/simulation_formulas.md` §3, Founder Decision 001) depends on an empirical assumption — that raw `close_price` from yfinance is already retroactively split-adjusted within a single ingestion fetch — that has not been verified against live data (no network access was available when the design note was drafted, nor during M3 implementation).
- **Severity**: High (this is the single largest financial-correctness risk in the M3 design — if false, historical returns spanning a stock split would be silently wrong).
- **Status**: Partially Verified — code behavior confirmed, live-data empirical claim still open
- **What M3 verified**: `tests/simulation/test_split_disclosure.py` confirms the *code* correctly treats `stock_splits` as disclosure-only and never multiplies share counts by `split_ratio`, given synthetic price data constructed to already look split-consistent.
- **What remains unverified — manual verification runbook**: before this design is treated as fully closed for production use, run the following against a live network connection: (1) pick a real, well-documented historical stock split (e.g., AAPL's 4-for-1 split on 2020-08-31, or NVDA's 10-for-1 split on 2024-06-10); (2) run `python -m app.ingestion.cli prices <SYMBOL> --provider yfinance --start <30 days before split> --end <30 days after split>`; (3) inspect the stored `historical_prices.close_price` values on both sides of the split date and confirm they already reflect the retroactive split adjustment (i.e., the pre-split-date prices are already scaled down by the split ratio relative to their original nominal trading price, consistent with today's fetch); (4) if confirmed, this KI can be marked fully Resolved; if not, `docs/simulation_formulas.md` §3 and Founder Decision 001 must be revisited before production use.
- **Planned Resolution**: Execute the runbook above in an environment with network access; treat as a blocking pre-launch gate item.
- **Resolution Date**: —

### KI-017

- **Description**: No trading-day resolution policy exists for simulation `start_date`/`end_date` values that fall on a non-trading day (weekend, market holiday).
- **Severity**: Low
- **Status**: Resolved
- **Resolution**: M3 requires an exact `close_price` row for both `start_date` and `end_date`; absence raises `MissingHistoricalDataError` (spec-compliant per Founder Specification Part 3.3.2) rather than silently substituting a nearby date. Implemented in `app/simulation/repository.py` (`get_price_on_date`, exact-match only) and `app/simulation/engine.py`. A future milestone may choose to add nearest-trading-day resolution as a product/UX improvement — this is a deliberate, spec-compliant default, not an oversight.
- **Resolution Date**: 2026-07-09

### KI-018

- **Description**: `docs/simulation_formulas.md` specifies a scoped `decimal.localcontext()` with `prec=38` and `ROUND_HALF_EVEN` rounding at storage time.
- **Severity**: Medium
- **Status**: Resolved
- **Resolution**: Implemented in `app/simulation/precision.py` (`simulation_decimal_context`, `quantize_currency`, `quantize_percentage`) and used throughout `app/simulation/engine.py`. Verified by `tests/simulation/test_precision.py` (context scoping, rounding behavior at an exact midpoint) and `tests/simulation/test_engine_determinism.py` (same simulation run multiple times produces byte-identical Decimal output across every field, per Founder Specification Part 2.14.12's non-negotiable determinism requirement).
- **Resolution Date**: 2026-07-09

### KI-019

- **Description**: Founder Specification Part 2.6.24's `CHECK(end_date >= start_date)` constraint on the `simulations` table permits a same-day range, while Part 3.3.2's functional requirement states "End date must be after start date" (strictly greater) — a same-day range would also make CAGR's `years` divisor zero, which is mathematically undefined.
- **Severity**: Low
- **Status**: Resolved
- **Resolution**: The Simulation Engine enforces the stricter, spec-correct rule (`end_date` must be strictly after `start_date`) at the application/input-validation layer, raising `InvalidDateRangeError` for a same-day range — the DB-level `CHECK` constraint (unchanged from M1, more permissive) remains a backstop, not the authoritative rule. Verified by `tests/simulation/test_engine_errors.py::test_same_day_range_is_rejected`.
- **Resolution Date**: 2026-07-09

### KI-020

- **Description**: Founder Specification Part 3.5.11 (Dividend Contribution) is an approved MVP financial metric, but the M1 `simulations` schema reserves no column for it, and it is not among the M3 Simulation Engine's required outputs per this milestone's explicit scope.
- **Severity**: Low
- **Status**: Open
- **Planned Resolution**: The per-event `cash_dividend` values computed inside the dividend-reinvestment loop (`app/simulation/formulas.py::apply_dividend_reinvestment`) are sufficient to derive this metric; expose it in a future milestone (Financial Analytics or API layer) without needing to alter the M3 calculation logic itself.
- **Resolution Date**: —
