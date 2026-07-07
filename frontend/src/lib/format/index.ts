/**
 * The canonical, and only sanctioned, place the frontend formats a
 * financial value for display. Every product screen (M7 Phase 2 onward)
 * must import from here rather than formatting inline. See ./README.md
 * for the full contract (what this module may and may not do) and ADR-029
 * for the lint rule that helps enforce it.
 */

export type { DecimalString } from './decimal-string';
export { asDecimalString, groupDecimalString, roundDecimalString } from './decimal-string';
export { compareDecimalStrings } from './compare-decimal-string';
export { formatCurrency, type FormatCurrencyOptions } from './currency';
export { formatPercentage } from './percentage';
export { formatDate, formatDateRange } from './date';
export { formatNullableCurrency, formatNullablePercentage, type UnavailableReason } from './nullable';
