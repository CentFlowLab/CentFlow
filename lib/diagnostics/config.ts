import { getAppVariant } from '@/lib/config/app-variant';

/**
 * CentFlow Doctor — apenas builds de desenvolvimento local.
 * Nunca em beta/produção (testers externos não veem ferramentas internas).
 */
export function isDiagnosticsEnabled(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  return getAppVariant() === 'development';
}
