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
