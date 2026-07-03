# MVP_RULES.md

From Founder Specification Part 2.17 (MVP Scope Definition) and Part 3.1 (PRD). This file governs what may and may not be built before the founder explicitly approves expanding scope.

## In scope (build these, in this order)

1. Database (nine domains — see [DATABASE_RULES.md](DATABASE_RULES.md))
2. Historical data imports (yfinance, CoinGecko, FRED — see ingestion notes below)
3. Simulation Engine (single-asset, deterministic — see [CODING_STANDARDS.md](CODING_STANDARDS.md))
4. API (versioned, thin handlers — see [API_STANDARDS.md](API_STANDARDS.md))
5. Frontend (Next.js — only after 1–4 are stable)
6. Authentication (email + password; OAuth deferred)
7. AI Explanations (explanatory only, never calculative)
8. Deployment

**Backend-before-frontend is a hard rule, not a preference.** No frontend milestone starts before the Simulation Engine and API are stable and tested.

### Feature list (approved for MVP)

- Single-asset historical simulation: pick an asset, amount, start/end date → shares purchased, final value, total return, CAGR.
- Dividend reinvestment toggle.
- Inflation adjustment (nominal vs. real, CPI sourced from FRED).
- Asset search: US stocks, ETFs, and crypto only (no international, no bonds/commodities/mutual funds — those are Phase 2+).
- AI explanation of results, historical context, and investment concepts (never facts/figures).
- User accounts (email/password) and simulation history.
- Asset comparison and report generation (added in Functional Requirements; not listed among the PRD's original 7 core features — treat as approved but confirm before deep investment, since this is an internal spec inconsistency flagged during review).
- Financial metrics exposed at MVP: Final Value, ROI, CAGR, Inflation-Adjusted Return, Dividend Contribution, Opportunity Cost Analysis. These live in the Simulation Engine (v1) itself.

### Financial Analytics is its own future milestone — do not fold advanced metrics into the Simulation Engine permanently

The Simulation Engine owns only the basic metrics listed above. Volatility, Sharpe Ratio, Sortino Ratio, Maximum Drawdown, Calmar Ratio, Rolling Return Analysis, and correlation analysis are reserved for a **dedicated future Financial Analytics milestone**, built as a separate service/module that reads simulation output rather than being wired into the engine itself. This keeps the Simulation Engine's test surface (known-answer tests, 90%+ coverage) small and stable, and avoids re-opening its highest-risk code every time a new metric is added. Do not implement any of these advanced metrics inside `simulation/` even "temporarily" — start them in their own module from day one, whenever that milestone is scheduled.

## Explicitly excluded — do not build without new, written founder approval

Portfolios, watchlists, retirement planning, tax modeling, real-time data, brokerage integration, trading, investment recommendations, social features, mobile apps. Also deferred (not excluded, just not-yet): Volatility, Sharpe Ratio, Sortino Ratio, Maximum Drawdown, Calmar Ratio, Best Entry/Exit Date Analysis, Rolling Return Analysis, multi-factor auth, advanced RBAC, CI/CD automation, infrastructure-as-code.

## Data providers (MVP only)

yfinance (stocks/ETFs), CoinGecko (crypto), FRED (economic indicators). No paid providers at MVP. Provider abstraction should exist (per Part 2.13) so adding a provider later doesn't require redesigning ingestion — but do not build support for providers not yet approved.

## A success signal, not a target

"A successful MVP proves that users value understanding historical investment outcomes" — the goal is validating the core simulate-and-explain loop, not maximizing feature count. When in doubt about whether something belongs in MVP, prefer leaving it out and asking.

## Do not

- Do not add Redis, background workers, or read replicas until a [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md) scaling trigger is actually observed.
- Do not build any deferred financial metric (Volatility, Sharpe, etc.) without first resolving its open design question (e.g. Sharpe/Sortino need a historically-appropriate risk-free rate, not a single current value) — these are flagged as correctness risks, not just "not built yet."
- Do not treat "Asset Comparison" and "Report Generation" as automatically MVP without confirming with the founder — internal spec documents (PRD vs. Functional Requirements) disagree about whether they're core or optional.
