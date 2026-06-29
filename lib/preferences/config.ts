import type { ThemeId, UserPreferences } from './types';
import {
  getCountryLabel,
  getCurrencyLabel,
  getLocaleForCountry,
  normalizeCountryCode,
} from './locale.data';

export const DEFAULT_PREFERENCES = {
  pushNotifications: true,
  warrantyAlerts: true,
  budgetAlerts: false,
  weeklyDigest: true,
  emailImportant: true,
  emailWeeklyDigest: true,
  emailWarrantyAlerts: true,
  emailSubscriptionRenewals: true,
  emailCreditPayments: true,
  emailTipsInsights: true,
  region: 'PT',
  themeId: 'dark-premium' as ThemeId,
  biometricsEnabled: false,
};

export const THEME_OPTIONS: Array<{
  id: ThemeId;
  name: string;
  description: string;
  available: boolean;
  preview: readonly [string, string, string];
}> = [
  {
    id: 'dark-premium',
    name: 'Dark Premium',
    description: 'Teal e gold — tema atual da CentFlow',
    available: true,
    preview: ['#0A1214', '#122023', '#2DD4BF'],
  },
  {
    id: 'dark-classic',
    name: 'Dark Classic',
    description: 'Em breve — tons mais neutros',
    available: false,
    preview: ['#0B0B0F', '#17171C', '#8B8B9A'],
  },
];

export function getLocaleForRegion(region: string): string {
  return getLocaleForCountry(normalizeCountryCode(region));
}

export { getCurrencyLabel, getCountryLabel, normalizeCountryCode };
