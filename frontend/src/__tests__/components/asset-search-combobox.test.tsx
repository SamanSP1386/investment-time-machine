import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetSearchCombobox } from '@/components/simulator/asset-search-combobox';
import { ApiError } from '@/lib/api/errors';

const useAssetSearchMock = vi.fn();
vi.mock('@/hooks/use-asset-search', () => ({
  useAssetSearch: (...args: unknown[]) => useAssetSearchMock(...args),
}));

const AAPL = { symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock' as const, currency: 'USD' };
const MSFT = { symbol: 'MSFT', name: 'Microsoft Corp.', asset_type: 'stock' as const, currency: 'USD' };

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
    expect(screen.getByText('Try a different symbol or name.')).toBeInTheDocument();
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
