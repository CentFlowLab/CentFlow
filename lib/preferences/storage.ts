import * as SecureStore from 'expo-secure-store';

import type { User } from '@/lib/auth/types';

import { DEFAULT_PREFERENCES } from './config';
import { normalizeThemeId } from '@/lib/theme/themes';
import type { UserPreferences } from './types';

const PREFS_KEY_PREFIX = 'centflow_prefs_';
const PROFILE_KEY_PREFIX = 'centflow_profile_';

function prefsKey(userId: string) {
  return `${PREFS_KEY_PREFIX}${userId}`;
}

function profileKey(userId: string) {
  return `${PROFILE_KEY_PREFIX}${userId}`;
}

export async function loadStoredPreferences(userId: string): Promise<UserPreferences> {
  try {
    const raw = await SecureStore.getItemAsync(prefsKey(userId));
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const merged = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } as UserPreferences;
    return { ...merged, themeId: normalizeThemeId(merged.themeId) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function saveStoredPreferences(
  userId: string,
  preferences: UserPreferences,
): Promise<void> {
  await SecureStore.setItemAsync(prefsKey(userId), JSON.stringify(preferences));
}

export async function loadStoredProfile(userId: string): Promise<Partial<User> | null> {
  try {
    const raw = await SecureStore.getItemAsync(profileKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as Partial<User>;
  } catch {
    return null;
  }
}

export async function saveStoredProfile(userId: string, profile: Partial<User>): Promise<void> {
  await SecureStore.setItemAsync(profileKey(userId), JSON.stringify(profile));
}
