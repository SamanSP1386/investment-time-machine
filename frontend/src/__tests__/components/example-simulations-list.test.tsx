import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExampleSimulationsList } from '@/components/landing/example-simulations-list';
import { EXAMPLE_SIMULATIONS } from '@/config/example-simulations';

describe('ExampleSimulationsList', () => {
  it('renders one row per shared example, each linking to /simulator?example=<id>', () => {
    render(<ExampleSimulationsList />);

    for (const example of EXAMPLE_SIMULATIONS) {
      const link = screen.getByRole('link', { name: new RegExp(example.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
      expect(link).toHaveAttribute('href', `/simulator?example=${example.id}`);
    }
  });

  it('numbers rows 01/02/03 in order', () => {
    render(<ExampleSimulationsList />);
    const numbers = screen.getAllByText(/^\d{2}$/).map((el) => el.textContent);
    expect(numbers).toEqual(['01', '02', '03']);
  });

  it('is fully keyboard-focusable — every example is a real, focusable link', () => {
    render(<ExampleSimulationsList />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(EXAMPLE_SIMULATIONS.length);
    for (const link of links) {
      link.focus();
      expect(link).toHaveFocus();
    }
  });

  it('item 12: every row carries the target-brackets hover/focus class, no custom cursor applied', () => {
    render(<ExampleSimulationsList />);
    for (const link of screen.getAllByRole('link')) {
      expect(link.className).toMatch(/\btarget-brackets\b/);
      expect(link.className).not.toMatch(/cursor-none/);
    }
  });
});
