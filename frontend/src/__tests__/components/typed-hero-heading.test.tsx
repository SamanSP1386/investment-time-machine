import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TypedHeroHeading } from '@/components/landing/typed-hero-heading';

const HERO_TEXT = 'If you had invested — what would it be worth today?';

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

describe('TypedHeroHeading', () => {
  it('reduced motion: renders the complete sentence instantly, with no cursor', () => {
    setReducedMotion(true);
    render(<TypedHeroHeading />);

    const heading = screen.getByRole('heading', { level: 1, name: HERO_TEXT });
    expect(heading).toBeInTheDocument();
    expect(heading.querySelector('.typewriter-cursor')).not.toBeInTheDocument();
  });

  it('active: the accessible name is always the complete sentence, even mid-type', () => {
    setReducedMotion(false);
    render(<TypedHeroHeading />);

    // aria-label carries the full, correct sentence regardless of what's
    // visually mid-animation — a screen reader must never read a partial
    // sentence (matches OpeningSequenceHeading's established pattern).
    expect(screen.getByRole('heading', { level: 1, name: HERO_TEXT })).toBeInTheDocument();
  });

  it('active: eventually settles to the full visible text and hides the cursor', async () => {
    setReducedMotion(false);
    render(<TypedHeroHeading />);

    const heading = screen.getByRole('heading', { level: 1 });
    await waitFor(() => expect(heading.textContent).toBe(HERO_TEXT), { timeout: 3000 });
    await waitFor(() => expect(heading.querySelector('.typewriter-cursor')).not.toBeInTheDocument(), {
      timeout: 3000,
    });
  });
});
