import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Vitest doesn't auto-run Testing Library's DOM cleanup between tests the
// way Jest's globals detection does — without this, renders from one test
// leak into the next within the same file.
afterEach(() => {
  cleanup();
});

// jsdom does not implement matchMedia; tests that care about a specific
// value override this per-test (see theme-provider.test.tsx).
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
}

// jsdom implements neither ResizeObserver nor real layout geometry — the
// Growth Chart's Recharts `ResponsiveContainer` (M7 Phase 3C-3) needs both
// to measure a non-zero size and render its SVG children at all under test.
// No test in this suite asserts on real pixel geometry, only on rendered
// content/structure, so a fixed, generous stub is sufficient everywhere.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof Element !== 'undefined') {
  Element.prototype.getBoundingClientRect = () =>
    ({ width: 600, height: 300, top: 0, left: 0, right: 600, bottom: 300, x: 0, y: 0, toJSON() {} }) as DOMRect;
}

