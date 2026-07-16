import { Platform } from 'react-native';

import { isAppleSignInSupportedOnPlatform } from '@/lib/auth/apple-sign-in.platform';
import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { isSupabaseEnabled } from '@/lib/supabase';

/** Sign in with Apple só em iOS com Supabase ou mock dev. */
export function isAppleSignInPlatformSupported(): boolean {
  return isAppleSignInSupportedOnPlatform(Platform.OS);
}

export async function checkAppleSignInAvailable(): Promise<boolean> {
  if (!isAppleSignInPlatformSupported()) return false;
  if (isMockAuthEnabled()) return true;
  if (!isSupabaseEnabled()) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AppleAuthentication = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}
