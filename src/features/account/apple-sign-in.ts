import type { SupabaseClient } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { authRedirectUrl } from './auth-redirect';

export class AppleSignInCancelledError extends Error {
  constructor() {
    super('Apple sign-in cancelled');
    this.name = 'AppleSignInCancelledError';
  }
}

/**
 * Só com o fornecedor Apple ligado no Supabase (`EXPO_PUBLIC_AUTH_APPLE_ENABLED=true`). Sem ele,
 * o botão falharia no iPhone (o sistema diz que está disponível) e na web. No iOS, também é
 * preciso que o sistema o suporte (e a capacidade Sign in with Apple na assinatura).
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (process.env.EXPO_PUBLIC_AUTH_APPLE_ENABLED !== 'true') return false;
  if (Platform.OS === 'ios') return AppleAuthentication.isAvailableAsync();
  return Platform.OS === 'web';
}

export async function performAppleSignIn(client: SupabaseClient): Promise<void> {
  if (Platform.OS === 'ios') {
    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code?: string }).code === 'ERR_REQUEST_CANCELED'
      ) {
        throw new AppleSignInCancelledError();
      }
      throw error;
    }
    if (!credential.identityToken) throw new Error('No identityToken');
    const { error } = await client.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;
    const given = credential.fullName?.givenName;
    const family = credential.fullName?.familyName;
    if (given || family) {
      await client.auth.updateUser({
        data: {
          full_name: [given, family].filter(Boolean).join(' '),
          given_name: given,
          family_name: family,
        },
      });
    }
    return;
  }

  const { error } = await client.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: authRedirectUrl('/auth/callback') },
  });
  if (error) throw error;
}
