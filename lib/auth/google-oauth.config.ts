import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';

import { isRealDataOnlyVariant } from '@/lib/config/app-variant';
import { getSupabaseGoogleOAuthCallbackUrl } from '@/lib/auth/supabase-oauth.config';

export const GOOGLE_AUTH_CALLBACK_PATH = 'auth/callback';

const APP_SCHEME =
  (typeof Constants.expoConfig?.scheme === 'string' && Constants.expoConfig.scheme) || 'centflow';

const PRODUCTION_REDIRECT = `${APP_SCHEME}://${GOOGLE_AUTH_CALLBACK_PATH}`;

/** URI de redirect que a app passa ao Supabase (deep link). */
export function getGoogleAuthRedirectUri(): string {
  if (isRealDataOnlyVariant() || !__DEV__) {
    return PRODUCTION_REDIRECT;
  }

  return makeRedirectUri({
    scheme: APP_SCHEME,
    path: GOOGLE_AUTH_CALLBACK_PATH,
    preferLocalhost: false,
  });
}

/** Lista de redirects a adicionar no dashboard Supabase (dev + EAS). */
export function getGoogleAuthRedirectAllowList(): string[] {
  const primary = getGoogleAuthRedirectUri();
  const supabaseCallback = getSupabaseGoogleOAuthCallbackUrl();

  return [
    primary,
    PRODUCTION_REDIRECT,
    supabaseCallback,
    `${APP_SCHEME}://**`,
    'exp://**',
    'exp+centflow://**',
  ];
}
