# M4 API Layer — Design Note

**Status: IMPLEMENTED (2026-07-10).** Originally produced as a pre-implementation design review; the founder approved five explicit decisions (auth posture, growth-chart placement, deferred-endpoint scope, field naming, asset exchange field) and implementation proceeded. This note is retained as the design record but no longer reflects an open review — see `docs/MILESTONE_REPORTS/M4_REPORT.md` for the as-built report and `docs/KNOWN_ISSUES.md` KI-021/022/023/024/025/026 for exactly how each open item resolved. **One drift from this note, since closed**: the audit-logging behavior described in §4 below for `POST /api/v1/simulations` was initially not implemented (KI-026, disclosed at M4's first report) and was fixed in a required follow-up pass (2026-07-10) before merge — see KI-026's resolution for the one deliberate deviation (no new `SIMULATION_FAILED` enum value; the existing `SIMULATION_CREATED` value is reused with outcome captured in `details`).

---

## Response envelope (from Founder Specification Part 3.3.14, verbatim for errors)

```json
// success
{"success": true, "data": {}}
// error
{"success": false, "error": {"code": "ERROR_CODE", "message": "Human-readable explanation", "request_id": "..."}}
```

`request_id` is an addition beyond the spec's literal example — included so a generic, safe user-facing message (required for 500-class errors) can still be correlated with detailed server-side logs on request, satisfying both Part 2.12.12 ("errors must be actionable") and general error-message-safety practice simultaneously.

## Standard error codes

| Code | HTTP Status | Raised when |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Pydantic request validation failure (malformed body, wrong types, missing required fields) |
| `INVALID_INVESTMENT_AMOUNT` | 422 | `app.simulation.exceptions.InvalidInvestmentAmountError` |
| `INVALID_DATE_RANGE` | 422 | `app.simulation.exceptions.InvalidDateRangeError` |
| `ASSET_NOT_FOUND` | 404 | `app.simulation.exceptions.AssetNotFoundError` |
| `MISSING_HISTORICAL_DATA` | 422 | `app.simulation.exceptions.MissingHistoricalDataError` |
| `CALCULATION_ERROR` | 500 | `app.simulation.exceptions.CalculationError` (generic message to client; full detail logged) |
| `SIMULATION_NOT_FOUND` | 404 | `GET /api/v1/simulations/{id}` — no such record |
| `FORBIDDEN` | 403 | Requesting a simulation owned by a different authenticated user |
| `UNAUTHORIZED` | 401 | Missing/invalid credentials on an auth-required endpoint (M5-gated) |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit middleware |
| `DATABASE_ERROR` | 500 | Unexpected DB-layer exception (generic message to client; full detail logged) |
| `INTERNAL_SERVER_ERROR` | 500 | Genuinely unclassified exception — the one place a boundary-level catch-all is appropriate (mirrors the documented exception already used at the Provider Layer boundary in `app/ingestion/providers/yfinance_provider.py`) |

## Endpoints

### 1. Health

**`GET /health`** *(already implemented, M0 — unversioned, matches Founder Specification Part 2.12.13's literal example)*
- Auth: none. Rate limit: none (health checks are conventionally exempt).
- Response: `{"success": true, "data": {"status": "healthy"}}`.
- No change proposed for M4.

### 2. Asset search and lookup

**`GET /api/v1/assets`**
- Purpose: asset search/discovery (Founder Specification 3.3.5, 3.1.10).
- Auth: none (public, read-only — Part 2.8.8).
- Query params: `query: str` (symbol/name partial match, required, non-empty per 3.3.5's validation rule), `asset_type: AssetType | None`, `limit: int = 20`, `offset: int = 0`.
- Response: `{"success": true, "data": {"assets": [AssetSummary...], "total": int}}`.
- No-results case: `200 OK` with an empty `assets` array (Founder Specification 3.3.5: "No Results Found → Display empty state" — not an error).
- Validation: empty `query` → `VALIDATION_ERROR` (422).
- Rate limit: not spec-mandated for this bucket; recommend a general default (see §Rate Limits below).
- Logging: request count/latency only (standard API monitoring, Part 2.12.5) — no audit log (read-only, no state change).

**`GET /api/v1/assets/{symbol}`**
- Purpose: asset details (Founder Specification 3.3.6).
- Auth: none.
- Response: `{"success": true, "data": {"symbol", "name", "asset_type", "currency", "data_source", "is_active"}}`. (No "exchange" field — not part of the M1 schema; flagged as an open item below.)
- Error: unknown symbol → `ASSET_NOT_FOUND` (404) (3.3.6: "Asset Missing → Asset unavailable").

### 3. Historical data availability

**`GET /api/v1/assets/{symbol}/availability`**
- Purpose: earliest/latest available `close_price` dates for an asset — lets the Simulator screen validate a date range *before* submitting a simulation that would otherwise fail with `MISSING_HISTORICAL_DATA` (supports the 3.3.2-named edge case "Asset delisted during period" and the Asset Explorer's "Historical overview" component, Part 3.1.10).
- Not an endpoint literally named in the Founder Specification (Part 2.9 gap) — inferred from the Asset Details "Historical availability" output field (3.3.6) and elevated to its own endpoint since the task scope lists it as a distinct category.
- Auth: none.
- Response: `{"success": true, "data": {"symbol", "earliest_date": "YYYY-MM-DD", "latest_date": "YYYY-MM-DD", "data_source"}}`.
- Error: unknown symbol or zero price rows → `ASSET_NOT_FOUND` (404).

### 4. Single-asset simulation

**`POST /api/v1/simulations`**
- Purpose: create and synchronously execute a historical investment simulation (Founder Specification 3.3.2, 3.2.5).
- Auth: **open question — see Compliance Report §7.** Provisional design: optional authentication. If a valid token is present, `user_id` is set; if absent, the simulation is created anonymously (`user_id = NULL`), matching Part 2.6.24's explicit "public simulator experience without requiring account creation" design decision. Flagged against Part 2.8.8's conflicting statement that "Create Simulation" is a "sensitive endpoint" that "should require authentication."
- Request body (field names match the Founder Specification's own vocabulary, Part 2.6.24/3.3.2 — mapped internally to the M1 schema's actual column names, see Compliance Report §7):
  ```json
  {
    "asset_symbol": "AAPL",
    "investment_amount": "1000.00",
    "start_date": "2015-01-01",
    "end_date": "2025-01-01",
    "include_dividends": false,
    "adjust_for_inflation": false
  }
  ```
- `investment_amount` serialized/accepted as a **string**, parsed to `Decimal` — never a JSON number (float precision risk).
- Response (`201 Created`, `Location: /api/v1/simulations/{id}`):
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "status": "completed",
      "asset_symbol": "AAPL",
      "investment_amount": "1000.00000000",
      "start_date": "2015-01-01",
      "end_date": "2025-01-01",
      "include_dividends": false,
      "adjust_for_inflation": false,
      "initial_price": "100.00000000",
      "final_price": "250.00000000",
      "shares_purchased": "10.00000000",
      "final_value": "2500.00000000",
      "total_return_percentage": "150.000000",
      "cagr_percentage": "9.596872",
      "inflation_adjusted_final_value": null,
      "disclosed_splits": [],
      "calculation_version": "v1",
      "created_at": "2026-07-10T12:00:00Z"
    }
  }
  ```
- **Growth chart data — implemented (2026-07-10).** `disclosed_splits`/`growth_series` are both present in the response above once populated by the Simulation Engine's `calculate_growth_series` (extended in M4, per the founder-approved decision to keep this calculation in the engine, not the API layer). **Retrieval-path gap**: since neither is persisted (no `simulations` columns exist for them), a subsequent `GET /api/v1/simulations/{id}` returns both as empty lists — tracked at KI-021, the founder's own approved fallback for exactly this case, approved for full resolution by Founder Decision 014 (implementation scheduled, not yet built as of M7 Phase 3B).
- **`calculation_version` — exposed (M7 Phase 3B, Founder Decision 014).** Was already stored on every `Simulation` row from the first migration (`app.models.simulation`) but not surfaced on `SimulationResponse` until now; a pure additive field, present on both `POST` and `GET` responses identically. Lets the Results screen's technical-details disclosure show which calculation model produced a given result.
- Error responses map 1:1 to `app.simulation.exceptions`: `ASSET_NOT_FOUND` (404), `INVALID_DATE_RANGE` (422), `INVALID_INVESTMENT_AMOUNT` (422), `MISSING_HISTORICAL_DATA` (422, includes the persisted failed `Simulation`'s `id` in the error response so the user/support can reference it), `CALCULATION_ERROR` (500, generic message only). Implemented in `app/api/v1/exception_handlers.py`.
- Rate limit: 60/min (Part 2.8.13, "Simulation Endpoints"). Implemented via `app/core/rate_limit.py` (Redis-backed fixed window, fails open on Redis outage).
- **Audit — implemented (KI-026, 2026-07-10 follow-up fix).** `app/api/v1/audit.py::record_simulation_audit`, called from `simulation_service.create_simulation`, writes an `audit_logs` row for every request, success or failure — plus a second function for the one case that never reaches the service layer at all (a Pydantic-level request validation failure). See KI-026's resolution for the one deliberate deviation from this note's literal text (no new `SIMULATION_FAILED` enum value).
- No business/financial logic in the route handler — verified: `app/api/v1/routers/simulations.py` only validates the request shape, calls the service layer (which calls `app.simulation.engine.run_simulation`), and maps the result/exception to the response envelope.

### 5. Simulation result retrieval

**`GET /api/v1/simulations/{id}`**
- Purpose: retrieve a previously-run simulation (Founder Specification 2.6.24's reproducibility policy, Results screen revisits, Part 3.2.11).
- Auth: conditional — if the stored simulation's `user_id` is `NULL` (anonymous), public read access is allowed; if `user_id` is set, only that authenticated user (or a future admin role) may read it (`FORBIDDEN` 403 otherwise). This access rule is an inference from Part 2.8.6 ("Standard User: View own history"), not an explicit spec mandate — flagged for confirmation. **Implemented (2026-07-10)**: `app/api/v1/services/simulation_service.py::get_simulation_by_id` enforces this exactly; since M4 has no authentication, `requesting_user_id` is always `None`, so in practice any simulation with a non-null `user_id` is forbidden to every caller today — the correct fail-closed default until M5 introduces real auth.
- Response: same shape as the `POST` response above, including `calculation_version` (M7 Phase 3B), except `disclosed_splits`/`growth_series` are always empty (KI-021 — neither is persisted; approved for full resolution by Founder Decision 014, not yet implemented).
- Error: no such `id` → `SIMULATION_NOT_FOUND` (404).

**`GET /api/v1/simulations`** *(Simulation History — Founder Specification 3.3.10)*
- Purpose: list the authenticated user's own past simulations.
- Auth: **required** — explicit in the spec ("Inputs: Authenticated user... Error: Unauthorized Access denied"). Since M4 excludes authentication implementation, **this endpoint cannot be meaningfully implemented until M5** — confirmed by founder decision, **not implemented in M4** (KI-023, resolved as deferred).
- Query params (for M5, documented now): `limit`, `offset`, `asset_symbol` (optional filter).
- Response: `{"success": true, "data": {"simulations": [...], "total": int}}`.

### 6. Import/report status (development/admin use)

**`GET /api/v1/admin/imports`** and **`POST /api/v1/admin/imports`**
- Purpose: list recent import audit records (reading `audit_logs` where `event_type` is `DATA_IMPORT_SUCCEEDED`/`DATA_IMPORT_FAILED`) and trigger a new import (wrapping the M2 `app.ingestion.orchestrator` functions) — matches the Administrator permission "Trigger data imports" / "Review audit logs" (Part 2.8.6) exactly.
- Auth: **Administrator role required.** Since M4 excludes authentication, **these routes cannot be safely exposed with real access control until M5** — designed here for contract completeness. Confirmed by founder decision, **not implemented in M4** (KI-023, resolved as deferred); no admin route exists anywhere in `app/api/v1/routers/`.
- Request body (`POST`): `{"kind": "prices" | "indicator", "symbol_or_code": "AAPL", "provider": "yfinance", "start_date": "...", "end_date": "...", "dry_run": false}`.
- Response: the M2 `ImportReport.to_dict()` shape, unchanged.

## Rate limit recommendations

| Bucket | Limit | Source |
|---|---|---|
| Simulation endpoints (`POST /api/v1/simulations`) | 60/min | Founder Specification 2.8.13 (explicit) |
| Auth endpoints (M5) | 10/min | Founder Specification 2.8.13 (explicit) |
| AI endpoints (future) | 20/min | Founder Specification 2.8.13 (explicit) |
| General read endpoints (asset search/details/availability, simulation retrieval) | 100/min (proposed) | **Not spec-mandated** — a reasonable default, not a requirement; revisit based on real usage |
| Admin endpoints | Same as auth bucket (10/min) proposed, pending M5 | Inferred, not spec-mandated |

Enforcement requires Redis (per `.claude/SYSTEM.md`/ADR-004: Redis was deliberately deferred until a milestone actually needs rate limiting — this is that milestone).

## Security review summary (full detail in the design review response)

- Public vs. authenticated: asset search/details/availability and (provisionally) simulation creation/retrieval-of-anonymous-results are public; simulation history requires auth; admin endpoints require the Administrator role. The latter two cannot be safely *implemented* (not just designed) until M5.
- Input validation: every request body validated via Pydantic before reaching a service; `investment_amount` accepted only as a string to avoid float precision loss; date fields validated as ISO 8601.
- Error message safety: 500-class errors return a generic message plus a `request_id`; full detail (stack trace, SQL, etc.) goes only to structured logs, never the response body.
- Audit logging: every simulation creation attempt (success or failure) is audited; admin actions (once M5 lands) must be audited per Part 2.8.14.
- Future auth compatibility: the response/error envelope, the `user_id`-conditional access rule on `GET /api/v1/simulations/{id}`, and the reserved `UNAUTHORIZED`/`FORBIDDEN` error codes are all designed to slot in cleanly once M5 exists, without an API contract change.
