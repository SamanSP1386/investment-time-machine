import { afterEach, describe, expect, it } from 'vitest';
import { isBackForwardNavigation } from '@/lib/navigation-history';

/**
 * M7 Phase 3D-6 (page transitions) — `isBackForwardNavigation` backs the
 * "back/forward must not replay entrance choreography" rule. jsdom does not
 * implement the Navigation API at all (`window.navigation` is undefined by
 * default), which exercises the feature-detect fallback path directly —
 * the same path a real Safari/Firefox visitor takes today.
 */
describe('isBackForwardNavigation', () => {
  afterEach(() => {
    // @ts-expect-error -- test-only cleanup of a property this suite defines below.
    delete window.navigation;
  });

  it('returns false when the Navigation API is unavailable (jsdom default, matches Safari/Firefox today)', () => {
    expect('navigation' in window).toBe(false);
    expect(isBackForwardNavigation()).toBe(false);
  });

  it('returns true when the current document was reached via a "traverse" (back/forward) navigation', () => {
    Object.defineProperty(window, 'navigation', {
      value: { activation: { navigationType: 'traverse' } },
      configurable: true,
    });
    expect(isBackForwardNavigation()).toBe(true);
  });

  it('returns false for an ordinary forward ("push") navigation', () => {
    Object.defineProperty(window, 'navigation', {
      value: { activation: { navigationType: 'push' } },
      configurable: true,
    });
    expect(isBackForwardNavigation()).toBe(false);
  });

  it('returns false when the Navigation API exists but reports no activation yet', () => {
    Object.defineProperty(window, 'navigation', { value: {}, configurable: true });
    expect(isBackForwardNavigation()).toBe(false);
  });
});
