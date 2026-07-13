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
- **Status**: Resolved
- **Resolution**: Founder Decision 002 (`docs/FOUNDER_DECISIONS.md`) — 15-minute stateless JWT access token; 30-day sliding, database-backed, rotating opaque refresh token with reuse detection; both delivered via httpOnly/Secure/SameSite=Strict cookies. Full design in ADR-017/ADR-018 (`docs/ARCHITECTURE_DECISIONS.md`), implemented in `app/auth/` and `app/api/v1/routers/auth.py`.
- **Resolution Date**: 2026-07-11

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
- **Status**: Resolved
- **Resolution**: M7 Phase 1 added explicit LF rules for every frontend source file type actually introduced (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.mts`, `.cjs`, `.json`, `.css`) to `.gitattributes`, matching ADR-010's planned resolution exactly. `.toml` remains unaddressed since no `.toml` file exists in the repository yet — the same "add it when it's introduced" policy applies, not a gap in this fix.
- **Resolution Date**: 2026-07-15


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
- **Status**: **Resolved** — empirical claim confirmed against real, live Yahoo Finance data.
- **What M3 verified**: `tests/simulation/test_split_disclosure.py` confirms the *code* correctly treats `stock_splits` as disclosure-only and never multiplies share counts by `split_ratio`, given synthetic price data constructed to already look split-consistent.
- **M7 Phase 3C-2 verification (2026-07-23)**: Executed the runbook against AAPL's real 2020-08-31 4-for-1 split. **The app's own ingestion pipeline (`python -m app.ingestion.cli prices AAPL --provider yfinance ...`) could not be exercised end-to-end** — it reproduced KI-044 exactly: `yfinance` 0.2.44's crumb negotiation returned the literal string `"Edge: Too Many Requests"` / HTTP 429 on every attempt, confirmed via `yf.enable_debug_mode()`. Three retries with a 20-second backoff did not clear it; NVDA (the runbook's own alternate, around its 2024-06-10 10-for-1 split) failed identically, ruling out a symbol-specific cause and reconfirming KI-044's root cause (the crumb endpoint itself, not the data endpoint) is still unresolved.
  - **Methodology deviation, disclosed**: since the *data endpoint* itself (`query2.finance.yahoo.com/v8/finance/chart/...`) is reachable and returns real, valid JSON without a crumb when called directly with a standard User-Agent header — exactly what KI-044's own investigation had already established — this verification fetched real AAPL daily OHLC + split-event data directly from that endpoint (a read-only HTTP GET, no code changed, nothing written to `historical_prices` via this path — this is *not* a claim that the app's ingestion pipeline itself was exercised, only that the same underlying real Yahoo data source was queried directly since the pipeline's crumb-gated wrapper remains blocked).
  - **Observed numbers**: Yahoo's `close` series (the same field yfinance's `history()` populates into `Close`, and what `YFinanceProvider` maps to `historical_prices.close_price`) shows AAPL trading in the **~$108.94–$126.52** range for every trading day from 2020-08-03 through 2020-08-28 (the last trading day before the split) — e.g. **2020-08-28: close = $124.8075**. AAPL's actual, well-documented *nominal* (non-split-adjusted) closing price on 2020-08-28 was **$499.23** — and `$499.23 / 4 = $124.8075`, an exact match to the fetched value. The response's own `events.splits` block independently confirms the `2020-08-31: 4-for-1` split event. The distinct `adjclose` series (e.g. `$121.06` on 2020-08-28) is further adjusted beyond `close` — confirming `close` and `adjclose` are two different adjustment levels, exactly as Founder Decision 001's `close_price`/`adjusted_close_price` distinction assumes, and that `close` alone (not `adjclose`) already carries the retroactive split adjustment.
  - **Conclusion**: The empirical assumption underlying Founder Decision 001 and `docs/simulation_formulas.md` §3 — that raw `close_price` is already retroactively split-adjusted within a single fetch, so applying `split_ratio` on top would double-adjust — is **confirmed**, not refuted. No engine code was changed as part of this verification (none was warranted).
- **Residual gap, tracked separately, not reopening this KI**: the app's own `YFinanceProvider`/ingestion pipeline itself remains blocked by KI-044 (still Open) — this verification confirms the *data*, not that the *pipeline* is currently usable. KI-044's planned resolution (upgrading past yfinance 0.2.44) is unaffected by this entry and remains the actual fix for the pipeline-level block.
- **Residual gap closed (2026-07-27)**: KI-044 resolved via `YahooChartProvider`, a working pipeline path that reuses this exact endpoint/technique. Re-running this verification through the app's own real pipeline (`python -m app.ingestion.seed_real_catalog --symbols AAPL`, not a standalone investigative fetch) against AAPL's full real history confirms the same numbers this entry already found: `close_price` on 2020-08-28 (last trading day before the real 2020-08-31 4-for-1 split) = $124.8075, in the actually-stored `historical_prices` table, with the `2020-08-31, ratio=4.0` split event independently stored in `stock_splits`. A live Simulator run spanning the split (AAPL, 2020-01-02 to 2024-01-02) rendered the split-disclosure caption correctly against this real, pipeline-ingested data. See KI-044's resolution text for full detail. This KI's own status/resolution date are unchanged (the claim it verifies was already true and dated 2026-07-23); this note only records that the pipeline-level gap it flagged as residual no longer exists.
- **Resolution Date**: 2026-07-23

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

### KI-021

- **Description**: Founder Specification Part 3.3.2 explicitly lists "Growth Chart" as a required output of the Historical Investment Simulation feature, but the M3 Simulation Engine computes and stores only point-in-time start/end values (`initial_price`, `final_price`, `shares_purchased`, `final_value`) — no value-over-time series. Discovered during the M4 API design review, not accounted for in M3's scope.
- **Severity**: Medium
- **Status**: Resolved
- **Resolution (M4, 2026-07-10)**: Extended the Simulation Engine (not the API layer, per the founder-approved decision) with `app/simulation/formulas.py::calculate_growth_series` — a read-only replay of the same dividend-reinvestment event loop at every stored price date in range, rather than only the two endpoints. Wired into `run_simulation` via `SimulationOutcome.growth_series` and surfaced on `POST /api/v1/simulations`'s response. Verified by `tests/simulation/test_growth_series.py` (5 tests, including a cross-check that the series' final point exactly matches the independently-computed `apply_dividend_reinvestment` + `calculate_final_value` result) and one DB-integration test.
- **M7 Phase 3B update (2026-07-19)**: Founder Decision 014 approves the full fix (Option A — persist `growth_series` at creation, backfill existing completed simulations, version against `calculation_version`), reopening this issue's status from "partially resolved" to "Open" so it is not mistaken for closed. Not implemented in M7 Phase 3B itself, which built only the non-chart Results foundation and had no need to read `growth_series` yet. `calculation_version` was separately exposed on `SimulationResponse` in this same pass (ADR-036) — an unconditionally safe, independent schema addition, not part of the persistence fix itself.
- **M7 Phase 3C-2 resolution (2026-07-23)**: Founder Decision 014 (Option A) implemented in full — `alembic/versions/0005_growth_series_persistence.py` adds a nullable `simulations.growth_series` JSONB column; `app/simulation/engine.py::run_simulation` persists the computed series onto the `Simulation` row at creation for completed simulations only (failed/pending rows stay `NULL`); `app/api/v1/services/simulation_service.py::get_simulation_by_id` now read-throughs the persisted column on every `GET` (via `app/simulation/growth_series_codec.py::deserialize_growth_series`) instead of returning an empty list, and additionally re-queries `stock_splits` fresh via `SimulationRepository.get_splits_ordered` for `disclosed_splits` (Founder Decision 014 clause 5 — no new column needed, splits already live queryably in `stock_splits`). Pre-existing completed rows were backfilled via `python -m app.simulation.backfill_growth_series`, which re-runs `calculate_growth_series` against each row's own stored inputs and stamps the result onto that row's *own*, already-stored `calculation_version` (never a newer one) — see ADR-042 for the full engineering record, including why `calculate_growth_series` itself is unaffected by Founder Decision 016's CAGR-scale fix (growth-series values are currency, not a percentage, so a "v1"-stamped backfilled series remains methodologically truthful). Both fields are now covered by a live create-then-GET round-trip test (`tests/api/test_simulations.py::test_get_simulation_by_id_round_trips`, `::test_get_simulation_by_id_returns_disclosed_splits`) asserting the `GET` response is byte-identical to what the original `POST` returned. `frontend/src/types/api.ts`'s `GrowthSeriesPoint`/`DisclosedSplit`/`SimulationResponse.growth_series` doc comments updated to reflect resolution — the field shapes themselves needed no correction (confirmed against the running backend's `/openapi.json` via `api-contract-drift.test.ts`).
- **Known residual gap, not a reopening**: a pre-existing completed row whose underlying `historical_prices`/`dividends` data can no longer support a full recompute (e.g. deleted or never-fully-imported price data for that exact date range) is left at `growth_series = NULL` by the backfill script and logged, not silently skipped — such a row's `GET` would still return an empty `growth_series`, the one narrow, reported exception to "never empty for a completed simulation." No such row was found against this platform's actual backfilled data (see the M7 Phase 3C-2 session's final report for the exact row count). See ADR-042's "unrecoverable-row edge case" section.
- **Resolution Date**: 2026-07-23

### KI-022

- **Description**: Founder Specification Part 2.8.8 states "sensitive endpoints... Create Simulation... should require authentication," while Part 2.6.24 explicitly designs `simulations.user_id` as nullable "to support a public simulator experience without requiring account creation" — a direct internal inconsistency. Discovered during the M4 API design review.
- **Severity**: Medium
- **Status**: Resolved — per explicit founder decision
- **Resolution (M4, 2026-07-10)**: Founder approved `POST /api/v1/simulations` as public for MVP, optionally authenticated later: anonymous simulations allowed (`user_id = NULL`); rate limiting required instead of authentication as the MVP-appropriate control. Implemented in `app/api/v1/routers/simulations.py` (hardcoded `user_id: uuid.UUID | None = None` until M5 exists) plus a Redis-backed fixed-window rate limiter (`app/core/rate_limit.py`, 60 requests/min on this endpoint).
- **Resolution Date**: 2026-07-10

### KI-023

- **Description**: Founder Specification Part 3.3.10 (Simulation History) and the Administrator-only endpoints implied by Part 2.8.6 (manage assets, trigger imports, review audit logs) both require real authentication/authorization to be meaningfully access-controlled, but M4 explicitly excludes implementing authentication (reserved for M5).
- **Severity**: Low
- **Status**: Resolved — per explicit founder decision, deferred to M5
- **Resolution (M4, 2026-07-10)**: Founder confirmed both endpoint families may be designed (see `docs/api_design.md` §5–6) but must not be implemented until M5 (simulation history) and M5-or-later with admin authorization (import endpoints). Neither route exists in `app/api/v1/routers/` — only `POST`/`GET /api/v1/simulations/{id}` (single-record, not history) and asset read endpoints are implemented in M4. No unprotected admin surface is exposed.
- **Update (M5, 2026-07-11)**: The authentication *middleware* this deferral was waiting on now exists (`app.api.v1.dependencies.get_current_user_required`/`get_current_admin_user`) and is already wired into `GET /api/v1/simulations/{id}`'s ownership check. Simulation History (`GET /api/v1/simulations`) and Admin Import (`GET`/`POST /api/v1/admin/imports`) themselves were not part of M5's explicit scope (Identity system only) and remain unbuilt — tracked forward as new follow-on work, not a reopening of this KI: building them is now a routes-and-schemas exercise, not an auth-infrastructure one.
- **Resolution Date**: 2026-07-10

### KI-024

- **Description**: Founder Specification Part 2.6.24's literal column names are `include_dividends`/`adjust_for_inflation`, but the M1 `simulations` table (and M3 engine parameters) use `dividends_reinvested`/`inflation_adjusted` instead — a naming deviation from the spec's literal text, not caught during M1 or M3. Discovered during the M4 API design review.
- **Severity**: Low
- **Status**: Resolved — per explicit founder decision
- **Resolution (M4, 2026-07-10)**: Founder confirmed the external API contract should use the Founder Specification's own vocabulary while internal names may remain unchanged. Implemented at the Pydantic-schema boundary: `app/api/v1/schemas/simulations.py::SimulationCreateRequest`/`SimulationResponse` use `include_dividends`/`adjust_for_inflation` externally; `app/api/v1/services/simulation_service.py::create_simulation` explicitly maps them to `dividends_reinvested`/`inflation_adjusted` when calling `run_simulation` (no Pydantic aliasing magic — a plain, readable parameter mapping). No schema/engine change made.
- **Resolution Date**: 2026-07-10

### KI-025

- **Description**: Founder Specification Part 3.3.6 lists "Exchange" as an Asset Details output field, but the M1 `assets` table has no such column.
- **Severity**: Low
- **Status**: Open — Founder-approved non-blocking gap
- **Update (M4, 2026-07-10)**: Founder confirmed this is not blocking for M4: `GET /api/v1/assets/{symbol}` returns `"exchange": null` explicitly (present in the contract, not omitted) rather than blocking on a schema change. Implemented in `app/api/v1/schemas/assets.py::AssetDetail`.
- **Planned Resolution**: Add an `exchange` column to the `assets` table in a future schema-enhancement migration; update `AssetDetail`/`asset_service.get_asset_by_symbol` accordingly. Not scheduled to a specific milestone.
- **Resolution Date**: —

### KI-026

- **Description**: `docs/api_design.md` (the M4 design review document, written and approved before implementation) specifies that `POST /api/v1/simulations` "writes an `audit_logs` row (`entity_type="simulation"`, `event_type=SIMULATION_CREATED`... for every request, success or failure." This was not implemented — `app/api/v1/services/simulation_service.py::create_simulation` does not write to `audit_logs` at all. Discovered during M4's own documentation-update pass, after implementation and full test verification were already complete.
- **Severity**: Low (no security or correctness impact — the simulation itself is still stored, including failed attempts, per Founder Specification Part 2.6.24; only the separate `audit_logs` trail described in the design note is missing) — but a genuine design-vs-implementation drift, not a deliberate, founder-approved scope cut like KI-021/023.
- **Status**: Resolved
- **Resolution (M4 follow-up, 2026-07-10)**: Added `app/api/v1/audit.py::record_simulation_audit`, called from `simulation_service.create_simulation` on every outcome — success, the three pre-flight validation errors (`AssetNotFoundError`, `InvalidDateRangeError`, `InvalidInvestmentAmountError`), and the two mid-simulation errors (`MissingHistoricalDataError`, `CalculationError`) — plus `record_simulation_request_validation_audit`, called from the `RequestValidationError` handler (`app/api/v1/exception_handlers.py`) for Pydantic-level request validation failures that never reach the service layer at all (e.g. a non-positive `investment_amount`). Every audit row records: `event_type` (`SIMULATION_CREATED` — see design note below), `entity_id` (the real `Simulation.id` when one was persisted, otherwise a synthetic `uuid4()` correlation id, since `entity_id` is `NOT NULL` and this column is documented as FK-less/polymorphic), and inside `details` (JSONB): `status` (`"succeeded"`/`"failed"`), `asset_symbol`, `request_id`, `error_code` (`None` on success), and `simulation_id` (`None` when no row was persisted). `user_id` is always `NULL` (anonymous), per M4's no-authentication scope. The write is isolated in a SAVEPOINT (`session.begin_nested()`) and swallows `SQLAlchemyError` with a logged warning — a broken audit write can never turn a correct simulation result or a correctly-classified error response into an unrelated 500, mirroring the Redis rate-limiter's fail-open policy.
- **Design note not followed literally**: no new `SIMULATION_FAILED` enum value was added — `AuditEventType`'s own docstring (`app/models/enums.py`) states "adding a value later is a migration... expand deliberately, not speculatively," and a schema migration was judged out of scope for this fix. The existing `SIMULATION_CREATED` value is reused for every attempt (success or failure); `details.status`/`details.error_code` carry the outcome instead. Every literal field the requirement asked for (event type, simulation id, asset symbol, request id, status, error code, timestamp via `created_at`, anonymous `user_id = NULL`) is present.
- **Verified by**: `tests/api/test_simulation_audit.py` (4 tests) — one audit row is written for a successful simulation, an asset-not-found pre-flight failure, a missing-historical-data mid-simulation failure (with `entity_id`/`details.simulation_id` matching the persisted failed `Simulation` row), and a Pydantic-level request validation failure.
- **Resolution Date**: 2026-07-10

### KI-027

- **Description**: `app.auth.service.refresh_session`'s rotation step (read the presented token's row, then create a new row and mark the old one revoked) has no row-level lock (e.g. `SELECT ... FOR UPDATE`). Two concurrent refresh requests presenting the same still-valid refresh token could both read it as valid before either revokes it, each issuing its own new token — forking one session into two instead of enforcing exactly one successor per rotation. Discovered during the M5 red-team self-review.
- **Severity**: Low (mirrors KI-012's TOCTOU race in ingestion asset/indicator resolution — same class of issue, same reasoning: no legitimate client issues two concurrent refreshes with the same token under normal use, and the resulting "fork" does not grant elevated privilege, only an extra valid session).
- **Status**: Open
- **Planned Resolution**: Add `with_for_update=True` (or an equivalent `SELECT ... FOR UPDATE`) to `AuthRepository.get_refresh_token_by_hash` when called from the rotation path, before any milestone introduces genuinely concurrent refresh traffic (e.g. multiple tabs/devices racing a near-simultaneous refresh).
- **Resolution Date**: —

### KI-028

- **Description**: The access token is a stateless JWT by design (Founder Decision 002, ADR-017/018) — it cannot be revoked before its own 15-minute expiry. A stolen access token (e.g. exfiltrated via a compromised proxy or a server-side log that captured a raw `Authorization`/cookie header despite HTTPS) remains valid for up to 15 minutes after logout or password change, even though the corresponding refresh token is immediately revoked. Identified during the M5 red-team self-review as a residual, architecturally-inherent risk, not a bug.
- **Severity**: Low-Medium (bounded by the short, deliberately-chosen 15-minute lifetime; cannot be used to obtain a *new* session once revoked, only to continue an already-stolen one until it naturally expires).
- **Status**: Open — Accepted tradeoff of the approved stateless-access-token design
- **Planned Resolution**: None planned at MVP scale — the 15-minute bound is the accepted mitigation. If this is ever judged insufficient (e.g. a future compliance requirement demands immediate access-token revocation), the fix is a short-TTL server-side denylist checked on every request, which reintroduces a per-request Redis round-trip similar to the existing rate limiter's — a deliberate cost this design avoided for M5.
- **Resolution Date**: —

### KI-029

- **Description**: `AccountLockedError`'s `retry_after_seconds` value (how long until the lockout window clears) is computed by `AccountLockout.is_locked` but never surfaced to the API client — the `429 ACCOUNT_LOCKED` response carries only a generic message, no `Retry-After` header or `retry_after_seconds` field. Identified during the M5 red-team self-review.
- **Severity**: Low (a product/UX gap, not a security issue — if anything, withholding the exact remaining duration very slightly reduces an attacker's ability to precisely time a retry).
- **Status**: Open
- **Planned Resolution**: Surface `retry_after_seconds` via a standard `Retry-After` response header when a future milestone's frontend needs to display a countdown; no backend logic change required, the value is already computed.
- **Resolution Date**: —

### KI-030

- **Description**: `tests/api/test_auth.py` passes `cookies=...` explicitly on individual `TestClient`/httpx requests to work around a real transport quirk: `settings.cookie_secure` defaults to `True` (Secure cookies), but `TestClient` talks to the app over a plain-http scheme (`http://testserver`), so httpx's cookie jar correctly refuses to *resend* a Secure cookie automatically, exactly as a real browser would over non-TLS. The per-request `cookies=` parameter works around this but is flagged by httpx as deprecated (`DeprecationWarning: Setting per-request cookies=... is being deprecated`).
- **Severity**: Low (test-infrastructure-only; does not affect production code or the actual cookie security attributes, which are verified directly by `test_register_sets_httponly_secure_strict_cookies`).
- **Status**: Open
- **Planned Resolution**: If a future httpx major version removes the per-request `cookies=` parameter, switch the affected tests to either an `httpx.Client` configured with `base_url="https://testserver"` (satisfying the Secure-cookie scheme check without the deprecated parameter) or a dedicated non-Secure-cookie test settings override — not yet done, since the current approach works and the warning is non-fatal.
- **Resolution Date**: —

### KI-031

- **Description**: Password reset / account recovery has no implementation — explicitly excluded from M5's scope by direct instruction (Founder Decision 002). A user who forgets their password today has no way to regain access to their account.
- **Severity**: Medium (a real, user-facing product gap — not a security vulnerability, since there is simply no reset flow to exploit — but `.claude/SECURITY_POLICY.md` is explicit that auth should not ship to production without one).
- **Status**: Open — Deliberately deferred, not forgotten
- **Planned Resolution**: Design and implement a standard email-based, time-limited, single-use reset-token flow before any production launch. Must not be built as part of a future milestone's "quick addition" — treat it as its own reviewable unit of work given it touches credential handling directly.
- **Resolution Date**: —

### KI-032

- **Description**: `app.ai.safety`'s three post-generation gates (numeric-integrity, output-structure, advice-language) are heuristic, not exhaustive. Known gaps, each documented in the relevant function's own docstring: a fabricated number spelled out in words ("twelve hundred dollars") or abbreviated ("$1.2K") is not extracted by the numeric-token regex and so cannot be checked; advice-like language phrased in a way none of the ~8 regex patterns match (e.g. "this looks like a great opportunity") would pass `check_advice_language` uncaught. Identified during the M6 AI Safety Review as a residual limitation of a pattern-matching approach, not a defect in the patterns that do exist.
- **Severity**: Medium (a genuine gap in the platform's only automated defense against a hallucinated fact or disallowed advice reaching a user — mitigated in practice by the prompt's own explicit instructions and Anthropic's general instruction-following behavior, but not backstopped by code for these specific phrasings).
- **Status**: Open
- **Planned Resolution**: Expand the advice-language pattern list and numeric-token extraction as real-world false negatives are observed (this is inherently an iterative, usage-driven process, not a one-time fix); consider a second-pass LLM-based self-critique step (the model checking its own output against the rules) if manual pattern expansion proves insufficient — not built now, to avoid doubling the cost/latency of every generation on a speculative improvement.
- **Resolution Date**: —

### KI-033

- **Description**: `explanation_service.get_or_create_explanation`/`ask_followup_question`'s regeneration/follow-up cap check (`_count_attempts` then compare, then insert) has no row-level lock or atomic increment — the same class of TOCTOU race already tracked at KI-012 (ingestion) and KI-027 (refresh-token rotation). Two genuinely concurrent requests against the same simulation near the cap boundary could both read a count under the limit and both proceed, momentarily exceeding it by one. Identified during the M6 AI Safety Review.
- **Severity**: Low (mirrors KI-012/KI-027's precedent and reasoning exactly: no realistic single-user client issues two concurrent regenerate/follow-up requests against the same simulation, and the worst outcome is one extra model call over the configured cap, not a security or correctness violation).
- **Status**: Open
- **Planned Resolution**: If genuinely concurrent AI-generation traffic is ever observed, add a `SELECT ... FOR UPDATE` on the count query or switch to an atomic Redis counter (matching the existing rate-limiter's mechanism) before the cap is relied upon as a hard cost ceiling rather than a best-effort one.
- **Resolution Date**: —

### KI-034

- **Description**: The Explanation Engine's caching decision (`app.ai.providers.get_ai_provider`'s selected model vs. the historical row's stored `model_name`) assumes a real provider echoes back exactly the model identifier it was asked for. `AnthropicProvider.generate` stores `response.model` (the vendor's own reported value) rather than the requested `settings.ai_model_name` directly — for a model alias that resolves to a specific dated snapshot, these could in principle differ, which would cause the cache to treat every request as "model changed" (always regenerating, never over-caching) rather than the reverse. Identified during implementation, not observed against a real Anthropic response (no live API key was available to verify empirically).
- **Severity**: Low (the failure mode is "cache never hits, more model calls than necessary," not "cache incorrectly returns a stale result for a genuinely different model" — a cost inefficiency, not a correctness or safety risk).
- **Status**: Open
- **Planned Resolution**: Verify against a real Anthropic API key whether `response.model` ever diverges from the requested model string for this project's configured model name; if it does, cache-match on the *requested* model name consistently (store it in a separate column) rather than the provider-echoed one.
- **Resolution Date**: —

### KI-035

- **Description**: `.github/workflows/ci.yml` provisions a `postgres` service but no `redis` service — it never has. `tests/auth/test_service.py::test_authenticate_locks_out_after_repeated_failures` (and, less visibly, `test_authenticate_resets_lockout_counter_on_success`) constructed a real, Redis-backed `AccountLockout` via `get_redis_client()` with no reachability guard, unlike every other Redis-dependent test in the project (`tests/core/test_rate_limit.py`, `tests/auth/test_lockout.py`), which either skip gracefully or deliberately target an always-unreachable address. In CI, `get_redis_client()` resolves to an address nothing is listening on, so every `AccountLockout` call in that test failed open (correctly, per its own documented behavior) — meaning 3 wrong-password attempts never actually locked the account, and the test's final assertion (`pytest.raises(AccountLockedError)` on the 4th, correct-password call) failed because authentication legitimately succeeded instead. Discovered post-merge, in GitHub Actions, after M6 merged (the failure is unrelated to M6's own changes — no file under `app/ai/` or `app/api/v1/services/explanation_service.py` touches authentication).
- **Severity**: Medium (blocked CI with a false-negative-looking failure — the *production* fail-open behavior being exercised was itself correct; only the test's assumption that Redis is always reachable was wrong. No real lockout-enforcement regression existed).
- **Status**: Resolved
- **Resolution**: `tests/auth/test_service.py`'s default `_lockout()` helper now returns `tests.auth.conftest.FakeAccountLockout` — an in-memory test double matching `AccountLockout`'s exact interface (`is_locked`/`record_failed_attempt`/`reset`) — for every test in the file that doesn't specifically exercise Redis itself, removing that file's implicit Redis dependency entirely. Two new, explicit tests were added immediately alongside the fixed test: `test_authenticate_enforces_lockout_when_redis_available` (a real, Redis-backed `AccountLockout`, skipping gracefully if Redis is unreachable — matching `tests/auth/test_lockout.py`'s own convention) and `test_authenticate_fails_open_when_redis_unavailable` (a real `AccountLockout` pointed at an always-unreachable address, asserting both that `authenticate()` never raises `AccountLockedError` and that the expected `"failing open"` warning is actually logged, via `caplog`). No production code changed — `app/auth/lockout.py`'s fail-open behavior is unchanged and, for the first time, directly verified at the `authenticate()` integration level, not just at the `AccountLockout` unit level.
- **Verified by**: `tests/auth/test_service.py::test_authenticate_locks_out_after_repeated_failures` (now deterministic, no Redis dependency), `test_authenticate_enforces_lockout_when_redis_available`, `test_authenticate_fails_open_when_redis_unavailable` — full suite (278 tests) passing locally; CI no longer requires Redis for any test in this file.
- **Resolution Date**: 2026-07-12

### KI-036

- **Description**: `frontend/src/types/api.ts` types `growth_series` (on `SimulationResponse`) as `GrowthSeriesPoint[]`, where `GrowthSeriesPoint = { date: string; value: string }`. This exact two-field shape is **assumed, not confirmed** — `docs/api_design.md` documents that `growth_series` is present in the response but never specifies what its per-point object actually contains (it could, for example, turn out to have additional fields like a cumulative-shares count, or use different key names entirely). It could not be checked against a real response while writing this type because `growth_series` is always returned as an empty array today (KI-021 — the backend doesn't yet persist it between the initial `POST` and a later `GET`). In plain terms: **the frontend has a guess for what one point of growth-chart data looks like, and nothing has verified that guess yet.**
- **Severity**: Low today (no chart or screen reads this type yet, so a wrong guess currently costs nothing). Would become a real, if easily caught, bug the moment M7 Phase 2 builds the growth chart against this type and the real shape turns out to differ — `tsc` would not catch this on its own, since the mismatch would only surface once real API response data is actually fetched and doesn't match the assumed field names.
- **Status**: Resolved
- **Resolution**: M7 Phase 1.5's API-contract-drift review read `backend/app/api/v1/schemas/simulations.py` directly and confirmed the guess was wrong: the field is named **`point_date`**, not `date` (`DisclosedSplit`'s date field is separately named `split_date`, also not `date`). Both corrected in `frontend/src/types/api.ts`. Additionally verified live, end-to-end, against the backend's own running `/openapi.json` (`frontend/src/__tests__/lib/api-contract-drift.test.ts`), not just by reading source — the fetched schema's `GrowthSeriesPoint`/`DisclosedSplit` properties confirmed `point_date`/`split_date` and confirmed `date` is absent from either.
- **Resolution Date**: 2026-07-16

### KI-038

- **Description**: M7 Phase 1.5's contract-drift review, reading `backend/app/api/v1/schemas/simulations.py::SimulationResponse` directly, found two further mismatches beyond KI-036 in `frontend/src/types/api.ts`'s hand-written `SimulationResponse` type: (1) six fields the frontend had typed as always-present strings — `initial_price`, `final_price`, `shares_purchased`, `final_value`, `total_return_percentage`, `cagr_percentage` — are actually `Decimal | None` on the backend (null whenever `status` is `pending` or `failed`, i.e. the calculation never completed); (2) the backend response includes an `error_message: str | None` field (the descriptive failure reason for a `failed` simulation) that the frontend type omitted entirely.
- **Severity**: Medium at the time it existed — a real type-safety gap that would have let Phase 2 code assume a hero stat tile's value is always a valid figure, when a `pending`/`failed` simulation would actually hand it `null` and no error message would have been renderable at all. Resolved before any component consumed the type.
- **Status**: Resolved
- **Resolution**: All six fields marked `DecimalString | null` in `frontend/src/types/api.ts`; `error_message: string | null` added. Verified live against the backend's running `/openapi.json` (`frontend/src/__tests__/lib/api-contract-drift.test.ts`), which asserts `error_message` is present in the real schema. A future M7 Phase 2 task: design the Results screen's explicit `pending`/`failed`-status treatment (distinct from the already-designed nullable-inflation-value treatment, frontend_design_system.md §14 risk 7) — not yet done, since no Results screen exists yet.
- **Resolution Date**: 2026-07-16

### KI-037

- **Description**: M7 Phase 1's original design tokens shipped two related, now-fixed defects in `frontend/src/styles/tokens/{primitives,semantic}.css`, both caught during Phase 1.5's accessibility hardening review, before any product page used them: (1) the muted-ink neutral and all four status colors (good/warning/serious/critical) used a single hex shared by light and dark mode, and three of the four status colors plus muted-ink failed WCAG AA's 4.5:1 text-contrast threshold against at least one theme's background (computed and verified programmatically, not eyeballed — see `frontend/src/__tests__/lib/contrast.test.ts`); (2) independently, `semantic.css`'s `:root` block declared each status semantic token as a literal self-reference (e.g. `--color-status-good: var(--color-status-good)`), which is invalid CSS per the Custom Properties spec and would have caused `badge.tsx`'s status-colored text to silently fall back to an inherited color instead of its intended status hue — confirmed by inspecting the actual compiled production CSS output, not just the source.
- **Severity**: Medium at the time it existed (a real, silent, shipped defect — not a hypothetical one) — resolved to Low/closed now. No user was ever affected, since no product page consumed these tokens before this fix landed in the same milestone the tokens were introduced.
- **Status**: Resolved
- **Resolution**: ADR-028 (`docs/ARCHITECTURE_DECISIONS.md`) — split every affected color into verified light/dark primitive pairs, fixed the self-reference, and added all three theme-selector blocks (`:root`, the `prefers-color-scheme` media block, and `[data-theme='dark']`) with the corrected values. `docs/frontend_design_system.md` §3 updated to match. Permanent regression test: `frontend/src/__tests__/lib/contrast.test.ts`.
- **Resolution Date**: 2026-07-16

### KI-039

- **Description**: Session cookies are delivered with `SameSite=Strict` (Founder Decision 002, ADR-018), which only attaches a cookie to a request when the requesting page and the cookie's origin server share the same **site** — the same registrable domain (eTLD+1) — regardless of subdomain or port. ADR-018's own text assumes "the frontend is same-origin-deployable via Vercel + a custom domain," but nothing in `.claude/SYSTEM.md`'s approved infrastructure list (Vercel for frontend; Railway or Render for backend) requires that a shared, custom parent domain actually be configured before production launch. If the platform ships on each provider's default subdomain (e.g. `investment-time-machine.vercel.app` and `investment-time-machine-api.up.railway.app`), those two hosts do **not** share a registrable domain, and `SameSite=Strict` cookies will never be attached to any cross-origin request between them — authentication would silently fail for every user in production, in a way no existing test catches (both the frontend's and backend's test suites currently exercise same-host/same-origin requests only). Found during M7 Phase 1.5's auth/CSRF posture review (`docs/SECURITY_LOG.md`).
- **Severity**: High. **Upgraded from Medium-High (2026-07-17)**: the original assessment framed this as a production-launch gate, but the underlying failure (`SameSite=Strict` cookies never attaching cross-site) is not specific to production — it breaks identically on the *first deployed staging or demo environment*, the moment frontend and backend are deployed to two different hosts without a shared custom parent domain. That is very likely to happen well before a production launch decision is even made (a Vercel preview deploy pointed at a Railway/Render staging API is the default, not an edge case), so this is a near-term deployment blocker, not a distant pre-launch one.
- **Status**: Open
- **Deadline**: Before the first deployed staging/demo environment (not "before production") — i.e., before any environment where the frontend and backend run on two different hosts is ever stood up and shown to anyone, including an internal demo.
- **Planned Resolution**: Before any deployed environment (staging, demo, or production), either (a) provision a custom domain with the frontend and backend as sibling subdomains of the same registrable parent (e.g. `app.example.com` / `api.example.com`), confirmed same-site under `SameSite=Strict`, or (b) if a shared parent domain is genuinely not available for that environment, revisit ADR-018's cookie strategy for cross-site deployment (e.g. `SameSite=None; Secure` plus a real CSRF token, reopening the exact tradeoff ADR-018 originally avoided). Must be resolved and verified against the actual chosen hosting setup for that specific environment, not assumed, before `.claude/SECURITY_POLICY.md`'s production-readiness bar is considered met for it.
- **Resolution Date**: —

### KI-040

- **Description**: No Content Security Policy exists anywhere in the frontend today (confirmed by a repo-wide search — no `Content-Security-Policy` header configuration in `next.config.ts` or anywhere else), so this is a forward-looking design note, not a current gap. `frontend/src/app/layout.tsx` renders exactly one `dangerouslySetInnerHTML` (`THEME_INIT_SCRIPT`, the theme-flash-prevention inline script, `docs/SECURITY_LOG.md`'s M7 Phase 1 entry) in the root layout, which wraps every current route. A strict CSP's two standard techniques for allowing a specific inline script interact with this script very differently: **nonce-based CSP** (Next's own recommended approach, `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`) requires the *entire application* to switch to dynamic rendering — nonces are generated per-request via Proxy, and Next explicitly documents that static generation and CDN caching are lost app-wide the moment nonces are adopted anywhere — a real conflict with this project's `.claude/PERFORMANCE_BUDGET.md` ($0-10/month infra target, currently met partly *because* every route today is static) and with the fact that every route in this app is deliberately static today. **Hash-based CSP** (allow-listing the script via its own `sha256-<hash>` in a `script-src` directive — the standard CSP mechanism, distinct from Next's experimental SRI feature for *asset* integrity) is compatible with static generation and is the better fit for this specific script, since `THEME_INIT_SCRIPT` is a fixed, deterministic string (a pure function of a compile-time constant) whose hash never changes between requests.
- **Severity**: Low (no CSP exists to violate; this is deferred design guidance for whenever CSP is introduced, not an active gap).
- **Status**: Open — deliberately deferred, not forgotten
- **Planned Resolution**: When a future milestone introduces a CSP (`.claude/SECURITY_POLICY.md` does not currently mandate one), prefer the hash-based `script-src 'sha256-<hash of THEME_INIT_SCRIPT>'` allow-list over nonces specifically for this script, to avoid forcing the entire app into dynamic rendering for the sake of one small, static inline script. Re-evaluate if a future phase's own requirements (e.g. a genuinely dynamic, per-request-personalized page) make dynamic rendering necessary anyway for unrelated reasons, at which point nonces become the simpler uniform choice.
- **Resolution Date**: —

### KI-041

- **Description**: Before this entry, `.github/workflows/ci.yml` had no frontend job at all — only a backend `lint-and-test` job and a repo-wide `secret-scan`. Nothing about the frontend (lint, typecheck, tests, build) was enforced in CI; a broken frontend build or a failing test could be merged to `main` without any automated check catching it. Raised while confirming whether `api-contract-drift.test.ts` (KI-036/KI-038's regression guard, ADR-030) was CI-enforced — it was not, because *nothing* frontend-related was.
- **Severity**: Was Medium (a real gap — the frontend's 100+ tests, lint rules including the financial-math guardrail (ADR-029), and production build were all unverified by CI) — partially resolved by this entry.
- **Status**: Partially Resolved
- **Resolution**: Added a `frontend-lint-and-test` job to `.github/workflows/ci.yml` (checkout, `npm ci`, `eslint`, `tsc --noEmit`, `vitest run`, `npm run build`), mirroring the backend job's structure. This closes the general "nothing frontend is CI-enforced" gap — lint, typecheck, the full test suite (105 tests as of this fix), and the production build now run on every push/PR.
- **Remaining gap, not resolved by this fix**: `api-contract-drift.test.ts`'s live-schema assertions still only run when a real backend is reachable — the new CI job runs no `postgres`/`redis`/`uvicorn` services, so in CI this test always takes its graceful-skip path (matching ADR-030's documented tradeoff), meaning CI enforces that the drift test *exists and does not crash*, but not that its live-path assertions currently pass against a real backend. Provisioning a live backend service in CI (mirroring the existing `postgres` service in the backend job, plus `redis` and a migrated database, plus starting `uvicorn`) would close this fully, but is a larger CI-infrastructure change than this cleanup pass's scope — tracked here rather than done silently as a side effect.
- **Planned Resolution**: When CI infrastructure work is next scheduled, add `postgres`/`redis` services plus a migration-and-`uvicorn`-startup step to a job the frontend test run can reach, and remove the graceful-skip dependency for that specific CI run (local runs without a backend should still skip gracefully, as they do today).
- **Resolution Date**: 2026-07-17 (partial — the general frontend-CI gap; the live-backend-in-CI gap remains open)

### KI-042

- **Description**: `SameSite=Strict` (Founder Decision 002, ADR-018) withholds a cookie not only cross-*site* but also on the *first* top-level navigation that arrives **from** a different site — including a plain link click from an email, a chat app, or a search engine result — even when the destination is this site itself. (This is the specific behavioral difference from `SameSite=Lax`, which still allows a cookie on a top-level, top-level-GET cross-site navigation; `Strict` does not.) ADR-018's own "Options Considered"/"Tradeoffs" sections evaluate cookies-vs-`localStorage` and note a CORS/non-browser-client tradeoff, but never discuss `Strict` vs. `Lax` or this specific first-load consequence — a real gap, since Founder Decision 002 explicitly approves anonymous users sharing simulation links, making "someone clicks a link from outside the app" a designed-for, not edge-case, user flow. Concretely: an anonymous simulation's shared link is entirely unaffected (no cookie/auth is involved in reading it at all — `GET /api/v1/simulations/{id}` allows public read for `user_id = NULL` rows). The one real-world case affected: an **authenticated** user who shares (or bookmarks/emails to themselves) a link to their **own** saved simulation, then opens that link via an external top-level referrer — on that first request, their session cookie is withheld, the request is treated as anonymous, and since the simulation's `user_id` is set, the access-control rule in `docs/api_design.md` §5 returns `FORBIDDEN` — a confusing "access denied" on the very first click of a link to content the user owns. The very next in-app navigation resolves it normally (the cookie flows on every subsequent same-site request).
- **Severity**: Low (self-resolving after one navigation, does not affect anonymous/shared-by-default simulation links — the platform's primary sharing use case per Founder Decision 002 — and is not a security issue; it is a UX rough edge specific to authenticated users' own saved simulations, which is not yet a built feature — Simulation History and any "share my saved simulation" UI do not exist yet, M7 Phase 2+).
- **Status**: Open — documented as an accepted tradeoff, not actioned
- **Assessment**: `SameSite=Strict` remains the right choice for now. It was not an oversight so much as an unstated consequence of an otherwise-correct decision: `Strict` gives a strictly stronger CSRF guarantee than `Lax` (which still permits some cross-site GET-triggered state, per the same-site cookie spec's own caveats around top-level navigation), and the affected flow (an authenticated user's own saved-simulation link) doesn't exist as a built feature yet. Switching to `Lax` purely to avoid this narrow, self-resolving, non-security consequence would trade away real CSRF protection for a UX nicety that isn't yet in scope — not judged worth it here, but recorded explicitly so it is a deliberate choice on the record, not a silent gap, the next time Simulation History or saved-simulation sharing is designed.
- **Planned Resolution**: Revisit when M7 Phase 2 (or later) designs Simulation History / a "share my simulation" feature for authenticated users specifically — at that point, decide explicitly whether to accept the first-click-from-outside friction (documented here, with in-product copy softening it, e.g. "Sign in again to view your saved simulations" rather than a bare `FORBIDDEN`) or revisit the `Strict`/`Lax` choice at that time, with the real feature's actual UX requirements in hand rather than a hypothetical one.
- **Resolution Date**: —

### KI-043

- **Description**: `AssetSearchCombobox` (`frontend/src/components/simulator/asset-search-combobox.tsx`) manages its displayed input text as its own uncontrolled state — the parent `SimulationForm` only receives the selected asset via `onChange`, it never controls the combobox's visible text. The Simulator's "Start a new simulation" action (shown after a successful submission) calls React Hook Form's `reset()`, which correctly clears `asset_symbol` back to `''` in form state, but does **not** touch the combobox's own internal `inputValue` state, since the component is not unmounted — only its props change, and `onChange`/`value` aren't part of the reset path at all. The visible symptom: after clicking "Start a new simulation," the text input still shows the previously selected asset (e.g. "AAPL — Apple Inc.") even though the underlying form value is empty and a fresh submission with an unselected asset would correctly fail validation. Found during this same phase's own post-build review of the Simulator (the same "verify your own recent work rather than assume it's correct" discipline M7 Phase 1.5 established for KI-036/KI-037/KI-038), before this feature was shown to the founder.
- **Severity**: Was Low-Medium (a real, user-visible correctness bug in a just-built feature's reset flow — misleading, though not silently destructive, since the stale text does not silently get resubmitted as a valid selection; the underlying form value is genuinely empty and validation still catches an unselected asset on submit) — resolved within the same phase it was introduced.
- **Status**: Resolved
- **Resolution**: `SimulationForm` now tracks a `formKey` counter, incremented in `handleStartNew`, and renders the `<form>` with `key={formKey}` — the standard React idiom for forcing a full remount (and therefore a clean reset of all uncontrolled child state, including the combobox's internal text) when a parent-owned reset needs to reach state the parent doesn't otherwise control. No change was needed to `AssetSearchCombobox` itself.
- **Resolution Date**: 2026-07-18

### KI-044

- **Description**: `YFinanceProvider` (`backend/app/ingestion/providers/yfinance_provider.py`) failed for every symbol tested (AAPL, SPY, BTC-USD), inside Docker and identically outside it, with `Expecting value: line 1 column 1` followed by yfinance's own `"possibly delisted; no timezone found"` fallback. Root-caused (not guessed) via yfinance's own debug mode (`yf.enable_debug_mode()`): yfinance 0.2.44's internal crumb-negotiation endpoint, `query1.finance.yahoo.com/v1/test/getcrumb`, returned **HTTP 429 Too Many Requests**; yfinance then used the literal string `"Edge: Too Many Requests"` as the crumb value on the follow-up chart-data request (also 429), producing the JSON-parse failure. This is not a Docker networking/User-Agent/cookie issue (the identical failure reproduced from a bare host process outside any container) and not a wholesale Yahoo IP block (a plain `requests.get()` to the actual chart endpoint, `query2.finance.yahoo.com/v8/finance/chart/AAPL`, with no crumb, succeeded with a clean `200`/valid JSON during the same investigation) — it is specifically yfinance 0.2.44's crumb/cookie negotiation logic hitting a tight, un-backed-off rate limit on Yahoo's `/v1/test/getcrumb` and `guce.yahoo.com/consent` endpoints, then retrying against the same rate-limited endpoints immediately rather than backing off, guaranteeing repeated failure once triggered.
- **Severity**: Medium — blocks all local yfinance-based ingestion (stocks/ETFs, and crypto via a `BTC-USD`-style ticker) for an unpredictable window once triggered; does not affect CoinGecko or FRED ingestion, and does not affect the platform's already-ingested data or the Simulation Engine (a pure ingestion-time provider reliability issue, verified to have zero effect on `close_price`-based calculation correctness).
- **Status**: **Resolved.**
- **Interim mitigation (superseded, kept for history)**: `DevSeedProvider` (`backend/app/ingestion/providers/dev_seed_provider.py`, `--provider dev_seed`) — a small, deterministic, clearly-synthetic local fixture provider, unblocked manual frontend/Simulator testing without depending on yfinance's rate-limit state (ADR-035). Never a fix to the underlying cause, and still in use today for the demo/fixture scenarios it was designed for (loss, dividend, split demos) — see the resolution below for how it now coexists with real data.
- **Resolution (2026-07-27)**: `YahooChartProvider` (`backend/app/ingestion/providers/yahoo_chart_provider.py`, `--provider yahoo_chart`, `data_source="yahoo_chart"`) — Yahoo's public chart JSON endpoint (`query2.finance.yahoo.com/v8/finance/chart/...`) called directly over HTTP with a standard browser User-Agent, bypassing yfinance's crumb-gated wrapper entirely. Reuses the exact endpoint and technique KI-016's own verification had already confirmed live. Full provider-choice rationale (vs. Stooq, vs. a yfinance version bump), rate-limit posture, and terms-of-use disclosure in ADR-046. `YFinanceProvider` is deprecated (module docstring updated), not deleted — kept registered for any environment where it happens to work.
  - **Split-adjustment invariant re-verified, live, through the app's own pipeline** (closing KI-016's residual gap — see that entry below): `python -m app.ingestion.seed_real_catalog --symbols AAPL` ingested AAPL's full history (1980-12-12 to 2026-07-10, 11,485 rows) via `YahooChartProvider` through the real orchestrator/validation/normalization/storage pipeline (not a standalone investigative fetch). Querying the actually-stored `historical_prices` rows directly: `close_price` on 2020-08-28 (the last trading day before AAPL's real 2020-08-31 4-for-1 split) = **$124.8075** — in the same ~$108-126 range KI-016's direct-fetch verification found, not the ~$499.23 nominal, non-split-adjusted figure AAPL actually closed at that day. `stock_splits` independently stored the `2020-08-31, ratio=4.0` event. Founder Decision 001's model (raw `close_price` already retroactively split-adjusted within a fetch; `split_ratio` used for disclosure only, never multiplied into share counts) is confirmed correct against this now-real, now-pipeline-ingested data, not just a synthetic or directly-fetched one.
  - **Live UI verification**: with the fixed pipeline running end-to-end (`alembic upgrade head`, `seed_real_catalog`, backend `uvicorn`, frontend `next dev`), a real Simulator run — $10,000 in AAPL, 2020-01-02 to 2024-01-02 (spanning the split) — completed with zero console/page errors, showed a final value of **$24,723.16** (+147.23% total return, +25.39% CAGR), a smooth/continuous Growth Chart with no discontinuity at the split date, and the caption **"A 4-for-1 stock split occurred on Aug 31, 2020. Prices shown are adjusted; your return is unaffected."** — the split-disclosure UI rendering correctly against real data for the first time.
  - **Starter catalog ingested**: AAPL, MSFT, TSLA, NVDA, GOOGL, AMZN, SPY, QQQ, BTC-USD, ETH-USD — full per-asset date ranges, row counts, and dividend/split counts in the M7 real-data-ingestion session's final report (this fix's own report) and reflected in the running database. Idempotency verified directly: re-running `seed_real_catalog` against an already-ingested symbol (AAPL) produced 0 newly-imported rows (all reported "already stored, skipped") and the stored row count was confirmed unchanged (11,485 before and after).
  - **Real-vs-seed coexistence**: `seed_dev_data.py`'s `SEED_ASSETS` display names are now prefixed `"DEMO — "` (e.g. `"DEMO — Apple Inc."`), so fixture data is unmistakable everywhere `Asset.name` is shown (including `GET /api/v1/assets`'s search results, which do not surface `data_source`). `seed_real_catalog.py` additionally corrects any pre-existing asset row's `name`/`asset_type`/`data_source` to the real-catalog values if a symbol was previously created by `dev_seed` (four of this catalog's ten symbols — AAPL, TSLA, SPY, QQQ — overlap with `dev_seed`'s own fixture set), so real ingestion always wins the display name once it runs. `backend/app/ingestion/wipe_seed_assets.py` gives the founder a one-line, FK-order-respecting delete for every `dev_seed`-sourced row (`python -m app.ingestion.wipe_seed_assets --yes`; dry-run by default), as the alternative to keeping seed data around under its new unambiguous name. Founder default (per this fix's task scope): keep seed assets, real catalog primary.
  - **Known, disclosed frontend drift** (not fixed in this pass — out of a backend-scoped fix's stated boundary): `frontend/src/components/simulator/simulation-form.tsx`'s three hardcoded example chips independently set `name: 'Apple Inc.'` / `'Peloton Interactive, Inc.'` / `'The Coca-Cola Company'` when filling the form, since they set the combobox's displayed selection directly rather than re-fetching from the backend. AAPL is now in the real starter catalog, so its actual stored name (`"Apple Inc."`) matches its chip. PTON and KO are not part of the real starter catalog and remain `dev_seed`-only — their real stored names are now `"DEMO — Peloton Interactive, Inc."` / `"DEMO — The Coca-Cola Company"`, so their chips display a plain, unprefixed name while a live search for the same symbol shows the `"DEMO — "`-prefixed one — a cosmetic, low-severity inconsistency between the example-chip label and a live search result for the same still-seed-only symbol. No correctness impact (the simulation itself runs correctly regardless of the displayed name string). Tracked here rather than as a new KI since it is a single, disclosed, low-severity consequence of this fix, not an independently-discovered defect.
- **Resolution Date**: 2026-07-27

### KI-045

- **Description**: `cagr_percentage` is stored and served at the wrong scale — a raw fraction (e.g. `0.146850` for a 14.685% annual return) rather than a percentage-point number (`14.685000`), a factor-of-100 error confirmed live: a real simulation ($10,000 → $17,301.35 over 2020-01-02–2024-01-02) correctly showed **"+73.01% Total Return"** but incorrectly showed **"+0.15% CAGR"** (correct value: **+14.69%**). Traced end to end, every layer touched is internally consistent with *itself* but not with its neighbors:
  - `backend/app/simulation/formulas.py::calculate_cagr` returns the raw fraction `ratio ** (1/years) - 1`, with no `× 100` step — matching its own docstring and `docs/simulation_formulas.md` §4's literally-documented formula (which also states `cagr = -1` "(-100%)" for a total loss, i.e. documents the fraction convention explicitly).
  - `backend/app/simulation/engine.py` stores that raw fraction directly into `cagr_percentage` (`cagr_percentage=quantize_percentage(cagr)`, no scaling) — while the *sibling* field, `total_return_percentage`, is populated from `calculate_total_return_percent`, which *does* multiply by `Decimal(100)`. Both fields share an identical `NUMERIC(10, 6)` column type and naming pattern (`backend/app/models/simulation.py`), with nothing on the column itself distinguishing the two conventions.
  - `backend/tests/simulation/test_engine_known_answer.py::test_basic_growth_matches_founder_spec_2_14_7_example` asserts the raw-fraction value (`math.pow(2.5, 1/years) - 1`, uncorrected) — so the backend test suite currently enshrines the bug as correct behavior, not merely fails to catch it.
  - `docs/api_design.md`'s own worked example response is **internally inconsistent with the code it documents**: for its stated inputs ($1,000 → $2,500 over exactly ~10 years), the mathematically correct raw fraction is `0.095969`, but the example shows `"cagr_percentage": "9.596872"` — a percentage-scaled number. The API documentation was written assuming the field is percentage-scaled (matching its name and matching `total_return_percentage`'s real behavior); the code does not honor that.
  - The API schema (`backend/app/api/v1/schemas/simulations.py`) carries no unit annotation on the field either way — a bare `DecimalStr` pass-through.
  - `frontend/src/lib/format/percentage.ts::formatPercentage` performs no scaling by design (rounds and appends `%` only) — correct for `total_return_percentage`, and it is the layer where the 100x under-display becomes visible to a user.
  - A third, currently-dormant surface: `backend/app/api/v1/services/explanation_service.py` passes the same wrong-scale value into the Educational AI System's prompt context as `cagr_percentage` — not yet user-visible (the AI panel isn't built into the frontend, M7 Phase 4), but any AI-generated explanation referencing CAGR today would already be reasoning from the same incorrect number.
  - Net effect: **every `completed` simulation's stored `cagr_percentage` — past and future, until fixed — under-reports the annual return by a factor of exactly 100**, on the single most commonly cited "how good was this investment, annualized" figure the product surfaces.
- **Severity**: **High** — a wrong, user-facing financial figure, silently wrong (no error, no crash, a plausible-looking but incorrect number), on a hero statistic of the product's core "worked example" answer. Violates `docs/EXPERIENCE_CONSTITUTION.md` §5's "every number the product shows carries a legible source" and "a genuine data gap... is stated as a plain fact" only in the narrow sense that this isn't a *stated* gap at all — it is presented with full, unqualified confidence.
- **Status**: **Resolved.** [Founder Decision 016](FOUNDER_DECISIONS.md) approved Option 1a (fix at the source, immediate backfill), implemented in full:
  - `backend/app/simulation/formulas.py::calculate_cagr` now multiplies by `Decimal(100)`, matching `calculate_total_return_percent`'s convention exactly.
  - `backend/app/simulation/engine.py`'s `DEFAULT_CALCULATION_VERSION` bumped `"v1"` → `"v2"`; the two versions' `cagr_percentage` semantics (raw fraction vs. percentage) are documented in `docs/simulation_formulas.md` §4a and `docs/ARCHITECTURE_DECISIONS.md` ADR-040.
  - Every existing `completed`, `calculation_version = "v1"` simulation with a non-null `cagr_percentage` was backfilled by `backend/alembic/versions/0004_cagr_percentage_v2_backfill.py` — rescaled ×100 and re-stamped to `"v2"` — with a defensive, logged carve-out for any row a lossless rescale would overflow `NUMERIC(10, 6)` on (none matched against this platform's actual data; see ADR-040).
  - `backend/tests/simulation/test_engine_known_answer.py`'s known-answer assertion now independently hand-derives the expected percentage (`9.594448`, shown in-line) rather than asserting the raw fraction. `docs/api_design.md`'s worked example corrected to `"cagr_percentage": "9.594448"` / `"calculation_version": "v2"`.
  - `explanation_service.py`'s AI-prompt-context leak closes automatically — it reads `simulation.cagr_percentage` directly, which is now correct at the source; no code change was needed there.
  - `frontend/src/lib/format/percentage.ts::formatPercentage` required no change, confirmed by both static review and a live seeded-AAPL end-to-end check showing a sane, correctly-scaled CAGR on the Results page.
- **Resolution Date**: 2026-07-22

### KI-046

- **Description**: `main`'s CI (`.github/workflows/ci.yml`) was **red across 8 consecutive commits** (`ad0e673` through `15935ec`, 2026-07-07 onward) before being noticed and fixed — every push during that window reported "locally green" despite CI failing on the very same code, for two independent, systemic reasons neither local dev workflow nor local verification passes were catching:
  1. **`lint-and-test` (backend)**: `ruff check .` failed on a pre-existing `E501` (`backend/app/ingestion/providers/__init__.py:31`, a `__all__` list 2 characters over the 100-char limit), introduced at `ad0e673` and never caught locally because subsequent sessions' verification passes ran `ruff check <changed files>` (scoped to what they'd touched) rather than `ruff check .` (the whole repo, exactly what CI runs) before reporting "lint clean."
  2. **`frontend-lint-and-test` (`Build` step)**: `next build` (which sets `NODE_ENV=production`) failed prerendering `/simulator` with `Invalid environment configuration: NEXT_PUBLIC_API_BASE_URL... received undefined`. `frontend/src/config/env.ts` deliberately fails fast on a missing `NEXT_PUBLIC_API_BASE_URL` in production (`docs/SECURITY_LOG.md`'s documented deployment-safety fix) — correct, intended behavior. The actual gap: `frontend/.env.local` (gitignored, present in every local working tree but never checked out in CI) silently supplies the var for every local `npm run build`, so the exact failure CI hits is **structurally unreproducible by a normal local dev-loop command** — only running `next build` with `.env.local` absent (or reading the workflow file and noticing no `env:` was ever set for that job) surfaces it.
- **Severity**: Medium — CI being red doesn't affect the running application or any deployed environment (no CD is gated on it yet, ADR-001's "tag deploys to production" model means a red `main` CI never auto-shipped anything broken), but it means CI has provided **zero actual signal** for 8 commits' worth of changes, silently defeating its entire purpose as a safety net during that window.
- **Status**: **Resolved** for both concrete instances (the `E501` line and the missing CI env var). The **systemic** gap — local verification claiming "green" without actually reproducing CI's exact commands/environment — is a standing process risk, not something a one-time fix closes permanently.
- **Resolution**: (1) `backend/app/ingestion/providers/__init__.py`'s `__all__` wrapped to multiple lines, under the 100-char limit. (2) `.github/workflows/ci.yml`'s `frontend-lint-and-test` job given a job-level `env: NEXT_PUBLIC_API_BASE_URL: http://localhost:8000` (matching `frontend/.env.example`'s documented local-dev placeholder; CI's `Build` step never actually calls this URL — a static/prerender build only — so any syntactically valid URL satisfies the fail-fast check). Both fixes verified by reproducing CI's exact steps locally: a fresh `itm_test` Postgres database (matching the workflow's ephemeral service container) for the backend job, and `frontend/.env.local` temporarily moved aside for the frontend job, confirming the exact failure reproduces without the fix and resolves with it.
- **Guardrail (process, not code)**: When asked to verify "CI will pass" or "the suite is green," **read `.github/workflows/*.yml` and run each job's exact steps, in order, in an environment matching its constraints** (no `.env.local`, a fresh/empty database if the workflow provisions one, the pinned tool/runtime versions) — not the closest local dev-loop equivalent. `ruff check <specific files>` is not `ruff check .`; a local `npm run build` with `.env.local` present is not CI's `npm run build`. This project's own `verify` skill and repeated live-verification precedent (KI-043, ADR-037, the M7 Phase 3B.1 `inline-block` bug) already establish "a passing test suite and a correct live render are not the same claim" for *product* correctness — this issue is the identical lesson applied to *CI* correctness: a locally-green dev loop and a green CI run are not the same claim either, and only actually reproducing CI's steps closes the gap.
- **Resolution Date**: 2026-07-23

### KI-047

- **Description**: M7 Phase 3D (Design Elevation) was scoped against an approved mockup stated to be "committed at `DOCUMENTS_AND_IDEAS/design-mockup-v2.html`." That exact path does not exist in this repository. The actual mockup — confirmed by content match (the exact `scramble()`/`sectionRise`/`chartDraw`/`popScale` mechanism and oklch palette Founder Decision 018 describes) — is `DOCUMENTS_AND_IDEAS/Investment Time Machine Results/Investment Time Machine.dc.html`, inside a folder that is, along with its sibling `.zip`, **untracked** (`git status` shows `??`) as of this issue's filing — not committed at all, contrary to the task framing's "approved... committed" description. A sibling file in the same untracked folder, `Dark Pool Liquidity Tide.dc.html`, is an unrelated, non-approved atmosphere exploration (infinite-loop `bandDrift`/`whaleDrift` animations) — confirmed, by content, to be the "discarded looping background" Founder Decision 018 rule 4 and `docs/ARCHITECTURE_DECISIONS.md` ADR-044 both name explicitly.
- **Severity**: Low — does not affect any shipped behavior; the correct mockup was identified with high confidence (verified by content, and confirmed with the founder before implementation began) and implementation proceeded against it. The risk is purely one of provenance/reproducibility: a future contributor following the path literally named in a task description would not find the file, and the approved visual source of truth for this milestone is not currently protected by version control at all.
- **Status**: Open — no git authority was available to this implementation pass (explicit instruction: "NO git authority: no commit/tag/push/merge/branch operations. Work in the tree, report, stop.") to add/commit the mockup folder. Resolution requires a founder or a subsequent session to `git add`/commit `DOCUMENTS_AND_IDEAS/Investment Time Machine Results/` (or relocate/rename it to a path matching future task descriptions) at their own discretion.
- **Planned Resolution**: Commit (or otherwise formally archive) the approved mockup source at a stable, tracked path, so the visual source of truth this and future design-elevation passes depend on is not permanently one accidental `git clean`/directory-deletion away from being lost.
- **Resolution Date**: Not yet resolved.

### KI-048

- **Description**: M7 Phase 3D (`docs/ARCHITECTURE_DECISIONS.md` ADR-044) changed the frontend's font stack (Inter/JetBrains Mono → Public Sans/IBM Plex Mono/Newsreader) and introduced a new elevated dark/light palette, scoped to the Results and Simulator surfaces via `.itm-elevated`. Two existing design documents now factually disagree with the shipped implementation for those surfaces: `docs/BRAND_CONSTITUTION.md` §6 ("One typeface family, no serif or display face anywhere... **Inter**... **JetBrains Mono**") and `docs/frontend_design_system.md` §4 ("One typeface family, no serif or display face anywhere... **Inter**"), plus `docs/frontend_design_system.md` §3/§8's chart-palette table, which is unaffected in code (the Growth Chart deliberately kept the validated blue, per ADR-044) but doesn't yet document the new `--color-accent`/`--color-negative-tint`/elevated-ink token families that now exist alongside it. Neither document was edited by the M7 Phase 3D implementation pass — updating either is a large, dedicated documentation exercise (a brand-typography section rewrite, a new elevated-palette section) explicitly outside that task's STEP list, not something to do as an incidental side effect.
- **Severity**: Low — no functional/correctness impact; this is a documentation-synchronization gap, not a defect in the shipped product. Risk is that a future contributor reading `docs/BRAND_CONSTITUTION.md`/`docs/frontend_design_system.md` in isolation (without also finding `docs/ARCHITECTURE_DECISIONS.md` ADR-044 and Founder Decision 018) would believe the typeface/chart-palette rules those documents state are still exhaustive, when they are now superseded for the Results/Simulator surfaces specifically.
- **Status**: Open.
- **Planned Resolution**: A follow-up documentation pass should update `docs/BRAND_CONSTITUTION.md` §6–7 and `docs/frontend_design_system.md` §3–4 to reflect the M7 Phase 3D font/palette decisions (or explicitly scope those sections' "app-wide" language to "outside `.itm-elevated` surfaces," if the two-palette design is intended to persist rather than eventually replace the base tokens everywhere).
- **Resolution Date**: Not yet resolved.

### KI-049

- **Description**: `DevSeedProvider.fetch_prices` (`backend/app/ingestion/providers/dev_seed_provider.py`) generated `close = (base_price + day_index * daily_drift) * (1.01 if day_index % 10 < 5 else 0.99)` — a linear drift with a fixed-amplitude multiplier that alternated every 5 trading days. Plotted on the Growth Chart, this produced a visibly periodic saw-tooth/oscillator curve, with day-over-day percentage changes repeating exactly on a 10-trading-day cycle — a founder reviewing a real chart (M7 Phase 3D-3 review) correctly identified the result as "a useless graph."
- **Severity**: Medium — did not affect any real-data path (this provider is non-production-only, guarded at construction), but materially undercut the Growth Chart's own credibility as a demo/review artifact, the single screen this platform's flagship visualization depends on most.
- **Status**: **Resolved.**
- **Resolution**: Replaced with a deterministic geometric random walk with drift — a fixed, symbol-derived seed (`random.Random(f"dev_seed_random_walk:{symbol}")`) drives one standard-normal draw per trading day, applied as `price *= 1 + daily_drift + daily_volatility * z`, with per-symbol annualized drift/volatility parameters (`_ANNUAL_DRIFT`/`_ANNUAL_VOLATILITY`). Determinism/reproducibility (byte-identical output per symbol/date-range, required by this provider's own docstring contract) is preserved — verified by a new regression test (`test_price_path_is_reproducible_across_repeated_calls`) — while eliminating the short-cycle repetition (`test_price_path_has_no_short_period_repeating_cycle` asserts >200 distinct day-over-day percentage changes over a 5-year series).
- **Resolution Date**: 2026-07-27.

