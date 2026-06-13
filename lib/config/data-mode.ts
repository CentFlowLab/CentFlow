import { isMockAuthEnabled } from '@/lib/auth/mock-auth';

/**
 * Dados mock/demo para MVP quando o backend não está disponível.
 * - EXPO_PUBLIC_USE_MOCK=true  → força mock
 * - EXPO_PUBLIC_MOCK_AUTH=true → mock (comportamento dev existente)
 * - Por defeito em __DEV__ com mock auth activo
 */
export function shouldUseMockData(): boolean {
  if (process.env.EXPO_PUBLIC_USE_MOCK === 'true') return true;
  if (process.env.EXPO_PUBLIC_USE_MOCK === 'false') return false;
  return isMockAuthEnabled();
}

export type DataSource = 'live' | 'mock';
