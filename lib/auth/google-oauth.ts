import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { GOOGLE_AUTH_CALLBACK_PATH, getGoogleAuthRedirectUri } from './google-oauth.config';

WebBrowser.maybeCompleteAuthSession();

export type GoogleOAuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

export function isOAuthCallbackUrl(url: string): boolean {
  if (!url) return false;

  const lower = url.toLowerCase();
  if (lower.includes(GOOGLE_AUTH_CALLBACK_PATH)) return true;

  const { params } = QueryParams.getQueryParams(url);
  return Boolean(params.code || params.access_token || params.error || params.error_description);
}

export function parseGoogleOAuthCallbackUrl(url: string): GoogleOAuthTokens {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  if (params.error_description) {
    throw new Error(String(params.error_description));
  }

  if (params.error) {
    throw new Error(String(params.error));
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken) {
    throw new Error('Tokens OAuth em falta no callback');
  }

  return {
    accessToken,
    refreshToken: refreshToken || undefined,
  };
}

export async function openGoogleOAuthBrowser(authUrl: string): Promise<string> {
  const redirectTo = getGoogleAuthRedirectUri();

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo, {
    showInRecents: true,
    ...(Platform.OS === 'android' ? { createTask: false } : {}),
  });

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
