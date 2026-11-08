import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { authStorage } from './auth-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null | undefined;

/**
 * Cliente Supabase (só com a chave publicável; o acesso aos dados é protegido por RLS).
 * Devolve `null` se o projeto não estiver configurado: a app continua a funcionar sem conta.
 */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!url || !publishableKey) {
    client = null;
    return client;
  }
  client = createClient(url, publishableKey, {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Os links de confirmação e recuperação são tratados explicitamente em /auth/callback.
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  if (Platform.OS !== 'web') {
    const auth = client.auth;
    AppState.addEventListener('change', (state) => {
      if (state === 'active') void auth.startAutoRefresh();
      else void auth.stopAutoRefresh();
    });
  }
  return client;
}
