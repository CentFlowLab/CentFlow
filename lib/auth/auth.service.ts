import { apiFetch } from '@/lib/api/client';
import { loadMockProfileOverlay } from '@/lib/api/services/profile.service';
import { getAccessToken, setAccessToken } from '@/lib/api/token';
import { isRealDataOnlyVariant } from '@/lib/config/app-variant';
import { isSupabaseEnabled, supabaseAuth } from '@/lib/supabase';

import { AUTH_ENDPOINTS } from './constants';
import {
  isAppleSignInSupportedOnDevice,
  signInWithAppleNative,
} from './apple-auth';
import {
  createMockSession,
  createMockAppleSession,
  createMockGoogleSession,
  isMockAuthEnabled,
} from './mock-auth';
import { deleteToken, loadToken, saveToken } from './storage';
import type {
  AuthSession,
  LoginCredentials,
  RawAuthResponse,
  RawUser,
  RegisterCredentials,
  User,
} from './types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Normaliza utilizador da API para o formato interno. */
export function normalizeUser(raw: RawUser): User {
  const name = raw.name ?? raw.fullName ?? 'Utilizador';
  const id = String(raw.id ?? raw._id ?? '');

  return {
    id,
    name,
    email: raw.email ?? '',
    currency: raw.currency ?? 'EUR',
    avatarInitials: raw.avatarInitials ?? getInitials(name),
  };
}

/** Extrai token e user de diferentes formatos de resposta da API. */
function normalizeAuthResponse(raw: RawAuthResponse): AuthSession {
  const nested = raw.data;
  const token =
    raw.token ??
    raw.accessToken ??
    raw.access_token ??
    nested?.token ??
    nested?.accessToken ??
    nested?.access_token;

  const userRaw = raw.user ?? nested?.user;

  if (!token || !userRaw) {
    throw new Error('Resposta de autenticação inválida');
  }

  return {
    token,
    user: normalizeUser(userRaw),
  };
}

async function persistSession(session: AuthSession): Promise<AuthSession> {
  await saveToken(session.token);
  setAccessToken(session.token);
  return session;
}

function assertSupabaseAuthBackend(): void {
  if (isRealDataOnlyVariant() && !isSupabaseEnabled()) {
    throw new Error(
      'Supabase não configurado. Define EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY na build Beta.',
    );
  }
}

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  if (isMockAuthEnabled()) {
    return persistSession(createMockSession(credentials));
  }

  assertSupabaseAuthBackend();

  if (isSupabaseEnabled()) {
    return persistSession(await supabaseAuth.login(credentials));
  }

  const raw = await apiFetch<RawAuthResponse>(AUTH_ENDPOINTS.login, {
    method: 'POST',
    body: JSON.stringify({
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    }),
  });

  return persistSession(normalizeAuthResponse(raw));
}

export async function register(credentials: RegisterCredentials): Promise<AuthSession> {
  if (isMockAuthEnabled()) {
    return persistSession(createMockSession(credentials));
  }

  assertSupabaseAuthBackend();

  if (isSupabaseEnabled()) {
    return persistSession(await supabaseAuth.register(credentials));
  }

  const raw = await apiFetch<RawAuthResponse>(AUTH_ENDPOINTS.register, {
    method: 'POST',
    body: JSON.stringify({
      name: credentials.name.trim(),
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    }),
  });

  return persistSession(normalizeAuthResponse(raw));
}

export type GoogleSignInResult = AuthSession | 'web-redirect';

export async function loginWithGoogle(): Promise<GoogleSignInResult> {
  if (isMockAuthEnabled()) {
    return persistSession(createMockGoogleSession());
  }

  assertSupabaseAuthBackend();

  if (isSupabaseEnabled()) {
    const result = await supabaseAuth.signInWithGoogle();
    if (result === 'web-redirect') {
      return 'web-redirect';
    }
    return persistSession(result);
  }

  throw new Error(
    'Login com Google requer Supabase. Define EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY e desativa EXPO_PUBLIC_MOCK_AUTH.',
  );
}

export async function completeGoogleOAuthCallback(url: string): Promise<AuthSession> {
  if (!isSupabaseEnabled()) {
    throw new Error('Callback OAuth só disponível com Supabase ativo.');
  }

  const session = await supabaseAuth.completeGoogleOAuthFromUrl(url);
  return persistSession(session);
}

