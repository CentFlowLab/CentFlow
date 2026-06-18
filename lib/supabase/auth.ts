import type { AuthSession, LoginCredentials, RegisterCredentials, User } from '@/lib/auth/types';
import { getGoogleAuthRedirectUri } from '@/lib/auth/google-oauth.config';
import {
  openGoogleOAuthBrowser,
  parseGoogleOAuthCallbackUrl,
} from '@/lib/auth/google-oauth';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { Platform } from 'react-native';

import { getSupabaseClient } from './client';
import { mapProfileToUser } from './mappers';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getNameFromMetadata(
  metadata: Record<string, unknown> | undefined,
  email: string,
): string | undefined {
  if (!metadata) return undefined;

  const candidates = [metadata.full_name, metadata.name];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const emailPrefix = email.split('@')[0];
  return emailPrefix || undefined;
}

function mapAuthUserFallback(
  id: string,
  email: string,
  name?: string,
  metadata?: Record<string, unknown>,
): User {
  const displayName = name ?? getNameFromMetadata(metadata, email) ?? 'Utilizador';
  return {
    id,
    name: displayName,
    email,
    currency: 'EUR',
    avatarInitials: getInitials(displayName),
  };
}

async function fetchProfileUser(
  userId: string,
  email: string,
  metadata?: Record<string, unknown>,
): Promise<User> {
  const supabase = getSupabaseClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, currency')
    .eq('id', userId)
    .maybeSingle();

  if (profile) {
    const user = mapProfileToUser(profile, email);
    const metadataName = getNameFromMetadata(metadata, email);
    if (metadataName && (user.name === 'Utilizador' || user.name === email.split('@')[0])) {
      user.name = metadataName;
      user.avatarInitials = getInitials(metadataName);
    }
    return user;
  }

  return mapAuthUserFallback(userId, email, undefined, metadata);
}

function toAuthSession(accessToken: string, user: User): AuthSession {
  return { token: accessToken, user };
}

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const supabase = getSupabaseClient();
  const email = credentials.email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: credentials.password,
  });

  if (error) throw new Error(error.message);
  if (!data.session?.access_token || !data.user) {
    throw new Error('Sessão Supabase inválida');
  }

  const user = await fetchProfileUser(data.user.id, data.user.email ?? email);
  return toAuthSession(data.session.access_token, user);
}

async function createSessionFromOAuthUrl(url: string): Promise<AuthSession> {
  const supabase = getSupabaseClient();
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(String(errorCode));
  }

  if (params.error_description) {
    throw new Error(String(params.error_description));
  }

  if (params.error) {
    throw new Error(String(params.error));
  }

  // Supabase usa PKCE por defeito — o callback traz ?code=, não access_token.
  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(String(params.code));

    if (error) throw new Error(error.message);
    if (!data.session?.access_token || !data.session.user) {
      throw new Error('Sessão Google inválida');
    }

    const user = await fetchProfileUser(
      data.session.user.id,
      data.session.user.email ?? '',
      data.session.user.user_metadata,
    );

    return toAuthSession(data.session.access_token, user);
  }

  // Fallback: fluxo implícito (legado) com tokens no URL.
  const tokens = parseGoogleOAuthCallbackUrl(url);

  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? '',
  });

  if (error) throw new Error(error.message);
  if (!data.session?.access_token || !data.session.user) {
    throw new Error('Sessão Google inválida');
  }

  const user = await fetchProfileUser(
    data.session.user.id,
    data.session.user.email ?? '',
    data.session.user.user_metadata,
  );

  return toAuthSession(data.session.access_token, user);
}

/** Web: redireciona a janela para o fluxo OAuth (callback em /auth/callback). */
export async function startGoogleOAuthWeb(): Promise<void> {
  const supabase = getSupabaseClient();
  const redirectTo = getGoogleAuthRedirectUri();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw new Error(error.message);
}

/** iOS/Android: abre browser in-app e completa sessão no callback. */
export async function signInWithGoogleNative(): Promise<AuthSession> {
  const supabase = getSupabaseClient();
  const redirectTo = getGoogleAuthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw new Error(error.message);
  if (!data.url) throw new Error('URL OAuth Google indisponível');

  const callbackUrl = await openGoogleOAuthBrowser(data.url);
  return createSessionFromOAuthUrl(callbackUrl);
}

export async function signInWithGoogle(): Promise<AuthSession | 'web-redirect'> {
  if (Platform.OS === 'web') {
    await startGoogleOAuthWeb();
    return 'web-redirect';
  }

  return signInWithGoogleNative();
}

export async function completeGoogleOAuthFromUrl(url: string): Promise<AuthSession> {
  return createSessionFromOAuthUrl(url);
}

export async function register(credentials: RegisterCredentials): Promise<AuthSession> {
  const supabase = getSupabaseClient();
  const email = credentials.email.trim().toLowerCase();
  const name = credentials.name.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: credentials.password,
    options: {
      data: { name, full_name: name },
    },
  });

  if (error) throw new Error(error.message);

  if (data.user && !data.session) {
    throw new Error(
      'Conta criada. Verifica o teu email para confirmar — ou desactiva «Confirm email» no Supabase para entrar logo após o registo.',
    );
  }

  if (!data.session?.access_token || !data.user) {
    throw new Error('Não foi possível iniciar sessão após o registo. Tenta entrar com email e password.');
  }

  const user = await fetchProfileUser(data.user.id, data.user.email ?? email);
  if (user.name === 'Utilizador' && name) {
    user.name = name;
    user.avatarInitials = getInitials(name);
  }

  return toAuthSession(data.session.access_token, user);
}

export async function getCurrentUser(): Promise<User> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user?.id) throw new Error('Utilizador não autenticado');

  return fetchProfileUser(data.user.id, data.user.email ?? '');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: 'centflow://reset-password',
  });

  if (error) throw new Error(error.message);
}

export async function completePasswordRecoveryFromUrl(url: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(String(errorCode));
  }

  if (params.error_description) {
    throw new Error(String(params.error_description));
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(String(params.code));
    if (error) throw new Error(error.message);
    return;
  }

  const accessToken = params.access_token ? String(params.access_token) : null;
  const refreshToken = params.refresh_token ? String(params.refresh_token) : null;

  if (!accessToken) {
    throw new Error('Link de recuperação inválido ou expirado.');
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });

  if (error) throw new Error(error.message);
}

export async function updatePassword(newPassword: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function restoreSession(): Promise<AuthSession | null> {
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    if (__DEV__) {
      console.warn('[supabase/auth] Cliente indisponível em restoreSession:', error);
    }
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    if (__DEV__) {
      console.warn('[supabase/auth] getSession erro:', error.message);
    }
    return null;
  }

  const session = data.session;
  if (!session?.access_token || !session.user) return null;

  try {
    const user = await fetchProfileUser(session.user.id, session.user.email ?? '');
    return toAuthSession(session.access_token, user);
  } catch {
    await supabase.auth.signOut();
    return null;
  }
}

export async function logout(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
