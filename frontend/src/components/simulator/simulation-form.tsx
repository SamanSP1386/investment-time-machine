'use client';

import { useEffect, useMemo, useState, type InputHTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Disclosure } from '@/components/ui/disclosure';
import { ErrorState } from '@/components/ui/error-state';
import { AssetSearchCombobox } from './asset-search-combobox';
import { useCreateSimulation } from '@/hooks/use-simulation';
import { useAssetAvailability } from '@/hooks/use-asset-availability';
import { simulationCreateSchema } from '@/lib/api/endpoints/simulations';
import { ApiError, getErrorCopy } from '@/lib/api';
import { formatDate, formatDateRange } from '@/lib/format';
import type { AssetSummary, SimulationCreateInput } from '@/types/api';

/**
 * A hard, sensible ceiling/floor for date entry (bug 3, M7 Phase 3D-2):
 * before an asset is selected the date fields are disabled outright (see
 * `DATE_DISABLED_HINT` below), so these two constants only ever bound
 * manual entry *after* selection, layered underneath the asset's own
 * `availability` window once it's known. No public market has price data
 * before the earliest date any of this platform's data providers cover,
 * and nothing in a historical simulation can end after today.
 */
const GLOBAL_MIN_DATE = '1900-01-01';
function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The end>start check is asset-independent, so it's always present.
 * Once an asset's availability window is known, start/end are additionally
 * bounded to it — this is the actual fix for bug 3 ("date inputs accept
 * any year"): the native `min`/`max` attributes already set on the
 * `<input type="date">` elements only affect the picker UI and the
 * browser's own `:invalid` state, which this form never surfaces because
 * `noValidate` intentionally routes all validation through react-hook-form
 * instead — so a manually-typed out-of-range year (e.g. 1887) was
 * previously accepted silently. Rebuilt per-render from the currently
 * selected asset's availability (or the global bounds above, pre-selection)
 * so the error message can name the exact allowed range.
 */
function buildFormSchema(bounds: { min: string; max: string }) {
  return simulationCreateSchema
    .refine(
      (data) =>
        // eslint-disable-next-line no-restricted-syntax -- fixed-width ISO date-string comparison, not a DecimalString comparison (ADR-033).
        data.end_date > data.start_date,
      { message: 'The end date must be after the start date.', path: ['end_date'] }
    )
    .superRefine((data, ctx) => {
      for (const field of ['start_date', 'end_date'] as const) {
        const value = data[field];
        if (!value) continue;
        // eslint-disable-next-line no-restricted-syntax -- fixed-width ISO date-string comparison, not a DecimalString comparison (ADR-033).
        if (value < bounds.min || value > bounds.max) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `Enter a date between ${bounds.min} and ${bounds.max}.`,
          });
        }
      }
    });
}

type FormValues = SimulationCreateInput;

const DATE_DISABLED_HINT = 'Select an asset first to see its available date range.';

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
        className="relative h-6 w-[42px] shrink-0 rounded-full bg-border-hairline-strong transition-colors duration-150 ease-out peer-checked:bg-accent peer-checked:[&>span]:translate-x-[18px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus-ring-color)]"
      >
        <span className="absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-surface transition-transform duration-150 ease-out" />
      </span>
    </label>
  );
}

/**
 * Three one-click presets (M7 Phase 3D-2, refinement 13) — a fast way to
 * see the product answer a real question without typing, using only
 * assets `app.ingestion.seed_dev_data` actually seeds (M7 Phase 3D-1, task
 * F): a plain gain (AAPL), a loss (PTON — "overall loss" per that script's
 * own seed comment), and a dividend-reinvestment case (KO). Dates are a
 * fixed, known-good trading-day range common to all three (every seeded
 * asset's availability window is 2020-01-01..2024-12-31 by construction —
 * `DEFAULT_START`/`DEFAULT_END`, `seed_dev_data.py`), so a preset click
 * never risks landing on a weekend/holiday and hitting
 * MISSING_HISTORICAL_DATA.
 */
interface ExamplePreset {
  chipLabel: string;
  asset: AssetSummary;
  investmentAmount: string;
  startDate: string;
  endDate: string;
  includeDividends: boolean;
}

