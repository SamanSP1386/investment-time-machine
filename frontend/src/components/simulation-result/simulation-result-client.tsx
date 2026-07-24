'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Disclosure } from '@/components/ui/disclosure';
import { ErrorState } from '@/components/ui/error-state';
import { ProductShell } from '@/components/shell/product-shell';
import { OpeningSequenceHeading } from '@/components/simulation-result/opening-sequence-heading';
import { ResultsSkeleton } from '@/components/simulation-result/results-skeleton';
import {
  AskAboutThisResult,
  GrowthOverTime,
  KeyTakeaways,
  SupportingFacts,
  TheProof,
  WhyExplanation,
} from '@/components/simulation-result/results-sections';
import { useEntranceDissolve } from '@/hooks/use-entrance-dissolve';
import { useSimulation } from '@/hooks/use-simulation';
import { cn } from '@/lib/utils';
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
            <dt className="kicker">Asset</dt>
            <dd className="figure text-sm text-ink-primary">{sim.asset_symbol}</dd>
          </div>
          <div>
            <dt className="kicker">Investment amount</dt>
            <dd className="figure text-sm text-ink-primary">{formatCurrency(sim.investment_amount)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="kicker">Date range</dt>
            <dd className="figure text-sm text-ink-primary">{formatDateRange(sim.start_date, sim.end_date)}</dd>
          </div>
          <div>
            <dt className="kicker">Dividends reinvested</dt>
            <dd className="text-sm text-ink-primary">{sim.include_dividends ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="kicker">Adjusted for inflation</dt>
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
    <Disclosure
      className="rounded-[var(--card-radius)] border border-border-hairline p-4"
      summaryClassName="text-sm font-medium text-ink-primary"
      summary="Technical details"
    >
      <dl className="figure mt-4 flex flex-col gap-2 text-xs text-ink-secondary">
        <div className="flex flex-col gap-0.5">
          <dt className="kicker">Simulation ID</dt>
          <dd className="break-all">{sim.id}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="kicker">Calculation version</dt>
          <dd>{sim.calculation_version}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="kicker">Created</dt>
          <dd>{sim.created_at}</dd>
        </div>
      </dl>
    </Disclosure>
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
      {copied ? (
        <>
          <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 fill-none stroke-current stroke-2">
            <path d="M3 8.5 6.5 12 13 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Link copied
        </>
      ) : (
        'Copy link'
      )}
    </Button>
  );
}

/** Used for the pending/failed states only — a completed simulation renders `OpeningSequenceHeading` instead. */
function ResultHeader({ sim }: { sim: SimulationResponse }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="kicker">Historical simulation</p>
      <div className="h-px w-12 bg-border-gridline" aria-hidden />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ink-primary sm:text-3xl">Simulation Result</h1>
        <Badge variant={STATUS_BADGE_VARIANT[sim.status]}>{sim.status}</Badge>
      </div>
      <p className="max-w-prose text-sm text-ink-secondary">{workedExampleSentence(sim)}</p>
    </div>
  );
}

/**
 * M7 Phase 3D-4 completion (founder gap 1) — the Results page's primary
 * action, restyled from a bare accent text link to the primary button
 * treatment. Root cause of the founder-observed gap: item 11 wired the
 * button light sweep into `buttonVariants`' `primary` variant "so it covers
 * every primary CTA," but this page's primary CTA was never ON that variant
 * — it was a hand-styled text link, so the Results page was the one route
 * with no sweep anywhere. Reaching for `buttonVariants({ variant:
 * 'primary' })` (exactly how the Landing CTA renders a styled `Link`)
 * inherits the sweep, the accent remap, and every §15 state from the one
 * shared mechanism, per §16's own rule: "a future primary-action element
 * should reach for `variant='primary'` ... never `text-accent` directly."
 */
function RunAnotherSimulationLink() {
  return (
    <Link href="/simulator" className={buttonVariants({ variant: 'primary' })}>
      Run another simulation
    </Link>
  );
}

/**
 * The Results page's closing action row plus the permanent-link caption
 * (M7 Phase 3D-5, item 5) — provenance stated as a feature, in one quiet
 * line. No backend work behind it: persistence + `calculation_version`
 * already guarantee a stored simulation replays identically at its URL
 * (Founder Decision 002's anonymous link sharing), so this sentence
 * describes what is already true rather than promising anything new.
 */
function ResultActions() {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-4">
        <RunAnotherSimulationLink />
        <CopyLinkButton />
      </div>
      <p className="text-xs text-ink-muted">
        Every result has a permanent link — same inputs, same answer, always.
      </p>
    </div>
  );
}

export function SimulationResultClient({ id }: { id: string }) {
  const { data: sim, isPending, isError, error, refetch, isFetching } = useSimulation(id);
  // Called unconditionally (Rules of Hooks) even though its result is only
  // used in the `completed` branch below — the hook itself is inert
  // (renders nothing, schedules nothing) until that branch actually reads
  // `active`/`dissolved`.
  const entrance = useEntranceDissolve(id);

  if (isPending) {
    return (
      <ProductShell contentClassName="py-16 sm:py-24">
        <ResultsSkeleton />
      </ProductShell>
    );
  }

  if (isError) {
    const errorCopy = getErrorCopy(error instanceof ApiError ? error.code : 'INTERNAL_SERVER_ERROR');
    // The shell's column geometry never narrows per-state (M7 Phase 3D-5,
    // item 1) — the error card alone caps its own width inside it.
    return (
      <ProductShell contentClassName="flex flex-col gap-8 py-16 sm:py-24">
        <ErrorState
          className="max-w-2xl"
          title={errorCopy.title}
          description={errorCopy.description}
          requestId={error instanceof ApiError ? error.requestId : undefined}
          errorCode={error instanceof ApiError ? error.code : undefined}
          action={<RunAnotherSimulationLink />}
        />
      </ProductShell>
    );
  }

  if (sim.status === 'completed') {
    return (
      <ProductShell calculationVersion={sim.calculation_version} contentClassName="flex flex-col py-16 sm:py-24">
        <div
          className={cn(entrance.active && ['entrance-dissolve', entrance.dissolved && 'entrance-dissolve-settled'])}
        >
          <OpeningSequenceHeading sim={sim}>
            <SupportingFacts sim={sim} />
            <GrowthOverTime sim={sim} />
            <WhyExplanation sim={sim} />
            <KeyTakeaways sim={sim} />
            <TheProof sim={sim} />
            <AskAboutThisResult sim={sim} />
            <ResultActions />
          </OpeningSequenceHeading>
        </div>
      </ProductShell>
    );
  }

  // The shell's column geometry never narrows per-state (M7 Phase 3D-5,
  // item 1) — the pending/failed reading content alone caps its own width
  // inside the shared measure.
  return (
    <ProductShell contentClassName="py-16 sm:py-24">
      <div className="flex max-w-2xl flex-col gap-8">
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

        <ResultActions />
      </div>
    </ProductShell>
  );
}
