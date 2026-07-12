import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';

import { normalizeThemeId } from '@/lib/theme/themes';

import { clampCategorySpendAlertThreshold } from '@/lib/domain/financial/category-spend-anomaly';

import { DEFAULT_PREFERENCES } from './config';
import { normalizeCountryCode } from './locale.data';
import { loadStoredPreferences, saveStoredPreferences } from './storage';
import type { UserPreferences } from './types';

type PreferencesRow = {
  user_id: string;
  push_notifications: boolean;
  warranty_alerts: boolean;
  budget_alerts: boolean;
  category_spend_alerts?: boolean;
  category_spend_alert_threshold?: number;
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
  prioritize_debt_amortization?: boolean;
};

function mapRow(row: PreferencesRow): UserPreferences {
  return {
    pushNotifications: row.push_notifications,
    warrantyAlerts: row.warranty_alerts,
    budgetAlerts: row.budget_alerts,
    categorySpendAlerts: row.category_spend_alerts ?? true,
    categorySpendAlertThreshold: clampCategorySpendAlertThreshold(
      row.category_spend_alert_threshold ?? DEFAULT_PREFERENCES.categorySpendAlertThreshold,
    ),
    weeklyDigest: row.weekly_digest,
    emailImportant: row.email_important ?? true,
    emailWeeklyDigest: row.email_weekly_digest ?? row.weekly_digest ?? true,
    emailWarrantyAlerts: row.email_warranty_alerts ?? row.warranty_alerts ?? true,
    emailSubscriptionRenewals: row.email_subscription_renewals ?? true,
    emailCreditPayments: row.email_credit_payments ?? true,
    emailTipsInsights: row.email_tips_insights ?? true,
    region: normalizeCountryCode(row.region),
    themeId: normalizeThemeId(row.theme_id),
    biometricsEnabled: row.biometrics_enabled,
    prioritizeDebtAmortization: row.prioritize_debt_amortization ?? true,
    recommendationDebtVsInvestment: DEFAULT_PREFERENCES.recommendationDebtVsInvestment,
    recommendationSurplusAllocation: DEFAULT_PREFERENCES.recommendationSurplusAllocation,
    recommendationCategoryMedian: DEFAULT_PREFERENCES.recommendationCategoryMedian,
    recommendationEmergencyFund: DEFAULT_PREFERENCES.recommendationEmergencyFund,
    recommendationHabitInsight: DEFAULT_PREFERENCES.recommendationHabitInsight,
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
    ...(prefs.categorySpendAlerts !== undefined && {
      category_spend_alerts: prefs.categorySpendAlerts,
    }),
    ...(prefs.categorySpendAlertThreshold !== undefined && {
      category_spend_alert_threshold: clampCategorySpendAlertThreshold(
        prefs.categorySpendAlertThreshold,
      ),
    }),
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
    ...(prefs.prioritizeDebtAmortization !== undefined && {
      prioritize_debt_amortization: prefs.prioritizeDebtAmortization,
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
  const local = await loadStoredPreferences(userId);

  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    return local;
  }

  try {
    const remote = await fetchSupabasePreferences(userId);
    return {
      ...remote,
      recommendationDebtVsInvestment:
        local.recommendationDebtVsInvestment ?? remote.recommendationDebtVsInvestment,
      recommendationSurplusAllocation:
        local.recommendationSurplusAllocation ?? remote.recommendationSurplusAllocation,
      recommendationCategoryMedian:
        local.recommendationCategoryMedian ?? remote.recommendationCategoryMedian,
      recommendationEmergencyFund:
        local.recommendationEmergencyFund ?? remote.recommendationEmergencyFund,
      recommendationHabitInsight:
        local.recommendationHabitInsight ?? remote.recommendationHabitInsight,
    };
  } catch {
    return local;
  }
}

export async function updateUserPreferences(
  userId: string,
  patch: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const recommendationPatch = {
    ...(patch.recommendationDebtVsInvestment !== undefined && {
      recommendationDebtVsInvestment: patch.recommendationDebtVsInvestment,
    }),
    ...(patch.recommendationSurplusAllocation !== undefined && {
      recommendationSurplusAllocation: patch.recommendationSurplusAllocation,
    }),
    ...(patch.recommendationCategoryMedian !== undefined && {
      recommendationCategoryMedian: patch.recommendationCategoryMedian,
    }),
    ...(patch.recommendationEmergencyFund !== undefined && {
      recommendationEmergencyFund: patch.recommendationEmergencyFund,
    }),
    ...(patch.recommendationHabitInsight !== undefined && {
      recommendationHabitInsight: patch.recommendationHabitInsight,
    }),
  };

  if (isMockAuthEnabled() || !isSupabaseEnabled()) {
    const current = await loadStoredPreferences(userId);
    const next = { ...current, ...patch };
    await saveStoredPreferences(userId, next);
    return next;
  }

  try {
    const next = await updateSupabasePreferences(userId, patch);
    if (Object.keys(recommendationPatch).length > 0) {
      const local = await loadStoredPreferences(userId);
      await saveStoredPreferences(userId, { ...local, ...next, ...recommendationPatch });
      return { ...next, ...recommendationPatch };
    }
    return next;
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
