import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetSearchCombobox, sortAssetsForBrowseMode } from '@/components/simulator/asset-search-combobox';
import { ApiError } from '@/lib/api/errors';

const useAssetSearchMock = vi.fn();
vi.mock('@/hooks/use-asset-search', () => ({
  useAssetSearch: (...args: unknown[]) => useAssetSearchMock(...args),
}));

const AAPL = { symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock' as const, currency: 'USD' };
const MSFT = { symbol: 'MSFT', name: 'Microsoft Corp.', asset_type: 'stock' as const, currency: 'USD' };
const BTC = { symbol: 'BTC-USD', name: 'Bitcoin', asset_type: 'crypto' as const, currency: 'USD' };
const SPY = { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', asset_type: 'etf' as const, currency: 'USD' };
const DEMO_KO = { symbol: 'KO', name: 'DEMO — The Coca-Cola Company', asset_type: 'stock' as const, currency: 'USD' };

// Call-history isolation between tests — a negative assertion below (item 1's
// "does not open browse mode..." test) checks `useAssetSearchMock`'s call
// history, which otherwise leaks across tests in this file (no other test
// here previously needed a negative assertion, so this gap was latent).
beforeEach(() => {
  useAssetSearchMock.mockClear();
});

describe('AssetSearchCombobox', () => {
  it('debounces typing before querying, then opens the listbox with results', async () => {
    useAssetSearchMock.mockReturnValue({ data: { assets: [AAPL, MSFT], total: 2 }, isFetching: false, error: undefined });
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<AssetSearchCombobox label="Asset" onChange={onChange} />);
    await user.type(screen.getByRole('combobox', { name: 'Asset' }), 'AA');

    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    expect(screen.getByRole('option', { name: /AAPL/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /MSFT/ })).toBeInTheDocument();
  });

  it('selects an option via keyboard (ArrowDown + Enter) and reports it via onChange', async () => {
    useAssetSearchMock.mockReturnValue({ data: { assets: [AAPL, MSFT], total: 2 }, isFetching: false, error: undefined });
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<AssetSearchCombobox label="Asset" onChange={onChange} />);
    const input = screen.getByRole('combobox', { name: 'Asset' });
    await user.type(input, 'A');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledWith(AAPL);
    expect(input).toHaveValue('AAPL — Apple Inc.');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clears the selection and re-opens search when the user types again', async () => {
    useAssetSearchMock.mockReturnValue({ data: { assets: [AAPL], total: 1 }, isFetching: false, error: undefined });
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<AssetSearchCombobox label="Asset" onChange={onChange} />);
    const input = screen.getByRole('combobox', { name: 'Asset' });
    await user.type(input, 'A');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(AAPL);

    await user.type(input, 'X');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('shows an informative empty state for a genuine zero-result search, not a blank area', async () => {
    useAssetSearchMock.mockReturnValue({ data: { assets: [], total: 0 }, isFetching: false, error: undefined });
    const user = userEvent.setup();

    render(<AssetSearchCombobox label="Asset" onChange={vi.fn()} />);
    await user.type(screen.getByRole('combobox', { name: 'Asset' }), 'ZZZZ');

    await waitFor(() => expect(screen.getByText('No assets found')).toBeInTheDocument());
    // Independently awaited (item 1's browse-vs-filtered copy is keyed off
    // the debounced query, not the raw keystroke) — asserting synchronously
    // right after the first `waitFor` can observe a transient render still
    // mid-debounce, where the popup is still showing browse mode's own
    // empty-state copy for the not-yet-committed query.
    await waitFor(() => expect(screen.getByText('Try a different symbol or name.')).toBeInTheDocument());
  });

  it('shows the central error copy for a search failure, never a raw error message', async () => {
    useAssetSearchMock.mockReturnValue({
      data: undefined,
      isFetching: false,
      error: new ApiError({ code: 'RATE_LIMIT_EXCEEDED', message: 'internal detail' }),
    });
    const user = userEvent.setup();

    render(<AssetSearchCombobox label="Asset" onChange={vi.fn()} />);
    await user.type(screen.getByRole('combobox', { name: 'Asset' }), 'AA');

    await waitFor(() => expect(screen.getByText('You’ve reached the limit for now. Please try again shortly.')).toBeInTheDocument());
  });

  it('reflects an externally-set `value` (e.g. an example-chip preset) into the visible text', () => {
    useAssetSearchMock.mockReturnValue({ data: undefined, isFetching: false, error: undefined });
    const { rerender } = render(<AssetSearchCombobox label="Asset" onChange={vi.fn()} value={null} />);

    const input = screen.getByRole('combobox', { name: 'Asset' });
    expect(input).toHaveValue('');

    rerender(<AssetSearchCombobox label="Asset" onChange={vi.fn()} value={AAPL} />);
    expect(input).toHaveValue('AAPL — Apple Inc.');
  });

  it('is fully keyboard operable: Escape closes the open listbox', async () => {
    useAssetSearchMock.mockReturnValue({ data: { assets: [AAPL], total: 1 }, isFetching: false, error: undefined });
    const user = userEvent.setup();

    render(<AssetSearchCombobox label="Asset" onChange={vi.fn()} />);
    await user.type(screen.getByRole('combobox', { name: 'Asset' }), 'A');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('AssetSearchCombobox — browse mode (M7 Phase 3D-4, item 1)', () => {
  it('opens the full catalog, grouped by type, on focusing the empty field — never an empty popup', async () => {
    useAssetSearchMock.mockReturnValue({
      data: { assets: [AAPL, BTC, SPY], total: 3 },
      isFetching: false,
      error: undefined,
    });
    const user = userEvent.setup();

    render(<AssetSearchCombobox label="Asset" onChange={vi.fn()} />);
    await user.click(screen.getByRole('combobox', { name: 'Asset' }));

    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    expect(screen.getByRole('option', { name: /AAPL/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /BTC-USD/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /SPY/ })).toBeInTheDocument();
    // Grouped: Stocks/ETFs/Crypto headers, present as inert text in the listbox.
    expect(screen.getByText('Stocks')).toBeInTheDocument();
    expect(screen.getByText('ETFs')).toBeInTheDocument();
    expect(screen.getByText('Crypto')).toBeInTheDocument();
  });

  it('fetched the browse-mode catalog with the non-empty wildcard query the endpoint requires (min_length=1)', async () => {
    useAssetSearchMock.mockReturnValue({ data: { assets: [AAPL], total: 1 }, isFetching: false, error: undefined });
    const user = userEvent.setup();

    render(<AssetSearchCombobox label="Asset" onChange={vi.fn()} />);
    await user.click(screen.getByRole('combobox', { name: 'Asset' }));

    await waitFor(() =>
      expect(useAssetSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({ query: '%', limit: 100 }),
        expect.objectContaining({ enabled: true })
      )
    );
  });

  it('lists demo assets last within their group, ordered stock/etf/crypto, alphabetical otherwise', () => {
    const shuffled = [DEMO_KO, SPY, BTC, MSFT, AAPL];
    const grouped = sortAssetsForBrowseMode(shuffled);
    expect(grouped.map((a) => a.symbol)).toEqual(['AAPL', 'MSFT', 'KO', 'SPY', 'BTC-USD']);
  });

  it('switches back to filtered (non-grouped) results the moment the user types', async () => {
    useAssetSearchMock.mockReturnValue({ data: { assets: [AAPL, MSFT], total: 2 }, isFetching: false, error: undefined });
    const user = userEvent.setup();

    render(<AssetSearchCombobox label="Asset" onChange={vi.fn()} />);
    const input = screen.getByRole('combobox', { name: 'Asset' });
    await user.click(input);
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.type(input, 'AA');

    await waitFor(() =>
      expect(useAssetSearchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: 'AA' }),
        expect.objectContaining({ enabled: true })
      )
    );
    // Typing narrows to a flat, ungrouped list — no group headers once filtering.
    expect(screen.queryByText('Stocks')).not.toBeInTheDocument();
  });

  it('does not open browse mode when focusing a field that already carries a selected value', async () => {
    useAssetSearchMock.mockReturnValue({ data: undefined, isFetching: false, error: undefined });
    // Matches the existing "reflects an externally-set value" test's own
    // pattern: the combobox only picks up an external `value` prop on a
    // CHANGE (via `rerender`), not on its very first mount — a pre-existing
    // component behavior, unrelated to item 1, that this test relies on
    // rather than re-litigates.
    const { rerender } = render(<AssetSearchCombobox label="Asset" onChange={vi.fn()} value={null} />);
    rerender(<AssetSearchCombobox label="Asset" onChange={vi.fn()} value={AAPL} />);

    const input = screen.getByRole('combobox', { name: 'Asset' });
    expect(input).toHaveValue('AAPL — Apple Inc.');

    // Let the 300ms debounce actually settle to the prefilled text first —
    // matches a real user re-focusing a previously-filled field well after
    // the debounce window, rather than the transient render before it.
    await waitFor(() =>
      expect(useAssetSearchMock).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'AAPL — Apple Inc.' }),
        expect.anything()
      )
    );

    useAssetSearchMock.mockClear();
    // Focusing re-opens the (filtered) popup for the existing text, not an
    // empty-field browse fetch — the underlying query call in this case
    // carries the full display text, not the browse wildcard.
    input.focus();
    expect(useAssetSearchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ query: '%' }),
      expect.anything()
    );
  });
});
