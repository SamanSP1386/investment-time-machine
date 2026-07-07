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

---

## ADR-017 — Refresh Tokens: Opaque + Hashed, Not a Second JWT, With Rotation-Chain Reuse Detection

- **Date**: 2026-07-11
- **Status**: Accepted (implements Founder Decision 002)
- **Context**: M5 needs a refresh mechanism (Founder Decision 002) that supports real server-side revocation — a bare stateless JWT refresh token cannot be revoked before its own expiry without an external denylist, which is itself a stateful store in disguise.
- **Problem**: Choose a refresh-token representation and storage design that supports revocation, rotation, and (designed-for-but-not-yet-built) multi-device session management, without over-building for M5's actual scope.
- **Options Considered**: (1) A second, longer-lived JWT as the refresh token, validated purely by signature, no DB row. (2) An opaque random value, hashed (SHA-256) and stored in a new `refresh_tokens` table, with `revoked_at`/`replaced_by_id` columns supporting rotation and reuse detection.
- **Final Decision**: Option 2 (`app/models/refresh_token.py`, migration `0002_refresh_tokens`).
- **Rationale**: A DB-backed opaque token makes "is this session still valid?" a real, queryable, revocable fact rather than a signature check against a token that remains valid until expiry no matter what the server later learns (e.g., a detected compromise). Storing only the SHA-256 hash (never the raw value) means a database read or leak alone can never be replayed as a working credential — the same discipline already applied to `users.password_hash`. `replaced_by_id` (a self-referential FK) chains each rotation, which is what makes reuse detection possible: presenting an already-revoked token that was itself the result of a prior rotation is a strong theft signal, not just an expired-token case.
- **Tradeoffs**: Every refresh call requires a DB round-trip (an `INSERT` + an `UPDATE`), unlike a pure-JWT refresh token's signature-only check. Accepted: refresh calls are infrequent relative to access-token-validated requests (once per ~15 minutes per active session at most), and this project's engineering priority order (Correctness > Security > Reliability > Maintainability > Performance) puts revocability ahead of that marginal cost.
- **Future Implications**: `user_agent`/`ip_address` columns and the lack of a uniqueness constraint on `user_id` (multiple concurrent rows per user are fully supported) exist now specifically so a future "manage your devices" feature (list active sessions, revoke one, revoke all) requires zero schema migration — only new routes calling `AuthRepository.revoke_all_for_user` (already implemented, unused by any route today) and a new "list active sessions" query. See docs/KNOWN_ISSUES.md for the tracked concurrent-refresh race this design's rotation step has not yet been hardened against.

---

## ADR-018 — Session Delivery via httpOnly/Secure/SameSite=Strict Cookies, Not Response Body or `localStorage`

- **Date**: 2026-07-11
- **Status**: Accepted (implements Founder Decision 002)
- **Context**: Neither the Founder Specification nor `.claude/API_STANDARDS.md` specifies where the JWT named in Part 2.15.3 should live on the client. `.claude/SECURITY_POLICY.md` already recommended httpOnly, `SameSite=strict` cookies as the safer default "given the frontend is same-origin-deployable via Vercel + a custom domain" — this ADR is the M5 implementation of that recommendation.
- **Problem**: A token readable by JavaScript (a JSON response body consumed into `localStorage` or a JS-visible cookie) can be exfiltrated by any successful XSS payload, turning a single unrelated frontend bug into a full session-theft vulnerability.
- **Options Considered**: (1) Return both tokens in the JSON response body; frontend stores them in `localStorage` and attaches the access token via an `Authorization` header. (2) Return both tokens exclusively as httpOnly, Secure, `SameSite=Strict` cookies, set directly by the API responses (`register`/`login`/`refresh`); nothing token-shaped ever appears in a response body.
- **Final Decision**: Option 2 (`app/api/v1/routers/auth.py`).
- **Rationale**: httpOnly means no JavaScript, including an XSS payload, can ever read either cookie's value — this closes off the single highest-impact token-theft vector for a browser-based frontend. `SameSite=Strict` means the cookies are never attached to a cross-site request at all, which is this project's primary CSRF mitigation (a dedicated CSRF token was considered and deliberately not added for M5 — SameSite=Strict is judged sufficient given this is a same-origin-deployable, non-public-API platform; tracked as a documented, not silent, simplification). The refresh-token cookie is additionally scoped to the `/api/v1/auth` path only, so it is never even transmitted to, or exposed by, any other endpoint.
- **Tradeoffs**: Cookie-based sessions require `allow_credentials=True` CORS configuration (already set since M4) and make the API awkward for a hypothetical future non-browser API client (a mobile app, a third-party integration) that can't rely on a cookie jar — accepted, since this platform's only client is its own same-origin web frontend for the foreseeable roadmap (Part 2.16/2.25).
- **Future Implications**: If a non-browser client is ever needed, it would require a parallel `Authorization`-header-based token issuance path — not a retrofit of this one, since mixing the two schemes on the same cookie-trusting routes would reopen the CSRF surface SameSite=Strict currently closes.

---

## ADR-019 — Account Lockout as a Distinct, Email-Keyed Mechanism From IP-Based Rate Limiting

