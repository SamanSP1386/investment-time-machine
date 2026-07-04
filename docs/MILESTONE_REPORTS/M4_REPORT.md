# Milestone 4 Report — API Layer

**Date**: 2026-07-10
**Version**: 0.5.0
**Status**: Complete, approved with one follow-up fix applied (KI-026, 2026-07-10 — see addendum at the end of this report)

Self-contained — readable from the repository alone (`.claude/`, `docs/`, `backend/`), without needing prior conversation context.

---

## Objective

Give the Simulation Engine (M3) its first real caller: a public HTTP API for asset search/lookup and single-asset simulation creation/retrieval, per five founder-approved decisions from the M4 design review — (1) `POST /api/v1/simulations` public for MVP, rate-limited instead of authenticated; (2) the Growth Chart output belongs in the Simulation Engine, not the route handler; (3) Simulation History and Admin Import may be designed but not implemented (deferred to M5); (4) the external API contract uses Founder Specification vocabulary (`include_dividends`, `adjust_for_inflation`), decoupled from internal names; (5) the asset `exchange` field returns `null`, non-blocking. No authentication, no frontend, no AI, no portfolio simulation, no admin routes.

## Deliverables

- `app/api/v1/` — schemas, services, routers, dependencies, and exception handlers implementing five endpoints across two resource families (assets, simulations).
- A Simulation Engine extension (`calculate_growth_series`) satisfying Founder Specification Part 3.3.2's "Growth Chart" requirement, built and tested *before* any route code, so "no financial calculation logic in the API layer" is structurally true, not just documented.
- Redis-backed fixed-window rate limiting (`app/core/rate_limit.py`), the founder-approved substitute for authentication on the public simulation-creation endpoint.
- 26 new tests (155 total project-wide), all passing against live Postgres and Redis instances.
- ADR-016, this report, and updates to all seven Documentation Policy journals.
- One honestly disclosed implementation gap (KI-026): the design note's audit-logging requirement for simulation creation was not built.

## Endpoint Summary

| Method | Path | Purpose | Auth | Rate Limit |
|---|---|---|---|---|
| GET | `/api/v1/assets` | Search assets by symbol/name | None | 100/min |
| GET | `/api/v1/assets/{symbol}` | Asset details (`exchange` always `null`, KI-025) | None | 100/min |
| GET | `/api/v1/assets/{symbol}/availability` | Earliest/latest stored price date | None | 100/min |
| POST | `/api/v1/simulations` | Create and synchronously run a simulation | None (public, anonymous — KI-022) | 60/min |
| GET | `/api/v1/simulations/{id}` | Retrieve a simulation (`growth_series`/`disclosed_splits` empty — KI-021) | Conditional (fail-closed; no auth exists yet) | 100/min |

Not implemented (designed only, `docs/api_design.md` §5–6, per founder decision — KI-023): `GET /api/v1/simulations` (Simulation History), `GET`/`POST /api/v1/admin/imports`.

## Request/Response Schemas

`POST /api/v1/simulations` request (`SimulationCreateRequest`):
```json
{
  "asset_symbol": "AAPL",
  "investment_amount": "1000.00",
  "start_date": "2020-01-02",
  "end_date": "2021-01-04",
  "include_dividends": false,
  "adjust_for_inflation": false
}
```

Response (`201 Created`, `Location: /api/v1/simulations/{id}`, envelope-wrapped `SimulationResponse`):
```json
{
  "success": true,
  "data": {
    "id": "uuid", "status": "completed", "asset_symbol": "AAPL",
    "investment_amount": "1000.00000000", "start_date": "2020-01-02", "end_date": "2021-01-04",
    "include_dividends": false, "adjust_for_inflation": false,
    "initial_price": "100.00000000", "final_price": "120.00000000",
    "shares_purchased": "10.00000000", "final_value": "1200.00000000",
    "total_return_percentage": "20.000000", "cagr_percentage": "...",
    "inflation_adjusted_final_value": null,
    "disclosed_splits": [], "growth_series": [{"point_date": "2020-01-02", "value": "1000.00000000"}, "..."],
    "error_message": null, "created_at": "2026-07-10T..."
  }
}
```

Error envelope (uniform across every endpoint):
```json
{"success": false, "error": {"code": "ASSET_NOT_FOUND", "message": "Asset not found: 'NOSUCH'", "request_id": "...", "simulation_id": null}}
```
`simulation_id` is populated only for `MISSING_HISTORICAL_DATA`/`CALCULATION_ERROR`, referencing the failed `Simulation` row the engine already persisted (Founder Specification Part 2.6.24).

Every `Decimal` field serializes as a fixed-point string (`DecimalStr`, `app/api/v1/schemas/common.py`) — never a JSON number — so no client-side float round-trip can lose precision.

## Tests Added

26 new tests: 5 pure-formula `calculate_growth_series` tests plus 1 DB-integration engine test (`tests/simulation/`); 4 Redis-backed `RateLimiter` unit tests (`tests/core/test_rate_limit.py`, including a real fail-open-on-unreachable-Redis case); 7 asset-endpoint and 9 simulation-endpoint integration tests (`tests/api/`, FastAPI `TestClient` against the real database via `join_transaction_mode="create_savepoint"`-bound sessions — see ADR-016). Every named exception type has direct test coverage except `ForbiddenError` (untestable until M5 — no authenticated caller exists to trigger it) and the generic `Exception` catch-all (deliberately not artificially triggered). Full detail in `docs/TESTING_REPORT.md`'s M4 entry.

