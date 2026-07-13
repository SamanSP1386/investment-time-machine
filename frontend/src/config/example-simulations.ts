import type { AssetSummary } from '@/types/api';

/**
 * The one shared source of truth for every pre-filled example simulation in
 * the product — the Simulator's "Try an example" chips (`simulation-form.tsx`)
 * and the Landing page's example-simulations list (`example-simulations-list.tsx`)
 * both read this array, so the two surfaces cannot drift the way the
 * Simulator's own chips previously drifted from the real asset catalog
 * (KI-044's disclosed frontend gap: chips referenced `PTON`/`KO`, which are
 * `dev_seed`-only fixture symbols, not the real starter catalog).
 *
 * Every asset below is in the real starter catalog
 * (`backend/app/ingestion/seed_real_catalog.py::REAL_CATALOG`), and every
 * date range was verified live against the running backend
 * (`POST /api/v1/simulations`) before being committed here — not guessed.
 * `endDate` is deliberately a fixed, past trading day rather than a
 * dynamically-computed "today": a preset is a specific, reproducible worked
 * example (Founder Decision 013 §4), not a live-updating figure, matching
 * how the Simulator's own original presets already worked.
 *
 * KI-050 resolved: the Apple example originally shipped shortened to
 * "2010 → today" as a disclosed frontend workaround for a backend defect —
 * `total_return_percentage`'s old `NUMERIC(10, 6)` column overflowed past a
 * ~9,999% return. Now that the column is widened to `NUMERIC(14, 6)` and the
 * fix is live-verified, the example returns to the original, more striking
 * "2000 → today" range (+31,449.61% total return) — there is no remaining
 * technical reason to hold it back, and a genuine ~315x, 26-year compounding
 * return tells this product's own thesis more strikingly than a shorter
 * range does.
 */
export interface ExampleSimulation {
  id: string;
  label: string;
  asset: AssetSummary;
  investmentAmount: string;
  startDate: string;
  endDate: string;
  includeDividends: boolean;
}

export const EXAMPLE_SIMULATIONS: ExampleSimulation[] = [
  {
    id: 'aapl-2000',
    label: '$1,000 in Apple, 2000 → today',
    asset: { symbol: 'AAPL', name: 'Apple Inc.', asset_type: 'stock', currency: 'USD' },
    investmentAmount: '1000',
    startDate: '2000-01-03',
    endDate: '2026-07-10',
    includeDividends: false,
  },
  {
    id: 'btc-2017',
    label: '$10,000 in Bitcoin, 2017 → today',
    asset: { symbol: 'BTC-USD', name: 'Bitcoin', asset_type: 'crypto', currency: 'USD' },
    investmentAmount: '10000',
    startDate: '2017-01-01',
    endDate: '2026-07-11',
    includeDividends: false,
  },
  {
    id: 'tsla-drawdown',
    label: '$5,000 in Tesla, Nov 2021 → Jan 2023 (a real drawdown)',
    asset: { symbol: 'TSLA', name: 'Tesla, Inc.', asset_type: 'stock', currency: 'USD' },
    investmentAmount: '5000',
    startDate: '2021-11-04',
    endDate: '2023-01-03',
    includeDividends: false,
  },
];
