# Simulation Engine — Financial Calculation Design Note

**Status: IMPLEMENTED (M3).** Approved as architecture via [Founder Decision 001](FOUNDER_DECISIONS.md) and [ADR-015](ARCHITECTURE_DECISIONS.md), and now implemented in `backend/app/simulation/` with 36 tests (formula known-answer, precision, DB-integration known-answer, determinism, error-handling, split-disclosure), all passing. One correction was made during implementation to §2 (dividends-disabled behavior) — see the note inline.

Grounded directly in the Founder Specification — see the compliance report accompanying Founder Decision 001 for section-by-section citations, including the three places the specification's own text recommends `adjusted_close_price` as the MVP default (Parts 2.6.7, 2.6.20, 2.6.22) that this design deliberately departs from, with founder approval.

---

## 1. Which price column is used

**`close_price`**, never `adjusted_close_price`, for every calculation that determines shares, value, or return.

`adjusted_close_price` **is preserved in the schema and continues to be ingested** (no M1 schema change), and is surfaced in results/reports as a cross-check value ("a standard adjusted-close calculation would show X — our explicit calculation shows Y"). It is never read by the Simulation Engine's core formulas. This is a hard boundary, not a preference: `adjusted_close_price` bundles an opaque, provider-defined dividend-reinvestment assumption into a single number, which is exactly what this design moves away from in favor of an auditable, explicit, event-by-event calculation — directly serving Founder Specification Part 2.14.19's "Full auditability" and "Structured error handling" as approved Simulation Engine decisions.

## 2. How dividends are handled

Raw `close_price` (Yahoo/yfinance convention) is **never dividend-adjusted** — dividends must be modeled explicitly, exactly once, via the `dividends` table, matching Founder Specification Part 2.14.10's five-step dividend reinvestment sequence (retrieve → calculate cash → purchase shares → update count → continue) and Part 2.6.21's "Simulation Usage" section verbatim.

