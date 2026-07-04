# ARCHITECTURE_DECISIONS.md

Architecture Decision Records. Never edit a previous ADR — if a decision changes, write a new ADR that supersedes it. See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md).

---

## ADR-001 — Resolve the Deployment Trigger Ambiguity

- **Date**: 2026-07-02
- **Status**: Accepted
- **Context**: Founder Specification Part 2.11 names two production-deploy triggers ("merge to `main`" and "tagged release") without reconciling them.
- **Problem**: An unreconciled dual trigger risks ambiguity about which commit is actually live, or accidental double-deploys.
- **Options Considered**: (1) Merge to `main` deploys straight to production. (2) Tagged release only, no auto-deploy on merge. (3) Merge to `main` auto-deploys to staging; a tag deploys to production.
- **Final Decision**: Option 3 — merge to `main` auto-deploys to staging; a tagged release (`vX.Y.Z`) deploys to production.
- **Rationale**: Gives a deliberate, human-gated production deploy step without inventing a `develop` branch the spec explicitly defers.
- **Tradeoffs**: Requires discipline to actually cut tags for production releases; adds one manual step vs. pure continuous deployment.
- **Future Implications**: Documented in `.claude/GIT_WORKFLOW.md`; applies starting at the Deployment & Observability milestone (M8).

---

## ADR-002 — `calculation_version` Is Non-Negotiable From Migration #1

- **Date**: 2026-07-02
- **Status**: Accepted
- **Context**: Founder Specification permits overwriting/correcting historical data at any time (reimport) while also mandating that identical historical data yields identical simulation results — and explicitly allows deferring the `calculation_version` field that would reconcile the two.
- **Problem**: Deferring the field guarantees an eventual retrofit against real, already-created simulation records once reproducibility is finally enforced.
- **Options Considered**: (1) Defer per the spec's literal allowance. (2) Add `calculation_version` (or equivalent) to the simulation/results schema from the very first migration, even if unused initially.
- **Final Decision**: Option 2.
- **Rationale**: Retrofitting a versioning column onto a table with live production data is far more expensive and riskier than including an unused column now.
- **Tradeoffs**: A small amount of unused schema surface exists until versioning logic is actually implemented.
- **Future Implications**: Binding on the Database Schema milestone (M1); documented in `.claude/DATABASE_RULES.md`.

---

## ADR-003 — Nullable Output Columns on `simulations` and `ai_explanations`

- **Date**: 2026-07-02
- **Status**: Accepted
- **Context**: The Founder Specification marks output columns (`final_value`, `explanation_text`, etc.) as NOT NULL, while the same spec's own status enums include `pending`/`failed` states where no output can exist yet.
- **Problem**: A literal implementation would violate its own schema constraints the first time a simulation or AI generation fails or is left pending.
- **Options Considered**: (1) Implement literally as NOT NULL and special-case failures elsewhere. (2) Make output columns nullable, matching the documented status states.
- **Final Decision**: Option 2.
- **Rationale**: The NOT NULL constraint as written is an internal spec bug, not an intentional design choice; fixing it at the schema level is simpler and safer than working around it in application code.
- **Tradeoffs**: None material — this is a correction, not a design tradeoff.
- **Future Implications**: Binding on the Database Schema milestone (M1); documented in `.claude/DATABASE_RULES.md`.

---

## ADR-004 — Redis Deferred Until Actually Needed

- **Date**: 2026-07-02
- **Status**: Accepted
- **Context**: The Founder Specification lists Redis as part of the approved MVP stack but marks it "optional" during early development.
- **Problem**: Provisioning Redis in the M0 repository foundation before any feature (caching, rate limiting) actually needs it adds operational surface with no corresponding value yet.
- **Options Considered**: (1) Include Redis in `docker-compose.yml` from M0 for parity with the eventual target stack. (2) Exclude Redis from M0 entirely; introduce it exactly when a milestone needs caching or rate limiting.
- **Final Decision**: Option 2 — `docker-compose.yml` at M0 contains Postgres and the backend only.
- **Rationale**: Matches the project's own "don't provision speculatively" discipline; Redis is scheduled to arrive at the API Layer milestone (M4) when rate limiting is actually implemented.
- **Tradeoffs**: The API Layer milestone must explicitly add Redis to Docker Compose and wire it in — tracked as part of that milestone's scope, not silently assumed.
- **Future Implications**: Documented in `.claude/SYSTEM.md` and `.claude/PERFORMANCE_BUDGET.md`.

