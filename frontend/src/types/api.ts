/**
 * Types mirror docs/api_design.md and backend/app/models/enums.py exactly.
 * Financial figures (investment_amount, prices, CAGR, etc.) stay `string`
 * end-to-end — they are Decimal-serialized by the backend and must never
 * be parsed into a JS number for arithmetic. The frontend only displays
 * what the API returns (`.claude/CODING_STANDARDS.md`: "presentation-only").
 */

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
 * Per-point shape is inferred, not directly confirmed by docs/api_design.md
 * (which documents growth_series's presence but not its exact field names) —
 * it is always an empty array in practice today (KI-021). Verify this shape
 * against a real response once FD-008's persistence work lands, before any
 * chart component is built against it.
 */
export interface GrowthSeriesPoint {
  date: string;
  value: string;
}

export interface DisclosedSplit {
  date: string;
  split_ratio: string;
}

export interface SimulationCreateInput {
  asset_symbol: string;
  investment_amount: string;
  start_date: string;
  end_date: string;
  include_dividends: boolean;
  adjust_for_inflation: boolean;
}

export interface SimulationResponse {
  id: string;
  status: SimulationStatus;
  asset_symbol: string;
  investment_amount: string;
  start_date: string;
  end_date: string;
  include_dividends: boolean;
  adjust_for_inflation: boolean;
  initial_price: string;
  final_price: string;
  shares_purchased: string;
  final_value: string;
  total_return_percentage: string;
  cagr_percentage: string;
  inflation_adjusted_final_value: string | null;
  disclosed_splits: DisclosedSplit[];
  /** Empty on GET-after-creation until KI-021/FD-008 land — never assume populated. */
  growth_series: GrowthSeriesPoint[];
  created_at: string;
}
