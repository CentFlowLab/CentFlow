import { API_BASE_URL, ApiError } from '@/lib/api/client';
import { getAccessToken } from '@/lib/api/token';

type UploadOptions = {
  method?: 'POST' | 'PUT' | 'PATCH';
};

/**
 * Fetch multipart/form-data — não define Content-Type (boundary automático).
 * Usado para upload de talões: POST /receipts
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: UploadOptions = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method: options.method ?? 'POST',
      headers,
      body: formData,
    });
  } catch (error) {
    const isNetworkError =
      error instanceof TypeError ||
      (error instanceof Error &&
        (error.message === 'Failed to fetch' ||
          error.message.includes('Network request failed')));

    if (isNetworkError) {
      throw new ApiError('NETWORK_ERROR', 0, { url, baseUrl: API_BASE_URL });
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
