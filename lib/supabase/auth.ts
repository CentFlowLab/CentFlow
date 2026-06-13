import type { AuthSession, LoginCredentials, RegisterCredentials, User } from '@/lib/auth/types';

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

function mapAuthUserFallback(
  id: string,
  email: string,
  name?: string,
): User {
  const displayName = name ?? email.split('@')[0] ?? 'Utilizador';
  return {
    id,
    name: displayName,
    email,
    currency: 'EUR',
    avatarInitials: getInitials(displayName),
  };
}

async function fetchProfileUser(userId: string, email: string): Promise<User> {
  const supabase = getSupabaseClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, currency')
    .eq('id', userId)
    .maybeSingle();

  if (profile) {
    return mapProfileToUser(profile, email);
  }

  return mapAuthUserFallback(userId, email);
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

export async function register(credentials: RegisterCredentials): Promise<AuthSession> {
  const supabase = getSupabaseClient();
  const email = credentials.email.trim().toLowerCase();
  const name = credentials.name.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: credentials.password,
    options: {
      data: { name },
    },
  });

  if (error) throw new Error(error.message);

  if (!data.session?.access_token || !data.user) {
    throw new Error(
      'Conta criada. Confirma o email no Supabase (ou desactiva confirmações no dashboard) antes de entrar.',
    );
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

export async function restoreSession(): Promise<AuthSession | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.getSession();
  if (error) return null;

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
