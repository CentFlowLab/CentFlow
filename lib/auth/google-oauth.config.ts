import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';

import { isRealDataOnlyVariant } from '@/lib/config/app-variant';

export const GOOGLE_AUTH_CALLBACK_PATH = 'auth/callback';

const APP_SCHEME =
  (typeof Constants.expoConfig?.scheme === 'string' && Constants.expoConfig.scheme) || 'centflow';

const PRODUCTION_REDIRECT = `${APP_SCHEME}://${GOOGLE_AUTH_CALLBACK_PATH}`;

/** URI de redirect registado no Supabase (Auth → URL Configuration). */
export function getGoogleAuthRedirectUri(): string {
  // Beta/produção: URI fixa para coincidir com o dashboard Supabase e Google Cloud.
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

  return [
    primary,
    PRODUCTION_REDIRECT,
    `${APP_SCHEME}://**`,
    'exp://**',
    'exp+centflow://**',
  ];
}
