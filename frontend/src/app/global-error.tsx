'use client';

import type { RouteErrorBoundaryProps } from '@/lib/next-error-boundary';

/**
 * Root-level crash fallback — must define its own <html>/<body> and
 * intentionally does not import the token system, providers, or any other
 * app code: this is the "everything else failed" boundary, so it must have
 * nothing left to fail. See src/app/error.tsx for the normal, token-driven
 * route-segment boundary. (The type-only import above is erased at compile
 * time and carries no runtime dependency, unlike a value import.)
 */
export default function GlobalError({ error, unstable_retry }: RouteErrorBoundaryProps) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          background: '#f9f9f7',
          color: '#0b0b0b',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center', padding: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: '#52514e', marginBottom: 16 }}>
            The application failed to load. Your data and any completed simulation are unaffected.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: 6,
              border: '1px solid rgba(11,11,11,0.10)',
              background: 'transparent',
              color: '#0b0b0b',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p
              style={{
                marginTop: 16,
                fontSize: 12,
                color: '#6b6963',
                fontFamily: 'ui-monospace, monospace',
                wordBreak: 'break-all',
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
