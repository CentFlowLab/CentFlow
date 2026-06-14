import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { isRealDataOnlyVariant } from '@/lib/config/app-variant';

/**
 * Dados mock/demo — apenas em desenvolvimento.
 * Beta e produção usam sempre dados reais (Supabase).
 */
export function shouldUseMockData(): boolean {
  if (isRealDataOnlyVariant()) return false;

  if (process.env.EXPO_PUBLIC_USE_MOCK === 'true') {
    return true;
  }
  if (process.env.EXPO_PUBLIC_USE_MOCK === 'false') return false;

  return isMockAuthEnabled();
}

export type DataSource = 'live' | 'mock';
