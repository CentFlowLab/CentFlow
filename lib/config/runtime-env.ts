import Constants from 'expo-constants';

/** Fallback Beta — alinhado com eas.json / app.config.js (chaves públicas client-side). */
const BETA_PUBLIC_DEFAULTS = {
  supabaseUrl: 'https://oxhjfwmhcwadlltinlck.supabase.co',
  supabaseAnonKey: 'sb_publishable_nY3Bqe4UcgbtIteavz6H1Q_kgquHcDQ',
  mockAuth: 'false',
} as const;

type RuntimeExtra = {
  appVariant?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  mockAuth?: string;
};

function readExtra(): RuntimeExtra {
  return (Constants.expoConfig?.extra ?? {}) as RuntimeExtra;
}

function readVariantRaw(): string {
  const extra = readExtra();
  return extra.appVariant?.trim() || process.env.EXPO_PUBLIC_APP_VARIANT?.trim() || '';
}

/** Detecta Beta sem depender de app-variant (evita ciclo de imports). */
function isBetaRuntime(): boolean {
  const variant = readVariantRaw();
  if (variant === 'beta') return true;
  if (variant === 'development' || variant === 'production') return false;

  const appName = Constants.expoConfig?.name ?? '';
  return appName.includes('Beta');
}

function betaFallback(name: string): string {
  if (!isBetaRuntime()) return '';

  switch (name) {
    case 'EXPO_PUBLIC_SUPABASE_URL':
      return BETA_PUBLIC_DEFAULTS.supabaseUrl;
    case 'EXPO_PUBLIC_SUPABASE_ANON_KEY':
      return BETA_PUBLIC_DEFAULTS.supabaseAnonKey;
    case 'EXPO_PUBLIC_MOCK_AUTH':
      return BETA_PUBLIC_DEFAULTS.mockAuth;
    default:
      return '';
  }
}

/**
 * Lê variáveis públicas embutidas na build nativa (`extra`) ou no bundle JS (`process.env`).
 * O `extra` da build nativa sobrevive melhor a OTA quando o export não traz env no EAS.
 */
export function getRuntimePublicEnv(name: string): string {
  const extra = readExtra();

  switch (name) {
    case 'EXPO_PUBLIC_APP_VARIANT':
      return readVariantRaw() || (isBetaRuntime() ? 'beta' : '');
    case 'EXPO_PUBLIC_SUPABASE_URL':
      return (
        extra.supabaseUrl?.trim() ||
        process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
        betaFallback(name)
      );
    case 'EXPO_PUBLIC_SUPABASE_ANON_KEY':
      return (
        extra.supabaseAnonKey?.trim() ||
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
        betaFallback(name)
      );
    case 'EXPO_PUBLIC_MOCK_AUTH':
      return (
        extra.mockAuth?.trim() ||
        process.env.EXPO_PUBLIC_MOCK_AUTH?.trim() ||
        betaFallback(name)
      );
    default:
      return process.env[name]?.trim() || '';
  }
}
