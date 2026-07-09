'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { OpeningSequenceHeading } from '@/components/simulation-result/opening-sequence-heading';
import { GrowthOverTime, SupportingFacts, TheProof, WhyExplanation } from '@/components/simulation-result/results-sections';
import { useSimulation } from '@/hooks/use-simulation';
import { ApiError, getErrorCopy } from '@/lib/api';
import { formatCurrency, formatDate, formatDateRange } from '@/lib/format';
import type { SimulationResponse, SimulationStatus } from '@/types/api';

const STATUS_BADGE_VARIANT: Record<SimulationStatus, 'good' | 'warning' | 'critical'> = {
  completed: 'good',
  pending: 'warning',
  failed: 'critical',
};

/**
 * The worked-example question a pending/failed simulation is still
 * answering (docs/EXPERIENCE_CONSTITUTION.md §4). A completed simulation no
 * longer uses this — `OpeningSequenceHeading` composes its own sentence,
 * the Results Opening Sequence's "first sentence of the answer"
 * (M7 Phase 3B.1), ending in the actual answer rather than a promissory
 * "here's precisely what would have happened."
 */
function workedExampleSentence(sim: SimulationResponse): string {
  const opening = `If you had invested ${formatCurrency(sim.investment_amount)} in ${sim.asset_symbol}, starting ${formatDate(sim.start_date)} and held until ${formatDate(sim.end_date)}`;
  if (sim.status === 'pending') {
    return `${opening} — here's what we're calculating.`;
  }
  return `${opening} — here's what happened when we tried to calculate it.`;
}

/** Every input the user actually chose, unconditionally renderable regardless of status. */
function SimulationSnapshot({ sim }: { sim: SimulationResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulation Snapshot</CardTitle>
        <CardDescription>Exactly what was asked — every value below is an input, not a result.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">Asset</dt>
            <dd className="figure font-mono text-sm text-ink-primary">{sim.asset_symbol}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">Investment amount</dt>
            <dd className="figure text-sm text-ink-primary">{formatCurrency(sim.investment_amount)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">Date range</dt>
            <dd className="figure text-sm text-ink-primary">{formatDateRange(sim.start_date, sim.end_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">Dividends reinvested</dt>
            <dd className="text-sm text-ink-primary">{sim.include_dividends ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">Adjusted for inflation</dt>
            <dd className="text-sm text-ink-primary">{sim.adjust_for_inflation ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

/** Simulation ID, calculation version, created timestamp — collapsed, never hidden (docs/EXPERIENCE_CONSTITUTION.md §5). */
function TechnicalDetails({ sim }: { sim: SimulationResponse }) {
  return (
    <details className="rounded-[var(--card-radius)] border border-border-hairline p-4">
      <summary className="cursor-pointer text-sm font-medium text-ink-primary select-none">Technical details</summary>
      <dl className="figure mt-4 flex flex-col gap-2 font-mono text-xs text-ink-secondary">
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-muted uppercase">Simulation ID</dt>
          <dd>{sim.id}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-muted uppercase">Calculation version</dt>
          <dd>{sim.calculation_version}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-muted uppercase">Created</dt>
          <dd>{sim.created_at}</dd>
        </div>
      </dl>
    </details>
  );
}

/** Copies the current URL — the anonymous-sharing affordance Founder Decision 002 already approves ("Anonymous users may... share simulation links"). Nothing is sent anywhere; the link already carries everything needed to re-fetch this same result. */
function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser; failing silently
      // here is safe — nothing was lost, the user can still copy manually.
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleCopy}>
      {copied ? 'Link copied' : 'Copy link'}
    </Button>
  );
}

/** Used for the pending/failed states only — a completed simulation renders `OpeningSequenceHeading` instead. */
function ResultHeader({ sim }: { sim: SimulationResponse }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="figure text-xs font-medium tracking-wide text-ink-muted uppercase">Historical simulation</p>
      <div className="h-px w-12 bg-border-gridline" aria-hidden />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink-primary sm:text-3xl">Simulation Result</h1>
        <Badge variant={STATUS_BADGE_VARIANT[sim.status]}>{sim.status}</Badge>
      </div>
      <p className="max-w-prose text-sm text-ink-secondary">{workedExampleSentence(sim)}</p>
    </div>
  );
}

function RunAnotherSimulationLink() {
  return (
    <Link
      href="/simulator"
      className="text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      Run another simulation
    </Link>
  );
}

export function SimulationResultClient({ id }: { id: string }) {
  const { data: sim, isPending, isError, error, refetch, isFetching } = useSimulation(id);

  if (isPending) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center p-6 sm:p-10">
        <p role="status" aria-live="polite" className="text-sm text-ink-secondary">
          Loading simulation…
        </p>
      </main>
    );
  }

  if (isError) {
    const errorCopy = getErrorCopy(error instanceof ApiError ? error.code : 'INTERNAL_SERVER_ERROR');
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-6 sm:p-10">
        <ErrorState
          title={errorCopy.title}
          description={errorCopy.description}
          requestId={error instanceof ApiError ? error.requestId : undefined}
          errorCode={error instanceof ApiError ? error.code : undefined}
          action={<RunAnotherSimulationLink />}
        />
      </main>
    );
  }

  if (sim.status === 'completed') {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col p-6 sm:p-10">
        <OpeningSequenceHeading sim={sim}>
          <SupportingFacts sim={sim} />
          <GrowthOverTime sim={sim} />
          <WhyExplanation sim={sim} />
          <TheProof sim={sim} />
          <div className="flex flex-wrap items-center gap-4">
            <RunAnotherSimulationLink />
            <CopyLinkButton />
          </div>
        </OpeningSequenceHeading>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-6 sm:p-10">
      <ResultHeader sim={sim} />

      {sim.status === 'pending' ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm text-ink-primary">
              This simulation hasn’t finished calculating yet. Results appear here as soon as the Simulation Engine
              completes.
            </p>
            <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
              Check again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ErrorState
          title="Simulation could not be completed"
          description={sim.error_message ?? 'The simulation could not be calculated.'}
        />
      )}

      <SimulationSnapshot sim={sim} />

      <TechnicalDetails sim={sim} />

      <div className="flex flex-wrap items-center gap-4">
        <RunAnotherSimulationLink />
        <CopyLinkButton />
      </div>
    </main>
  );
}
