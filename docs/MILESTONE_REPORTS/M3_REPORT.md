# Milestone 3 Report — Simulation Engine

**Date**: 2026-07-09
**Version**: 0.4.0
**Status**: Complete, pending review

Self-contained — readable from the repository alone (`.claude/`, `docs/`, `backend/`), without needing prior conversation context.

---

## Objective

Implement the Simulation Engine — the platform's "sole source of financial truth" (Founder Specification Part 2.14.2) — per Founder Decision 001: `close_price` as the primary calculation input, `adjusted_close_price` preserved for audit/comparison only, dividends applied explicitly exactly once, `stock_splits` used for disclosure only in MVP, `Decimal` precision throughout (`prec=38`, `ROUND_HALF_EVEN`), exact-date historical data requirements, and controlled error handling. No API endpoints, no frontend, no portfolio simulation, no advanced analytics beyond the six MVP-required calculations (growth, total return, CAGR, dividend reinvestment, inflation adjustment, error handling).

## Deliverables

- Five focused modules (`app/simulation/`): exceptions, precision, pure formulas, read-only repository, orchestrating engine.
- 36 new tests (18 pure-math/precision, 18 DB-integration), all passing against a live Postgres instance.
- A corrected design note (`docs/simulation_formulas.md`) — one imprecision in the dividends-disabled behavior was caught and fixed before it became a code bug.
- A concrete, actionable manual verification runbook for KI-016 (the one substantive open risk carried into this milestone).
- This report, plus updates to all seven Documentation Policy journals.

## Simulation Formulas Implemented

All cited to exact Founder Specification sections (full detail in `docs/simulation_formulas.md`):

| Formula | Founder Specification | Implementation |
|---|---|---|
| Shares purchased | 2.14.7 | `shares = investment_amount / close_price(start_date)` |
| Final value | 2.14.7 | `final_value = shares_held × close_price(end_date)` |
| Total return % | 2.14.8 / 3.5.3 | `((final_value - investment_amount) / investment_amount) × 100` |
| CAGR | 2.14.9 / 3.5.4 | `(final_value / investment_amount) ^ (1/years) - 1`, years = days/365.25 |
| Dividend reinvestment | 2.14.10 / 2.6.21 | Per-event loop: `cash = shares_held × amount`; `shares_held += cash / close_price(ex_date)`, in chronological order |
| Inflation adjustment | 2.14.11 / 3.5.10 | `final_value × (cpi_at_start / cpi_at_end)`, as-of (never interpolated) CPI lookup |

**Not implemented in M3 (explicit scope boundary, tracked as KI-020)**: Dividend Contribution as a distinct, persisted metric — the underlying per-event cash-dividend values are computable from the reinvestment loop, but no schema column exists for it and it is not among M3's required outputs.

## Tests Added

- **18 pure-math/precision tests** (`test_formulas.py`, `test_precision.py`) — no database required, run anywhere. Several reproduce the Founder Specification's own worked examples verbatim (2.14.7: $1,000 → 10 shares → $2,500; 2.14.11: $10,000 nominal → $7,900 real). CAGR is cross-checked against Python's `math` module — an independent code path from `decimal` — rather than re-deriving the same formula under test.
- **18 DB-integration tests** (transaction-isolated, rolled back per test, run against a live Postgres instance): full known-answer scenarios through the real engine and database, the documented error-handling asymmetry (pre-flight errors persist nothing; mid-simulation errors persist a failed `Simulation` row), determinism (identical inputs against identical stored data produce byte-identical output across repeated runs), and split-disclosure behavior (splits surfaced but never multiply share counts).

## Known-Answer Test Results

**All 36 simulation tests passed** against a live Postgres instance (Docker Desktop was not running at the start of this session; started directly and `docker compose up -d postgres` brought the database up). Full project suite: **129/129 passing**. Notable results:
- `test_basic_growth_matches_founder_spec_2_14_7_example`: exact match to the specification's own $1,000/$100/$250/$2,500 example.
- `test_adjusted_close_price_is_never_read_even_when_wildly_different`: a stored `adjusted_close_price` deliberately set to produce a wildly different result was confirmed **not** to affect the calculation — direct proof of Founder Decision 001's core requirement, not just a documentation claim.
- `test_inflation_adjustment_matches_founder_spec_2_14_11_example`: exact match to the specification's own $10,000 → $7,900 example.
- `test_dividend_reinvestment_two_events_known_answer` / `test_split_ratio_never_multiplies_share_count`: hand-traced multi-step scenarios confirmed exactly.
- `test_engine_determinism.py` (2 tests): identical inputs produced byte-identical Decimal output across every field, run 3 times in the more complex (dividends + inflation) case.

## Security Review

- The Simulation Engine has no external network calls and no user-facing endpoint yet (M4) — it reads only already-validated, already-stored data (Founder Specification 2.14.6).
- `adjusted_close_price` is structurally never read — verified by a dedicated test that would fail loudly if a future change introduced a read, not just documented.
- All queries are parameterized SQLAlchemy Core/ORM constructs — no injection vector via `symbol` or any other input.
- Every controlled error is explicit and named (Founder Specification 2.14.14) — no bare `except Exception` anywhere in the engine.
- Full findings in `docs/SECURITY_LOG.md`.

## Technical Debt1


| ID | Item | Status |
|---|---|---|
| KI-016 | Split-consistency assumption (raw `close_price` already split-adjusted) unverified against live data | Code behavior verified; live-data empirical claim open, with a concrete manual runbook documented |
| KI-020 | Dividend Contribution metric not exposed | Deferred — explicit scope boundary, not an oversight |

KI-017 (trading-day resolution policy) and KI-018 (precision/rounding convention) were opened during the design review and are **resolved** by this implementation.

## Documentation Updates

`docs/simulation_formulas.md` (corrected + marked IMPLEMENTED), `docs/KNOWN_ISSUES.md` (KI-016 updated with runbook, KI-017/018 resolved, KI-019/020 added), `docs/DEVLOG.md`, `docs/CHANGELOG.md`, `docs/SECURITY_LOG.md`, `docs/TESTING_REPORT.md`, `docs/PERFORMANCE_LOG.md`, this report.

## Production Readiness

**6/10.** The engine is correct against every known-answer test available, fully deterministic, and precisely scoped — but carries one unverified empirical dependency (KI-016) that should be closed with live data before production use, and has no caller yet since the API layer doesn't exist until M4.

## Recommended Next Milestone

**M4 — API Layer**, per the milestone plan — the Simulation Engine needs a caller. Before or during that milestone, execute the KI-016 manual verification runbook in an environment with network access.
