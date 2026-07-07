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

