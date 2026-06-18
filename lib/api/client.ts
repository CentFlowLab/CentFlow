import { getAccessToken } from './token';
import { getRuntimePublicEnv } from '@/lib/config/runtime-env';
import { logAppError } from '@/lib/diagnostics';

const LEGACY_PLACEHOLDER_API = 'https://api.centflow.app';

function resolveApiBaseUrl(): string {
  const configured = getRuntimePublicEnv('EXPO_PUBLIC_API_URL');

  if (configured && !configured.includes('api.centflow.app')) {
    return configured;
  }

  // Supabase não expõe /dashboard nem /net-worth — dados vêm via SDK (lib/supabase).
  return configured || LEGACY_PLACEHOLDER_API;
}

export const API_BASE_URL = resolveApiBaseUrl();

export function isLegacyPlaceholderApiUrl(): boolean {
  return API_BASE_URL.includes('api.centflow.app');
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(path: string, params?: RequestOptions['params']) {
  const url = new URL(path.startsWith('http') ? path : `${API_BASE_URL}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, headers, ...init } = options;
  const url = buildUrl(path, params);

  const token = getAccessToken();
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (headers) {
    const extra =
      headers instanceof Headers
        ? Object.fromEntries(headers.entries())
        : Array.isArray(headers)
          ? Object.fromEntries(headers)
          : headers;
    Object.assign(requestHeaders, extra);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: requestHeaders,
    });
  } catch (error) {
    const isNetworkError =
      error instanceof TypeError ||
      (error instanceof Error &&
        (error.message === 'Failed to fetch' ||
          error.message.includes('Network request failed')));

    if (isNetworkError) {
      const apiError = new ApiError('NETWORK_ERROR', 0, { url, baseUrl: API_BASE_URL });
      logAppError('api-fetch', apiError, { url, method: init.method ?? 'GET' });
      throw apiError;
    }

    logAppError('api-fetch', error, { url, method: init.method ?? 'GET' });
    throw error;
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }

    const apiError = new ApiError(
      `API error: ${response.status} ${response.statusText}`,
      response.status,
      body,
    );
    logAppError('api-fetch', apiError, { url, status: response.status });
    throw apiError;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
