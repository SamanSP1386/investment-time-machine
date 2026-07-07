# TanStack Query Conventions

Defined once here, before any product page invents its own pattern (M7 Phase 1.5 hardening — do not let Phase 2 improvise this per screen).

## Query keys

Always go through `queryKeys` (`src/lib/query/keys.ts`), never a raw array literal in a component. Structure is `[resource, operation, ...params]`:

```ts
queryKeys.assets.search({ query: 'AAPL' }) // ['assets', 'search', { query: 'AAPL' }]
queryKeys.simulations.detail(id)           // ['simulations', 'detail', id]
```

Adding a new resource means adding a new top-level key in `keys.ts`, not a one-off array in the hook that uses it.

## Client defaults

Set once in `src/providers/query-provider.tsx`: `staleTime: 60_000`, `retry: 1` on queries, `retry: 0` on mutations, `refetchOnWindowFocus: false`. This product's data is historical and mostly-static (an asset's price history doesn't change while a user is looking at it) — do not override `staleTime` per-query without a specific reason; if a screen genuinely needs fresher data, document why in that hook.

## Error handling

Every function in `src/lib/api/endpoints/*.ts` throws `ApiError` (`src/lib/api/errors.ts`) on any failure — a backend error envelope or a network-level failure, normalized to one shape. This means `useQuery`/`useMutation`'s `error` field is always either `undefined` or an `ApiError`. The convention every hook and component follows:

```ts
import { ApiError, getErrorCopy } from '@/lib/api';

const { data, error } = useQuery({ queryKey: queryKeys.assets.detail(symbol), queryFn: () => getAssetDetail(symbol) });

if (error) {
  const copy = error instanceof ApiError ? getErrorCopy(error.code) : getErrorCopy('INTERNAL_SERVER_ERROR');
  // render <ErrorState title={copy.title} description={copy.description} requestId={error instanceof ApiError ? error.requestId : undefined} />
}
```

Never write a screen-specific error message inline — always resolve through `getErrorCopy`, so the same backend error code reads identically everywhere it appears (`docs/frontend_design_system.md`'s "one central error-code→copy table" requirement).

## Invalidation

A mutation invalidates its resource's `.all` key (e.g. `queryClient.invalidateQueries({ queryKey: queryKeys.simulations.all })` after `createSimulation` succeeds), not individual `.detail(...)` keys one at a time — TanStack Query's key-prefix matching invalidates every query under that prefix in one call.

## Example

`src/hooks/use-asset-search.ts` demonstrates the full pattern end-to-end (key factory, `apiRequest`-backed query function, the client defaults) and is itself cross-cutting infrastructure — usable by both the future Simulator and Asset Explorer screens, not tied to either one.