## Security Review

- Rate limiting (60/min creation, 100/min reads), not authentication, is the control on the public simulation-creation endpoint — an explicit founder decision (KI-022), not an oversight.
- Every named exception maps to a reviewed status/code; 500-class responses return a generic message plus a `request_id`, full detail logged server-side only.
- `get_db_session` never auto-commits/rolls-back; the service layer explicitly owns the transaction boundary per exception type, preserving Founder Specification Part 2.6.24's failed-simulation-persistence guarantee against silent destruction by a would-be framework default.
- No admin or auth-requiring route is implemented or exposed.
- **Gap**: the design note's audit-logging requirement for simulation creation is not implemented (KI-026) — open, not silently dropped.
- Full findings in `docs/SECURITY_LOG.md`.

## Founder Specification Compliance Report

| Decision | Status |
|---|---|
| 1. Public/anonymous simulation creation, rate-limited | Implemented exactly as approved |
| 2. Growth Chart computed in the Simulation Engine | Implemented (`calculate_growth_series`); persistence gap documented (KI-021) |
| 3. Simulation History / Admin Import designed, not implemented | Confirmed — neither route exists in code |
| 4. External field names use Founder Specification vocabulary | Implemented (`include_dividends`/`adjust_for_inflation`, mapped at the service boundary) |
| 5. Asset `exchange` returns `null`, non-blocking | Implemented |
| Design note's audit-logging requirement | **Not implemented — KI-026, disclosed** |

## Documentation Updates

`docs/api_design.md` (marked implemented, growth-chart/audit-logging status corrected), `docs/KNOWN_ISSUES.md` (KI-021 resolved with a documented remaining gap, KI-022/023/024 resolved per founder decision, KI-025/026 added), `docs/ARCHITECTURE_DECISIONS.md` (ADR-016), `docs/DEVLOG.md`, `docs/CHANGELOG.md` (`[0.5.0]`), `docs/SECURITY_LOG.md`, `docs/TESTING_REPORT.md`, `docs/PERFORMANCE_LOG.md`, this report.

## Technical Debt

| ID | Item | Status |
|---|---|---|
| KI-026 | Audit-logging requirement (design note §4) not implemented for simulation creation | Open — genuine gap, not a scope cut |
| KI-021 | `growth_series`/`disclosed_splits` not persisted; empty on retrieval-after-creation | Resolved with documented remaining gap (founder-approved fallback) |
| KI-025 | Asset `exchange` field returns `null` (no M1 column) | Open, non-blocking, founder-acknowledged |
| KI-016 | (carried from M3) split-consistency assumption unverified against live data | Open — now more urgent, since a real caller exists |

## Production Readiness Score

**6/10.** The declared M4 scope is functionally complete, cleanly layered (router → service → engine/repository), and fully tested against real Postgres and Redis instances. Held back from a higher score by: KI-026 (an undisclosed-until-now implementation gap against the approved design), no load/concurrency testing, and KI-016 carried forward from M3 as an unresolved, increasingly relevant risk now that a real caller exists.

## Recommended Next Milestone

**M5 — Authentication.** It directly unblocks two endpoint families already designed in `docs/api_design.md` (Simulation History, Admin Import) and resolves the conditional-access logic on `GET /api/v1/simulations/{id}` from "always forbidden for non-null `user_id`" to something meaningful. Before or alongside M5: execute M3's KI-016 manual verification runbook, since it becomes more consequential once real users and real auth exist.

---

## Addendum — KI-026 Follow-Up Fix (2026-07-10)

M4 was approved pending resolution of KI-026 before merge. Fixed: `app/api/v1/audit.py` now writes one `audit_logs` row per `POST /api/v1/simulations` attempt (success, every pre-flight and mid-simulation error, and — best-effort — Pydantic-level request validation failures), wired into `simulation_service.create_simulation` and the `RequestValidationError` handler. The write is SAVEPOINT-isolated and fails safe (logs and swallows `SQLAlchemyError`) so it can never turn a correct response into a 500. One deliberate, disclosed deviation from the original design note: no new `SIMULATION_FAILED` enum value was added (a schema migration judged out of scope); the existing `SIMULATION_CREATED` value is reused, with `details.status`/`details.error_code` (JSONB) carrying the outcome. Verified by 4 new tests (`tests/api/test_simulation_audit.py`) covering success, `AssetNotFoundError`, `MissingHistoricalDataError`, and the Pydantic-validation-failure path. Full project suite: 159/159 passing. `docs/KNOWN_ISSUES.md` KI-026 is now **Resolved**. Updated Technical Debt: KI-026 row above is superseded by this addendum — treat it as resolved, not open. **Production Readiness Score revised to 7/10** (up from 6/10) — the one previously-disclosed gap is closed; KI-016 (carried from M3) remains the platform's highest-priority open item. Full detail in `docs/DEVLOG.md`'s M4 Follow-Up entry and `docs/SECURITY_LOG.md`'s corresponding entry.
