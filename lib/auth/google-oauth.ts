import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { GOOGLE_AUTH_CALLBACK_PATH, getGoogleAuthRedirectUri } from './google-oauth.config';
import { parseOAuthCallbackUrl } from './oauth-callback';

WebBrowser.maybeCompleteAuthSession();

export type GoogleOAuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export function isOAuthCallbackUrl(url: string): boolean {
  if (!url) return false;

  const lower = url.toLowerCase();
  if (lower.includes(GOOGLE_AUTH_CALLBACK_PATH)) return true;

  const parsed = parseOAuthCallbackUrl(url);
  return Boolean(parsed.code || parsed.accessToken || parsed.error);
}

/** @deprecated Usa parseOAuthCallbackUrl — mantido para compatibilidade. */
export function parseGoogleOAuthCallbackUrl(url: string): GoogleOAuthTokens {
  const parsed = parseOAuthCallbackUrl(url);

  if (parsed.errorDescription) {
    throw new Error(parsed.errorDescription);
  }

  if (parsed.error) {
    throw new Error(parsed.error);
  }

  if (!parsed.accessToken) {
    throw new Error('Tokens OAuth em falta no callback');
  }

  return {
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
  };
}

export async function openGoogleOAuthBrowser(authUrl: string): Promise<string> {
  const redirectTo = getGoogleAuthRedirectUri();

  if (Platform.OS === 'android') {
    void WebBrowser.warmUpAsync();
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo, {
    showInRecents: true,
    ...(Platform.OS === 'android' ? { createTask: false } : {}),
  });

  if (Platform.OS === 'android') {
    void WebBrowser.coolDownAsync();
  }

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Login com Google cancelado');
  }

  if (result.type !== 'success' || !result.url) {
    throw new Error('Login com Google falhou');
  }

  return result.url;
}

/** Resolve URL de callback (cold start ou evento de deep link). */
export async function resolveOAuthCallbackUrl(
  initialUrl: string | null | undefined,
  eventUrl: string | null | undefined,
): Promise<string | null> {
  const candidates = [eventUrl, initialUrl].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );

  for (const url of candidates) {
    if (isOAuthCallbackUrl(url)) return url;
  }

  return null;
}

