import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import { apiClient, apiRequest, normalizeApiError } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

describe('apiRequest', () => {
  it('unwraps a successful envelope', async () => {
    const result = await apiRequest<{ hello: string }>({
      url: '/x',
      // A fake transport (a supported axios technique) so the real
      // interceptor chain in client.ts runs against a controlled response.
      adapter: async (config) => ({
        data: { success: true, data: { hello: 'world' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }),
    });
    expect(result).toEqual({ hello: 'world' });
  });

  it('is instantiated with credentials enabled for httpOnly session cookies', () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it('has a bounded request timeout so a hung connection cannot wait forever (A6)', () => {
    expect(apiClient.defaults.timeout).toBe(15_000);
  });
});

describe('normalizeApiError', () => {
  it('converts a backend error envelope into a typed ApiError', () => {
    const axiosError = new AxiosError('Request failed with status code 404');
    axiosError.response = {
      data: { success: false, error: { code: 'ASSET_NOT_FOUND', message: 'No such asset', request_id: 'r1' } },
      status: 404,
      statusText: 'Not Found',
      headers: {},
      // @ts-expect-error -- config is irrelevant to this unit test
      config: {},
    };

    const result = normalizeApiError(axiosError);

    expect(result).toBeInstanceOf(ApiError);
    expect(result.code).toBe('ASSET_NOT_FOUND');
    expect(result.requestId).toBe('r1');
    expect(result.message).toBe('No such asset');
  });

  it('classifies a transport-level failure (no response reached the server) as NETWORK_ERROR', () => {
    const axiosError = new AxiosError('Network Error');
    const result = normalizeApiError(axiosError);
    expect(result.code).toBe('NETWORK_ERROR');
    expect(result.message).toBe('Network Error');
  });

  it('falls back to NETWORK_ERROR for a malformed response body', () => {
    const axiosError = new AxiosError('timeout of 10000ms exceeded');
    axiosError.response = {
      data: '<html>502 Bad Gateway</html>',
      status: 502,
      statusText: 'Bad Gateway',
      headers: {},
      // @ts-expect-error -- config is irrelevant to this unit test
      config: {},
    };
    expect(normalizeApiError(axiosError).code).toBe('NETWORK_ERROR');
  });
});
