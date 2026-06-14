import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Database } from './database.types';
import { assertSupabaseConfig, getSupabaseAnonKey, getSupabaseUrl } from './config';

const SUPABASE_AUTH_STORAGE_KEY = 'centflow-supabase-auth';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return Promise.resolve(localStorage.getItem(key));
      }
      return Promise.resolve(null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

let client: SupabaseClient<Database> | null = null;
let initError: Error | null = null;

function logSupabaseInitFailure(error: unknown): void {
  if (__DEV__) {
    console.error('[Supabase] Falha ao criar cliente:', error);
  }
}

export function getSupabaseInitError(): Error | null {
  return initError;
}

/** Retorna null em vez de lançar quando a configuração Supabase é inválida. */
export function tryGetSupabaseClient(): SupabaseClient<Database> | null {
  try {
    return getSupabaseClient();
  } catch {
    return null;
  }
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;

  if (initError) {
    throw initError;
  }

  try {
    assertSupabaseConfig();
    client = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        storage: ExpoSecureStoreAdapter,
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    });
  } catch (error) {
    initError =
      error instanceof Error
        ? error
        : new Error('Não foi possível inicializar o Supabase.');
    logSupabaseInitFailure(initError);
    throw initError;
  }

  return client;
}

export function resetSupabaseClient(): void {
  client = null;
  initError = null;
}
