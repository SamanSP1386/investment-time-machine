import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFound from '@/app/not-found';
import ErrorBoundaryPage from '@/app/error';

vi.mock('next/navigation', () => ({
  usePathname: () => '/nowhere',
}));

/**
 * M7 Phase 3D-5 (item 6) — the 404 and route-error boundaries as editorial
 * pages in the product voice: serif heading in character, one plain line,
 * links to the landing page and the Simulator, all inside the same
 * `ProductShell` every real route uses (never a default Next.js screen,
 * never a stack trace).
 */
describe('NotFound (M7 Phase 3D-5, item 6)', () => {
  it('renders the in-character serif heading and plain explanation inside the shared shell', () => {
    render(<NotFound />);

    expect(screen.getByRole('heading', { name: 'This page returned no data.' })).toBeInTheDocument();
    expect(screen.getByText(/may have been mistyped, moved/)).toBeInTheDocument();
    // The shared shell: wordmark home link + standing footer line.
    expect(screen.getByRole('link', { name: 'Investment Time Machine' })).toHaveAttribute('href', '/');
    expect(
      screen.getByText('Investment Time Machine is an educational tool — not financial advice.')
    ).toBeInTheDocument();
  });

  it('offers both the landing page and the Simulator as next steps', () => {
    render(<NotFound />);
    expect(screen.getByRole('link', { name: 'Run a simulation' })).toHaveAttribute('href', '/simulator');
    expect(screen.getByRole('link', { name: 'Back to the front page' })).toHaveAttribute('href', '/');
  });
});

describe('Route error boundary (M7 Phase 3D-5, item 6)', () => {
  const baseError = Object.assign(new Error('boom'), { digest: 'digest-abc' });

  it('renders the in-character serif heading, retry, and next-step links — never a stack trace', () => {
    const retry = vi.fn();
    render(<ErrorBoundaryPage error={baseError} unstable_retry={retry} />);

    expect(screen.getByRole('heading', { name: 'This page failed to load its answer.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Run a simulation' })).toHaveAttribute('href', '/simulator');
    expect(screen.getByRole('link', { name: 'Back to the front page' })).toHaveAttribute('href', '/');
    // The digest appears as one quiet reference line; the raw error message/stack never renders.
    expect(screen.getByText('Reference: digest-abc')).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
  });

  it('omits the reference line entirely when the error has no digest', () => {
    render(<ErrorBoundaryPage error={new Error('boom')} unstable_retry={vi.fn()} />);
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
  });
});
