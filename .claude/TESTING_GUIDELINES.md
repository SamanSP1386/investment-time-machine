# TESTING_GUIDELINES.md

Distilled from Founder Specification Part 2.19 (Testing Strategy). Philosophy: heavy unit testing, essential integration testing, minimal E2E early. "A feature is not complete without tests" — this is part of Definition of Done, see [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md).

## Coverage targets by component (treat as a floor, not a suggestion)

| Component | Target |
|---|---|
| Simulation Engine | 90%+ |
| Data Ingestion | 85%+ |
| API Layer | 80%+ |
| Database Logic | 80%+ |
| Frontend | 60%+ |

No CI gate enforces these numbers in the base spec (CI/CD is deferred) — that is a known gap, not a reason to skip testing. Wire coverage reporting into CI as soon as CI exists (see the first coding milestone recommendation), even though the founder spec treats it as a "future" item.

## Simulation Engine — mandatory known-answer tests

Every one of these requires deterministic, hand-computed known-answer test cases before the component ships, no exceptions: Investment Growth, Total Return, CAGR, Dividend Reinvestment, Inflation Adjustment, Error Handling (bad dates, missing assets, missing historical data, division-by-zero edge cases). "No launch should occur without simulation validation" is explicit in the spec — this is the single hardest gate in the whole project.

## Stack

- Backend + API: Pytest, `coverage.py`, FastAPI `TestClient`.
- Frontend: Vitest.
- E2E: Playwright — optional at MVP, but strongly recommended for the core simulation flow (Home → Simulator → Results) given how thin the integration test layer is otherwise. Treat "optional" as "defer, don't skip forever."

## Security testing scope (explicit in spec, do not treat as separate from functional testing)

Authentication requirements, authorization controls, protected-endpoint access, secret handling, input validation. Security ranks below correctness/data-integrity/reliability in the spec's own testing priority order — do not let that demotion become "security testing is optional." At minimum: every auth/authz code path and every endpoint accepting user input needs a negative test case.

## Pre-launch gate (non-negotiable, from spec)

Before any deploy that touches these, tests must pass: simulation calculations, core APIs, database migrations, historical data imports, authentication.

## Bug fixes

Every bug fix should include a regression test "whenever practical" (spec's own hedge) — in practice: always, unless the fix is a pure typo/copy change with zero logic surface.

## Do not

- Do not treat Playwright/E2E as permanently skippable — it's deferred, not excluded.
- Do not ship a Simulation Engine change (including a formula tweak) without updating/adding known-answer tests for the affected calculation.
- Do not let "coverage % has no enforcement mechanism yet" become an excuse to under-test — write to the target as if the gate exists, because it will.
