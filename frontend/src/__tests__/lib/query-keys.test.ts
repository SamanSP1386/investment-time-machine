import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query/keys';

describe('queryKeys', () => {
  it('builds a resource/operation/params-shaped key for asset search', () => {
    expect(queryKeys.assets.search({ query: 'AAPL' })).toEqual(['assets', 'search', { query: 'AAPL' }]);
  });

  it('builds distinct keys for different search params (no accidental cache collision)', () => {
    const a = queryKeys.assets.search({ query: 'AAPL' });
    const b = queryKeys.assets.search({ query: 'MSFT' });
    expect(a).not.toEqual(b);
  });

  it('builds detail keys scoped by id/symbol', () => {
    expect(queryKeys.assets.detail('AAPL')).toEqual(['assets', 'detail', 'AAPL']);
    expect(queryKeys.simulations.detail('sim-123')).toEqual(['simulations', 'detail', 'sim-123']);
  });

  it('exposes a resource-level "all" key for bulk invalidation', () => {
    expect(queryKeys.assets.all).toEqual(['assets']);
    expect(queryKeys.simulations.all).toEqual(['simulations']);
  });
});
