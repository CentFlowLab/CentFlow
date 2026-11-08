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

/** iOS nativo quando disponível; na web só se o projeto tiver o fornecedor Apple configurado. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS === 'ios') return AppleAuthentication.isAvailableAsync();
  return Platform.OS === 'web' && process.env.EXPO_PUBLIC_AUTH_APPLE_ENABLED === 'true';
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