---

## ADR-005 — Adopt Conventional Commits

- **Date**: 2026-07-02
- **Status**: Accepted
- **Context**: The Founder Specification requires descriptive commit messages but does not mandate a specific convention.
- **Problem**: Without a shared convention, commit history becomes harder to scan and changelog-generation harder to automate later.
- **Options Considered**: (1) Free-form descriptive commits only. (2) Adopt Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `perf:`).
- **Final Decision**: Option 2.
- **Rationale**: Low cost, high consistency payoff, and plays well with `CHANGELOG.md` maintenance.
- **Tradeoffs**: None material.
- **Future Implications**: Documented in `.claude/GIT_WORKFLOW.md`; applies to every commit from M0 forward.

---

## ADR-006 — Reorder Authentication Before Frontend

- **Date**: 2026-07-02
- **Status**: Accepted
- **Context**: Founder Specification Part 2.17.11 sequences Frontend (step 5) before Authentication (step 6), but Part 2.15.6 requires auth for the Simulation History page — a direct build-order contradiction.
- **Problem**: Building Frontend before Auth means the Simulation History page cannot actually be completed in its stated position.
- **Options Considered**: (1) Build Frontend literally first and leave the History page unfinished until Auth lands. (2) Build Auth (and AI Explanations, which has no ordering conflict) before Frontend, so all six MVP screens are buildable in one pass.
- **Final Decision**: Option 2 — Auth and AI Explanations (M5, M6) both precede Frontend (M7).
- **Rationale**: Removes a real, spec-acknowledged sequencing contradiction with no loss of backend-before-frontend discipline.
- **Tradeoffs**: None material — this is a milestone-ordering fix, not a scope change.
- **Future Implications**: Documented in `.claude/MVP_RULES.md` and reflected in the milestone dependency graph.

---

## ADR-007 — Financial Analytics Is a Separate Future Milestone

- **Date**: 2026-07-02
- **Status**: Accepted
- **Context**: The founder directed that advanced financial metrics (Volatility, Sharpe, Sortino, Maximum Drawdown, Calmar Ratio, Rolling Return Analysis, correlation) must not be permanently folded into the Simulation Engine.
- **Problem**: Continuously reopening the Simulation Engine's highest-risk, most heavily-tested code path (90%+ coverage target, known-answer tests) to add new metrics increases regression risk in the platform's most critical component.
- **Options Considered**: (1) Add each new metric directly into the Simulation Engine as it's requested. (2) Reserve a dedicated, separate Financial Analytics module/milestone that reads simulation output rather than extending the engine itself.
- **Final Decision**: Option 2. Simulation Engine v1 owns only Final Value, ROI, CAGR, Inflation-Adjusted Return, Dividend Contribution, and Opportunity Cost Analysis.
- **Rationale**: Keeps the Simulation Engine's test surface small and stable; advanced analytics can iterate independently without touching the sole-source-of-financial-truth code path.
- **Tradeoffs**: Advanced metrics ship later than they otherwise might if bundled into M3.
- **Future Implications**: Documented in `.claude/MVP_RULES.md`; a Financial Analytics milestone is reserved post-MVP, positioned after the Simulation Engine.

---

## ADR-008 — Economic Indicators as a Separate Catalog + Time-Series Pair

