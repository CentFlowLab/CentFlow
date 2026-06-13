import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';

import { DEFAULT_PREFERENCES } from './config';
import { loadStoredPreferences, saveStoredPreferences } from './storage';
import type { UserPreferences } from './types';

type PreferencesRow = {
  user_id: string;
  push_notifications: boolean;
  warranty_alerts: boolean;
  budget_alerts: boolean;
  weekly_digest: boolean;
  region: UserPreferences['region'];
  theme_id: UserPreferences['themeId'];
  biometrics_enabled: boolean;
};

function mapRow(row: PreferencesRow): UserPreferences {
  return {
    pushNotifications: row.push_notifications,
    warrantyAlerts: row.warranty_alerts,
    budgetAlerts: row.budget_alerts,
    weeklyDigest: row.weekly_digest,
    region: row.region,
    themeId: row.theme_id,
    biometricsEnabled: row.biometrics_enabled,
  };
}

function toRow(userId: string, prefs: Partial<UserPreferences>) {
  return {
    user_id: userId,
    ...(prefs.pushNotifications !== undefined && {
      push_notifications: prefs.pushNotifications,
    }),
    ...(prefs.warrantyAlerts !== undefined && { warranty_alerts: prefs.warrantyAlerts }),
    ...(prefs.budgetAlerts !== undefined && { budget_alerts: prefs.budgetAlerts }),
    ...(prefs.weeklyDigest !== undefined && { weekly_digest: prefs.weeklyDigest }),
    ...(prefs.region !== undefined && { region: prefs.region }),
    ...(prefs.themeId !== undefined && { theme_id: prefs.themeId }),
    ...(prefs.biometricsEnabled !== undefined && {
      biometrics_enabled: prefs.biometricsEnabled,
    }),
  };
}

async function fetchSupabasePreferences(userId: string): Promise<UserPreferences> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    const { data: inserted, error: insertError } = await supabase
      .from('user_preferences')
      .insert({ user_id: userId })
      .select('*')
      .single();

    if (insertError) throw new Error(insertError.message);
    return mapRow(inserted as PreferencesRow);
  }

  return mapRow(data as PreferencesRow);
}

async function updateSupabasePreferences(
  userId: string,
  patch: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(toRow(userId, patch), { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as PreferencesRow);
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferences> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return loadStoredPreferences(userId);
  }

  try {
    return await fetchSupabasePreferences(userId);
  } catch {
    return loadStoredPreferences(userId);
  }
}

export async function updateUserPreferences(
  userId: string,
  patch: Partial<UserPreferences>,
): Promise<UserPreferences> {
  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    const current = await loadStoredPreferences(userId);
    const next = { ...current, ...patch };
    await saveStoredPreferences(userId, next);
    return next;
  }

  try {
    return await updateSupabasePreferences(userId, patch);
  } catch {
    const current = await loadStoredPreferences(userId);
    const next = { ...current, ...patch };
    await saveStoredPreferences(userId, next);
    return next;
  }
}

export function getDefaultPreferences(): UserPreferences {
  return { ...DEFAULT_PREFERENCES };
}
