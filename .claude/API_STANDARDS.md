# API_STANDARDS.md

**Note**: Founder Specification Part 2.9 — API Architecture was never written (confirmed gap — see [SYSTEM.md](SYSTEM.md)). Everything in this file below the "From the spec" line is a conservative, minimal-invention filler derived from adjacent sections (Part 2.15 Frontend, Part 3.3 Functional Requirements, Part 3.9 Engineering Standards), not an approved founder decision. Treat it as provisional and get founder sign-off at or before the API milestone.

## From the spec (binding)

- FastAPI, `APIRouter` per resource, versioned routes: `/api/v1/...`.
- Business logic never lives in route handlers — handlers validate input, call the service layer, return a response.
- Pydantic v2 models for all request/response schemas; never serialize ORM models directly.
- OpenAPI documentation is auto-generated and is one of the required MVP documentation deliverables.
- Response envelope (mandatory, all endpoints):
  ```json
  {"success": true, "data": {}}
  {"success": false, "error": {"code": "ERROR_CODE", "message": "Human-readable description"}}
  ```
- Rate limiting starting points (spec labels these "recommended," not final): simulation endpoints 60/min, auth endpoints 10/min, AI explanation endpoints 20/min. No enforcement mechanism was specified — implement via middleware backed by Redis; this is an implementation decision, not a redesign.
- Performance targets (Part 3.4 NFRs): asset search <250ms, historical data/auth/simulation-creation <500ms, single simulation <2s, comparison <3s, AI explanation <15s. See [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md).

## Provisional (flag for founder approval, do not treat as settled)

- **Endpoint grouping**: `/api/v1/assets`, `/api/v1/simulations`, `/api/v1/explanations`, `/api/v1/auth` — inferred from the six MVP frontend screens (Home, Simulator, Asset Explorer, Results, Reports, Account) and the Functional Requirements feature list, not stated verbatim anywhere.
- **Pagination**: cursor or offset/limit on list endpoints (asset search, simulation history) — not specified in the source spec at all.
- **CORS policy**: not specified; frontend origin(s) must be explicitly allow-listed via `CORS_ALLOWED_ORIGINS` env var (named in Part 2.11 but never given concrete values).
- **Auth transport**: JWT is implied (a `JWT_SECRET` env var is named in Part 2.8) but token storage (httpOnly cookie vs. `localStorage`), expiry, and refresh/revocation behavior are never specified anywhere in the 408-page document. **This is a real security gap, not a stylistic choice — resolve it explicitly before building the Auth milestone** (httpOnly, `SameSite=strict` cookies are the safer default given the frontend is same-origin-deployable via Vercel + a custom domain).

## Do not

- Do not add endpoints for anything in the MVP exclusion list (portfolios, watchlists, trading, recommendations, social, tax/retirement planning) — see [MVP_RULES.md](MVP_RULES.md).
- Do not let the AI explanation endpoint call anything other than the Simulation Engine's stored output — no live provider calls, no raw DB access from the AI service (see [SECURITY_POLICY.md](SECURITY_POLICY.md)).