- **Date**: 2026-07-05
- **Status**: Accepted — Pending Founder Review (see `docs/KNOWN_ISSUES.md` KI-005)
- **Context**: The Founder Specification names Economic Indicators as one of the nine database domains (Part 2.6.3) with a required index (2.6.13), but Part 2.6.27 (where its physical table would have been specified) was never written — a confirmed spec gap, not a design choice made by the founder.
- **Problem**: Economic indicators (CPI, unemployment rate, etc.) needed to be given a physical schema without founder guidance on its shape, and without over-designing beyond what M1 needs.
- **Options Considered**: (1) Add an `economic_indicator` value to `asset_type_enum` and store indicators as rows in `assets`/`historical_prices`. (2) Create a wholly separate catalog table (`economic_indicators`) plus a time-series table (`economic_indicator_values`), structurally parallel to `assets`/`historical_prices` but independent.
- **Final Decision**: Option 2.
- **Rationale**: Economic indicators are not investable instruments — they have no `symbol`, no `asset_type` in the tradable sense, and no simulation ever targets one directly (they're context, e.g. for inflation adjustment). Forcing them into `assets` would either add nullable, asset-specific columns that don't apply to indicators, or force indicator-specific columns onto every tradable asset row. A structurally-parallel-but-separate pair keeps both models clean.
- **Tradeoffs**: Two new tables instead of reusing `assets`/`historical_prices` directly; some duplicated structural pattern (catalog + time series) across the two domains.
- **Future Implications**: If the founder later decides indicators should be treated as a special asset type instead (e.g. to unify search/lookup code), this ADR would need to be superseded — flagged in `docs/KNOWN_ISSUES.md` KI-005 pending that review.

---

## ADR-009 — `audit_logs.user_id` Uses `ON DELETE SET NULL`

- **Date**: 2026-07-05
- **Status**: Accepted
- **Context**: `audit_logs.user_id` is a real (non-polymorphic) foreign key to `users.id`, recording who triggered an event. The Founder Specification does not specify delete behavior for this relationship.
- **Problem**: If a user account is later deleted (e.g. account deletion request), the default FK behavior would block the deletion entirely while audit rows referencing that user exist, or (if cascade were used) would destroy audit history — either outcome is wrong for a security/audit log.
- **Options Considered**: (1) Default `NO ACTION` — blocks user deletion while any audit log references them, forcing an awkward cleanup step. (2) `ON DELETE CASCADE` — deletes audit history along with the user, destroying exactly the record a security incident review would need. (3) `ON DELETE SET NULL` — the audit row survives, `user_id` becomes null, and `details`/`entity_type`/`entity_id` retain the rest of the event context.
- **Final Decision**: Option 3.
- **Rationale**: Audit logs exist to answer "what happened and who did it" even after the "who" no longer has an active account — this is the same reasoning that makes audit logs immutable (no `updated_at`) in the first place.
- **Tradeoffs**: A null `user_id` on an old audit row means "the acting user's account no longer exists," which must be handled gracefully wherever audit logs are displayed (not implemented yet — no admin UI exists at M1).
- **Future Implications**: Applies to any future FK from an immutable/audit-style table to `users` — default to `SET NULL`, not cascade or restrict, unless a specific reason argues otherwise.

---

## ADR-010 — Standardize on LF Line Endings, CRLF Only for Windows-Native Scripts

- **Date**: 2026-07-06
- **Status**: Accepted
- **Context**: Development happens on Windows (the primary environment), but the project runs in Docker (Linux containers), deploys to Linux-based hosting (Railway/Render), and runs CI on `ubuntu-latest` GitHub Actions runners. A repository hygiene pass (not a feature milestone) surfaced the need to make line-ending behavior explicit rather than left to each contributor's local Git/editor configuration.
- **Problem**: Without an explicit policy, line endings are governed by each contributor's local `core.autocrlf` setting (this machine's is `true`), which silently rewrites LF to CRLF on checkout and back on commit. That's invisible and harmless in isolation, but across Windows and Linux contributors, Docker builds, and CI runners, it produces spurious whole-file diffs, inconsistent `git blame`, and — worse — scripts with CRLF line endings fail or behave unexpectedly when executed inside Linux containers (`.sh` files, Dockerfiles) where a stray `\r` at the end of a shebang line or command can break execution outright.
- **Options Considered**: (1) Leave line endings entirely to each contributor's local Git config (the status quo, implicit and inconsistent). (2) Force LF everywhere, including `.bat`/`.ps1`. (3) Force LF for everything that is ever built, run, or interpreted inside Linux/Docker/CI (`.py`, `.md`, `.yml`/`.yaml`, `Dockerfile`, `.sh`), and CRLF only for the two file types that are Windows-native by definition and never execute in a Linux context (`.bat`, `.ps1`).
- **Final Decision**: Option 3, implemented via `.gitattributes` (repository-enforced, not dependent on contributor config) and mirrored in `.editorconfig` (so editors save matching line endings locally before Git ever has to normalize anything).
- **Rationale**: `.sh` files and `Dockerfile`s are interpreted by Linux shells inside containers — a CRLF there is a correctness bug, not a style issue. Python, Markdown, and YAML have no such hard requirement, but forcing LF keeps `git diff`/`git blame` clean across a Windows-primary, Linux-deployed project. `.bat`/`.ps1` are the inverse case: they only ever run on Windows, where CRLF is the native and expected convention, and forcing LF on them would be consistency for its own sake with no benefit.
- **Tradeoffs**: Contributors whose local Git config normalizes differently will see `.gitattributes` override their local behavior for tracked files — this is the intended effect (repository policy beats individual config) but can surprise a contributor unfamiliar with `.gitattributes` the first time they see `git add --renormalize` touch files they didn't expect.
- **Future Implications**: Any new source file type added to the project (e.g. `.json`, `.toml`, `.tsx` once the frontend milestone begins) should get an explicit `.gitattributes` entry at that time rather than falling back to the `* text=auto eol=lf` catch-all by accident — see `docs/KNOWN_ISSUES.md` for the tracked reminder.

