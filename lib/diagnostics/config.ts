import { getAppVariant } from '@/lib/config/app-variant';

/** Activo em development e beta — fase de testes. */
export function isDiagnosticsEnabled(): boolean {
  const variant = getAppVariant();
  return variant === 'development' || variant === 'beta';
}
