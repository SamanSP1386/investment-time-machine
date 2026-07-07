'use client';

import { useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { StatTile } from '@/components/ui/stat-tile';
import { useTheme } from '@/providers/theme-provider';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-border-hairline pb-10">
      <h2 className="text-lg font-semibold text-ink-primary">{title}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

export function PlaygroundClient() {
  const { resolvedTheme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-primary">Component Playground</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Dev-only — every primitive, every variant, both themes. Not part of the shipped product.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'}
        </Button>
      </div>

      <Section title="Button">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="tertiary">Tertiary</Button>
        <Button variant="primary" size="sm">
          Small
        </Button>
        <Button variant="primary" loading={loading} onClick={() => setLoading((v) => !v)}>
          {loading ? 'Loading' : 'Toggle loading'}
        </Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
      </Section>

      <Section title="Input">
        <Input label="Investment amount" placeholder="1000.00" className="w-64" />
        <Input label="Asset symbol" helperText="e.g. AAPL" className="w-64" />
        <Input label="Investment amount" error="Enter a valid positive amount" className="w-64" defaultValue="-5" />
        <Input label="Start date" required className="w-64" />
      </Section>

      <Section title="Badge">
        <Badge variant="neutral">Anonymous</Badge>
        <Badge variant="good">Completed</Badge>
        <Badge variant="warning">Rate limited</Badge>
        <Badge variant="serious">Partial data</Badge>
        <Badge variant="critical">Failed</Badge>
      </Section>

      <Section title="Card">
        <Card className="w-80">
          <CardHeader>
            <CardTitle>Growth Over Time</CardTitle>
            <CardDescription>How the investment grew between start and end date.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-ink-secondary">Chart renders here in Phase 2.</CardContent>
        </Card>
      </Section>

      <Section title="Skeleton">
        <div className="flex w-64 flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Section>

      <Section title="EmptyState">
        <EmptyState
          icon={Search}
          title="No results"
          description="Try a different symbol or asset name."
          className="w-96"
        />
      </Section>

      <Section title="ErrorState">
        <ErrorState
          title="Something went wrong"
          description="This page couldn't be displayed. Your data is unaffected."
          requestId="req-a1b2c3"
          action={
            <Button variant="secondary" size="sm">
              Try again
            </Button>
          }
          className="w-96"
        />
      </Section>

      <Section title="StatTile">
        <StatTile
          label="Final Value"
          value="$2,500.00"
          delta={{ value: '+150.00%', direction: 'positive' }}
          className="w-56"
        />
        <StatTile
          label="CAGR"
          value="9.60%"
          source="(final_value / investment_amount)^(1/years) - 1"
          className="w-56"
        />
        <StatTile
          label="Total Return"
          value="-40.00%"
          delta={{ value: '-40.00%', direction: 'negative' }}
          className="w-56"
        />
      </Section>

      <Section title="Status color as text (post-ADR-028 contrast fix)">
        <p className="figure text-sm text-status-good">status-good text sample</p>
        <p className="figure text-sm text-status-warning">status-warning text sample</p>
        <p className="figure text-sm text-status-serious">status-serious text sample</p>
        <p className="figure text-sm text-status-critical">status-critical text sample</p>
        <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
          <AlertTriangle aria-hidden className="h-4 w-4" /> ink-muted text sample
        </span>
      </Section>
    </main>
  );
}
