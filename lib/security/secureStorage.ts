import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Chaves permitidas — nunca guardar passwords em texto claro. */
export const SECURE_KEYS = {
  appPinHash: 'centflow_app_pin_hash',
  biometricEnabled: 'centflow_biometric_enabled',
  migrationVersion: 'centflow_migration_version',
  privacyConsent: 'centflow_privacy_consent_v1',
} as const;

export type SecureKey = (typeof SECURE_KEYS)[keyof typeof SECURE_KEYS];

async function setItem(key: SecureKey, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function getItem(key: SecureKey): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(key);
    }
    return null;
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: SecureKey): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureStorage = {
  setItem,
  getItem,
  deleteItem,
};
