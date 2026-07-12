import Constants from 'expo-constants';

/** Supabase CentFlow — URL e anon key públicos (client-side). */
const CENTFLOW_SUPABASE_DEFAULTS = {
  supabaseUrl: 'https://oxhjfwmhcwadlltinlck.supabase.co',
  supabaseAnonKey: 'sb_publishable_nY3Bqe4UcgbtIteavz6H1Q_kgquHcDQ',
  mockAuth: 'false',
} as const;

type RuntimeExtra = {
  appVariant?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  mockAuth?: string;
  sentryDsn?: string;
};

function readExtra(): RuntimeExtra {
  return (Constants.expoConfig?.extra ?? {}) as RuntimeExtra;
}

function readVariantRaw(): string {
  const extra = readExtra();
  return extra.appVariant?.trim() || process.env.EXPO_PUBLIC_APP_VARIANT?.trim() || '';
}

/**
 * Beta, produção ou release sem variant explícita (ex.: iOS TestFlight).
 * Não aplica em development explícito.
 */
function isRealDataRuntime(): boolean {
  const variant = readVariantRaw();
  if (variant === 'beta' || variant === 'production') return true;
  if (variant === 'development') return false;

  const appName = Constants.expoConfig?.name ?? '';
  if (appName.includes('Beta')) return true;

  return !__DEV__;
}

function realDataFallback(name: string): string {
  if (!isRealDataRuntime()) return '';

  switch (name) {
    case 'EXPO_PUBLIC_SUPABASE_URL':
      return CENTFLOW_SUPABASE_DEFAULTS.supabaseUrl;
    case 'EXPO_PUBLIC_SUPABASE_ANON_KEY':
      return CENTFLOW_SUPABASE_DEFAULTS.supabaseAnonKey;
    case 'EXPO_PUBLIC_MOCK_AUTH':
      return CENTFLOW_SUPABASE_DEFAULTS.mockAuth;
    default:
      return '';
  }
}

/**
 * Lê variáveis públicas embutidas na build nativa (`extra`) ou no bundle JS (`process.env`).
 * Fallback para Supabase em builds release quando OTA/build não embutem env.
 */
export function getRuntimePublicEnv(name: string): string {
  const extra = readExtra();

  switch (name) {
    case 'EXPO_PUBLIC_APP_VARIANT': {
      const value = readVariantRaw();
      if (value) return value;
      return isRealDataRuntime() && !__DEV__ ? 'production' : '';
    }
    case 'EXPO_PUBLIC_SUPABASE_URL':
      return (
        extra.supabaseUrl?.trim() ||
        process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
        realDataFallback(name)
      );
    case 'EXPO_PUBLIC_SUPABASE_ANON_KEY':
      return (
        extra.supabaseAnonKey?.trim() ||
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
        realDataFallback(name)
      );
    case 'EXPO_PUBLIC_MOCK_AUTH':
      return (
        extra.mockAuth?.trim() ||
        process.env.EXPO_PUBLIC_MOCK_AUTH?.trim() ||
        realDataFallback(name)
      );
    case 'EXPO_PUBLIC_SENTRY_DSN':
      return (
        extra.sentryDsn?.trim() ||
        process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ||
        ''
      );
    default:
      return process.env[name]?.trim() || '';
  }
}
