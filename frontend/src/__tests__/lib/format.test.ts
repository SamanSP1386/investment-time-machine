import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { asDecimalString, groupDecimalString, roundDecimalString } from '@/lib/format/decimal-string';
import { compareDecimalStrings } from '@/lib/format/compare-decimal-string';
import { formatCurrency } from '@/lib/format/currency';
import { formatPercentage } from '@/lib/format/percentage';
import { formatDate, formatDateRange } from '@/lib/format/date';
import { formatNullableCurrency, formatNullablePercentage } from '@/lib/format/nullable';

describe('roundDecimalString', () => {
  it('rounds half-up on the digit string, not via float', () => {
    expect(roundDecimalString(asDecimalString('1.005'), 2)).toBe('1.01');
    expect(roundDecimalString(asDecimalString('1.004'), 2)).toBe('1.00');
  });

  it('propagates a rounding carry through multiple 9s', () => {
    expect(roundDecimalString(asDecimalString('99.995'), 2)).toBe('100.00');
    expect(roundDecimalString(asDecimalString('9.999'), 2)).toBe('10.00');
  });

  it('preserves exact precision for values far beyond Number.MAX_SAFE_INTEGER', () => {
    // 12,345,678,901,234,567,890.12345678 cannot round-trip through a JS
    // number without silent precision loss — this must still round correctly.
    expect(roundDecimalString(asDecimalString('12345678901234567890.126'), 2)).toBe(
      '12345678901234567890.13'
    );
  });

  it('handles negative values, including rounding to exactly zero', () => {
    expect(roundDecimalString(asDecimalString('-1.005'), 2)).toBe('-1.01');
    expect(roundDecimalString(asDecimalString('-0.001'), 2)).toBe('0.00');
  });

  it('handles a value with no fractional part', () => {
    expect(roundDecimalString(asDecimalString('1000'), 2)).toBe('1000.00');
  });
});

describe('groupDecimalString', () => {
  it('inserts thousands separators', () => {
    expect(groupDecimalString(asDecimalString('1000000.00'))).toBe('1,000,000.00');
    expect(groupDecimalString(asDecimalString('-2500.50'))).toBe('-2,500.50');
    expect(groupDecimalString(asDecimalString('999.99'))).toBe('999.99');
  });
});

describe('formatCurrency', () => {
  it('formats a typical positive amount', () => {
    expect(formatCurrency(asDecimalString('2500.00000000'))).toBe('$2,500.00');
  });

  it('formats a negative amount with the sign before the symbol', () => {
    expect(formatCurrency(asDecimalString('-1000.5'))).toBe('-$1,000.50');
  });

  it('respects a custom currency symbol', () => {
    expect(formatCurrency(asDecimalString('100'), { currencySymbol: '€' })).toBe('€100.00');
  });
});

describe('formatPercentage', () => {
  it('always signs a positive value explicitly with +', () => {
    expect(formatPercentage(asDecimalString('150.000000'))).toBe('+150.00%');
  });

  it('signs a negative value with the U+2212 minus sign, not a hyphen', () => {
    const result = formatPercentage(asDecimalString('-40.000000'));
    expect(result).toBe('−40.00%');
    expect(result).not.toContain('-');
  });

  it('signs exact zero as positive, for consistency', () => {
    expect(formatPercentage(asDecimalString('0'))).toBe('+0.00%');
  });
});

describe('formatDate / formatDateRange', () => {
  it('formats an ISO calendar date without a local-timezone off-by-one', () => {
    expect(formatDate('2025-01-01')).toBe('Jan 1, 2025');
    expect(formatDate('2015-12-31')).toBe('Dec 31, 2015');
  });

  it('formats a range with an en dash', () => {
    expect(formatDateRange('2015-01-01', '2025-01-01')).toBe('Jan 1, 2015 – Jan 1, 2025');
  });
});

describe('nullable formatters', () => {
  it('formats a real value when not null', () => {
    expect(formatNullableCurrency(asDecimalString('500.00'), 'unavailable')).toBe('$500.00');
    expect(formatNullablePercentage(asDecimalString('5.00'), 'unavailable')).toBe('+5.00%');
  });

  it('distinguishes "not requested" from "unavailable" for the same null value', () => {
    expect(formatNullableCurrency(null, 'not_requested')).toBe('Not requested');
    expect(formatNullableCurrency(null, 'unavailable')).toBe('Not available');
    expect(formatNullablePercentage(null, 'not_requested')).toBe('Not requested');
    expect(formatNullablePercentage(null, 'unavailable')).toBe('Not available');
  });
});

describe('compareDecimalStrings', () => {
  it('orders positive values by magnitude, not lexicographically', () => {
    expect(compareDecimalStrings(asDecimalString('9'), asDecimalString('10'))).toBe(-1);
    expect(compareDecimalStrings(asDecimalString('10'), asDecimalString('9'))).toBe(1);
  });

  it('treats equal values (including differing trailing zeros) as equal', () => {
    expect(compareDecimalStrings(asDecimalString('100.00'), asDecimalString('100'))).toBe(0);
    expect(compareDecimalStrings(asDecimalString('2500.5'), asDecimalString('2500.50'))).toBe(0);
  });

  it('handles negative values correctly, including magnitude inversion', () => {
    expect(compareDecimalStrings(asDecimalString('-5'), asDecimalString('-10'))).toBe(1);
    expect(compareDecimalStrings(asDecimalString('-10'), asDecimalString('-5'))).toBe(-1);
    expect(compareDecimalStrings(asDecimalString('-1'), asDecimalString('1'))).toBe(-1);
  });

  it('treats signed zero as equal regardless of sign', () => {
    expect(compareDecimalStrings(asDecimalString('-0.00'), asDecimalString('0'))).toBe(0);
    expect(compareDecimalStrings(asDecimalString('0'), asDecimalString('-5'))).toBe(1);
  });

  it('compares fractional-only differences correctly', () => {
    expect(compareDecimalStrings(asDecimalString('1.5'), asDecimalString('1.499'))).toBe(1);
    expect(compareDecimalStrings(asDecimalString('1.49'), asDecimalString('1.5'))).toBe(-1);
  });

  it('preserves ordering for values far beyond Number.MAX_SAFE_INTEGER', () => {
    expect(
      compareDecimalStrings(
        asDecimalString('12345678901234567890.13'),
        asDecimalString('12345678901234567890.12')
      )
    ).toBe(1);
  });
});

describe('guardrail: the format module never touches numeric coercion', () => {
  const formatDir = join(dirname(fileURLToPath(import.meta.url)), '../../lib/format');
  const sourceFiles = readdirSync(formatDir).filter((f) => f.endsWith('.ts'));

  it('scanned at least the expected formatter modules', () => {
    expect(sourceFiles).toEqual(
      expect.arrayContaining([
        'currency.ts',
        'percentage.ts',
        'date.ts',
        'nullable.ts',
        'decimal-string.ts',
        'compare-decimal-string.ts',
      ])
    );
  });

  it.each(sourceFiles)('%s never calls Number()/parseFloat()/parseInt()', (file) => {
    const source = readFileSync(join(formatDir, file), 'utf-8');
    // Strip comments first — this file's own JSDoc intentionally quotes
    // "Number(...)" etc. as documentation of what NOT to do, which would
    // otherwise trip this same scan as a false positive.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/\bNumber\s*\(/);
    expect(code).not.toMatch(/\bparseFloat\s*\(/);
    expect(code).not.toMatch(/\bparseInt\s*\(/);
  });
});
