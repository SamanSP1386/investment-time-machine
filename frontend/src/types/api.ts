/**
 * Types mirror docs/api_design.md and backend/app/models/enums.py exactly.
 * Financial figures (investment_amount, prices, CAGR, etc.) are typed
 * `DecimalString`, not plain `string` — they are Decimal-serialized by the
 * backend and must never be parsed into a JS number for arithmetic. The
 * frontend only displays what the API returns
 * (`.claude/CODING_STANDARDS.md`: "presentation-only"); see
 * src/lib/format/README.md for the formatting contract and ADR-029 for the
 * lint-enforced guardrail this branding supports.
 */

import type { DecimalString } from '@/lib/format/decimal-string';

export type AssetType = 'stock' | 'etf' | 'crypto';

export type SimulationStatus = 'pending' | 'completed' | 'failed';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/** Codes documented in docs/api_design.md, plus one client-only addition. */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_INVESTMENT_AMOUNT'
  | 'INVALID_DATE_RANGE'
  | 'ASSET_NOT_FOUND'
  | 'MISSING_HISTORICAL_DATA'
  | 'CALCULATION_ERROR'
  | 'SIMULATION_NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHORIZED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DATABASE_ERROR'
  | 'INTERNAL_SERVER_ERROR'
  /** No response reached the server at all (offline, DNS, CORS, timeout) — not a backend code. */
  | 'NETWORK_ERROR';

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  request_id?: string;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export interface AssetSummary {
  symbol: string;
  name: string;
  asset_type: AssetType;
  currency: string;
}

export interface AssetDetail {
  symbol: string;
  name: string;
  asset_type: AssetType;
  currency: string;
  data_source: string;
  is_active: boolean;
  /** Always null until KI-025 (no `exchange` column yet) — present, not omitted. */
  exchange: string | null;
}

export interface AssetAvailability {
  symbol: string;
  earliest_date: string;
  latest_date: string;
  data_source: string;
}

export interface AssetSearchResult {
  assets: AssetSummary[];
  total: number;
}

/**
 * Field names confirmed directly against `backend/app/api/v1/schemas/simulations.py::GrowthSeriesPoint`
 * during M7 Phase 1.5's contract-drift review — the point's date field is
 * `point_date`, not `date` (KI-036, resolved: Phase 1's original guess was
 * wrong). Shape unchanged by Founder Decision 014/KI-021's persistence fix
 * (M7 Phase 3C-2) — only the emptiness on GET-after-creation was fixed, not
 * the field names.
 */
export interface GrowthSeriesPoint {
  point_date: string;
  value: DecimalString;
}

/** Field name confirmed against `backend/app/api/v1/schemas/simulations.py::DisclosedSplit` — `split_date`, not `date`. */
export interface DisclosedSplit {
  split_date: string;
  split_ratio: DecimalString;
}

export interface SimulationCreateInput {
  asset_symbol: string;
  investment_amount: string;
  start_date: string;
  end_date: string;
  include_dividends: boolean;
  adjust_for_inflation: boolean;
}

/**
 * Confirmed directly against `backend/app/api/v1/schemas/simulations.py::SimulationResponse`
 * during M7 Phase 1.5 — six fields M7 Phase 1 had typed as always-present
 * are actually nullable (`null` for a `pending`/`failed` simulation, which
 * never completed the calculation), and `error_message` was missing
 * entirely (KI-038). Any UI reading these fields must handle `status !==
 * 'completed'` as a real, typed case, not an assumption.
 */
export interface SimulationResponse {
  id: string;
  status: SimulationStatus;
  asset_symbol: string;
  investment_amount: DecimalString;
  start_date: string;
  end_date: string;
  include_dividends: boolean;
  adjust_for_inflation: boolean;
  initial_price: DecimalString | null;
  final_price: DecimalString | null;
  shares_purchased: DecimalString | null;
  final_value: DecimalString | null;
  total_return_percentage: DecimalString | null;
  cagr_percentage: DecimalString | null;
  /** null means "not requested" OR "CPI data gap" — see formatNullableCurrency/formatNullablePercentage in src/lib/format. */
  inflation_adjusted_final_value: DecimalString | null;
  disclosed_splits: DisclosedSplit[];
  /**
   * Persisted at creation and read through on GET as of Founder Decision 014
   * (M7 Phase 3C-2, KI-021 resolved) — non-empty on every retrieval for a
   * `completed` simulation, except the rare pre-existing row a backfill
   * skipped for missing underlying price data (logged, not silent; see
   * docs/KNOWN_ISSUES.md KI-021). Still empty for `pending`/`failed`.
   */
  growth_series: GrowthSeriesPoint[];
  /** Exposed as of M7 Phase 3B (Founder Decision 014) — identical on POST and GET. */
  calculation_version: string;
  /** Non-null only when status is 'failed' — the descriptive message docs/api_design.md's MissingHistoricalDataError/CalculationError paths persist. */
  error_message: string | null;
  created_at: string;
}
