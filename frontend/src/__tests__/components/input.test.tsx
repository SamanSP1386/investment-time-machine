import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('associates a visible label with the field', () => {
    render(<Input label="Investment amount" />);
    expect(screen.getByLabelText('Investment amount')).toBeInTheDocument();
  });

  it('marks the field invalid and renders the error message accessibly', () => {
    render(<Input label="Investment amount" error="Enter a valid positive amount" />);
    const input = screen.getByLabelText('Investment amount');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid positive amount');
  });

  it('renders helper text only when there is no error', () => {
    render(<Input label="Symbol" helperText="e.g. AAPL" />);
    expect(screen.getByText('e.g. AAPL')).toBeInTheDocument();
  });
});
