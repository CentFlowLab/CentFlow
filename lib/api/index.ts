/**
 * Barrel mínimo — evita dependências circulares com services/errors.
 * Importa serviços e helpers directamente dos submódulos:
 *   @/lib/api/errors
 *   @/lib/api/services/transaction.service
 *   etc.
 */
export { queryClient } from './queryClient';
