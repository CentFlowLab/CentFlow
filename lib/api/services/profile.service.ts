import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import type { User } from '@/lib/auth/types';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';
import { mapProfileToUser } from '@/lib/supabase/mappers';

import { loadStoredProfile, saveStoredProfile } from '@/lib/preferences/storage';
import type {
  ActiveSessionInfo,
  ChangePasswordInput,
  SupportedCurrency,
  UpdateProfileInput,
  UpdateProfileResult,
} from '@/lib/preferences/types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

async function updateMockProfile(
  userId: string,
  input: UpdateProfileInput,
  current: User,
): Promise<UpdateProfileResult> {
  const name = input.name.trim();
  const email = (input.email ?? current.email).trim().toLowerCase();

  await saveStoredProfile(userId, {
    name,
    email,
    currency: current.currency,
    avatarInitials: getInitials(name),
  });

  return { name, email };
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  current: User,
): Promise<UpdateProfileResult> {
  const name = input.name.trim();
  if (!name) throw new Error('O nome é obrigatório.');

  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return updateMockProfile(userId, input, current);
  }

  const supabase = getSupabaseClient();
  const email = input.email?.trim().toLowerCase();

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ name })
    .eq('id', userId);

  if (profileError) throw new Error(profileError.message);

  let resolvedEmail = current.email;

  if (email && email !== current.email) {
    const { error: emailError } = await supabase.auth.updateUser({ email });
    if (emailError) {
      throw new Error(
        emailError.message.includes('already')
          ? 'Este email já está em uso.'
          : 'Não foi possível atualizar o email. Verifica se a conta permite alterações.',
      );
    }
    resolvedEmail = email;
  }

  const { data: authData } = await supabase.auth.getUser();
  const authEmail = authData.user?.email ?? resolvedEmail;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, currency')
    .eq('id', userId)
    .single();

  if (profile) {
    const user = mapProfileToUser(profile, authEmail);
    return { name: user.name, email: user.email };
  }

  return { name, email: authEmail };
}

export async function updateProfileCurrency(
  userId: string,
  currency: SupportedCurrency,
  current: User,
): Promise<User> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    await saveStoredProfile(userId, { ...current, currency });
    return { ...current, currency };
  }

  const supabase = getSupabaseClient();

  const { error } = await supabase.from('profiles').update({ currency }).eq('id', userId);

  if (error) throw new Error(error.message);

  return { ...current, currency };
}

export async function changePassword(_input: ChangePasswordInput): Promise<void> {
  throw new Error(
    'Para alterar a password, usa "Redefinir password" em Segurança — enviamos um email seguro.',
  );
}

export async function getActiveSessions(): Promise<ActiveSessionInfo> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return {
      count: 1,
      currentDeviceLabel: 'Este dispositivo (modo demonstração)',
    };
  }

  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    return { count: 0, currentDeviceLabel: 'Nenhuma sessão ativa' };
  }

  return {
    count: 1,
    currentDeviceLabel: 'Este dispositivo',
  };
}

export async function loadMockProfileOverlay(userId: string, base: User): Promise<User> {
  const stored = await loadStoredProfile(userId);
  if (!stored) return base;

  return {
    ...base,
    ...stored,
    id: base.id,
    avatarInitials: getInitials(stored.name ?? base.name),
  };
}
