import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/types/api';

/**
 * Shared axios instance. The auth store registers the token getter and the
 * unauthorized handler at startup (see features/auth/store.ts) so this module
 * has no dependency on React or the store.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

export function configureApiClient(options: {
  getToken: () => string | null;
  onUnauthorized: () => void;
}) {
  getToken = options.getToken;
  onUnauthorized = options.onUnauthorized;
}

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    // An expired/invalid session anywhere except the login call logs the user out.
    const isLoginCall = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginCall) onUnauthorized();
    return Promise.reject(toApiError(error));
  },
);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly fieldErrors: Record<string, string[] | undefined> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data?.error;
    if (body) {
      return new ApiError(body.message, error.response!.status, body.code, body.details ?? {});
    }
    if (!error.response) {
      return new ApiError('Cannot reach the server. Is the API running?', 0, 'NETWORK_ERROR');
    }
    return new ApiError(error.message, error.response.status, 'UNKNOWN');
  }
  return new ApiError('Unexpected error', 0, 'UNKNOWN');
}

export function getErrorMessage(error: unknown): string {
  return toApiError(error).message;
}
