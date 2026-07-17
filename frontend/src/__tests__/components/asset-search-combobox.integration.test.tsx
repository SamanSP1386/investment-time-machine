import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AssetSearchCombobox } from '@/components/simulator/asset-search-combobox';
import { apiClient } from '@/lib/api/client';

/**
 * Full-chain integration coverage for the Simulator's asset search
 * (M7 Phase 3D-4 completion, founder gap 3 — the test-gap fix).
 *
 * The original 3D-4 browse-mode tests mocked `useAssetSearch` wholesale, so
 * they proved only that the COMPONENT asks the hook the right question —
 * never that the hook → `searchAssets` → axios params serialization →
 * `{success, data}` envelope unwrap chain actually answers it. A break
 * anywhere in that wiring (a renamed query param, a response-shape
 * mismatch, a lost `limit`) would have sailed through every existing test
 * while the live UI showed "No assets found." This file renders the REAL
 * component + REAL hook + REAL endpoint + REAL client and stubs only the
 * axios transport adapter, replaying the live backend's verbatim response
 * envelope (captured from `GET /api/v1/assets` against the seeded dev
 * database, 2026-07-16).
 */

/** Verbatim live envelope: GET /api/v1/assets?query=%25&limit=100 (the 10 yahoo_chart assets). */
const FULL_CATALOG_ENVELOPE = {
  success: true,
  data: {
    assets: [
      { symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', currency: 'USD' },
      { symbol: 'AMZN', name: 'Amazon.com, Inc.', asset_type: 'stock', currency: 'USD' },
      { symbol: 'BTC-USD', name: 'Bitcoin', asset_type: 'crypto', currency: 'USD' },
      { symbol: 'ETH-USD', name: 'Ethereum', asset_type: 'crypto', currency: 'USD' },
      { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', asset_type: 'stock', currency: 'USD' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', asset_type: 'stock', currency: 'USD' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', asset_type: 'stock', currency: 'USD' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', asset_type: 'etf', currency: 'USD' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', asset_type: 'etf', currency: 'USD' },
      { symbol: 'TSLA', name: 'Tesla, Inc.', asset_type: 'stock', currency: 'USD' },
    ],
    total: 10,
  },
};

/** Verbatim live envelope: GET /api/v1/assets?query=nvda (case-insensitive symbol match). */
const NVDA_ENVELOPE = {
  success: true,
  data: {
    assets: [{ symbol: 'NVDA', name: 'NVIDIA Corporation', asset_type: 'stock', currency: 'USD' }],
    total: 1,
  },
};

/** Verbatim live envelope shape: GET /api/v1/assets?query=nvidia (name match). */
const NVIDIA_NAME_ENVELOPE = NVDA_ENVELOPE;

let capturedRequests: Array<{ url: string | undefined; params: Record<string, unknown> | undefined }>;
let originalAdapter: AxiosRequestConfig['adapter'];

function stubTransport(respond: (params: Record<string, unknown> | undefined) => unknown) {
  apiClient.defaults.adapter = async (config) => {
    capturedRequests.push({ url: config.url, params: config.params as Record<string, unknown> | undefined });
    return {
      data: respond(config.params as Record<string, unknown> | undefined),
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    } as AxiosResponse;
  };
}

beforeEach(() => {
  capturedRequests = [];
  originalAdapter = apiClient.defaults.adapter;
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  vi.useRealTimers();
});

function renderCombobox() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<AssetSearchCombobox label="Asset" onChange={() => {}} />, { wrapper: Wrapper });
}

describe('AssetSearchCombobox — full-chain integration (component → hook → endpoint → axios → envelope)', () => {
  it('typing "nvda" (lowercase) sends query=nvda and renders the NVDA option from the live envelope shape', async () => {
    stubTransport((params) => (params?.query === 'nvda' ? NVDA_ENVELOPE : FULL_CATALOG_ENVELOPE));
    const user = userEvent.setup();
    renderCombobox();

    await user.type(screen.getByRole('combobox'), 'nvda');

    // Wait past the 300ms debounce for the real search request (the popup
    // shows browse-mode results, which also contain NVDA, until then).
    await waitFor(() => {
      expect(capturedRequests.some((r) => r.params?.query === 'nvda')).toBe(true);
    });
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(1);
    });
    expect(screen.getByRole('option', { name: /NVDA/ })).toHaveTextContent('NVIDIA Corporation');

    // The exact wire-level question asked of the backend, not the hook.
    const searchRequest = capturedRequests.find((r) => r.params?.query === 'nvda');
    expect(searchRequest?.url).toBe('/api/v1/assets');
  });

  it('searching by name ("nvidia") renders the symbol result — the endpoint matches name AND symbol', async () => {
    stubTransport((params) => (params?.query === 'nvidia' ? NVIDIA_NAME_ENVELOPE : FULL_CATALOG_ENVELOPE));
    const user = userEvent.setup();
    renderCombobox();

    await user.type(screen.getByRole('combobox'), 'nvidia');

    await waitFor(() => {
      expect(capturedRequests.some((r) => r.params?.query === 'nvidia')).toBe(true);
    });
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(1);
    });
    expect(screen.getByRole('option', { name: /NVDA/ })).toBeInTheDocument();
  });

  it('browse mode (focused empty field) requests the wildcard catalog and lists ALL 10 assets grouped Stocks → ETFs → Crypto', async () => {
    stubTransport(() => FULL_CATALOG_ENVELOPE);
    const user = userEvent.setup();
    renderCombobox();

    await user.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(10);
    });

    // The browse fetch really went out as ?query=%&limit=100 — the wildcard
    // the endpoint's own min_length=1 constraint requires.
    const browseRequest = capturedRequests.find((r) => r.params?.query === '%');
    expect(browseRequest).toBeDefined();
    expect(browseRequest?.params?.limit).toBe(100);

    // Grouped per spec, every catalog member present.
    const listbox = screen.getByRole('listbox');
    const text = listbox.textContent ?? '';
    for (const symbol of ['AAPL', 'AMZN', 'GOOGL', 'MSFT', 'NVDA', 'TSLA', 'QQQ', 'SPY', 'BTC-USD', 'ETH-USD']) {
      expect(text).toContain(symbol);
    }
    expect(text.indexOf('Stocks')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('Stocks')).toBeLessThan(text.indexOf('ETFs'));
    expect(text.indexOf('ETFs')).toBeLessThan(text.indexOf('Crypto'));
  });

  it('a genuinely empty result set renders the empty state, never a crash or a stuck spinner', async () => {
    stubTransport((params) =>
      params?.query === '%' ? FULL_CATALOG_ENVELOPE : { success: true, data: { assets: [], total: 0 } }
    );
    const user = userEvent.setup();
    renderCombobox();

    await user.type(screen.getByRole('combobox'), 'zzz');

    expect(await screen.findByText('No assets found')).toBeInTheDocument();
  });
});