---

## ADR-011 — Provider Capability Protocols Instead of One Uniform Interface

- **Date**: 2026-07-07
- **Status**: Accepted
- **Context**: Milestone 2 (Data Ingestion Pipeline) needs a Provider Layer supporting yfinance (prices, dividends, splits), CoinGecko (prices only — crypto has no dividends or splits), and FRED (economic indicator observations only — no prices at all).
- **Problem**: A single `Provider` interface requiring every adapter to implement `fetch_prices`/`fetch_dividends`/`fetch_splits`/`fetch_observations` would force CoinGecko and FRED to implement methods that make no domain sense for them (a `fetch_dividends` for crypto, a `fetch_prices` for an economic indicator), either raising `NotImplementedError` at call time or returning meaningless empty lists silently.
- **Options Considered**: (1) One large `Provider` protocol all adapters implement fully, unsupported methods raising `NotImplementedError`. (2) Separate capability protocols (`PriceProvider`, `DividendProvider`, `SplitProvider`, `IndicatorProvider`) that a provider implements only the subset it genuinely supports, with callers checking capability via `isinstance()` before calling.
- **Final Decision**: Option 2, implemented with `typing.Protocol` + `@runtime_checkable` (`app/ingestion/providers/base.py`).
- **Rationale**: Matches the actual shape of the domain — not every provider supports every capability, and pretending otherwise (via `NotImplementedError`) just moves the failure from "doesn't compile" to "fails at runtime in a way that looks like a bug." `isinstance()` capability checks let the orchestrator (and any future caller) ask "can this provider do X?" before attempting X, which is also exactly how `import_asset()`'s convenience wrapper decides whether to attempt dividend/split imports.
- **Tradeoffs**: Slightly more moving parts (four protocols instead of one) for a reader encountering the Provider Layer for the first time.
- **Future Implications**: A future provider (Polygon, Alpha Vantage, IEX) that supports a different subset of capabilities (e.g. prices + dividends but not splits) requires zero changes to existing providers or the orchestrator — it simply implements the protocols it can satisfy.

---

## ADR-012 — CoinGecko OHLC Approximation Is Disclosed, Never Fabricated

