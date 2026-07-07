import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { StatTile } from '@/components/ui/stat-tile';

/**
 * Structural/ARIA accessibility evidence via axe-core, run directly
 * against jsdom (no Playwright/real browser in this project yet).
 *
 * Scope and an honest limitation: jsdom does not load stylesheets or
 * compute real rendered colors, so axe's `color-contrast` rule cannot run
 * meaningfully here — it is disabled explicitly below, not silently
 * skipped. Contrast is instead verified for real, against the actual
 * shipped hex values, by the known-answer test in
 * `src/__tests__/lib/contrast.test.ts` (WCAG formulas computed directly).
 * Together the two tests cover what a real browser's axe run would have
 * covered; neither alone would.
 */
const AXE_OPTIONS = {
  rules: {
    'color-contrast': { enabled: false },
  },
};

async function expectNoViolations(container: Element) {
  const results = await axe.run(container, AXE_OPTIONS);
  expect(results.violations).toEqual([]);
}

describe('primitive component accessibility (axe-core, structural rules)', () => {
  it('Button', async () => {
    const { container } = render(<Button>Run simulation</Button>);
    await expectNoViolations(container);
  });

  it('Input with label, helper text, and an error', async () => {
    const { container } = render(
      <>
        <Input label="Investment amount" helperText="e.g. 1000.00" />
        <Input label="Start date" error="Enter a valid date" />
      </>
    );
    await expectNoViolations(container);
  });

  it('Card composition', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Growth Over Time</CardTitle>
        </CardHeader>
        <CardContent>Chart</CardContent>
      </Card>
    );
    await expectNoViolations(container);
  });

  it('Badge, every variant', async () => {
    const { container } = render(
      <>
        <Badge variant="neutral">Anonymous</Badge>
        <Badge variant="good">Completed</Badge>
        <Badge variant="warning">Rate limited</Badge>
        <Badge variant="serious">Partial data</Badge>
        <Badge variant="critical">Failed</Badge>
      </>
    );
    await expectNoViolations(container);
  });

  it('Skeleton', async () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    await expectNoViolations(container);
  });

  it('EmptyState', async () => {
    const { container } = render(<EmptyState icon={Search} title="No results" description="Try again." />);
    await expectNoViolations(container);
  });

  it('ErrorState', async () => {
    const { container } = render(<ErrorState title="Something went wrong" requestId="req-1" />);
    await expectNoViolations(container);
  });

  it('StatTile, with and without a source disclosure', async () => {
    const { container } = render(
      <>
        <StatTile label="Final Value" value="$2,500.00" />
        <StatTile label="CAGR" value="9.60%" source="(final_value / investment_amount)^(1/years) - 1" />
      </>
    );
    await expectNoViolations(container);
  });
});