- **Date**: 2026-07-11
- **Status**: Accepted (implements Founder Decision 002)
- **Context**: Founder Specification Part 3.6.7 (Credential Stuffing) names "Account lockout policies" as a required mitigation, distinct from and additional to the existing rate-limiting requirement (Part 2.8.13). M4 already has a per-IP `RateLimiter` (`app/core/rate_limit.py`).
- **Problem**: An attacker distributing password-guessing attempts against one target account across many source IPs (or via a botnet/proxy pool) defeats a purely per-IP rate limit entirely, while never tripping any single IP's threshold.
- **Options Considered**: (1) Rely solely on the existing per-IP `RateLimiter`, applied to the new `/auth` endpoints at the spec's 10/min figure. (2) Add a second, independent mechanism (`AccountLockout`, `app/auth/lockout.py`) keyed by the normalized email address being attempted, locking the account after a fixed number of failures regardless of source IP.
- **Final Decision**: Both — Option 2 in addition to, not instead of, Option 1.
- **Rationale**: The two mechanisms defend against different attacker shapes: per-IP rate limiting throttles a single source hammering many endpoints or accounts; per-account lockout stops a distributed attack against one specific account that per-IP limiting cannot see. This is exactly why the Founder Specification lists both as separate line items in its threat mitigation table rather than treating rate limiting as sufficient on its own.
- **Tradeoffs**: A per-account lockout is itself a potential denial-of-service vector against a specific victim (an attacker who knows a target's email can lock them out by deliberately failing 5 logins) — accepted as a known, standard tradeoff of any lockout policy; mitigated in part by a bounded, time-limited window (15 minutes) rather than a permanent lock requiring manual admin intervention.
- **Future Implications**: Both mechanisms share the same Redis instance and fail-open policy on Redis unreachability (an outage of this dependency must never itself become the reason a legitimate user can't log in) — any future third rate-governing mechanism should follow the same fail-open convention rather than introduce a new failure philosophy.

---

## ADR-020 — Reject the Default `JWT_SECRET` Placeholder Outside Development at Startup

- **Date**: 2026-07-11
- **Status**: Accepted
- **Context**: `Settings.jwt_secret` needed a default value so local development works with zero required setup, matching the existing convention for `database_url` (which defaults to `itm_password`). Discovered during the M5 red-team self-review, not requested by any design document.
- **Problem**: Unlike a wrong database password (which fails loudly — the app simply can't connect), a forgotten `JWT_SECRET` in a real deployment is silently catastrophic: the signing key becomes public knowledge (it's committed in `.env.example`/source), letting anyone forge a valid access token for any user, including `is_admin: true`, with no failed request or error anywhere to reveal the problem.
- **Options Considered**: (1) Ship the placeholder default with a code comment warning not to use it in production, trusting deployment discipline. (2) Add a `pydantic` `model_validator` on `Settings` that raises at startup if `environment` is not `development`/`test`/`testing` and `jwt_secret` still equals the placeholder.
- **Final Decision**: Option 2 (`app/core/config.py::_reject_default_jwt_secret_outside_development`).
- **Rationale**: A comment is advice; a startup failure is a guarantee. This mirrors the general principle that a security-critical misconfiguration should fail the deployment immediately and obviously, not silently degrade the platform's actual security posture in a way that produces no error anyone would ever see until it's exploited.
- **Tradeoffs**: None material — the guard only fires when `environment` is deliberately set to something other than the three explicitly-exempted values, which any real deployment must already do correctly for other reasons (e.g. `.claude/PERFORMANCE_BUDGET.md`'s environment-specific behavior).
- **Future Implications**: Any future secret with a development-only placeholder default (were one ever introduced) should get the same startup-time guard rather than relying on documentation alone.

---

## ADR-021 — AI Provider Abstraction: Protocol-Based, Anthropic First, `NullProvider` Fallback

- **Date**: 2026-07-12
- **Status**: Accepted (implements Founder Decision 003)
- **Context**: Founder Specification Part 2.7.15 requires the AI layer to "communicate through an abstraction layer rather than directly depending on a specific vendor," naming OpenAI, Anthropic, Google, and Local Models as candidates without selecting one. This project already has a directly analogous precedent: `app/ingestion/providers/base.py`'s capability-`Protocol` design (ADR-013), adopted specifically because not every provider supports every capability.
- **Problem**: A single hard-coded call to a vendor SDK anywhere in router or service code would violate Founder Specification Principle 3 (100% functional with AI removed) the moment that code ran without a configured key, and would make switching or adding a provider a cross-cutting change rather than a one-file one.
- **Options Considered**: (1) Call the Anthropic SDK directly from `explanation_service.py`. (2) Define a single `AIProvider` Protocol (`app/ai/providers/base.py`) with one `generate()` method, implement `AnthropicProvider` and a `NullProvider`, and select between them via a `Settings.ai_provider` factory (`app/ai/providers/get_ai_provider`).
- **Final Decision**: Option 2 — reusing the exact Protocol-based shape ADR-013 already validated for the ingestion providers.
- **Rationale**: `NullProvider` (selected by default, `AI_PROVIDER=none`) makes "the platform must remain 100% functional with every AI component removed" (Principle 3) literally true rather than aspirational — no network call, no API key, and every caller already has a working failure path for a provider that cannot generate. No module outside `app/ai/providers/anthropic_provider.py` imports the `anthropic` package, so adding a second vendor later touches one new file, not the router or service layer.
- **Tradeoffs**: The `Protocol`'s single `generate(system_prompt, user_content, max_tokens) -> ProviderResult` method is deliberately minimal (no streaming, no function/tool calling) — sufficient for M6's synchronous, single-turn explanation/follow-up generation, but would need extension for a future streaming-response or agentic-tool-use feature (neither in scope for M6, per Founder Decision 003).
- **Future Implications**: A second provider (OpenAI, Google, a local model) is a new file implementing the same `Protocol` plus one new branch in the factory — no change to `app/ai/service.py`, `app/api/v1/services/explanation_service.py`, or any router.

---

## ADR-022 — Explanation/Follow-Up Caching Matches on (simulation, prompt_version, model_name[, question_text]), Not Filtered to `COMPLETED` for the Explanation Engine

- **Date**: 2026-07-12
- **Status**: Accepted (implements Founder Decision 003)
- **Context**: The M6 founder decision requires that an unchanged `simulation_id` + `prompt_version` + model never re-spends a model call — "return the stored explanation instead of calling the model again." The Explanation Engine exposes an explicit `regenerate` flag for a deliberate retry; the Financial Tutor's follow-up-question endpoint does not.
- **Problem**: A cache lookup filtered to `generation_status == COMPLETED` only would silently re-attempt generation on every single non-regenerate call after any failure (provider outage, integrity violation) — for the Explanation Engine, this defeats the entire purpose of a regeneration cap, since every "free" non-regenerate call would keep spending a real model call as long as the prior attempt failed. For the Financial Tutor, the opposite problem exists: a follow-up question has no `regenerate` override at all, so caching a `FAILED` answer against that exact question text forever would create a permanent dead end for a transient provider hiccup.
- **Options Considered**: (1) Cache-match only `COMPLETED` rows for both features. (2) Cache-match regardless of status for both features. (3) Match regardless of status for the Explanation Engine (which has an explicit `regenerate` escape hatch), but `COMPLETED`-only for the Financial Tutor (which has none).
- **Final Decision**: Option 3 — `_find_cached(..., only_completed: bool)` in `app/api/v1/services/explanation_service.py`, `False` (the default) for the Explanation Engine, `True` for the Financial Tutor.
- **Rationale**: The regeneration cap, not the cache filter, is what should bound a retry-after-failure loop for the Explanation Engine — matching cache to "any status" makes the cap's count meaningful (an unbounded number of free non-regenerate calls would otherwise never touch the model at all after the first failure, silently defeating cost-control intent). The Financial Tutor has no equivalent override, so it needs the opposite default to remain usable after a transient failure; its own per-simulation follow-up cap (not the cache filter) is what bounds *its* cost exposure instead.
- **Tradeoffs**: The two features now have asymmetric caching semantics, which is a genuine, if narrow, inconsistency a future maintainer must understand rather than assume uniform — documented directly in `_find_cached`'s docstring for exactly this reason.
- **Future Implications**: If a future milestone adds an explicit "regenerate this follow-up answer" action, its cache lookup should switch to `only_completed=False` to match the Explanation Engine's semantics, consistent with the pattern established here (an explicit retry action pairs with any-status caching; no retry action pairs with completed-only caching).

---

## ADR-023 — Educational Disclaimer Is Code-Appended, Never Model-Generated

- **Date**: 2026-07-12
- **Status**: Accepted (implements Founder Decision 003)
- **Context**: The M6 approved output structure lists "Educational Disclaimer" as the seventh required section, alongside six others (Summary, What Happened, Why It Happened, Financial Concepts, Key Takeaways, Limitations) that are naturally AI-generated content.
- **Problem**: Asking the model to generate the disclaimer text itself means its presence depends on the model's compliance with a prompt instruction — a request, not a guarantee. A disclaimer is exactly the kind of compliance-relevant content where "the model usually includes it" is a materially weaker property than "the platform always includes it."
- **Options Considered**: (1) Instruct the model to produce all seven sections, including the disclaimer, and verify its presence with the same structure check used for the other six. (2) Treat the disclaimer as a fixed, version-controlled string (`app.ai.service.EDUCATIONAL_DISCLAIMER`) that application code appends after every successful generation, and explicitly instruct the model *not* to write one itself (to avoid a duplicate).
- **Final Decision**: Option 2.
- **Rationale**: A fixed string is deterministic, cannot be worded inconsistently across generations, cannot be omitted by an off-distribution model response, and needs no safety-check coverage of its own (the six-section structure check in `app.ai.safety.check_output_structure` deliberately excludes it, per that module's own docstring). This is one place M6's implementation goes beyond the letter of the approved instruction, for a documented, narrow safety reason — not a silent deviation.
- **Tradeoffs**: None material — the disclaimer's wording cannot vary per-simulation (e.g., it cannot reference the specific asset or figures involved) since it is not generated per-request; judged acceptable since a disclaimer's purpose is a fixed compliance statement, not simulation-specific content.
- **Future Implications**: Any future addition to the required output structure that is itself a fixed, compliance-relevant statement (not simulation-specific content) should default to this same code-appended pattern rather than a prompt instruction.

---

## ADR-024 — `ai_explanations` Extended with `explanation_type`/`question_text` Rather Than a New Table

- **Date**: 2026-07-12
- **Status**: Accepted (implements Founder Decision 003)
- **Context**: The Financial Tutor's follow-up question-and-answer needs to be persisted, audited, and cached the same way the Explanation Engine's initial explanation already is. `.claude/DATABASE_RULES.md` prohibits adding a new table/domain beyond the nine listed without approval, but has an established precedent for extending an existing domain instead (`refresh_tokens` extending Users at M5, ADR-017).
- **Problem**: A follow-up answer is structurally very close to an initial explanation (same `simulation_id` FK, same `model_name`/`prompt_version`/`input_summary`/`explanation_text`/`generation_status`/`error_message` shape) but additionally needs to record which question was asked, and the two need to be distinguishable for caching, capping, and listing.
- **Options Considered**: (1) A new `ai_followup_questions` table, duplicating most of `ai_explanations`' columns. (2) Extend `ai_explanations` with `explanation_type` (`initial` | `follow_up`) and a nullable `question_text`, plus a composite index on `(simulation_id, explanation_type)` supporting the new cache/cap lookup pattern.
- **Final Decision**: Option 2 (migration `0003_ai_explanation_type`).
- **Rationale**: The two record types share every column except one (`question_text`, already nullable-by-necessity the same way `explanation_text` is), and `ai_explanations` already supports "multiple explanations per simulation" (Founder Specification Part 2.6.26) — a follow-up answer is not a new logical domain, it is another row in the domain that already exists. This mirrors the exact reasoning ADR-017 used for `refresh_tokens` extending Users rather than standing alone.
- **Tradeoffs**: `ai_explanations` now serves two logically distinct purposes from one table, requiring every query to filter by `explanation_type` explicitly (enforced by the new composite index, not by a separate physical table boundary) — a minor query-ergonomics cost, accepted the same way ADR-008 accepted a comparable tradeoff for Economic Indicators' two-table split in the opposite direction.
- **Future Implications**: A hypothetical third AI-generated content type (e.g., a full multi-simulation comparison report, if Report Generation is ever built per Part 3.3.12) should evaluate this same question fresh — this ADR is not a blanket license to keep extending `ai_explanations` indefinitely, only a specific, justified precedent for the two types M6 actually needs.

---

## ADR-025 — Frontend Design Token Architecture: CSS-Variable Three-Layer System Bridged into Tailwind v4, Plus a New Z-Index Scale

- **Date**: 2026-07-15
- **Status**: Accepted
- **Context**: M7 Phase 0 (`docs/BRAND_CONSTITUTION.md`, `docs/frontend_design_system.md`) approved a primitive → semantic → component token architecture and a specific color/type/spacing/radius/elevation/motion/breakpoint system, but M7 Phase 1 is the first milestone to actually scaffold the frontend — `create-next-app` provisioned Next.js 16 with Tailwind v4, which removed the `tailwind.config.ts` JavaScript config file in favor of a CSS-first `@theme` directive, a genuine framework change from the config-file approach `docs/frontend_design_system.md` implicitly assumed when it was written.
- **Problem**: Tailwind v4's `@theme` values are normally static at build time, which is the wrong fit for a token system that must switch every color at runtime for light/dark (FD-005) without a page reload or a `dark:` variant sprinkled onto every utility class.
- **Options Considered**: (1) Use `@theme` directly with hard light-mode values and `dark:` variants on every component — matches Tailwind v4's own quickstart docs but reintroduces exactly the per-component dark-mode duplication the design system's token architecture exists to avoid. (2) Three physical CSS files (`tokens/primitives.css`, `tokens/semantic.css`, `tokens/components.css`) holding real runtime CSS custom properties, switched via a `[data-theme]` attribute selector, then a thin `@theme inline { --color-x: var(--color-x); }` bridge layer that lets Tailwind generate ordinary utility classes (`bg-background`, `text-ink-primary`, ...) whose actual value still resolves at paint time from the switchable variable.
- **Final Decision**: Option 2, implemented in `frontend/src/styles/tokens/{primitives,semantic,components}.css` and bridged in `frontend/src/app/globals.css`'s `@theme inline` block. Also introduces a z-index scale (`--z-dropdown` through `--z-tooltip`, six tiers) as a new primitive token — not previously specified in any Phase 0 document — since Tailwind v4 does not ship a themeable z-index namespace and the design system was silent on stacking order.
- **Rationale**: This is the standard pattern the shadcn/ui v4 template itself converged on for the identical problem (CSS vars for the switchable layer, `@theme inline` purely as a Tailwind-utility-generation bridge), so it is a well-precedented solution rather than a bespoke one. It also means every component only ever writes semantic utility class names (`bg-surface`, `border-border-hairline`) and never a `dark:` variant, which is the concrete implementation of the design system's own "components reference semantic tokens only" rule (`docs/BRAND_CONSTITUTION.md` component checklist item 1).
- **Tradeoffs**: Two color-utility names read slightly awkwardly as a direct consequence of the naming convention (`border-border-hairline`, `text-ink-primary`) — accepted rather than shortening the semantic names, since a longer-but-unambiguous utility name is preferable to a token-naming scheme that drifts from `docs/frontend_design_system.md`'s own vocabulary. The z-index scale is a genuinely new, unreviewed addition; it should be treated as provisional until a real overlay/modal/toast stacking scenario is built in Phase 2 and can validate the six tiers are sufficient.
- **Future Implications**: Any new semantic color added in a future phase must be added to all three token files (or explicitly deferred) plus the `@theme inline` bridge — omitting the bridge step silently produces a CSS variable that has no corresponding Tailwind utility, a class of bug worth a lint/review checklist item in Phase 2.

---

## ADR-026 — Theme Switching: `data-theme` Attribute + Inline Head Script, Not a Third-Party Theme Library

- **Date**: 2026-07-15
- **Status**: Accepted
- **Context**: FD-005 requires light/dark theme architecture from day one, with no flash of the wrong theme on load and no visible toggle mandated yet. The obvious off-the-shelf solution (`next-themes`) is small and well-tested, but this Next.js version (16.2) ships its own documented flash-prevention pattern (bundled guide: "Preventing Flash," `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`) built specifically around this exact scenario.
- **Problem**: Server-rendered HTML has no access to `localStorage` or the client's OS theme preference; without correcting the DOM before first paint, a user with a stored or system dark preference sees a flash of light content on every load.
- **Options Considered**: (1) `next-themes` — a small, well-known dependency that handles this internally. (2) Hand-roll the exact pattern this Next.js version's own docs recommend: a synchronous inline `<script>` in `<head>` that reads `localStorage` (falling back to `prefers-color-scheme`) and sets `data-theme` on `<html>` before the browser paints, paired with a React `ThemeProvider`/`useTheme()` context whose lazy `useState` initializer reads the same source so client and script never disagree.
- **Final Decision**: Option 2 — `frontend/src/providers/theme-script.ts` (the inline script string) and `frontend/src/providers/theme-provider.tsx` (the context/hook), with `<html data-theme="light" suppressHydrationWarning>` as the SSR fallback default in `frontend/src/app/layout.tsx`.
- **Rationale**: Avoids a dependency for a problem this specific Next.js version already documents a first-party solution for, and keeps the implementation legible to any future contributor reading this version's own bundled guide. `useTheme()` is exported now so a future toggle control is a one-line `setTheme()` call, not a redesign — deliberately satisfying `docs/BRAND_CONSTITUTION.md`'s "no toggle unless it naturally falls out of the architecture" instruction without leaving the capability unbuilt.
- **Tradeoffs**: A hand-rolled solution carries slightly more maintenance surface than a maintained library, and re-implements a small amount of logic (system-preference listening, storage sync) that `next-themes` provides for free. Accepted because the surface is genuinely small (two files, under 90 lines combined) and the behavior is fully covered by `frontend/src/__tests__/lib/theme-provider.test.tsx`.
- **Future Implications**: If a future phase needs SSR-aware theme-dependent server rendering (e.g., a server component branching on theme), this client-only approach will need revisiting — not a concern for Phase 1, since no server component currently reads theme.

---

## ADR-027 — Centralized API Client: One Axios Instance, One Error-Normalization Function, One Error-Code-to-Copy Table

- **Date**: 2026-07-15
- **Status**: Accepted
- **Context**: `docs/frontend_design_system.md`'s shared-component list calls for "an API client hook that maps the `{success, data}` / `{success: false, error: {code, message, request_id}}` envelope... to one central error-code→copy table" (`docs/api_design.md`). `.claude/CODING_STANDARDS.md` requires the frontend to remain presentation-only and never duplicate backend business logic.
- **Problem**: Without one enforced boundary, every future screen would be tempted to branch on `response.data.success` itself and invent its own error copy, silently duplicating logic and producing inconsistent error messages for the same backend error code across different screens.
- **Options Considered**: (1) A thin wrapper per endpoint that each does its own success/failure branching. (2) One `axios` instance (`withCredentials: true` for the httpOnly session cookies Founder Decision 002 established) with a response interceptor that unwraps `{success:true,data}` and converts every failure — a backend error envelope or a transport-level failure with no response at all — into one typed `ApiError` class, plus a single `ERROR_COPY` record covering every documented code.
- **Final Decision**: Option 2, in `frontend/src/lib/api/{client,errors}.ts`. The interceptor's error-normalization step is factored into an exported pure function (`normalizeApiError`) specifically so it is unit-testable against constructed error shapes without depending on axios's transport/`validateStatus` internals inside a test.
- **Rationale**: Every endpoint function (`frontend/src/lib/api/endpoints/*.ts`) can now simply `await apiRequest<T>(...)` and either get typed data back or have a single `ApiError` thrown — no screen ever needs to know the envelope shape exists. This is the direct implementation of "the frontend only calls the versioned API" and "never duplicate backend business logic": the only place that understands the API contract's shape is this one module.
- **Tradeoffs**: `ERROR_COPY` deliberately does not include an entry used for AI-unavailable states — that is a normal successful response per Founder Decision 003, not an error code, and routing it through this table would be a category error; this is called out explicitly in `errors.ts`'s own comment so a future contributor doesn't "helpfully" add one.
- **Future Implications**: Adding a new backend error code (`docs/api_design.md`) requires adding it to the `ApiErrorCode` union (`frontend/src/types/api.ts`) and `ERROR_COPY` in the same change — TypeScript's exhaustiveness checking on the `Record<ApiErrorCode, ErrorCopy>` type will fail the build if a code is ever added to one but not the other.

---

## ADR-028 — Status and Muted-Ink Colors Split Light/Dark, Fixing a Real Contrast Bug (and a Self-Reference Bug) in the M7 Phase 1 Tokens

- **Date**: 2026-07-16
- **Status**: Accepted
- **Context**: M7 Phase 1.5's hardening review computed real WCAG contrast ratios for every ink/status color against its background, rather than assuming the Phase 0/0B design-review hex values were correct as shipped. `docs/frontend_design_system.md`'s status palette (§3) and the muted-ink neutral were both designed as a single hex shared by light and dark mode — unlike the chart-data palette and every other neutral, which already had separate light/dark values.
- **Problem**: Two distinct, real bugs were found, not one. (1) **Contrast**: a single hex cannot pass 4.5:1 against both a near-white and a near-black background at once — computed contrast ratios showed muted-ink at 3.41:1 (fail) on light, status-good at 3.18:1 (fail) on light, status-warning at 1.74:1 (fail badly) on light, status-serious at 2.50:1 (fail) on light, and status-critical at 4.05:1 (fail) on dark; only status-critical-on-light (4.56:1) happened to pass, and only barely. (2) **Self-reference**: `frontend/src/styles/tokens/semantic.css`'s original `:root` block declared `--color-status-good: var(--color-status-good)` (and the same pattern for warning/serious/critical) — a custom property referencing its own name, which is invalid per the CSS Custom Properties spec and causes the declaration using it (`color: var(--color-status-good)` in `badge.tsx`) to fall back to an inherited/initial color instead. The dark-mode override blocks additionally never set `--color-status-*` at all, meaning dark mode was equally affected. Confirmed via the actual compiled production CSS (`.next/static/chunks/*.css`), not just source inspection.
- **Options Considered**: (1) Leave the hues as a single value and only fix the self-reference bug, accepting the contrast failures as a known, documented gap. (2) Split every status color and the muted-ink neutral into light/dark primitive pairs — computing new, verified-safe hex values for each failing case — matching the pattern the chart-data and other neutral tokens already correctly used, and fix the self-reference in the same change.
- **Final Decision**: Option 2. New primitives: `--color-status-{good,warning,serious,critical}-{light,dark}` and `--color-ink-muted-{light,dark}` (`frontend/src/styles/tokens/primitives.css`), referenced correctly (no self-reference) per theme in `semantic.css`. New verified hex values: good `#0b7d0b`/`#0ca30c`, warning `#8a5a00`/`#fab219`, serious `#a8451f`/`#ec835a`, critical `#c23434`/`#e8605f`, muted `#6b6963`/`#898781` (light/dark respectively) — dark-mode values were already safe for good/warning/serious/muted and were kept unchanged; only critical needed a new, lighter dark-mode value.
- **Rationale**: Every new hex was chosen by solving for the relative-luminance threshold needed to hit ≥4.5:1 against its theme's background (`#f9f9f7` light / `#0d0d0d` dark), then verified programmatically, not eyeballed — the same values are asserted directly in `frontend/src/__tests__/lib/contrast.test.ts` as a permanent regression guard (a known-answer test, mirroring this project's own backend testing philosophy applied to a design token). Keeping the hue identity (still recognizably green/amber/orange-red/red) while shifting the exact shade per theme is the same tradeoff the chart-data palette already made for the identical reason, so this isn't a new design pattern, just a gap in Phase 1's original application of it.
- **Tradeoffs**: None of the shifted hex values change any prior product decision or Founder Decision — this is a pure bug fix within an already-approved design direction (BRAND_CONSTITUTION.md §7's status-palette *philosophy* — "functional, never celebratory" — is unaffected; only the literal hex values are corrected). `docs/frontend_design_system.md` §3 was updated to match, since that document is meant to reflect implementation truth, not a stale proposal.
- **Future Implications**: Any future new status/semantic color must be verified against both theme backgrounds with the same known-answer-test discipline before shipping — `contrast.test.ts` is the place to add it. Any change to `--color-status-*`'s dark-mode selectors must set all four status variables explicitly in every theme block (`:root`, the `prefers-color-scheme` media block, and `[data-theme='dark']`) — the missing-override half of this bug would have recurred silently if a future contributor added a fifth status color and forgot one of the three blocks.

---

## ADR-029 — Financial-Math Guardrail: Branded `DecimalString` Type + ESLint Rule Banning Numeric Coercion in Product Code

- **Date**: 2026-07-16
- **Status**: Accepted
- **Context**: `.claude/CODING_STANDARDS.md` states "the frontend is presentation-only: it must never calculate returns, CAGR, dividend reinvestment, or inflation adjustment" as a rule, but M7 Phase 1 enforced it only by convention (every financial field was typed `string`, indistinguishable at the type level from any other string, and nothing prevented a future component from writing `Number(sim.final_value) - Number(sim.investment_amount)` inline). M7 Phase 1.5's hardening review was asked to add a practical guardrail, not just restate the rule in a comment.
- **Problem**: A documented rule with no structural enforcement is exactly the kind of thing that survives a design review intact and then gets silently violated eight screens later, once whoever is under deadline pressure to build a Results page reaches for the obvious (and wrong) `Number(...)` call because nothing stops them and the type checker has no opinion.
- **Options Considered**: (1) Document the rule more prominently and rely on code review. (2) A branded `DecimalString` type (`frontend/src/lib/format/decimal-string.ts`) marking every backend-sourced financial field as distinct from a plain `string` at the type level, plus a real ESLint rule (`no-restricted-syntax`, a core ESLint rule requiring no new dependency) banning `Number(`, `parseFloat(`, `parseInt(`, and unary `+` numeric coercion in `src/app/**` and `src/components/**` (product/UI code), plus a static-analysis test scanning the formatting module's own source for the same banned tokens. (3) A custom type-aware ESLint rule (using `@typescript-eslint`'s type-checking API) that specifically flags numeric coercion only when the operand's type is `DecimalString` — more precise than option 2, but requires building and maintaining a custom lint rule package, a meaningfully larger undertaking than justified for this phase.
- **Final Decision**: Option 2. Verified working against a deliberate scratch violation (four coercion patterns, all four caught) before being treated as done, then confirmed the real, already-written codebase passes cleanly with zero changes needed.
- **Rationale**: The branded type and the lint rule are complementary, not redundant: the type makes a financial value visually and structurally distinct from a stray string in an editor and in code review; the lint rule makes the actual ban enforced automatically, in CI, on every future page, without relying on a reviewer noticing. Choosing a repo-wide restriction (rather than option 3's precise, type-aware version) is a deliberate breadth-over-precision tradeoff: it is coarser (it also flags a hypothetically legitimate `Number()` call on genuinely non-financial data inside a component), but `src/app/**`/`src/components/**` is exactly the surface where non-financial numeric coercion is rare and financial-value coercion is the realistic risk, so the false-positive cost is low and the rule needed zero new tooling to ship today.
- **Tradeoffs**: A component that genuinely needs to parse a non-financial number (e.g. a pagination page index from a query string) will need a narrowly-scoped `// eslint-disable-next-line no-restricted-syntax` with a comment explaining why — an accepted, visible escape hatch rather than a silent one. The rule cannot see through re-exports or aliasing (e.g. `const N = Number; N(x)` would not be caught) — accepted as a deliberate, documented gap; the goal is to catch the obvious, common-case mistake, not to be adversarially unbypassable.
- **Future Implications**: If a genuine, repeated need for numeric coercion on non-financial data emerges in `src/app/**`/`src/components/**`, revisit toward option 3 (a type-aware rule) rather than accumulating scattered disable comments. Any new backend financial field added to `src/types/api.ts` must be typed `DecimalString`, not `string`, in the same change.

---

## ADR-030 — API Contract Strategy: Hand-Written Types, Deferred Codegen, Live-Schema Drift Detection

- **Date**: 2026-07-16
- **Status**: Accepted
- **Context**: `frontend/src/types/api.ts` was hand-written against `docs/api_design.md` and spot-read backend Pydantic schemas during M7 Phase 1, with no formal codegen pipeline and no automated way to notice if the backend's actual response shape ever diverges from what the frontend assumes. M7 Phase 1.5's contract-drift review, prompted to evaluate this informally, found the risk was not hypothetical: reading the real Pydantic schemas directly turned up two genuine mismatches already shipped (KI-036: `GrowthSeriesPoint`/`DisclosedSplit`'s date fields are named `point_date`/`split_date`, not `date`; KI-038: six `SimulationResponse` fields are nullable, and `error_message` was missing entirely).
- **Problem**: FastAPI generates a complete OpenAPI schema (`/openapi.json`) for free, which could in principle drive full type codegen (`openapi-typescript` or similar) — but hand-written types currently encode intent codegen can't produce automatically (the `DecimalString` branded type, ADR-029's guardrail, and deliberate per-field documentation of *why* a field is nullable), and replacing them wholesale is a real migration, not a drop-in.
- **Options Considered**: (1) Adopt `openapi-typescript` (or equivalent) codegen now, regenerating `types/api.ts` from a live or exported schema as part of the build. (2) Keep hand-written types, but add a concrete, automated drift-detection mechanism rather than relying on manual re-reading of backend source during design reviews. (3) Keep hand-written types with no automated check at all, relying on manual review — the status quo M7 Phase 1 shipped with, which this same review just showed is insufficient.
- **Final Decision**: Option 2. `frontend/src/__tests__/lib/api-contract-drift.test.ts` fetches the backend's live `/openapi.json` and asserts the specific field names the frontend's hand-written types depend on are present (and that specific renamed/removed fields, like the old `date`, are genuinely absent) — skipping gracefully, not failing, when no backend is reachable (matching the existing Redis-unreachable test convention, KI-035's resolution). Verified against a real, running backend during this same review (postgres/redis containers already running, `uvicorn app.main:app` started directly): all four live-path assertions passed.
- **Rationale**: Full codegen is deferred, not rejected — it remains the more scalable long-term answer once the API contract stabilizes past M7's remaining phases (Simulator/Results screens will need several more response shapes) and once a decision is made about how to preserve `DecimalString` branding and guardrail-relevant documentation through a generated file (e.g. a thin hand-written wrapper layer over generated base types). Shipping a working drift detector today, cheaply, closes the actual gap (silent, undetected mismatch) without blocking on that larger design question.
- **Tradeoffs**: This drift detector only catches a mismatch when someone runs the test suite against a live backend — it will not catch drift in CI unless a backend service is provisioned there (not currently the case), so it is a strong *local development and manual-review-time* safety net, not a CI gate yet. It also only checks field *names*, not full type/shape compatibility (a field could be renamed to something present-but-differently-typed and this test would not catch a type mismatch, only a presence mismatch).
- **Future Implications**: Revisit full codegen once the API surface this frontend depends on stabilizes past Phase 2's initial build-out. If CI ever provisions a backend service (mirroring the `postgres`-in-CI precedent), promote this drift test from a locally-run safety net to an enforced CI gate. Any new hand-written type added to `types/api.ts` for a new endpoint should get a corresponding drift-detection case in the same change, not as an afterthought.

---

## ADR-031 — Isolate Next.js's `unstable_retry` Behind a Shared Type, Not a Runtime Wrapper

- **Date**: 2026-07-16
- **Status**: Accepted
- **Context**: `frontend/src/app/error.tsx` and `global-error.tsx` both receive an `unstable_retry` prop from Next.js — a function explicitly marked unstable by Next.js itself (introduced at v16.2.0, per that version's own bundled docs). M7 Phase 1.5 was asked to isolate this volatility rather than let two files each inline the same unstable prop shape.
- **Problem**: If a future Next.js release renames, changes the signature of, or removes `unstable_retry` (which its own naming explicitly signals as possible), every file that inlines its type shape needs a coordinated edit, and it is easy to miss one.
- **Options Considered**: (1) Leave the prop shape inlined in both files (the M7 Phase 1 state). (2) Extract a shared type (`frontend/src/lib/next-error-boundary.ts::RouteErrorBoundaryProps`) that both files import. (3) Build a runtime wrapper component around `error.js`/`global-error.js` that abstracts `unstable_retry` behind a stable, custom-named API.
- **Final Decision**: Option 2.
- **Rationale**: Next.js itself dictates the exact prop signature of the `error.js`/`global-error.js` file-convention special files — it calls these components directly as part of its own routing/rendering pipeline, with a prop shape it controls, not one this project defines. Option 3 (a runtime wrapper) would not actually reduce coupling to the unstable API: Next would still invoke the wrapper with exactly this shape, so a future rename would still require updating the wrapper. A shared *type* accomplishes the real, achievable goal — one place to update, not two or more — without pretending to insulate against a framework-level API change that isolation can't actually prevent.
- **Tradeoffs**: `global-error.tsx` deliberately imports nothing else from the app (it is the "everything else failed" boundary) — the shared type is imported there too, but as a `import type`, which TypeScript fully erases at compile time and which therefore carries no runtime dependency, preserving that file's "nothing left to fail" property.
- **Future Implications**: If Next.js's `error.js`/`global-error.js` prop contract changes in a future upgrade, `RouteErrorBoundaryProps` is the only place requiring an edit; `frontend/src/app/error.tsx` and `global-error.tsx` themselves would not need to change beyond whatever new behavior the new API enables.

---

## ADR-032 — TanStack Query Conventions Fixed Before Any Page Uses Them

- **Date**: 2026-07-16
- **Status**: Accepted
- **Context**: M7 Phase 1 configured a `QueryClient` with sensible defaults (`query-provider.tsx`) but never defined how query keys should be structured or how a query's `error` field should be handled by a component — meaning M7 Phase 2's first screen would have had to invent both conventions under deadline pressure, with no precedent to follow or deviate from consciously.
- **Problem**: TanStack Query's biggest real-world footgun is inconsistent query keys across a codebase (e.g. one screen using `['asset', symbol]` and another using `['assets', 'detail', symbol]` for what should be the same cache entry) and inconsistent error handling (each screen inventing its own error-to-copy mapping instead of reusing the one central table `docs/frontend_design_system.md` already calls for).
- **Options Considered**: (1) Leave conventions undefined and let each Phase 2 screen establish its own pattern, documenting retroactively. (2) Define a query-key factory (`src/lib/query/keys.ts`), a written convention document (`src/lib/query/README.md`: key structure, staleTime philosophy, invalidation pattern, error-handling pattern), and one reference hook (`src/hooks/use-asset-search.ts`) demonstrating the full pattern end-to-end against a real endpoint function, before any product page exists.
- **Final Decision**: Option 2.
- **Rationale**: `useAssetSearch` is deliberately the example chosen because it is genuinely cross-cutting (both the future Simulator's asset autocomplete and the future Asset Explorer's search will need it) rather than tied to one screen's specific UI — it demonstrates the convention without smuggling in page-specific business logic ahead of this phase's explicit "no product pages" scope. The error-handling convention (`error instanceof ApiError ? getErrorCopy(error.code) : ...`) is written down once so it's copy-pasted correctly by every future screen rather than each screen rediscovering that `apiRequest` always throws `ApiError`.
- **Tradeoffs**: The key factory (`keys.ts`) currently only covers `assets` and `simulations` — the two resources this phase's API layer already has endpoint functions for. Adding a new resource (e.g. `explanations` once M7 Phase 2 needs the AI panel) means extending `keys.ts` in the same change that adds its endpoint functions, not deferring it.
- **Future Implications**: Every new `useQuery`/`useMutation` call added in Phase 2 onward must use `queryKeys`, not a raw array literal — this should be a code-review checklist item, the same way `docs/BRAND_CONSTITUTION.md`'s Component Review Checklist is for UI primitives.
