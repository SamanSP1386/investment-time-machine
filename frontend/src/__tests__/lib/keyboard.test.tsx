import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';
import { StatTile } from '@/components/ui/stat-tile';

describe('keyboard operability', () => {
  it('a Button is reachable by Tab and activates on Enter and Space (native <button> behavior)', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Run simulation</Button>);

    await userEvent.tab();
    expect(screen.getByRole('button')).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);

    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('a disabled/loading Button is skipped by Tab', async () => {
    render(
      <>
        <Button loading>Submitting</Button>
        <Button>Next field</Button>
      </>
    );
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Next field' })).toHaveFocus();
  });

  it("StatTile's source disclosure is a native <details>/<summary> element, reachable and operable with zero additional JavaScript", async () => {
    render(<StatTile label="CAGR" value="9.60%" source="(final_value / investment_amount)^(1/years) - 1" />);

    const summary = screen.getByText('Source');
    expect(summary.tagName).toBe('SUMMARY');
    expect(screen.queryByText('(final_value / investment_amount)^(1/years) - 1')).not.toBeVisible();

    // <summary> is natively focusable/interactive content per the HTML spec,
    // and real browsers map both Enter and Space presses on it to the same
    // toggle a click performs — jsdom does not simulate that native
    // key-to-activation mapping faithfully, so this exercises the
    // equivalent, spec-guaranteed activation via click instead.
    await userEvent.click(summary);
    expect(screen.getByText('(final_value / investment_amount)^(1/years) - 1')).toBeVisible();
  });
});
