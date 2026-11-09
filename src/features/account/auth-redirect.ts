import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Origem pública das páginas de autenticação (site estático em miven.pt, ADR-034).
 * No nativo, os links dos emails abrem uma página web que funciona em qualquer dispositivo e
 * reencaminha para `miven://auth/...` com o mesmo código. Não usar `Linking.createURL`: nas
 * compilações nativas devolve `miven:///auth/callback` (três barras), que não coincide com a
 * lista de redirects do Supabase e fazia o servidor cair no site por omissão.
 */
export const PUBLIC_AUTH_ORIGIN = 'https://miven.pt';

type AuthPath = '/auth/callback' | '/auth/reset-password';

/** Prefixo da app web (ex.: `/app` em miven.pt/app, ADR-037); vazio em desenvolvimento. */
function webBasePath(): string {
  const base = (Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl;
  return base ? `/${base.replace(/^\/+|\/+$/g, '')}` : '';
}

/** Endereço de retorno dos emails e do OAuth. Tem de estar autorizado no Supabase. */
export function authRedirectUrl(path: AuthPath): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${webBasePath()}${path}`;
  }
  return `${PUBLIC_AUTH_ORIGIN}${path}`;
}
