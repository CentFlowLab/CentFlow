import * as QueryParams from 'expo-auth-session/build/QueryParams';

export type OAuthCallbackParams = {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  errorDescription?: string;
};

/** Extrai parâmetros OAuth de query string e hash (#access_token=…). */
export function parseOAuthCallbackUrl(url: string): OAuthCallbackParams {
  const { params: queryParams, errorCode } = QueryParams.getQueryParams(url);

  let hashParams: Record<string, string> = {};
  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) {
    const hash = url.slice(hashIndex + 1);
    hashParams = Object.fromEntries(
      hash
        .split('&')
        .map((part) => part.split('='))
        .filter(([key]) => key)
        .map(([key, value = '']) => [key, decodeURIComponent(value.replace(/\+/g, ' '))]),
    );
  }

  const code = queryParams.code ?? hashParams.code;
  const accessToken = queryParams.access_token ?? hashParams.access_token;
  const refreshToken = queryParams.refresh_token ?? hashParams.refresh_token;
  const error =
    queryParams.error ??
    hashParams.error ??
    (errorCode ? String(errorCode) : undefined);
  const errorDescription =
    queryParams.error_description ?? hashParams.error_description;

  return {
    code: code ? String(code) : undefined,
    accessToken: accessToken ? String(accessToken) : undefined,
    refreshToken: refreshToken ? String(refreshToken) : undefined,
    error: error ? String(error) : undefined,
    errorDescription: errorDescription ? String(errorDescription) : undefined,
  };
}

export function assertOAuthCallbackNoError(params: OAuthCallbackParams): void {
  if (params.errorDescription) {
    throw new Error(params.errorDescription);
  }
  if (params.error) {
    throw new Error(params.error);
  }
}
