'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';
import { ToastProvider } from './toast-provider';

/**
 * The single place every app-wide client provider is composed, so
 * src/app/layout.tsx stays a thin assembly point rather than growing its
 * own nesting order over time.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ToastProvider>{children}</ToastProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
