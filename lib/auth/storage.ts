import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { TOKEN_STORAGE_KEY } from './constants';

/**
 * Armazenamento seguro do token.
 * SecureStore em nativo; localStorage em web (apenas dev — não usar em produção web sem alternativa).
 */
export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
    return;
  }
  await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
}

export async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    }
    return null;
  }
  return SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
}

export async function deleteToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
}
