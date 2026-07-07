import { describe, expect, it } from 'vitest';
import { ApiError, ERROR_COPY, getErrorCopy } from '@/lib/api/errors';
import type { ApiErrorCode } from '@/types/api';

describe('ApiError', () => {
  it('carries code, message, and request_id from the error body', () => {
    const error = new ApiError({ code: 'ASSET_NOT_FOUND', message: 'No such asset', request_id: 'req-1' });
    expect(error.code).toBe('ASSET_NOT_FOUND');
    expect(error.message).toBe('No such asset');
    expect(error.requestId).toBe('req-1');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('getErrorCopy', () => {
  it('has an entry for every documented backend error code', () => {
    const codes: ApiErrorCode[] = [
      'VALIDATION_ERROR',
      'INVALID_INVESTMENT_AMOUNT',
      'INVALID_DATE_RANGE',
      'ASSET_NOT_FOUND',
      'MISSING_HISTORICAL_DATA',
      'CALCULATION_ERROR',
      'SIMULATION_NOT_FOUND',
      'FORBIDDEN',
      'UNAUTHORIZED',
      'RATE_LIMIT_EXCEEDED',
      'DATABASE_ERROR',
      'INTERNAL_SERVER_ERROR',
      'NETWORK_ERROR',
    ];
    for (const code of codes) {
      expect(ERROR_COPY[code]).toBeDefined();
      expect(getErrorCopy(code).title.length).toBeGreaterThan(0);
    }
  });

  it('falls back to a generic message for an unrecognized code', () => {
    expect(getErrorCopy('NOT_A_REAL_CODE' as ApiErrorCode)).toEqual(ERROR_COPY.INTERNAL_SERVER_ERROR);
  });
});
