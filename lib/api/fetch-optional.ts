import { ApiError, apiFetch } from '@/lib/api/client';

/** Fetch que retorna null em 404/204 — útil para endpoints opcionais no fallback composto. */
export async function fetchOptional<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 204)) {
      return null;
    }
    throw error;
  }
}
