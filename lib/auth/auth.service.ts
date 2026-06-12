import { apiFetch } from '@/lib/api/client';
import { getAccessToken, setAccessToken } from '@/lib/api/token';

import { AUTH_ENDPOINTS } from './constants';
import { createMockSession, isMockAuthEnabled } from './mock-auth';
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

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  if (isMockAuthEnabled()) {
    return persistSession(createMockSession(credentials));
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

export async function getCurrentUser(): Promise<User> {
  if (isMockAuthEnabled() && getAccessToken() === 'mock-dev-token') {
    return {
      id: 'mock-user-1',
      name: 'Utilizador Dev',
      email: 'dev@centflow.app',
      avatarInitials: 'UD',
      currency: 'EUR',
    };
  }

  const raw = await apiFetch<RawUser | { user: RawUser }>(AUTH_ENDPOINTS.me);

  if ('user' in raw && raw.user) {
    return normalizeUser(raw.user);
  }

  return normalizeUser(raw as RawUser);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiFetch(AUTH_ENDPOINTS.forgotPassword, {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

/** Carrega token guardado e valida com /auth/me. */
export async function restoreSession(): Promise<AuthSession | null> {
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
  await clearSession();
}
