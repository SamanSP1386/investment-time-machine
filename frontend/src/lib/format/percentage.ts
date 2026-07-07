import { type DecimalString, roundDecimalString } from './decimal-string';

/** U+2212 MINUS SIGN — BRAND_CONSTITUTION.md §6/§10 uses this, not a hyphen, for negative figures. */
const MINUS_SIGN = '−';

/**
 * Formats a backend-provided percentage decimal string for display, always
 * signed explicitly (BRAND_CONSTITUTION.md §10: "always signed explicitly
 * (+9.2% / −3.1%) — the sign is a correctness signal, not a style choice").
 * Rounding/grouping only, never a calculation.
 */
export function formatPercentage(value: DecimalString, decimals = 2): string {
  const rounded = roundDecimalString(value, decimals);
  const negative = rounded.startsWith('-');
  const magnitude = negative ? rounded.slice(1) : rounded;
  const sign = negative ? MINUS_SIGN : '+';
  return `${sign}${magnitude}%`;
}
