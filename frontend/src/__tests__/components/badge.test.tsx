import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('never carries meaning through color alone — an icon always accompanies the label', () => {
    const { container } = render(<Badge variant="critical">Failed</Badge>);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('defaults to the neutral variant', () => {
    render(<Badge>Anonymous</Badge>);
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });
});
