import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Armazenamento chave-valor para preferências e pequenos estados não sensíveis.
 * Não usar para dados financeiros (Fase 1 usa uma base de dados local) nem para
 * segredos/tokens (usar armazenamento seguro do sistema).
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const NAMESPACE = 'centflow:';

export function createAsyncStorageStore(namespace = NAMESPACE): KeyValueStore {
  return {
    getItem: (key) => AsyncStorage.getItem(namespace + key),
    setItem: (key, value) => AsyncStorage.setItem(namespace + key, value),
    removeItem: (key) => AsyncStorage.removeItem(namespace + key),
  };
}

export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial));
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
}

export const appStorage: KeyValueStore = createAsyncStorageStore();
