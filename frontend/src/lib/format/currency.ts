import { type DecimalString, groupDecimalString, roundDecimalString } from './decimal-string';

export interface FormatCurrencyOptions {
  /** Defaults to '$'. Passed through verbatim, never derived from anything computed. */
  currencySymbol?: string;
  /** Defaults to 2 — display precision, independent of the backend's NUMERIC(20,8) storage precision. */
  decimals?: number;
}

/**
 * Formats a backend-provided decimal string as currency for display —
 * grouping and rounding only, never a calculation. See src/lib/format/README.md.
 */
export function formatCurrency(value: DecimalString, options: FormatCurrencyOptions = {}): string {
  const { currencySymbol = '$', decimals = 2 } = options;
  const rounded = roundDecimalString(value, decimals);
  const grouped = groupDecimalString(rounded);
  const negative = grouped.startsWith('-');
  const unsigned = negative ? grouped.slice(1) : grouped;
  return negative ? `-${currencySymbol}${unsigned}` : `${currencySymbol}${unsigned}`;
}