const EXAMPLE_PRESETS: ExamplePreset[] = [
  {
    chipLabel: '$1,000 in Apple Inc., 2020 → 2024',
    asset: { symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', currency: 'USD' },
    investmentAmount: '1000',
    startDate: '2020-01-02',
    endDate: '2024-12-30',
    includeDividends: false,
  },
  {
    chipLabel: '$1,000 in Peloton, 2020 → 2024 (a loss)',
    asset: { symbol: 'PTON', name: 'Peloton Interactive, Inc.', asset_type: 'stock', currency: 'USD' },
    investmentAmount: '1000',
    startDate: '2020-01-02',
    endDate: '2024-12-30',
    includeDividends: false,
  },
  {
    chipLabel: '$1,000 in Coca-Cola, dividends reinvested',
    asset: { symbol: 'KO', name: 'The Coca-Cola Company', asset_type: 'stock', currency: 'USD' },
    investmentAmount: '1000',
    startDate: '2020-01-02',
    endDate: '2024-12-30',
    includeDividends: true,
  },
];

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

  const dateBounds = useMemo(
    () => ({
      min: availability?.earliest_date ?? GLOBAL_MIN_DATE,
      max: availability?.latest_date ?? todayIsoDate(),
    }),
    [availability?.earliest_date, availability?.latest_date]
  );
  // Rebuilt whenever the selected asset's availability window changes —
  // react-hook-form re-reads `resolver` from its latest render's props on
  // every validation pass, so a schema that closes over the current
  // `dateBounds` is enough; no imperative setError/clearErrors bookkeeping
  // needed to keep validation in sync with the selected asset.
  const formSchema = useMemo(() => buildFormSchema(dateBounds), [dateBounds]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function onSubmit(values: FormValues) {
    createSimulation.mutate(values);
  }

  /** Fills the form only — never submits it (task 13's explicit instruction). */
  function applyPreset(preset: ExamplePreset) {
    setSelectedAsset(preset.asset);
    setValue('asset_symbol', preset.asset.symbol, { shouldValidate: true });
    setValue('investment_amount', preset.investmentAmount, { shouldValidate: true });
    setValue('start_date', preset.startDate, { shouldValidate: true });
    setValue('end_date', preset.endDate, { shouldValidate: true });
    setValue('include_dividends', preset.includeDividends, { shouldValidate: true });
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-12">
      <Controller
        name="asset_symbol"
        control={control}
        render={({ field, fieldState }) => (
          <AssetSearchCombobox
            label="Asset"
            required
            error={fieldState.error?.message}
            className={UNDERLINE_INPUT}
            value={selectedAsset}
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
        <div className="rise-fade-in flex flex-col gap-3">
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
          disabled={!selectedAsset}
          min={dateBounds.min}
          max={dateBounds.max}
          helperText={
            availability
              ? `Data available from ${formatDate(availability.earliest_date)} to ${formatDate(availability.latest_date)}`
              : DATE_DISABLED_HINT
          }
          error={errors.start_date?.message}
          className={UNDERLINE_INPUT}
          {...register('start_date')}
        />
        <Input
          type="date"
          label="End date"
          required
          disabled={!selectedAsset}
          min={dateBounds.min}
          max={dateBounds.max}
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

      <Disclosure
        className="border-t border-border-hairline pt-6"
        summaryClassName="text-sm font-semibold text-ink-primary"
        summary="More options"
      >
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
      </Disclosure>

      {errorCopy ? (
        <ErrorState
          title={errorCopy.title}
          description={errorCopy.description}
          requestId={apiError instanceof ApiError ? apiError.requestId : undefined}
          errorCode={apiError instanceof ApiError ? apiError.code : undefined}
        />
      ) : null}

      <Button type="submit" loading={createSimulation.isPending || isNavigating} className="mt-2 self-start px-12">
        {createSimulation.isPending || isNavigating ? 'Calculating historical returns…' : 'Run simulation'}
      </Button>

      <div className="flex flex-col gap-3">
        <p className="kicker">Try an example</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Example simulations">
          {EXAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.chipLabel}
              type="button"
              onClick={() => applyPreset(preset)}
              className="cursor-pointer rounded-full border border-border-hairline px-3.5 py-1.5 text-xs text-ink-secondary transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)] hover:border-border-hairline-strong hover:text-ink-primary"
            >
              {preset.chipLabel}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
