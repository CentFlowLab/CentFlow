import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ONBOARDING_KEY = 'centflow_onboarding_completed';

let memoryFlag = false;

export async function getOnboardingCompleted(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return memoryFlag;
  }

  const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
  return value === 'true';
}

export async function setOnboardingCompleted(): Promise<void> {
  if (Platform.OS === 'web') {
    memoryFlag = true;
    return;
  }

  await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
}