Algorithm when `dividends_reinvested = true` (walking the simulation's date range in chronological order):

1. `shares_held` starts at `initial_investment_amount / close_price(start_date)` (Decimal division).
2. For each `dividends` row with `ex_dividend_date` in `(start_date, end_date]`, in date order:
   - `cash_dividend = shares_held × dividend_amount` (the per-share amount from the `dividends` table, at the share count held *at that point in the simulation timeline* — not the starting share count, so later dividends compound on earlier reinvestments).
   - `additional_shares = cash_dividend / close_price(ex_dividend_date)`; `shares_held += additional_shares`.
3. At `end_date`: `final_value = shares_held × close_price(end_date)`.

**Corrected from an earlier draft of this note**: when `dividends_reinvested = false`, dividend events are not retrieved or processed *at all* — not even tracked as uninvested cash. Founder Specification Part 2.14.10 ("When disabled") and Part 3.3.3 are explicit: "Ignore dividend events. Use price appreciation only." There is no third "collect as cash but don't reinvest" mode in the specification; the engine implements exactly the two modes it describes. `shares_held` in that case simply equals `initial_investment_amount / close_price(start_date)` throughout, unchanged by any dividend.

Fractional shares are assumed (standard for a DRIP-style reinvestment model and for an educational simulation platform) — this modeling assumption is stated explicitly since the Founder Specification does not address share fractionality directly.

**Out of M3 scope**: a distinct, persisted "Dividend Contribution" metric (Founder Specification Part 3.5.11) is not implemented — the M1 `simulations` schema reserves no column for it, and it is not among the M3-required outputs. The underlying per-event `cash_dividend` values are computable from the same reinvestment loop if a future milestone needs to expose this metric.

Fractional shares are assumed (standard for a DRIP-style reinvestment model and for an educational simulation platform) — this modeling assumption is stated explicitly since the Founder Specification does not address share fractionality directly.

## 3. How splits are handled

**Splits are not applied as a share-count multiplier in M3's core calculation** — approved as Founder Decision 001, and consistent with the Founder Specification's own stated rationale in Part 2.6.22 ("adjusted prices already account for most split events... this prevents double-adjustment errors") and Part 2.6.7 ("simulation engine shall primarily use adjusted close prices while retaining split data for auditability").

Reasoning: Yahoo/yfinance's raw `Close` (what we store as `close_price`) is retroactively split-adjusted across its entire historical series as of the date it was fetched — standard practice for essentially all price data vendors, since an un-adjusted historical series would show a nonsensical price discontinuity on every split date with no corresponding change in company value. Volume is inversely adjusted the same way. Only dividends are excluded from this adjustment.

Since one ingestion call (`YFinanceProvider.fetch_prices`) retrieves an entire date range in a single request, every `close_price` value returned in that call shares the same split-adjustment basis — internally consistent across the whole range. Given that, computing `shares = amount / close_price(start_date)` and later `final_value = shares × close_price(end_date)` using prices from the same fetch already produces the economically correct result across any split that occurred in between, with no separate multiplication needed. **Applying our own `split_ratio` multiplication to `shares_held` on top of this would double-adjust.**

`stock_splits` rows are retained and used in M3 for **disclosure and audit context only** (e.g., "a 4-for-1 split occurred on this date" surfaced alongside the simulation result) — not as an input to the growth/CAGR formulas. This matches the Founder Specification's own description of the table's MVP purpose (Part 2.6.22: "exists primarily for: auditability, transparency, future advanced simulations, corporate action analysis").

**Residual risk, named explicitly rather than hidden:** the split-consistency argument above only holds *within a single fetch*. If `historical_prices` rows for a date range were imported *before* a subsequent split occurred, and are never re-imported afterward, those older rows will not reflect the retroactive adjustment a fresh fetch would apply — they become stale relative to the provider's current view of history. Our ingestion pipeline's idempotent upsert (`ON CONFLICT DO NOTHING`) means a stale row is never automatically overwritten by a later import covering the same dates. This is an ingestion/reimport-policy gap, not something the Simulation Engine can correct after the fact — tracked under "Deferred" (§6), mitigated operationally (re-import full history for an asset whenever a new split is detected in `stock_splits`), not by a Simulation Engine change.

**Verification requirement, not yet satisfied**: this design depends on an empirical fact about yfinance/Yahoo data behavior that has not yet been verified against live data in this codebase (no network access was available when this note was drafted). M3's test suite must include a known-answer test against a real historical stock split (e.g., a well-documented split with published pre/post prices) confirming raw `close_price` is indeed already split-consistent across that boundary, **before this assumption is treated as load-bearing in production.** See §6 and the Design Review testing challenges.

## 4. How CAGR is calculated

```
years = Decimal(end_date - start_date).days / Decimal("365.25")
total_return_ratio = final_value / initial_investment_amount
cagr = total_return_ratio ** (Decimal(1) / years) - Decimal(1)
```

Matches Founder Specification Part 2.14.9 / Part 3.5.4 exactly: `CAGR = (final_value / investment_amount) ^ (1/years) - 1`.

- Day-count convention: **365.25 days/year** (average, leap-year-inclusive) — the Founder Specification's formula does not define a day-count convention, so this is a documented, explicit implementation choice, not a spec requirement. More precise conventions (actual/actual, 30/360) are deferred (§6).
- All arithmetic in `decimal.Decimal`, including the fractional exponent — Python's `decimal` module supports non-integer `Decimal ** Decimal` directly (correctly-rounded power, per the General Decimal Arithmetic spec), so no `float` conversion is needed anywhere in this formula, satisfying Part 2.14.9's "preserve intermediate precision" requirement.
- **Precision and rounding (new, from Design Review)**: all calculations run inside a scoped `decimal.localcontext()` with explicit precision (`prec=38`, well above the 28-digit default) so intermediate results (especially repeated dividend-reinvestment division across long holding periods) don't silently lose precision — scoped locally so it never leaks into unrelated code. Final values are rounded to match column precision (`NUMERIC(20,8)` for currency, `NUMERIC(10,6)` for percentages) using `ROUND_HALF_EVEN` (banker's rounding — the `decimal` module default, chosen to avoid systematic upward bias across many rounding operations), applied once at the point of storage, never mid-calculation.
- `total_return_ratio` is always `>= 0` (share prices and share counts are both validated non-negative at ingestion — a stored `close_price` is always `> 0`, so `shares_held` can never be undefined via division by zero, and `final_value` can never be negative). A total-loss scenario (`final_value = 0`) yields `cagr = -1` (-100%), which is mathematically correct and requires no special-case handling.
- `years <= 0` (invalid or same-day range) is rejected as a functional-requirements-level input validation concern before the engine runs (Founder Specification Part 3.3.2: "End date must be after start date"), not handled inside this formula.