export async function loginWithApple(): Promise<AuthSession> {
  if (isMockAuthEnabled()) {
    return persistSession(createMockAppleSession());
  }

  assertSupabaseAuthBackend();

  const supported = await isAppleSignInSupportedOnDevice();
  if (!supported) {
    throw new Error('Sign in with Apple não está disponível neste dispositivo.');
  }

  if (isSupabaseEnabled()) {
    const { identityToken, fullName } = await signInWithAppleNative();
    return persistSession(await supabaseAuth.signInWithAppleIdToken(identityToken, fullName));
  }

  throw new Error('Login com Apple requer Supabase configurado.');
}

export async function deleteAccount(): Promise<void> {
  if (isMockAuthEnabled()) {
    await clearSession();
    return;
  }

  if (isSupabaseEnabled()) {
    await supabaseAuth.deleteOwnAccount();
    await clearSession();
    return;
  }

  throw new Error('Eliminação de conta indisponível neste ambiente.');
}

export async function getCurrentUser(): Promise<User> {
  if (isMockAuthEnabled()) {
    const token = getAccessToken();
    if (token === 'mock-apple-token') {
      return loadMockProfileOverlay('mock-apple-user-1', {
        id: 'mock-apple-user-1',
        name: 'Utilizador Apple',
        email: 'apple.user@privaterelay.appleid.com',
        avatarInitials: 'UA',
        currency: 'EUR',
      });
    }
    if (token === 'mock-google-token') {
      return loadMockProfileOverlay('mock-google-user-1', {
        id: 'mock-google-user-1',
        name: 'Utilizador Google',
        email: 'google.user@gmail.com',
        avatarInitials: 'UG',
        currency: 'EUR',
      });
    }
    if (token === 'mock-dev-token') {
      return loadMockProfileOverlay('mock-user-1', {
        id: 'mock-user-1',
        name: 'Utilizador Dev',
        email: 'dev@centflow.app',
        avatarInitials: 'UD',
        currency: 'EUR',
      });
    }
  }

  if (isSupabaseEnabled()) {
    return supabaseAuth.getCurrentUser();
  }

  const raw = await apiFetch<RawUser | { user: RawUser }>(AUTH_ENDPOINTS.me);

  if ('user' in raw && raw.user) {
    return normalizeUser(raw.user);
  }

  return normalizeUser(raw as RawUser);
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (isSupabaseEnabled()) {
    await supabaseAuth.requestPasswordReset(email);
    return;
  }

  await apiFetch(AUTH_ENDPOINTS.forgotPassword, {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

export async function completePasswordRecoveryFromUrl(url: string): Promise<void> {
  if (!isSupabaseEnabled()) {
    throw new Error('Recuperação de password só disponível com Supabase.');
  }

  await supabaseAuth.completePasswordRecoveryFromUrl(url);
}

export async function updatePasswordAfterRecovery(newPassword: string): Promise<void> {
  if (isSupabaseEnabled()) {
    await supabaseAuth.updatePassword(newPassword);
    return;
  }

  throw new Error('Alteração de password indisponível neste ambiente.');
}

/** Carrega token guardado e valida sessão. */
export async function restoreSession(): Promise<AuthSession | null> {
  if (isSupabaseEnabled()) {
    try {
      const session = await supabaseAuth.restoreSession();
      if (!session) {
        await clearSession();
        return null;
      }
      setAccessToken(session.token);
      await saveToken(session.token);
      return session;
    } catch (error) {
      if (__DEV__) {
        console.warn('[auth] restoreSession (Supabase) falhou:', error);
      }
      await clearSession();
      return null;
    }
  }

  const token = await loadToken();
  if (!token) return null;

  setAccessToken(token);

  try {
    const user = await getCurrentUser();
    return { token, user };
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  setAccessToken(null);
  await deleteToken();
}

export async function logout(): Promise<void> {
  if (isSupabaseEnabled()) {
    await supabaseAuth.logout();
  }
  await clearSession();
}

/** Termina sessão em todos os dispositivos ligados à conta. */
export async function logoutAllDevices(): Promise<void> {
  if (isSupabaseEnabled()) {
    await supabaseAuth.logoutAllSessions();
  }
  await clearSession();
}
