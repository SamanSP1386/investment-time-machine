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
