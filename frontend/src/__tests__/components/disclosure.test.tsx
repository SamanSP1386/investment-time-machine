import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Disclosure } from '@/components/ui/disclosure';

describe('Disclosure', () => {
  it('is closed by default, with content present in the DOM but marked inert', () => {
    render(
      <Disclosure summary="More options">
        <p>Hidden but real content</p>
      </Disclosure>
    );

    const trigger = screen.getByRole('button', { name: 'More options' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // Never hidden — the content is real DOM, just visually collapsed.
    expect(screen.getByText('Hidden but real content')).toBeInTheDocument();
  });

  it('opens on click, rotating the chevron and calling onOpenChange', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Disclosure summary="More options" onOpenChange={onOpenChange}>
        <p>Content</p>
      </Disclosure>
    );

    const trigger = screen.getByRole('button', { name: 'More options' });
    const chevron = trigger.querySelector('svg');
    expect(chevron?.getAttribute('class')).not.toMatch(/rotate-90/);

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(chevron?.getAttribute('class')).toMatch(/rotate-90/);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('closes again on a second click', async () => {
    const user = userEvent.setup();
    render(
      <Disclosure summary="More options">
        <p>Content</p>
      </Disclosure>
    );

    const trigger = screen.getByRole('button', { name: 'More options' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('respects defaultOpen', () => {
    render(
      <Disclosure summary="More options" defaultOpen>
        <p>Content</p>
      </Disclosure>
    );
    expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('uses a 150ms chevron rotation transition — a CSS transition, gated by the existing global prefers-reduced-motion override (globals.css), not a separate JS branch', () => {
    render(
      <Disclosure summary="More options">
        <p>Content</p>
      </Disclosure>
    );
    const chevron = screen.getByRole('button', { name: 'More options' }).querySelector('svg');
    expect(chevron?.getAttribute('class')).toMatch(/duration-150/);
  });
});
