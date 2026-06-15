import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { getRuntimePublicEnv } from '@/lib/config/runtime-env';

const SUPABASE_URL = getRuntimePublicEnv('EXPO_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = getRuntimePublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

/** Supabase activo quando há URL+key e mock auth está desligado */
export function isSupabaseEnabled(): boolean {
  if (isMockAuthEnabled()) return false;
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** Google Sign-In disponível com Supabase ou em modo mock (dev). */
export function isGoogleSignInAvailable(): boolean {
  return isMockAuthEnabled() || isSupabaseEnabled();
}

export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  return SUPABASE_ANON_KEY;
}

export function assertSupabaseConfig(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase não configurado. Define EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
}