- **Date**: 2026-07-07
- **Status**: Accepted
- **Context**: CoinGecko's free-tier API endpoint that supports an arbitrary historical date range (`/market_chart/range`) returns one price observation per day, not true Open/High/Low/Close. The endpoint that does return real OHLC (`/ohlc`) is restricted to a fixed lookback window from "now" and cannot backfill arbitrary historical ranges — unusable for this platform's core use case (simulating decades-old investments).
- **Problem**: The `historical_prices` schema (M1) requires non-null Open/High/Low/Close for every row. Without true OHLC data available from the free API for historical ranges, some value has to go in those columns.
- **Options Considered**: (1) Silently set Open = High = Low = Close = the single observed price, with no indication anywhere that this differs from genuinely-observed OHLC. (2) Same substitution, but explicitly disclosed via a warning attached to every CoinGecko price import's Import Report, and documented prominently in code comments and this ADR.
- **Final Decision**: Option 2 (`COINGECKO_OHLC_APPROXIMATION_WARNING` in `coingecko_provider.py`, attached by the orchestrator to every CoinGecko price import report).
- **Rationale**: "Historical Truth Is Sacred" (Founder Specification, Part 2.1) does not forbid using an imperfect data source — it forbids *pretending* imperfect data is complete. Setting O=H=L=C is not fabrication in the sense of inventing a number that never existed (the single price point genuinely was CoinGecko's observation for that day); the fabrication risk would be in presenting it as if real intraday high/low variance had been captured when it wasn't. Disclosure closes that gap.
- **Tradeoffs**: Crypto price data ingested via CoinGecko has permanently lower fidelity than stock/ETF data via yfinance — any future feature computing intraday volatility from `high_price - low_price` would silently get zero for all CoinGecko-sourced rows. This is now a known, documented constraint rather than a silent trap.
- **Future Implications**: If a paid CoinGecko tier or an alternative crypto data provider with genuine historical OHLC becomes available, this adapter (or a replacement) should be updated — tracked in `docs/KNOWN_ISSUES.md`.

---

## ADR-013 — Per-Record SAVEPOINT in Storage Layer Upserts

- **Date**: 2026-07-07
- **Status**: Accepted
- **Context**: The Storage Layer's idempotent upsert (`INSERT ... ON CONFLICT DO NOTHING ... RETURNING`) can still raise a genuine constraint violation distinct from the anticipated natural-key duplicate (e.g. a foreign key pointing at a row that doesn't exist). Postgres aborts an entire transaction on the first unhandled statement error.
- **Problem**: Without isolating each record's insert attempt, one bad record partway through a multi-hundred-row import batch would silently discard every row already upserted earlier in the same transaction when the batch's outer transaction is later committed (or, if the error isn't caught at all, the whole transaction aborts).
- **Options Considered**: (1) Let a constraint violation propagate and abort the whole import's transaction. (2) Wrap each individual upsert in a SAVEPOINT (`session.begin_nested()`), so a failure rolls back only that one insert attempt, and the transaction as a whole remains valid and committable with everything upserted so far intact.
- **Final Decision**: Option 2 (`IngestionRepository._upsert`, `app/ingestion/storage/repository.py`).
- **Rationale**: A single malformed record (a genuine bug, not an ordinary duplicate) should be reported and skipped, not allowed to silently erase legitimate work already done in the same import run — directly serving "accuracy is more important than speed" and the general principle that partial success should be visible and preserved, not hidden by an all-or-nothing rollback.
- **Tradeoffs**: A SAVEPOINT per record adds minor overhead per insert; acceptable at MVP import volumes (per-asset historical backfills, not continuous high-frequency writes).
- **Future Implications**: Verified directly by `test_upsert_price_constraint_violation_raises_and_preserves_prior_rows` (`tests/ingestion/test_storage.py`) — any future change to `_upsert` should keep this test green, since it's the one thing standing between "one bad row" and "silently lose an entire import."

---

## ADR-014 — One Audit Log Row Per Real Import Attempt, No Separate "Start" Event

- **Date**: 2026-07-07
- **Status**: Accepted
- **Context**: The Founder Specification's audit requirements (as relayed in this milestone's brief) list "import start" and "import completion" as things to capture. `audit_logs.entity_id` (M1 schema) is NOT NULL, and dry runs must not write to the database at all.
- **Problem**: There is no real entity to attach a "start" audit event to before the asset/indicator row is resolved (for a brand-new symbol, that resolution is itself the first write of the import). Writing a start-of-import audit row would also directly conflict with the dry-run "must not modify the database" requirement, since dry runs need to log a start signal without writing anything.
- **Options Considered**: (1) Two audit rows per real import: one at start (against a synthetic, not-otherwise-referenced UUID) and one at completion. (2) One audit row per real import attempt, written at completion (success or failure), with the full structured Import Report (including `import_start`, `import_end`, `duration_seconds`) embedded in `details` — plus structured application logging (not persisted audit rows) for real-time start/progress visibility.
- **Final Decision**: Option 2.
- **Rationale**: The single completion row is a complete historical record — it contains the start timestamp and everything else needed for monitoring/debugging after the fact, without inventing a synthetic entity_id with no backing row (which would itself be an inconsistency with the platform's polymorphic-audit convention of `entity_id` pointing at something real). Application logs (see `app/core/logging.py`) cover the "is this import still running right now" concern that a persisted start-row would otherwise serve.
- **Tradeoffs**: There is no queryable database record of imports that are currently in-progress (only completed ones, successful or failed) — acceptable given MVP-scale imports complete in seconds to low minutes, not hours.
- **Future Implications**: If a future milestone introduces long-running or scheduled background imports where "is this stuck?" becomes an operational question, this design should be revisited — likely via a mutable in-progress audit row rather than the current write-once-at-completion shape. Tracked in `docs/KNOWN_ISSUES.md`.

---

## ADR-015 — Simulation Engine Calculation Model Built on `close_price`, Not `adjusted_close_price`

- **Date**: 2026-07-08
- **Status**: Accepted (implements Founder Decision 001 — see `docs/FOUNDER_DECISIONS.md`)
- **Context**: The Founder Specification's own text (Parts 2.6.7, 2.6.20, 2.6.22) recommends `adjusted_close_price` as the MVP default for the Simulation Engine, with raw price fields and `stock_splits` described as existing "for transparency and future advanced simulations." The founder has explicitly decided to build the Simulation Engine (M3) around the "future advanced" model instead, from the start.
- **Problem**: `adjusted_close_price` is a single number that bundles split adjustment and (per the specification's own description, "provider dependent") dividend adjustment together, opaquely. A calculation built on it cannot show its work — it cannot answer "how much of this return came from dividends versus price appreciation" without essentially re-deriving the raw event history anyway, undermining the auditability and explainability the Founder Specification names as top Simulation Engine priorities (Part 2.14.1).
- **Options Considered**: (1) Use `adjusted_close_price` as the specification's own text recommends for MVP, deferring explicit event-based modeling to a genuinely future milestone. (2) Use `close_price` with explicit, stored-event dividend reinvestment and split disclosure, per Founder Decision 001.
- **Final Decision**: Option 2, detailed in full in `docs/simulation_formulas.md`.
- **Rationale**: See Founder Decision 001. In engineering terms: an explicit event-processing model is directly testable against known-answer references (a specific dividend, on a specific date, at a specific share count) in a way an opaque adjusted-price calculation is not — this materially serves Part 2.14.18's requirement that the Simulation Engine "requires the highest test coverage in the platform."
- **Tradeoffs**: More implementation complexity in M3 (a per-event loop rather than a single price-ratio lookup); one unverified empirical assumption (raw `close_price` is already split-consistent within a single ingestion fetch) that must be confirmed by a known-answer test against a real historical split before this model is trusted in production — tracked as a blocking pre-launch item, not an optional nice-to-have.
- **Future Implications**: A future "Advanced Corporate Actions Engine" (spin-offs, mergers, special dividends, incremental-reimport-safe split reconciliation) is explicitly reserved as a later milestone, not part of M3. Any new source file or calculation added to the Simulation Engine must continue to read `close_price`, never `adjusted_close_price`, unless a new Founder Decision supersedes this one.

---

## ADR-016 — API Layer: Service-Owned Transaction Boundary, Engine-Computed Growth Series, Savepoint-Nested Test Sessions

- **Date**: 2026-07-10
- **Status**: Accepted
- **Context**: M4 adds the first real caller of the M3 Simulation Engine (`POST /api/v1/simulations`) and the first real consumer of a database `Session` that outlives a single function call (a FastAPI request). Three interlocking design questions had to be resolved together: who commits/rolls back the transaction, where the Founder-Specification-required "Growth Chart" output (Part 3.3.2, tracked as KI-021) gets computed, and how DB-integration tests exercise code that itself calls `session.commit()`.
- **Problem**: (1) `app.simulation.engine.run_simulation` only `flush()`es by design (established in M3: the caller owns the transaction) — for `MissingHistoricalDataError`/`CalculationError`, it flushes a failed `Simulation` row *before* re-raising, per Founder Specification Part 2.6.24's "failed simulations should be stored" requirement. If the API layer's DB-session dependency auto-rolled-back on any exception (the common FastAPI pattern), that already-flushed failed row would be silently destroyed on its way out. (2) Part 3.3.2 requires a value-over-time series; nothing in the API layer should perform financial calculation (approved decision #2), so it cannot be computed in a route handler. (3) The project's established DB-integration test pattern (`tests/simulation/conftest.py`, `tests/ingestion/conftest.py`) binds a `Session` to a single connection wrapped in one outer transaction, rolled back at the end of the test — but that pattern assumes the code under test never itself calls `commit()`/`rollback()`; `app.api.v1.services.simulation_service` does, by design, per (1).
- **Options Considered**: (1a) Give `get_db_session` FastAPI's common auto-commit-on-success/auto-rollback-on-exception behavior. (1b) Make `get_db_session` commit/rollback-agnostic (only `close()`s) and have the service layer explicitly own the boundary per exception type. (2a) Recompute the growth series in the route handler from already-serialized response data. (2b) Extend the Simulation Engine itself with a read-only `calculate_growth_series` formula and thread it through `SimulationOutcome`. (3a) Accept the `SAWarning: transaction already deassociated from connection` noise in test output as harmless. (3b) Bind test sessions with SQLAlchemy 2.0's `join_transaction_mode="create_savepoint"`, so a service-layer `commit()`/`rollback()` operates on a nested SAVEPOINT instead of ending the outer transaction outright.
- **Final Decision**: (1b), (2b), (3b) — implemented in `app/api/v1/dependencies.py::get_db_session`, `app/api/v1/services/simulation_service.py::create_simulation`, `app/simulation/formulas.py::calculate_growth_series` + `app/simulation/engine.py`, and `tests/api/conftest.py::db_session` respectively.
- **Rationale**: (1b) makes the commit point an explicit, auditable decision per exception type (pre-flight validation errors roll back since nothing was written; `MissingHistoricalDataError`/`CalculationError` commit since the engine already flushed a row worth preserving) rather than an implicit framework default that would silently violate Part 2.6.24 for exactly the error paths that matter most. (2b) keeps "no financial calculation logic in the API layer" a structural guarantee, not a code-review convention — `calculate_growth_series` is exercised by the same known-answer/cross-check test discipline as every other M3 formula (`tests/simulation/test_growth_series.py`), including a test proving its final data point exactly matches the independently-computed `apply_dividend_reinvestment` + `calculate_final_value` result. (3b) is the standard SQLAlchemy 2.0 pattern for testing code that itself manages transactions, and was confirmed necessary empirically: without it, the fixture's own final `transaction.rollback()` raised a real (if non-fatal) `SAWarning` for every test whose request path called `session.rollback()`/`session.commit()`.
- **Tradeoffs**: (1b) pushes transaction-boundary responsibility onto every future service function that writes to the database — each must know and handle its own commit/rollback, rather than getting it for free from the dependency. This is a deliberate cost accepted for correctness around the one existing case where it matters (failed-simulation persistence); documented in `simulation_service`'s module docstring so it isn't rediscovered by surprise. (2b) means `growth_series`/`disclosed_splits` are never persisted (no `simulations` columns exist for them) — a `GET /api/v1/simulations/{id}` call made after the initial `POST` cannot reconstruct them, so `SimulationResponse.from_simulation()` defaults both to empty tuples on the retrieval path. This is the founder-approved fallback ("if this is too large for M4, expose growth_series as an empty/deferred field and document the deferral") and is tracked, not silently accepted, at KI-021.
- **Future Implications**: If a future milestone persists `growth_series`/`disclosed_splits` (e.g., a dedicated `simulation_growth_points` table), `SimulationResponse.from_simulation()`'s retrieval-path default changes from "always empty" to "read from storage," with no route-handler-level calculation change required. Any new API-layer service function that writes to the database must follow the same explicit commit/rollback-per-exception-type pattern established here, not assume a framework-level auto-commit.
