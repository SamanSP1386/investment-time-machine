/**
 * The one sanctioned way to order two `DecimalString` values (e.g. sorting a
 * table column, deciding whether to show a positive/negative badge). Like
 * every other function in this directory, it operates on the string's digit
 * characters directly — no `Number(...)`/`parseFloat(...)`/`parseInt(...)`
 * or unary `+` anywhere (see decimal-string.ts, README.md, and ADR-033).
 * Comparing is an ordering operation, not a derived value, so it belongs
 * alongside rounding/grouping as a sanctioned display/UI concern — it must
 * never be used to compute a difference or any other new financial figure.
 */

import type { DecimalString } from './decimal-string';
import { splitDecimal } from './decimal-string';

function stripLeadingZeros(digits: string): string {
  const stripped = digits.replace(/^0+(?=\d)/, '');
  return stripped.length > 0 ? stripped : '0';
}

function isZeroMagnitude(integerPart: string, fractionalPart: string): boolean {
  return /^0*$/.test(integerPart) && /^0*$/.test(fractionalPart);
}

function compareMagnitude(
  aIntegerPart: string,
  aFractionalPart: string,
  bIntegerPart: string,
  bFractionalPart: string
): -1 | 0 | 1 {
  const aInt = stripLeadingZeros(aIntegerPart);
  const bInt = stripLeadingZeros(bIntegerPart);

  if (aInt.length !== bInt.length) {
    return aInt.length > bInt.length ? 1 : -1;
  }
  if (aInt !== bInt) {
    return aInt > bInt ? 1 : -1;
  }

  const fracLength = aFractionalPart.length > bFractionalPart.length ? aFractionalPart.length : bFractionalPart.length;
  const aFrac = aFractionalPart.padEnd(fracLength, '0');
  const bFrac = bFractionalPart.padEnd(fracLength, '0');
  if (aFrac === bFrac) return 0;
  return aFrac > bFrac ? 1 : -1;
}

/**
 * Returns -1 if `a` < `b`, 0 if equal in value, 1 if `a` > `b` — ordinary
 * `Array.prototype.sort` comparator semantics. `-0`/`0`/`-0.00` etc. all
 * compare equal to each other regardless of sign, matching how a real
 * Decimal library treats signed zero.
 */
export function compareDecimalStrings(a: DecimalString, b: DecimalString): -1 | 0 | 1 {
  const partsA = splitDecimal(a);
  const partsB = splitDecimal(b);

  const aIsZero = isZeroMagnitude(partsA.integerPart, partsA.fractionalPart);
  const bIsZero = isZeroMagnitude(partsB.integerPart, partsB.fractionalPart);
  if (aIsZero && bIsZero) return 0;

  if (partsA.negative !== partsB.negative) {
    return partsA.negative ? -1 : 1;
  }

  const magnitudeCompare = compareMagnitude(
    partsA.integerPart,
    partsA.fractionalPart,
    partsB.integerPart,
    partsB.fractionalPart
  );
  if (magnitudeCompare === 0) return 0;
  // Both negative: the larger magnitude is the smaller (more negative) value.
  return partsA.negative ? (magnitudeCompare === 1 ? -1 : 1) : magnitudeCompare;
}
