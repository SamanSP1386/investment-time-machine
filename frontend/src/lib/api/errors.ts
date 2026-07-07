import type { ApiErrorBody, ApiErrorCode } from '@/types/api';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly requestId?: string;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.requestId = body.request_id;
  }
}

export interface ErrorCopy {
  title: string;
  description: string;
}

/**
 * One central error-code -> copy table (frontend_design_system.md
 * "shared components" list) so no screen invents its own phrasing for the
 * same backend error. Plain language, states what happened, never exposes
 * system detail (docs/api_design.md's own error-message-safety rule).
 *
 * Deliberately NOT used for AI-unavailable: per Founder Decision 003, an AI
 * failure returns a normal successful response with a fixed safe message,
 * not one of these codes — routing it through this table would visually
 * misrepresent a deliberately-safe backend behavior as an error.
 */
export const ERROR_COPY: Record<ApiErrorCode, ErrorCopy> = {
  VALIDATION_ERROR: {
    title: 'Check the form and try again',
    description: 'Some of the information provided isn’t valid.',
  },
  INVALID_INVESTMENT_AMOUNT: {
    title: 'Enter a valid investment amount',
    description: 'The investment amount must be a positive number.',
  },
  INVALID_DATE_RANGE: {
    title: 'Check the selected dates',
    description: 'The end date must be after the start date.',
  },
  ASSET_NOT_FOUND: {
    title: 'Asset not found',
    description: 'We couldn’t find that asset. Try a different symbol.',
  },
  MISSING_HISTORICAL_DATA: {
    title: 'Historical data unavailable',
    description: 'This asset doesn’t have price data for the selected date range.',
  },
  CALCULATION_ERROR: {
    title: 'Something went wrong',
    description: 'The simulation couldn’t be calculated. Please try again.',
  },
  SIMULATION_NOT_FOUND: {
    title: 'Simulation not found',
    description: 'This simulation doesn’t exist or may have been removed.',
  },
  FORBIDDEN: {
    title: 'Access restricted',
    description: 'This simulation belongs to a different account.',
  },
  UNAUTHORIZED: {
    title: 'Sign in required',
    description: 'Please sign in to continue.',
  },
  RATE_LIMIT_EXCEEDED: {
    title: 'Slow down a little',
    description: 'You’ve reached the limit for now. Please try again shortly.',
  },
  DATABASE_ERROR: {
    title: 'Something went wrong',
    description: 'We couldn’t complete that request. Please try again.',
  },
  INTERNAL_SERVER_ERROR: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
  },
  NETWORK_ERROR: {
    title: 'Connection problem',
    description: 'We couldn’t reach the server. Check your connection and try again.',
  },
};

export function getErrorCopy(code: ApiErrorCode): ErrorCopy {
  return ERROR_COPY[code] ?? ERROR_COPY.INTERNAL_SERVER_ERROR;
}
