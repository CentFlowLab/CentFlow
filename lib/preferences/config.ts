import { DEFAULT_THEME_ID, THEME_DEFINITIONS } from '@/lib/theme/themes';
import type { ThemeId } from '@/lib/theme/types';

import type { UserPreferences } from './types';
import {
  getCountryLabel,
  getCurrencyLabel,
  getLocaleForCountry,
  normalizeCountryCode,
} from './locale.data';

import { DEFAULT_CATEGORY_SPEND_ALERT_THRESHOLD } from '@/lib/domain/financial/category-spend-anomaly';

export const DEFAULT_PREFERENCES = {
  pushNotifications: true,
  warrantyAlerts: true,
  budgetAlerts: false,
  categorySpendAlerts: true,
  categorySpendAlertThreshold: DEFAULT_CATEGORY_SPEND_ALERT_THRESHOLD,
  weeklyDigest: true,
  emailImportant: true,
  emailWeeklyDigest: true,
  emailWarrantyAlerts: true,
  emailSubscriptionRenewals: true,
  emailCreditPayments: true,
  emailTipsInsights: true,
  region: 'PT',
  themeId: DEFAULT_THEME_ID as ThemeId,
  biometricsEnabled: false,
  prioritizeDebtAmortization: true,
  recommendationDebtVsInvestment: true,
  recommendationSurplusAllocation: true,
  recommendationCategoryMedian: true,
  recommendationEmergencyFund: true,
  recommendationHabitInsight: true,
  benchmarkContributionConsent: false,
};

export const THEME_OPTIONS = THEME_DEFINITIONS.map((theme) => ({
  id: theme.id,
  name: theme.name,
  description: theme.description,
  previewBackground: theme.previewBackground,
  previewAccent: theme.previewAccent,
}));

export function getLocaleForRegion(region: string): string {
  return getLocaleForCountry(normalizeCountryCode(region));
}

export { getCurrencyLabel, getCountryLabel, normalizeCountryCode };
