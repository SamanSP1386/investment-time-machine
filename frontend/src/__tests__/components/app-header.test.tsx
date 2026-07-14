import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppHeader } from '@/components/shell/app-header';

const usePathnameMock = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

describe('AppHeader (M7 Phase 3D-4, item 13)', () => {
  it('the wordmark links home, and the nav lists Simulator then About', () => {
    usePathnameMock.mockReturnValue('/');
    render(<AppHeader />);

    expect(screen.getByRole('link', { name: 'Investment Time Machine' })).toHaveAttribute('href', '/');
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const links = nav.querySelectorAll('a');
    expect(Array.from(links).map((a) => a.textContent)).toEqual(['Simulator', 'About']);
    expect(links[1]).toHaveAttribute('href', '/about');
  });

  it('marks the active route with aria-current and a permanently-drawn underline', () => {
    usePathnameMock.mockReturnValue('/about');
    render(<AppHeader />);

    const aboutLink = screen.getByRole('link', { name: 'About' });
    expect(aboutLink).toHaveAttribute('aria-current', 'page');
    // The underline span is a sibling <span> inside the link, drawn (scale-x-100)
    // unconditionally for the active route — not gated behind :hover/:focus-visible.
    const underline = aboutLink.querySelector('span[aria-hidden]');
    expect(underline?.className).toMatch(/scale-x-100/);

    const simulatorLink = screen.getByRole('link', { name: 'Simulator' });
    expect(simulatorLink).not.toHaveAttribute('aria-current');
    const inactiveUnderline = simulatorLink.querySelector('span[aria-hidden]');
    expect(inactiveUnderline?.className).toMatch(/scale-x-0/);
    expect(inactiveUnderline?.className).toMatch(/group-hover:scale-x-100/);
  });

  it('also treats a nested route under a nav link as active (startsWith match)', () => {
    usePathnameMock.mockReturnValue('/simulator/anything');
    render(<AppHeader />);
    expect(screen.getByRole('link', { name: 'Simulator' })).toHaveAttribute('aria-current', 'page');
  });
});
