import type { SupabaseClient, User } from '@supabase/supabase-js';
import { Linking, Platform } from 'react-native';

import { authRedirectUrl } from './auth-redirect';

/** Quem entrou só com a Google confirma a eliminação da conta com uma entrada recente. */
export const GOOGLE_REAUTH_WINDOW_MS = 10 * 60 * 1000;

/**
 * Só com o fornecedor Google ligado no Supabase (`EXPO_PUBLIC_AUTH_GOOGLE_ENABLED=true`, ADR-055).
 * Sem ele, o botão levaria a um erro do servidor.
 */
export function isGoogleSignInAvailable(): boolean {
  return process.env.EXPO_PUBLIC_AUTH_GOOGLE_ENABLED === 'true';
}

/**
 * Entrar com a Google por OAuth (PKCE). Na web, o browser vai e volta a `/auth/callback`. No
 * telemóvel, abre o browser e o regresso usa o mesmo caminho dos emails: `miven.pt/auth/callback`
 * reencaminha para `miven://auth/callback?code=…` e a app troca o código (o verificador ficou
 * guardado neste aparelho). Sem módulos nativos novos.
 */
export async function performGoogleSignIn(client: SupabaseClient): Promise<void> {
  const redirectTo = authRedirectUrl('/auth/callback');
  if (Platform.OS === 'web') {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
    return;
  }
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No OAuth url');
  await Linking.openURL(data.url);
}

/** Conta só com a Google (sem palavra-passe). */
export function isGoogleOnly(user: Pick<User, 'app_metadata'>): boolean {
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [
    user.app_metadata?.provider as string,
  ];
  return providers.includes('google') && !providers.includes('email');
}

/** Entrou há pouco tempo: serve de confirmação para eliminar a conta. */
export function signedInRecently(
  user: Pick<User, 'last_sign_in_at'>,
  now: number = Date.now(),
): boolean {
  if (!user.last_sign_in_at) return false;
  return now - new Date(user.last_sign_in_at).getTime() <= GOOGLE_REAUTH_WINDOW_MS;
}
