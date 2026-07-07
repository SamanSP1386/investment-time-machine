import { formatCurrency, type FormatCurrencyOptions } from './currency';
import { formatPercentage } from './percentage';
import type { DecimalString } from './decimal-string';

/**
 * Resolves the dual-meaning-null problem flagged in
 * `docs/frontend_design_system.md` §14 risk 7: `null` on a field like
 * `inflation_adjusted_final_value` means either "not requested" (the user
 * didn't ask for inflation adjustment) or "unavailable" (a real CPI data
 * gap) — two different facts that must never collapse into the same
 * blank space or a misleading zero. Every caller of the nullable
 * formatters below must pass an explicit reason; there is no default,
 * on purpose.
 */
export type UnavailableReason = 'not_requested' | 'unavailable';

const REASON_TEXT: Record<UnavailableReason, string> = {
  not_requested: 'Not requested',
  unavailable: 'Not available',
};

export function formatNullableCurrency(
  value: DecimalString | null,
  reason: UnavailableReason,
  options?: FormatCurrencyOptions
): string {
  if (value === null) return REASON_TEXT[reason];
  return formatCurrency(value, options);
}

export function formatNullablePercentage(
  value: DecimalString | null,
  reason: UnavailableReason,
  decimals?: number
): string {
  if (value === null) return REASON_TEXT[reason];
  return formatPercentage(value, decimals);
}
