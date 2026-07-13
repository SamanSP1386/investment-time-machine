import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';

function setReducedMotion(matches: boolean) {
  window.matchMedia = (query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

describe('LandingPage', () => {
  it('renders the hero, the one-line product description, a primary CTA to /simulator, and three example links', () => {
    setReducedMotion(true);
    render(<LandingPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'If you had invested — what would it be worth today?' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('A deterministic, historical, educational replay of real market data — never a projection, never advice.')
    ).toBeInTheDocument();

    const cta = screen.getByRole('link', { name: 'Run a simulation' });
    expect(cta).toHaveAttribute('href', '/simulator');

    expect(screen.getByText('Example simulations')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /→ today|drawdown/ })).toHaveLength(3);
  });
});
