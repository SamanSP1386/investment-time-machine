import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders as a real <button> element', () => {
    render(<Button>Run simulation</Button>);
    expect(screen.getByRole('button', { name: 'Run simulation' })).toBeInTheDocument();
  });

  it('fires onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled and non-interactive while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Submitting
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows a spinning working-state icon while loading, when motion is allowed', () => {
    const { container } = render(<Button loading>Submitting</Button>);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('task B.5: under reduced motion, omits the spinner entirely — a static label change only, never a frozen mid-spin icon', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query: string) =>
      ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;

    const { container } = render(<Button loading>Calculating historical returns…</Button>);
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('Calculating historical returns…');

    window.matchMedia = originalMatchMedia;
  });

  it('presses with a firm ~0.98 scale compression, never a bounce/scale-up', () => {
    render(<Button>Run simulation</Button>);
    expect(screen.getByRole('button').className).toMatch(/active:scale-\[0\.98\]/);
  });
});
