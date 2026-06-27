import * as SecureStore from 'expo-secure-store';

import { userScopedSecureKey } from './secure-store-key';

/** Lê um objecto JSON local com escopo por utilizador (tolerante a falhas). */
export async function readUserJson<T>(scope: string, userId: string): Promise<T | null> {
  if (!userId) return null;
  try {
    const raw = await SecureStore.getItemAsync(userScopedSecureKey(scope, userId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Escreve um objecto JSON local com escopo por utilizador (tolerante a falhas). */
export async function writeUserJson<T>(scope: string, userId: string, value: T): Promise<void> {
  if (!userId) return;
  try {
    await SecureStore.setItemAsync(userScopedSecureKey(scope, userId), JSON.stringify(value));
  } catch {
    // best-effort — flags locais não devem quebrar o fluxo
  }
}
