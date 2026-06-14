import { getSupabaseUrl } from '@/lib/supabase';

const FALLBACK_SUPABASE_CALLBACK =
  'https://oxhjfwmhcwadlltinlck.supabase.co/auth/v1/callback';

/** Callback OAuth que o Supabase envia ao Google (Web client → Authorized redirect URIs). */
export function getSupabaseGoogleOAuthCallbackUrl(): string {
  const base = getSupabaseUrl().replace(/\/$/, '');
  if (!base) return FALLBACK_SUPABASE_CALLBACK;
  return `${base}/auth/v1/callback`;
}
