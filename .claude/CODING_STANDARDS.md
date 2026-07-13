# CODING_STANDARDS.md

See [SYSTEM.md](SYSTEM.md) for the full architectural context. These are the mandatory implementation rules from Founder Specification Parts 3.8–3.9.

## Tooling (enforced from the first commit, not deferred with CI/CD)

- **ruff** — linting.
- **black** — formatting.
- **pytest** — the only test runner.
- **pre-commit** — runs ruff, black, and a secret scan (gitleaks) on every commit, mirroring the CI checks locally so failures are caught before push, not after.

## Core Configuration Layer

Every backend service is built on a small, shared foundation — this exists before ingestion, the Simulation Engine, or any feature code:

- **Settings management**: a single `Settings` class (pydantic-settings) reads all configuration from environment variables. No module reads `os.environ` directly outside this layer.
- **Environment loading**: `.env` for local dev only, never committed (see `.env.example`); provider-native env vars in staging/production.
- **Logging**: structured (JSON-capable) logging configured once at startup, used everywhere via the standard `logging` module — no `print()` in application code.
- **Dependency injection**: FastAPI `Depends` is the only DI mechanism — services and DB sessions are injected into route handlers, never imported and instantiated ad hoc inside a handler.
- **App configuration**: app metadata (name, version), CORS origins, and environment name all flow from `Settings`, not hardcoded literals scattered through the codebase.

## Backend

- Python 3.12+. Type hints on every function signature, including explicit return types.
- FastAPI with `APIRouter` per resource; routes live under `/api/v1/...` (version the API from day one).
- Route handlers are thin: `validate input → call service layer → return response`. **No business/financial logic in route handlers.** Ever.
- SQLAlchemy 2.0 declarative models for persistence. Pydantic v2 models for request/response schemas — never expose ORM models directly over the API.
- Alembic is the only way schema changes happen. No manual DDL, no direct production schema edits, ever (see [DATABASE_RULES.md](DATABASE_RULES.md)).
- Small functions, descriptive names (`calculate_cagr()`, not `calc()`), docstrings on every public interface. Avoid single-letter variables, deep nesting, and hidden side effects.
- No dependency substitutions (no Django/Flask/MongoDB/Marshmallow) without a documented, approved exception.

## Response contract (all API endpoints)

```json
// success
{"success": true, "data": {}}
// error
{"success": false, "error": {"code": "ERROR_CODE", "message": "Human-readable description"}}
```

## Simulation Engine — highest-risk component, extra rules

- Deterministic and reproducible: identical inputs + identical stored data + identical logic version → identical output, always.
- Every formula must be explicit and testable in isolation (known-answer tests — see [TESTING_GUIDELINES.md](TESTING_GUIDELINES.md)).
- Must never import/call the AI service, never query a live market data provider, never generate or estimate a price.
- Financial values: `NUMERIC(20,8)` end-to-end (see below). Never `float`/`Decimal`-to-`float` conversions in the calculation path — floating-point drift is a correctness bug here, not a style nit.
- No hidden calculations: every number the engine emits must be traceable to a stored input plus an explicit formula.

## Financial data types (backend and DB, no exceptions)

- Currency values: `NUMERIC(20,8)`.
- Percentages unbounded by compounding (e.g. `total_return_percentage`/`cagr_percentage`): `NUMERIC(14,6)` — widened from `NUMERIC(10,6)` by KI-050, whose ~100x ceiling a real long-horizon return exceeded. See `docs/simulation_formulas.md` §4b.
- Ratios bounded by their own real-world magnitude (e.g. `stock_splits.split_ratio`): `NUMERIC(10,6)` remains correct.
- `float` / `REAL` / `DOUBLE PRECISION` are **prohibited** anywhere a financial value is stored, computed, or serialized.

## Frontend

- Next.js + TypeScript + Tailwind + Recharts. React state + Context API for MVP state management — do not introduce Redux/Zustand until complexity genuinely requires it (get approval first).
- The frontend is presentation-only: it must never calculate returns, CAGR, dividend reinvestment, or inflation adjustment, and must never query the database directly. It only calls the versioned API.
- No frontend work begins until the backend foundation (DB → ingestion → Simulation Engine → API) is stable, per [MVP_RULES.md](MVP_RULES.md).

## Documentation-as-code

Whoever changes a system updates its docs in the same change (schema docs, API docs, deployment docs). A feature is not "done" if its documentation is stale — see [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md) Definition of Done.

## When the spec is silent

If you must fill a gap the Founder Specification doesn't cover (e.g. Part 2.9 API Architecture, which was never written), pick the most conservative, reversible option, mark it clearly in code comments/PR description as "spec gap — provisional," and flag it for founder sign-off rather than treating it as settled architecture.
