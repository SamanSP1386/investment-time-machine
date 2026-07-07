/**
 * The branded type every backend-sourced financial figure carries, and the
 * one place in the entire frontend allowed to touch its digits. Every
 * function in this file operates on the decimal string's characters
 * directly — there is no `Number(...)`, `parseFloat(...)`, `parseInt(...)`,
 * or unary `+` anywhere in this module, on purpose (see
 * src/lib/format/README.md and ADR-029). A JS `number` cannot exactly
 * represent an arbitrary `NUMERIC(20,8)` value; converting one, even only
 * for display, reopens exactly the precision-loss risk
 * `.claude/CODING_STANDARDS.md`'s "financial data types" section rules out
 * for the backend, on the one boundary the backend cannot enforce for us.
 */

declare const decimalStringBrand: unique symbol;

/** A Decimal-serialized financial figure exactly as the backend returned it. */
export type DecimalString = string & { readonly [decimalStringBrand]: true };

/**
 * The one, single place a raw API string becomes a `DecimalString` — call
 * this only where response data is received (src/types/api.ts's shape is
 * already declared with this type; this helper exists for tests and any
 * future runtime boundary, e.g. a WebSocket payload).
 */
export function asDecimalString(value: string): DecimalString {
  return value as DecimalString;
}

export interface DecimalParts {
  negative: boolean;
  integerPart: string;
  fractionalPart: string;
}

/** Exported for compare-decimal-string.ts — the one other module allowed to operate on a DecimalString's raw digit parts. */
export function splitDecimal(value: DecimalString): DecimalParts {
  const trimmed = value.trim();
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [integerPart, fractionalPart = ''] = unsigned.split('.');
  return { negative, integerPart: integerPart || '0', fractionalPart };
}

/**
 * Rounds a decimal string to `decimals` places using round-half-up on the
 * digit characters themselves — no float conversion anywhere. This is a
 * *display* rounding only (e.g. showing `NUMERIC(20,8)` storage precision
 * as 2 decimals for currency); it never changes which value is considered
 * financially correct — that rounding already happened once, authoritatively,
 * in the Simulation Engine (`docs/simulation_formulas.md` §4,
 * `ROUND_HALF_EVEN` at storage time).
 */
export function roundDecimalString(value: DecimalString, decimals: number): DecimalString {
  const { negative, integerPart, fractionalPart } = splitDecimal(value);
  const padded = fractionalPart.padEnd(decimals + 1, '0');
  const kept = padded.slice(0, decimals);
  const roundUp = padded.charCodeAt(decimals) - 48 >= 5;

  const digits = `${integerPart}${kept}`.split('').map((char) => char.charCodeAt(0) - 48);
  if (roundUp) {
    let i = digits.length - 1;
    while (i >= 0) {
      digits[i] += 1;
      if (digits[i] < 10) break;
      digits[i] = 0;
      i -= 1;
    }
    if (i < 0) digits.unshift(1);
  }

  const digitString = digits.join('');
  const integerLength = digitString.length - decimals;
  const newIntegerPart = digitString.slice(0, integerLength) || '0';
  const newFractionalPart = digitString.slice(integerLength);
  const magnitude = decimals > 0 ? `${newIntegerPart}.${newFractionalPart}` : newIntegerPart;
  const isZero = /^0(\.0+)?$/.test(magnitude);

  return asDecimalString(negative && !isZero ? `-${magnitude}` : magnitude);
}

/** Inserts thousands separators into an already-rounded, signed decimal string. */
export function groupDecimalString(value: DecimalString): string {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [integerPart, fractionalPart] = unsigned.split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const withFraction = fractionalPart !== undefined ? `${grouped}.${fractionalPart}` : grouped;
  return negative ? `-${withFraction}` : withFraction;
}

export function isNegativeDecimalString(value: DecimalString): boolean {
  return value.trim().startsWith('-');
}
