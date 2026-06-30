import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { isSupabaseEnabled } from '@/lib/supabase';

/** Apple Sign In disponível em iOS com Supabase (ou mock dev). */
export function isAppleSignInAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  if (isMockAuthEnabled()) return true;
  return isSupabaseEnabled();
}

export async function isAppleSignInSupportedOnDevice(): Promise<boolean> {
  if (!isAppleSignInAvailable()) return false;
  if (isMockAuthEnabled()) return true;
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithAppleNative(): Promise<{
  identityToken: string;
  fullName?: string;
}> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Não foi possível obter credencial Apple. Tenta outra vez.');
  }

  const given = credential.fullName?.givenName?.trim();
  const family = credential.fullName?.familyName?.trim();
  const fullName = [given, family].filter(Boolean).join(' ') || undefined;

  return {
    identityToken: credential.identityToken,
    fullName,
  };
}