## 5. How inflation adjustment is calculated

```
real_value = final_value × (cpi_at_start / cpi_at_end)
```

Serves Founder Specification Part 2.14.11 (nominal vs. real return) and Part 3.5.10 (Inflation-Adjusted Return).

- `cpi_at_start` / `cpi_at_end`: the most recent CPI observation (from `economic_indicator_values`, indicator `CPIAUCSL` or equivalent) **on or before** the given date — an "as-of" lookup against real, observed values only, never an interpolated one. This resolves the granularity mismatch between daily prices and monthly CPI readings without fabricating a value that was never actually reported.
- If no CPI observation exists on or before the requested date (a real data gap), `inflation_adjusted_final_value` is left `NULL` rather than silently defaulting to "no inflation" — matching the Founder Specification's own error condition for this case (Part 3.3.4: "Missing CPI Data → Inflation adjustment unavailable") and already how the M1 schema models it (the column is nullable).
- True interpolation between CPI readings is deferred (§6).

## 6. What is deferred

| Item | Why deferred | Minimal M3 behavior instead |
|---|---|---|
| Incremental-reimport-safe split handling | Requires a genuine corporate-actions-aware price reconstruction robust to staggered/incremental re-imports — real complexity beyond a single milestone; explicitly named by the founder as a future "Advanced Corporate Actions Engine" | Rely on single-fetch split consistency (§3); `stock_splits` used for disclosure only; staleness risk named explicitly, mitigated operationally (re-import after a detected new split) |
| Empirical verification of split-consistency assumption | No network access was available when this note was drafted | Must be verified via known-answer test against a real historical split before M3 is considered production-ready (blocking, not optional) |
| Trading-day resolution for start/end dates that aren't trading days | Requires a trading calendar or a documented convention not yet specified anywhere in the Founder Specification | M3 requires an exact `close_price` row for both `start_date` and `end_date`; absence produces the spec's own "Missing Historical Data → Simulation blocked" error (Part 3.3.2) rather than silently substituting a nearby date |
| CPI interpolation between monthly readings | Interpolating invents values never actually observed | As-of/most-recent-observation lookup (§5) |
| Non-USD dividend/price currency conversion | No FX rate ingestion exists yet | M3 assumes single-currency (USD) simulations only; `dividends.currency` is stored but not converted |
| Corporate actions beyond splits/dividends (spin-offs, mergers, special one-time distributions) | No schema exists for these (M1 only has `stock_splits`/`dividends`); explicitly deferred to a future Advanced Corporate Actions Engine per Founder Decision 001 | Not modeled at all in M3 |
| Advanced analytics (volatility, Sharpe, Sortino, drawdown, rolling returns) | Already scoped out of the Simulation Engine into a dedicated future milestone (ADR-007) | Unaffected by this note; reiterated here since it's adjacent to "what reads `close_price`" |
| Day-count convention refinement (actual/actual, 30/360) | Diminishing returns for an educational platform's stated precision needs | Fixed 365.25 divisor (§4), explicitly stated |

## 7. How this avoids double-counting

- **Dividends**: counted exactly once, via the explicit per-event loop over `dividends` (§2). `adjusted_close_price` — which would implicitly bake in its own dividend-reinvestment assumption — is never read by this calculation path, so there is no second, hidden dividend effect competing with the explicit one.
- **Splits**: the engine does not apply its own share-count multiplication for split events, because the `close_price` series retrieved in a single ingestion call is already internally consistent for splits across that range (§3) — multiplying by `split_ratio` on top would be a redundant second adjustment. `stock_splits` is read for disclosure only, never as a math input, in M3.
- **Decimal throughout**: every value entering these formulas is a SQLAlchemy `NUMERIC`-backed `Decimal` already (M1 schema); no `float` conversion occurs anywhere in the calculation path, including the fractional-exponent CAGR step; a scoped high-precision context plus a single, explicit, final rounding step (§4) prevents precision loss from silently compounding into a double-counting-shaped bug over long holding periods.

---

See `docs/MILESTONE_REPORTS/` (M3 report, once written) and the Design Review accompanying Founder Decision 001 for remaining open concerns (trading-day policy, known-answer test coverage, precision/rounding conventions) that must be resolved during M3 implementation, not before it.
