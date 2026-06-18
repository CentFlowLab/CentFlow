import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';

import { DEFAULT_PREFERENCES } from './config';
import { normalizeCountryCode } from './locale.data';
import { loadStoredPreferences, saveStoredPreferences } from './storage';
import type { UserPreferences } from './types';

type PreferencesRow = {
  user_id: string;
  push_notifications: boolean;
  warranty_alerts: boolean;
  budget_alerts: boolean;
  weekly_digest: boolean;
  email_important?: boolean;
  email_weekly_digest?: boolean;
  email_warranty_alerts?: boolean;
  email_subscription_renewals?: boolean;
  email_credit_payments?: boolean;
  email_tips_insights?: boolean;
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
    emailImportant: row.email_important ?? true,
    emailWeeklyDigest: row.email_weekly_digest ?? row.weekly_digest ?? true,
    emailWarrantyAlerts: row.email_warranty_alerts ?? row.warranty_alerts ?? true,
    emailSubscriptionRenewals: row.email_subscription_renewals ?? true,
    emailCreditPayments: row.email_credit_payments ?? true,
    emailTipsInsights: row.email_tips_insights ?? true,
    region: normalizeCountryCode(row.region),
    themeId: row.theme_id,
    biometricsEnabled: row.biometrics_enabled,
  };
}

function toSupabaseRegion(region: string): UserPreferences['region'] {
  const code = normalizeCountryCode(region);
  if (code === 'PT') return 'portugal';
  if (code === 'BR') return 'brasil';
  if (code === 'ES') return 'espanha';
  return 'outro';
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
    ...(prefs.emailImportant !== undefined && { email_important: prefs.emailImportant }),
    ...(prefs.emailWeeklyDigest !== undefined && { email_weekly_digest: prefs.emailWeeklyDigest }),
    ...(prefs.emailWarrantyAlerts !== undefined && {
      email_warranty_alerts: prefs.emailWarrantyAlerts,
    }),
    ...(prefs.emailSubscriptionRenewals !== undefined && {
      email_subscription_renewals: prefs.emailSubscriptionRenewals,
    }),
    ...(prefs.emailCreditPayments !== undefined && {
      email_credit_payments: prefs.emailCreditPayments,
    }),
    ...(prefs.emailTipsInsights !== undefined && { email_tips_insights: prefs.emailTipsInsights }),
    ...(prefs.region !== undefined && { region: toSupabaseRegion(prefs.region) }),
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
    return mapRow(inserted as unknown as PreferencesRow);
  }

  return mapRow(data as unknown as PreferencesRow);
}

async function updateSupabasePreferences(
  userId: string,
  patch: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(toRow(userId, patch) as never, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as unknown as PreferencesRow);
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
