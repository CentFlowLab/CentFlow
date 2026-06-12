import { getAccessToken } from './token';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://api.centflow.app';

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
      throw new ApiError(
        'NETWORK_ERROR',
        0,
        { url, baseUrl: API_BASE_URL },
      );
    }

    throw error;
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }

    throw new ApiError(
      `API error: ${response.status} ${response.statusText}`,
      response.status,
      body,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
