import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutPage from '@/app/about/page';

describe('AboutPage (M7 Phase 3D-4, item 8)', () => {
  it('renders the page inside the shared product shell — header, footer, and atmosphere like every other route', () => {
    render(<AboutPage />);

    expect(screen.getByRole('link', { name: 'Investment Time Machine' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about');
    // Appears twice by design — the footer's standing line, and this page's
    // own Disclaimer section restating it explicitly (item 8's requirement).
    expect(
      screen.getAllByText('Investment Time Machine is an educational tool — not financial advice.', { exact: false })
    ).toHaveLength(2);
  });

  it('renders the builder story as a clearly-marked placeholder, never presented as finished copy', () => {
    render(<AboutPage />);
    expect(screen.getByText(/Placeholder — founder to replace with final personal copy/)).toBeInTheDocument();
  });

  it('M7 Phase 3D-5 (item 3): links the builder\'s GitHub — new tab, noopener — on the page and quietly in the footer', () => {
    render(<AboutPage />);
    // Two by design: the About page's editorial "Built by Saman — GitHub"
    // link, and the sitewide quiet footer link.
    const githubLinks = screen.getAllByRole('link', { name: 'GitHub' });
    expect(githubLinks).toHaveLength(2);
    for (const link of githubLinks) {
      expect(link).toHaveAttribute('href', 'https://github.com/SamanSP1386');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
    expect(screen.getByText(/Built by Saman/)).toBeInTheDocument();
  });

  it('states the product principles (Identity/Trust/Behavior) sourced from the Experience Constitution', () => {
    render(<AboutPage />);
    expect(screen.getByRole('heading', { name: 'Identity' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trust' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Behavior' })).toBeInTheDocument();
  });

  it('states the standing educational disclaimer explicitly, not only in the footer', () => {
    render(<AboutPage />);
    const disclaimerSection = screen.getByLabelText('Disclaimer');
    expect(disclaimerSection).toHaveTextContent('never predicts, estimates, or recommends a future outcome');
  });
});
