'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { AssetSearchCombobox } from './asset-search-combobox';
import { useCreateSimulation } from '@/hooks/use-simulation';
import { useAssetAvailability } from '@/hooks/use-asset-availability';
import { simulationCreateSchema } from '@/lib/api/endpoints/simulations';
import { ApiError, getErrorCopy } from '@/lib/api';
import { formatCurrency, formatDate, formatDateRange } from '@/lib/format';
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
  const [selectedAsset, setSelectedAsset] = useState<AssetSummary | null>(null);
  // AssetSearchCombobox manages its own displayed text as uncontrolled
  // state; resetting the RHF form alone would not clear it. Bumping this
  // key on "Start a new simulation" forces React to remount the form
  // subtree (including the combobox), the standard way to reset
  // uncontrolled child state that a parent doesn't otherwise own.
  const [formKey, setFormKey] = useState(0);
  const { data: availability } = useAssetAvailability(selectedAsset?.symbol ?? null);
  const createSimulation = useCreateSimulation();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function onSubmit(values: FormValues) {
    createSimulation.mutate(values);
  }

  function handleStartNew() {
    createSimulation.reset();
    setSelectedAsset(null);
    reset(DEFAULT_VALUES);
    setFormKey((key) => key + 1);
  }

  if (createSimulation.isSuccess && createSimulation.data) {
    const sim = createSimulation.data;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Simulation created</CardTitle>
          <CardDescription>Your historical investment simulation has been recorded.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">Simulation ID</dt>
              <dd className="figure font-mono text-sm text-ink-primary">{sim.id}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-ink-muted uppercase">Status</dt>
              <dd className="text-sm text-ink-primary capitalize">{sim.status}</dd>
            </div>
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
          </dl>
          {sim.status === 'failed' && sim.error_message ? (
            <ErrorState title="Simulation could not be completed" description={sim.error_message} />
          ) : null}
          <Button variant="secondary" size="sm" onClick={handleStartNew} className="self-start">
            Start a new simulation
          </Button>
        </CardContent>
      </Card>
    );
  }

  const apiError = createSimulation.error;
  const errorCopy = apiError
    ? getErrorCopy(apiError instanceof ApiError ? apiError.code : 'INTERNAL_SERVER_ERROR')
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run a historical simulation</CardTitle>
        <CardDescription>
          See what a real investment would have returned, calculated from actual historical prices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form key={formKey} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
          <Controller
            name="asset_symbol"
            control={control}
            render={({ field, fieldState }) => (
              <AssetSearchCombobox
                label="Asset"
                required
                error={fieldState.error?.message}
                onChange={(asset) => {
                  setSelectedAsset(asset);
                  field.onChange(asset?.symbol ?? '');
                }}
              />
            )}
          />

          <Input
            label="Investment amount (USD)"
            required
            inputMode="decimal"
            placeholder="10000.00"
            error={errors.investment_amount?.message}
            {...register('investment_amount')}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              {...register('start_date')}
            />
            <Input
              type="date"
              label="End date"
              required
              min={availability?.earliest_date}
              max={availability?.latest_date}
              error={errors.end_date?.message}
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
            Stocks and ETFs don’t have price data on weekends or market holidays. Choose a trading day when possible
            — Investment Time Machine never moves your dates automatically, since historical accuracy matters more
            than convenience.
          </p>

          <details className="rounded-[var(--card-radius)] border border-border-hairline p-4">
            <summary className="cursor-pointer text-sm font-medium text-ink-primary select-none">
              More options
            </summary>
            <div className="mt-4 flex flex-col gap-1">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 py-2 text-sm text-ink-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--color-primary)]"
                  {...register('include_dividends')}
                />
                Reinvest dividends
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 py-2 text-sm text-ink-primary">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--color-primary)]"
                  {...register('adjust_for_inflation')}
                />
                Adjust for inflation
              </label>
            </div>
          </details>

          {errorCopy ? (
            <ErrorState
              title={errorCopy.title}
              description={errorCopy.description}
              requestId={apiError instanceof ApiError ? apiError.requestId : undefined}
            />
          ) : null}

          <Button type="submit" loading={createSimulation.isPending} className="self-start">
            {createSimulation.isPending ? 'Calculating historical returns…' : 'Run simulation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
