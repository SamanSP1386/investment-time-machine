# SYSTEM.md — Investment Time Machine

Source of truth: `DOCUMENTS_AND_IDEAS/Founder_Specification_v1.pdf` ("the Founder Specification"). If any generated code, doc, or decision conflicts with it, **the Founder Specification wins**. Do not redesign architecture without explicit founder approval, even if you spot a flaw — flag it (what/why/severity/fix/approval-needed) and wait.

## What this system is

A historical investment intelligence platform. Users simulate investment decisions across time using real market data and get quantitative analysis, risk metrics, and AI-generated educational explanations. It is explicitly **not**: a brokerage, a trading platform, a recommendation engine, a predictive/forecasting tool, or a financial advisor.

Primary users: college students (primary), retail investors (secondary), researchers/enthusiasts (tertiary).

## Four non-negotiable principles

1. **Historical Truth Is Sacred** — never fabricate or estimate data; unknowns are explicitly marked incomplete, never silently interpolated.
2. **Local Data Ownership** — the simulation engine never calls a live external provider at request time; all historical data is imported, validated, and stored locally first.
3. **AI Never Generates Financial Facts** — AI explains results; it never calculates, invents, or alters a number. The platform must remain 100% functional with every AI component removed.
4. **Simulation Logic Must Be Independent** — the Simulation Engine produces identical results whether or not AI is available or reachable.

## Four core services and their boundaries

| Service | May | Must Not |
|---|---|---|
| API Gateway | authn/authz, routing, validation, rate limiting | contain business/financial logic |
| Historical Data Service | ingest, validate, normalize, store market data | be called live by the Simulation Engine during a run |
| Simulation Engine | be the **sole source of financial truth** (returns, CAGR, dividends, inflation adj.) | call AI, call live providers, depend on AI availability |
| AI Intelligence Service | explain/summarize simulation output & historical context | calculate results, access raw DB/credentials/infra secrets directly |

Data flow for any user-facing result: `Provider → Validation → Storage → Simulation Engine → (optional) AI Explanation → Response`. AI is always downstream of, never a participant in, the financial calculation.

## Engineering priority order (applies to every decision, in this order)

Correctness → Security → Reliability → Maintainability → Performance → Convenience/Aesthetics.

"Accuracy over aesthetics" and "backend before frontend" are standing rules, not milestone-specific preferences.

## Approved MVP technology (do not substitute without approval)

Backend: Python 3.12+, FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic, PostgreSQL. Redis is deliberately excluded from the initial repo/environment foundation — it is introduced only when a milestone actually needs caching or rate limiting (see the API Layer milestone), not provisioned speculatively.
Frontend: Next.js, TypeScript, Tailwind CSS, Recharts.
Infra: Docker, GitHub, GitHub Projects, Railway or Render (backend+DB), Vercel (frontend), Sentry, UptimeRobot.
Data providers (MVP): yfinance (stocks/ETFs), CoinGecko (crypto), FRED (economic indicators/CPI).

Prohibited without explicit written approval: Django, Flask, MongoDB, Marshmallow, any framework/DB not listed above.

## Known specification gaps (tracked, not blocking)

- **Part 2.9 — API Architecture was never written** (spec references it twice as "Next:" but jumps straight to Part 2.10). [API_STANDARDS.md](API_STANDARDS.md) fills the practical gap conservatively — treat it as a placeholder pending founder sign-off, not an architectural decision.
- **Part 2.6.27 — Entity Relationship Design was never written.** No consolidated ERD exists; relationships are scattered per-table across Part 2.6.
- Part 2.8 (Security), Part 2.16 (Roadmap), Part 2.18 (Engineering Workflow), and Part 2.6.26 (AI Explanation Table) each appear twice, verbatim, in the source document — harmless duplication artifacts, not content conflicts.

See [MVP_RULES.md](MVP_RULES.md) for scope, [DATABASE_RULES.md](DATABASE_RULES.md) for schema law, [SECURITY_POLICY.md](SECURITY_POLICY.md) for the threat model, and [DOCUMENTATION_POLICY.md](DOCUMENTATION_POLICY.md) for the mandatory `docs/` journal — no milestone is complete without it.
