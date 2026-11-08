import * as Linking from 'expo-linking';

/** Esquema em `app.json`. Usado se o manifesto Expo não estiver disponível (ex.: testes). */
const APP_SCHEME = 'centflow';

/** Endereço de retorno dos emails e OAuth. Tem de estar autorizado no Supabase. */
export function authRedirectUrl(path: '/auth/callback' | '/auth/reset-password'): string {
  try {
    const url = Linking.createURL(path, { scheme: APP_SCHEME });
    if (url) return url;
  } catch {
    // Sem Constants.expoConfig (Jest) ou sem esquema resolvido: o valor coincide com `app.json`.
  }
  return `${APP_SCHEME}://${path.replace(/^\//, '')}`;
}
