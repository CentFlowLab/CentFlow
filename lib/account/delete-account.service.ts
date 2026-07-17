import { queryClient } from '@/lib/api';
import { clearSession } from '@/lib/auth/auth.service';
import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { clearPrivacyConsent } from '@/lib/privacy/consent.storage';
import { secureStorage, SECURE_KEYS } from '@/lib/security/secureStorage';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';

import { DELETE_ACCOUNT_CONFIRMATION_PHRASE } from './delete-account.constants';

export type DeleteAccountInput = {
  email: string;
  password?: string;
  /** Confirmação textual para contas OAuth (ex.: ELIMINAR). */
  confirmationPhrase?: string;
};

export type DeleteAccountResult = {
  mock: boolean;
};

/** Contas só com Google/Apple não têm password local — usam frase de confirmação. */
export async function userRequiresPasswordForDeletion(): Promise<boolean> {
  if (isMockAuthEnabled()) return true;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return true;

  const identities = data.user.identities ?? [];
  if (identities.length === 0) return true;

  return identities.some((identity) => identity.provider === 'email');
}

export async function verifyPasswordBeforeDelete(
  email: string,
  password: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) {
    throw new Error('Password incorrecta. Verifica e tenta novamente.');
  }
}

export async function deleteAccount(input: DeleteAccountInput): Promise<DeleteAccountResult> {
  if (isMockAuthEnabled()) {
    await clearLocalAccountData();
    return { mock: true };
  }

  if (!isSupabaseEnabled()) {
    throw new Error('Eliminação de conta indisponível sem ligação ao servidor.');
  }

  const supabase = getSupabaseClient();

  if (input.password?.trim()) {
    await verifyPasswordBeforeDelete(input.email, input.password);
  } else if (input.confirmationPhrase?.trim().toUpperCase() !== DELETE_ACCOUNT_CONFIRMATION_PHRASE) {
    throw new Error(`Escreve ${DELETE_ACCOUNT_CONFIRMATION_PHRASE} para confirmar a eliminação.`);
  }

  const { error: rpcError } = await supabase.rpc('delete_own_account');
  if (rpcError) {
    if (rpcError.message.includes('not_authenticated')) {
      throw new Error('Sessão inválida. Inicia sessão novamente.');
    }
    throw new Error('Não foi possível eliminar a conta. Tenta mais tarde.');
  }

  await clearLocalAccountData();

  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Conta já removida — ignorar erro de signOut
  }

  return { mock: false };
}

export async function clearLocalAccountData(): Promise<void> {
  await clearSession();
  await clearPrivacyConsent();
  await Promise.all([
    secureStorage.deleteItem(SECURE_KEYS.biometricEnabled),
    secureStorage.deleteItem(SECURE_KEYS.appPinHash),
    secureStorage.deleteItem(SECURE_KEYS.migrationVersion),
  ]);
  queryClient.clear();
}
