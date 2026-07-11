# investment-time-machine

Investment Time Machine

"If you had invested $1,000 in Apple in 2020, what would it actually be worth today?"

Not an estimate. Not a projection. The answer — computed deterministically from real historical prices, dividend by dividend, presented like a page from an annual report, with every number able to prove where it came from.



What it is

Investment Time Machine is a historical investment intelligence platform. You pick an asset, an amount, and a date range; a deterministic simulation engine replays history — daily closing prices, dividend reinvestment on actual ex-dates, optional CPI inflation adjustment — and answers in one sentence, backed by a full evidentiary trail.

It is deliberately not a brokerage, a prediction engine, or a trading toy. It's built on one principle: the answer to "what would have happened" should be a fact, and facts should carry receipts.

Every result ships with:


The Sentence — the answer, first, in plain English
The Evidence — a growth chart drawn from a persisted, versioned time series
The Why — plain-English explanation of price appreciation, dividends, and inflation, composed deterministically from the simulation's own data (no AI hand-waving)
The Proof — collapsed methodology, assumptions, provenance, calculation version, and the complete point-by-point data table behind the chart


Why this project is different under the hood

Most portfolio projects demo a happy path. This one is engineered like money is on the line — because in this domain, a silently wrong number is worse than a crash.

💰 Financial correctness as an architecture, not a hope


All money math in fixed-point Decimal under a scoped 38-digit context with banker's rounding — floats are banned from the financial path, enforced by a guardrail test that scans the formatting layer for violations
Values quantize exactly once, at the persistence boundary
The one unavoidable exception (charts need JS numbers for SVG coordinates) is a single, documented, lint-flagged function whose output is never displayed — every visible figure re-formats the original decimal string


🔢 Versioned calculations with migration discipline


Every simulation is stamped with a calculation_version
When a real bug was found (see below), the fix shipped as v2 with an auditable backfill migration that rescaled stored rows and re-stamped them — reproducibility preserved, history honest


🐛 The CAGR bug — a case study in why tests aren't enough
The engine's annualized-return function returned a raw fraction where a percentage was expected — off by 100×. The test suite was green the entire time, because the known-answer test had enshrined the buggy output as the expected value. It was caught by live output verification, root-caused across five layers (formula → column → schema → docs → test), and fixed with the corrected expected value derived independently by hand (day-count and all: 3,653 days ÷ 365.25 → 2.5^(1/10.0014) − 1 = 9.594448%) so the test could never be circular again. The whole story is in the repo's decision log.

📊 A data assumption that got verified, not trusted
The engine's core premise — that stored closing prices are already retroactively split-adjusted — was confirmed empirically against Apple's 2020 4-for-1 split: the real pre-split close of $499.23 ÷ 4 = $124.8075, an exact match to the stored series. The evidence is quoted in the issue tracker entry that closed it.

🧾 Engineering with receipts


FOUNDER_DECISIONS.md — every product ruling, recorded with options and rationale
ARCHITECTURE_DECISIONS.md — 40+ ADRs
KNOWN_ISSUES.md — bugs tracked honestly with severity, evidence, and resolution proof
DEVLOG.md / CHANGELOG.md — the entire history, including the mistakes


🔐 Auth built like it matters
Argon2 password hashing with a dummy-hash path for timing-attack parity (even for OAuth accounts with no password), refresh tokens stored only as SHA-256 hashes, admin claims re-verified against the database on every request.

🧪 Verification culture


480+ tests across backend and frontend
A contract-drift test that validates frontend types against the live backend's /openapi.json — it has caught real bugs twice
CI reproduces a fresh-database migration run on every push (which once exposed two defects that had been invisible locally for eight straight pushes — both root-caused and turned into standing guardrails)


The experience

The interface follows a written Experience Constitution: the answer renders immediately (motion may explain, orient, or communicate state — never delay or decorate), gains and losses receive identical calm treatment, and every meaningful figure can open its own "Source" trail. Typography does the hierarchy — Newsreader for the sentence, IBM Plex Mono for the figures — over a quiet, grain-textured dark atmosphere. Reduced-motion preferences are honored everywhere, including JavaScript-driven effects.



Stack

LayerTechnologyEngine & APIPython, FastAPI, SQLAlchemy, Alembic, PydanticDataPostgreSQL (NUMERIC-typed financial columns, JSONB series), RedisFrontendNext.js (App Router), TypeScript, React Query, Recharts, Tailwind design tokensTestingpytest, Vitest, React Testing Library, contract-drift validationInfraDocker Compose, GitHub Actions CI (lint, type-check, fresh-DB migration + full suites)
