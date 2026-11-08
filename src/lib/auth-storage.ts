import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type AuthStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/** O Keychain/Keystore pode recusar valores grandes; a sessão é guardada em partes. */
const CHUNK_SIZE = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

async function readCount(key: string): Promise<number> {
  const value = await SecureStore.getItemAsync(countKey(key), OPTIONS);
  return value === null ? 0 : Number.parseInt(value, 10) || 0;
}

/** Sessão no armazenamento seguro do sistema (Keychain no iOS, Keystore no Android). */
export const secureAuthStorage: AuthStorage = {
  async getItem(key) {
    const count = await readCount(key);
    if (count === 0) return null;
    const parts: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, index), OPTIONS);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key, value) {
    const previous = await readCount(key);
    const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let index = 0; index < count; index += 1) {
      await SecureStore.setItemAsync(
        chunkKey(key, index),
        value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
        OPTIONS,
      );
    }
    await SecureStore.setItemAsync(countKey(key), String(count), OPTIONS);
    for (let index = count; index < previous; index += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, index), OPTIONS);
    }
  },
  async removeItem(key) {
    const count = await readCount(key);
    await SecureStore.deleteItemAsync(countKey(key), OPTIONS);
    for (let index = 0; index < count; index += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, index), OPTIONS);
    }
  },
};

/**
 * Web: o browser não tem um cofre equivalente; a sessão fica no `localStorage` da origem
 * (o mesmo que o Supabase usa por omissão). O token de acesso expira em pouco tempo.
 */
const webAuthStorage: AuthStorage = {
  getItem: async (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: async (key, value) => globalThis.localStorage?.setItem(key, value),
  removeItem: async (key) => globalThis.localStorage?.removeItem(key),
};

export const authStorage: AuthStorage = Platform.OS === 'web' ? webAuthStorage : secureAuthStorage;
