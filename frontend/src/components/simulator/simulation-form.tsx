'use client';

import { useEffect, useState, type InputHTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { AssetSearchCombobox } from './asset-search-combobox';
import { useCreateSimulation } from '@/hooks/use-simulation';
import { useAssetAvailability } from '@/hooks/use-asset-availability';
import { simulationCreateSchema } from '@/lib/api/endpoints/simulations';
import { ApiError, getErrorCopy } from '@/lib/api';
import { formatDate, formatDateRange } from '@/lib/format';
import type { AssetSummary, SimulationCreateInput } from '@/types/api';

/**
 * Client-side-only refinement, not part of the wire schema
 * (simulationCreateSchema) — the API validates each date field
 * independently, so an obviously-wrong range (end before start) would
 * otherwise only surface after a round trip. `end_date`/`start_date` are
 * both fixed-width `YYYY-MM-DD` ISO strings, so lexicographic comparison
 * is chronologically correct here — this is a date-string comparison, not
 * a DecimalString one (ADR-033 governs the latter, not this).
 */
const formSchema = simulationCreateSchema.refine(
  (data) =>
    // eslint-disable-next-line no-restricted-syntax -- fixed-width ISO date-string comparison, not a DecimalString comparison (ADR-033).
    data.end_date > data.start_date,
  { message: 'The end date must be after the start date.', path: ['end_date'] }
);

type FormValues = SimulationCreateInput;

/**
 * The underline-only input treatment (M7 Phase 3D, FD-018/ADR-044) —
 * merged onto the shared `Input`/`AssetSearchCombobox` primitives'
 * bordered-box default via `cn` (tailwind-merge resolves the conflicting
 * border/radius/background utilities), scoped to this call site only so
 * the primitives' own default styling is unaffected for any future,
 * non-elevated consumer (e.g. a future Auth screen).
 */
const UNDERLINE_INPUT =
  'h-auto rounded-none border-0 border-b border-border-hairline-strong bg-transparent px-0.5 py-3.5 text-lg focus-visible:border-accent';

/**
 * A toggle-switch presentation over a real, native `<input type="checkbox">`
 * (visually hidden via `sr-only`, never `display:none` or removed from the
 * tab order) — matches the mockup's "More options" toggles while keeping
 * the exact same underlying form semantics `react-hook-form` already
 * relies on (`register`). Behavior and validation are unchanged; only the
 * visual presentation replaces the default checkbox square (STEP 4 direct
 * instruction).
 */
function ToggleField({
  label,
  description,
  ...inputProps
}: { label: string; description: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-6 border-b border-border-hairline py-4">
      <span>
        <span className="block text-sm font-medium text-ink-primary">{label}</span>
        <span className="mt-0.5 block text-xs text-ink-muted">{description}</span>
      </span>
      <input type="checkbox" className="peer sr-only" {...inputProps} />
      <span
        aria-hidden
        className="relative h-6 w-[42px] shrink-0 rounded-full bg-border-hairline-strong transition-colors duration-200 peer-checked:bg-accent peer-checked:[&>span]:translate-x-[18px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus-ring-color)]"
      >
        <span className="absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-surface transition-transform duration-200" />
      </span>
    </label>
  );
}

const DEFAULT_VALUES: FormValues = {
  asset_symbol: '',
  investment_amount: '',
  start_date: '',
  end_date: '',
  include_dividends: false,
  adjust_for_inflation: false,
};

/**
 * The Simulator's only form — collects inputs, validates their shape and
 * range, and calls `POST /api/v1/simulations`. It never calculates a
 * return, CAGR, share count, or any other financial figure itself; every
 * value shown after submission is the backend's own response, displayed
 * as-is (src/lib/format's wire-format contract).
 */
export function SimulationForm() {
  const router = useRouter();
  const [selectedAsset, setSelectedAsset] = useState<AssetSummary | null>(null);
  const { data: availability } = useAssetAvailability(selectedAsset?.symbol ?? null);
  const createSimulation = useCreateSimulation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function onSubmit(values: FormValues) {
    createSimulation.mutate(values);
  }

  // The moment a submission succeeds, the button stays in its "Calculating
  // historical returns…" state through the route transition too — derived
  // directly from mutation state, not a separate flag, so it can never
  // drift out of sync with it.
  const isNavigating = createSimulation.isSuccess;

  /**
   * The product "begins answering the user's question" the moment the
   * Simulation Engine completes (EXPERIENCE_CONSTITUTION.md) — this form no
   * longer shows its own inline success card; it hands off to the Results
   * screen immediately, which renders the same way regardless of how it was
   * reached (Founder Decision 017 — no more `?new=1` replay marker, since
   * there is no longer a staged reveal that needs to play "exactly once").
   */
  useEffect(() => {
    if (createSimulation.isSuccess && createSimulation.data) {
      const sim = createSimulation.data;
      router.push(`/simulation/${sim.id}`);
    }
  }, [createSimulation.isSuccess, createSimulation.data, router]);

  const apiError = createSimulation.error;
  const errorCopy = apiError
    ? getErrorCopy(apiError instanceof ApiError ? apiError.code : 'INTERNAL_SERVER_ERROR')
    : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-11">
      <Controller
        name="asset_symbol"
        control={control}
        render={({ field, fieldState }) => (
          <AssetSearchCombobox
            label="Asset"
            required
            error={fieldState.error?.message}
            className={UNDERLINE_INPUT}
            onChange={(asset) => {
              setSelectedAsset(asset);
              field.onChange(asset?.symbol ?? '');
            }}
          />
        )}
      />

      {/*
       * Asset information — reinforces trust/transparency by showing
       * exactly what the platform already knows about the selected asset
       * before the user commits to an amount or date range. Every field
       * here is data already in hand (the search result itself, plus the
       * availability query already fetched for the date-range clamp
       * below) — nothing new is fetched, and nothing here is calculated
       * (frontend_design_system.md §13/BRAND_CONSTITUTION §9's "every
       * number carries a legible source"). No card/border chrome (STEP 4:
       * "no card-in-card nesting") — a plain inline dl, like every other
       * supplementary fact on this page. `exchange` is deliberately
       * omitted: AssetSummary doesn't carry it, and fetching AssetDetail
       * just for a field that's always null today (KI-025) isn't worth a
       * second request.
       */}
      {selectedAsset ? (
        <div className="flex flex-col gap-3">
          <p className="kicker">Asset information</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-ink-muted">Symbol</dt>
              <dd className="figure text-ink-primary">{selectedAsset.symbol}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Name</dt>
              <dd className="text-ink-primary">{selectedAsset.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Type</dt>
              <dd className="text-ink-primary uppercase">{selectedAsset.asset_type}</dd>
            </div>
            {availability ? (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs text-ink-muted">Historical data available</dt>
                <dd className="figure text-ink-primary">
                  {formatDateRange(availability.earliest_date, availability.latest_date)}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      <Input
        label="Investment amount (USD)"
        required
        inputMode="decimal"
        placeholder="10000.00"
        error={errors.investment_amount?.message}
        className={UNDERLINE_INPUT}
        {...register('investment_amount')}
      />

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <Input
          type="date"
          label="Start date"
          required
          min={availability?.earliest_date}
          max={availability?.latest_date}
          helperText={
            availability
              ? `Data available from ${formatDate(availability.earliest_date)} to ${formatDate(availability.latest_date)}`
              : undefined
          }
          error={errors.start_date?.message}
          className={UNDERLINE_INPUT}
          {...register('start_date')}
        />
        <Input
          type="date"
          label="End date"
          required
          min={availability?.earliest_date}
          max={availability?.latest_date}
          error={errors.end_date?.message}
          className={UNDERLINE_INPUT}
          {...register('end_date')}
        />
      </div>

      {/*
       * Trading-day guidance (educational, not corrective): stocks/ETFs
       * have no price row on weekends/market holidays, and the backend
       * correctly rejects such a date with MISSING_HISTORICAL_DATA
       * rather than silently substituting a nearby trading day
       * (docs/simulation_formulas.md §6, "Historical Truth Is Sacred").
       * This text helps a user avoid that outcome before submitting —
       * it never adjusts, guesses, or calculates a trading calendar
       * itself.
       */}
      <p className="text-xs text-ink-secondary">
        Stocks and ETFs don’t have price data on weekends or market holidays. Choose a trading day when possible —
        Investment Time Machine never moves your dates automatically, since historical accuracy matters more than
        convenience.
      </p>

      <details className="border-t border-border-hairline pt-6">
        <summary className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink-primary select-none">
          <span className="figure text-accent" aria-hidden>
            +
          </span>
          More options
        </summary>
        <div className="mt-2 flex flex-col">
          <ToggleField
            label="Reinvest dividends"
            description="Automatically reinvest cash dividends on ex-date"
            {...register('include_dividends')}
          />
          <ToggleField
            label="Adjust for inflation"
            description="Show real returns alongside nominal, where CPI data is available"
            {...register('adjust_for_inflation')}
          />
        </div>
      </details>

      {errorCopy ? (
        <ErrorState
          title={errorCopy.title}
          description={errorCopy.description}
          requestId={apiError instanceof ApiError ? apiError.requestId : undefined}
          errorCode={apiError instanceof ApiError ? apiError.code : undefined}
        />
      ) : null}

      <Button type="submit" loading={createSimulation.isPending || isNavigating} className="mt-2 self-start px-11">
        {createSimulation.isPending || isNavigating ? 'Calculating historical returns…' : 'Run simulation'}
      </Button>
    </form>
  );
}
