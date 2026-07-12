'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {/* Opt-in only (M7 Phase 3D-2, bug 5) — the previous NODE_ENV check
          meant every `next dev` session, including founder demos, always
          rendered the devtools toggle. NEXT_PUBLIC_* is inlined at build
          time, so this is also verifiably absent from a production build,
          not just hidden behind a runtime check. */}
      {process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS === 'true' ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
