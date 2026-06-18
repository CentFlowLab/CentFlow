import * as LocalAuthentication from 'expo-local-authentication';

import { logSecurityEvent } from './securityLogger';
import { secureStorage, SECURE_KEYS } from './secureStorage';

export type BiometricSupport = {
  available: boolean;
  enrolled: boolean;
  types: LocalAuthentication.AuthenticationType[];
};

export async function getBiometricSupport(): Promise<BiometricSupport> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  return {
    available: hasHardware && enrolled,
    enrolled,
    types,
  };
}

export async function authenticateWithBiometrics(
  promptMessage = 'Desbloqueia a CentFlow',
): Promise<boolean> {
  const support = await getBiometricSupport();
  if (!support.available) return true;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
    fallbackLabel: 'Usar código do dispositivo',
  });

  if (!result.success) {
    logSecurityEvent('biometric_failed', { error: result.error }, 'warn');
  }

  return result.success;
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  await secureStorage.setItem(SECURE_KEYS.biometricEnabled, enabled ? '1' : '0');
}

export async function isBiometricLockEnabled(): Promise<boolean> {
  const value = await secureStorage.getItem(SECURE_KEYS.biometricEnabled);
  return value === '1';
}
