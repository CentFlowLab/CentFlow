import type { SupportedCurrency, ThemeId, UserRegion } from './types';

export const DEFAULT_PREFERENCES = {
  pushNotifications: true,
  warrantyAlerts: true,
  budgetAlerts: false,
  weeklyDigest: true,
  region: 'portugal' as UserRegion,
  themeId: 'dark-premium' as ThemeId,
  biometricsEnabled: false,
};

export const CURRENCY_OPTIONS: Array<{
  code: SupportedCurrency;
  label: string;
}> = [
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'USD', label: 'USD ($)' },
  { code: 'GBP', label: 'GBP (£)' },
];

export const REGION_OPTIONS: Array<{
  id: UserRegion;
  label: string;
}> = [
  { id: 'portugal', label: 'Portugal' },
  { id: 'brasil', label: 'Brasil' },
  { id: 'espanha', label: 'Espanha' },
  { id: 'outro', label: 'Outro' },
];

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
    description: 'Teal e gold — tema actual da CentFlow',
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

const REGION_LOCALE: Record<UserRegion, string> = {
  portugal: 'pt-PT',
  brasil: 'pt-BR',
  espanha: 'es-ES',
  outro: 'en-US',
};

export function getLocaleForRegion(region: UserRegion): string {
  return REGION_LOCALE[region] ?? 'pt-PT';
}

export function getCurrencyLabel(code: SupportedCurrency): string {
  return CURRENCY_OPTIONS.find((item) => item.code === code)?.label ?? code;
}

export function getRegionLabel(region: UserRegion): string {
  return REGION_OPTIONS.find((item) => item.id === region)?.label ?? region;
}
