/**
 * Barrel mínimo — evita dependências circulares com services/errors.
 * Importa serviços e helpers directamente dos submódulos:
 *   @/lib/api/errors
 *   @/lib/api/services/transaction.service
 *   etc.
 */
export { apiFetch, ApiError } from './client';
export { API_ENDPOINTS, receiptEndpoints } from './endpoints';
export { queryClient } from './queryClient';
export { queryKeys } from './keys';
export { getAccessToken, setAccessToken } from './token';
