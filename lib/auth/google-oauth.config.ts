import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';

export const GOOGLE_AUTH_CALLBACK_PATH = 'auth/callback';

const APP_SCHEME =
  (typeof Constants.expoConfig?.scheme === 'string' && Constants.expoConfig.scheme) || 'centflow';

/** URI de redirect registado no Supabase (Auth → URL Configuration). */
export function getGoogleAuthRedirectUri(): string {
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
    `${APP_SCHEME}://${GOOGLE_AUTH_CALLBACK_PATH}`,
    `${APP_SCHEME}://**`,
    'exp://**',
    'exp+centflow://**',
  ];
}
