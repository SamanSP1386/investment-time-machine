import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { ApiError } from './errors';
import type { ApiFailure, ApiSuccess } from '@/types/api';

function isApiFailureBody(data: unknown): data is ApiFailure {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { success?: unknown }).success === false &&
    'error' in data
  );
}

/**
 * Pure and exported specifically so it can be unit-tested directly against
 * constructed error shapes, rather than through axios's real transport
 * layer (a fake adapter's interaction with axios's validateStatus/rejection
 * pipeline is itself an implementation detail worth not depending on).
 */
export function normalizeApiError(error: AxiosError): ApiError {
  if (isApiFailureBody(error.response?.data)) {
    return new ApiError(error.response!.data.error);
  }
  return new ApiError({
    code: 'NETWORK_ERROR',
    message: error.message || 'The request could not be completed.',
  });
}

/**
 * withCredentials is required: session tokens are delivered exclusively via
 * httpOnly cookies (Founder Decision 002) — this client never reads or
 * attaches a token itself.
 */
export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(normalizeApiError(error))
);

/**
 * The single entry point every endpoint function in src/lib/api/endpoints
 * goes through — unwraps {success:true,data} and guarantees every failure
 * (backend error envelope or network-level) surfaces as one ApiError type.
 */
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<ApiSuccess<T>>(config);
  return response.data.data;
}
