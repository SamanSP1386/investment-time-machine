import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatTile } from '@/components/ui/stat-tile';

describe('StatTile', () => {
  it('renders the label and value', () => {
    render(<StatTile label="Final Value" value="$2,500.00" />);
    expect(screen.getByText('Final Value')).toBeInTheDocument();
    expect(screen.getByText('$2,500.00')).toBeInTheDocument();
  });

  it('exposes its source formula behind a keyboard-operable disclosure, not hidden', () => {
    render(<StatTile label="CAGR" value="9.60%" source="(final_value / investment_amount)^(1/years) - 1" />);
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('(final_value / investment_amount)^(1/years) - 1')).toBeInTheDocument();
  });

  it('does not render a source disclosure when none is provided', () => {
    render(<StatTile label="Final Value" value="$2,500.00" />);
    expect(screen.queryByText('Source')).not.toBeInTheDocument();
  });
});
