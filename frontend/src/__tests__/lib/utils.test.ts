import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges conditional class names', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('resolves conflicting Tailwind utilities in favor of the last one', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('ignores null and undefined', () => {
    expect(cn('a', null, undefined, 'b')).toBe('a b');
  });
});
