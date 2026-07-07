# Financial Formatting Layer

The canonical, and only sanctioned, place the frontend formats a financial value for display. Every product screen (M7 Phase 2 onward) must import from `src/lib/format` rather than formatting a value inline in a component.

## The wire-format contract, stated plainly

This is the single fact everything else in this document follows from:

> **The API serializes every financial value as a string, specifically so its precision survives the trip to the browser exactly.** The frontend's job is to *format* that string for display. The frontend's job is never to *derive* one — not a return, not CAGR, not a final value, not a share count, not an inflation-adjusted figure, not any other number a human could compute from two or more fields. If a figure isn't already a field the API returned, this codebase has no business displaying it, because it would mean the frontend calculated it. A missing or `null` financial field is rendered as an honest, explicit statement of *why* it's missing (`formatNullableCurrency`/`formatNullablePercentage`, reason-coded `'not_requested'` vs. `'unavailable'`) — never guessed at, never silently shown as zero or blank space.

This is the frontend-specific instance of `.claude/CODING_STANDARDS.md`'s platform-wide rule ("the frontend is presentation-only: it must never calculate returns, CAGR, dividend reinvestment, or inflation adjustment") and of Founder Specification Principle 3/4 (financial truth has exactly one source: the Simulation Engine). Every section below is a mechanism enforcing this one sentence, not a separate rule.

## What this module IS allowed to do

- Round an already-correct value to a *display* precision (e.g. show `NUMERIC(20,8)` storage precision as 2 decimals for currency).
- Group digits with thousands separators.
- Attach a currency symbol, a percent sign, or an explicit `+`/`−` sign.
- Render a date or date range in one fixed, locale-independent format.
- Render an explicit, reason-coded placeholder for a `null` financial field (`formatNullableCurrency`/`formatNullablePercentage`) — never a blank space, never a bare `"0"`.

## What this module is NOT allowed to do, ever

- Compute a return, CAGR, inflation adjustment, dividend contribution, or any other derived financial metric. If a number isn't already a field the API returned, this module has no business producing it.
- Combine two `DecimalString` values (add, subtract, multiply, divide, compare) for any reason, including "just for display."
- Convert a `DecimalString` to a JS `number` at all — no `Number(...)`, `parseFloat(...)`, `parseInt(...)`, or unary `+`. Every function in `decimal-string.ts` operates on the string's characters directly.

## How this supports "the frontend never calculates financial values"

`.claude/CODING_STANDARDS.md` states the rule; this module is the concrete mechanism that makes it hard to violate by accident:

1. **The `DecimalString` branded type** (`decimal-string.ts`) marks every backend-sourced financial field as "not a plain string" at the type level (see `src/types/api.ts`), so a component can't absent-mindedly pass one through a generic string-formatting helper that might coerce it to a number.
2. **A lint rule** (`eslint.config.mjs`, ADR-029) bans `Number(`, `parseFloat(`, `parseInt(`, and unary `+` numeric coercion in `src/app/**` and `src/components/**` — the two places product code and UI live — so even a well-intentioned "quick calculation in a component" fails the lint step before it ships, rather than relying on code review alone.
3. **A static-analysis test** (`src/__tests__/lib/format.test.ts`) scans this module's own source text for the same banned tokens, proving the formatters practice what the lint rule preaches, not just that the rule exists elsewhere.

## Why string-based rounding instead of `Intl.NumberFormat`

`Intl.NumberFormat`/`toLocaleString` are the conventional way to format a number, but they require a JS `number` as input — converting a `NUMERIC(20,8)` decimal string to a `number` first is exactly the precision-loss risk this module exists to avoid, even though for typical dollar amounts within JS's safe integer range the practical risk is small. `roundDecimalString`/`groupDecimalString` (`decimal-string.ts`) implement the equivalent behavior (round-half-up, thousands separators) by operating on the string's digit characters directly, so the guarantee holds unconditionally rather than "usually."
