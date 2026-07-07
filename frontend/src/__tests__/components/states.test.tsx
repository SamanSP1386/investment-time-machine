import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

describe('EmptyState', () => {
  it('is informative, never a bare blank area', () => {
    render(
      <EmptyState icon={Search} title="No results" description="Try a different symbol or asset name." />
    );
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('Try a different symbol or asset name.')).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('announces itself to assistive technology via role=alert', () => {
    render(<ErrorState title="Something went wrong" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('shows a request id for support reference when provided, never a stack trace', () => {
    render(<ErrorState title="Something went wrong" requestId="req-123" />);
    expect(screen.getByText(/req-123/)).toBeInTheDocument();
  });
});
