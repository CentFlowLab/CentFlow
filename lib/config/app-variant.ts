export type AppVariant = 'development' | 'beta' | 'production';

/**
 * Variante da app definida em build time (eas.json → EXPO_PUBLIC_APP_VARIANT).
 * - development: mock permitido, Expo Go / dev client
 * - beta: apenas Supabase / dados reais (testes internos)
 * - production: lojas
 */
export function getAppVariant(): AppVariant {
  const raw = process.env.EXPO_PUBLIC_APP_VARIANT?.trim();

  if (raw === 'development' || raw === 'beta' || raw === 'production') {
    return raw;
  }

  return __DEV__ ? 'development' : 'production';
}

export function isDevelopmentVariant(): boolean {
  return getAppVariant() === 'development';
}

export function isBetaVariant(): boolean {
  return getAppVariant() === 'beta';
}

export function isProductionVariant(): boolean {
  return getAppVariant() === 'production';
}

/** Beta e produção nunca usam dados de demonstração. */
export function isRealDataOnlyVariant(): boolean {
  const variant = getAppVariant();
  return variant === 'beta' || variant === 'production';
}
