import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '@/components/ui/skeleton';

describe('Skeleton', () => {
  it('is hidden from assistive technology (it carries no information of its own)', () => {
    const { container } = render(<Skeleton className="h-4 w-32" data-testid="skeleton" />);
    const el = container.firstElementChild;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveClass('h-4', 'w-32');
  });
});
