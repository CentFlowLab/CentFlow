import type { Href } from 'expo-router';

import type { IconName } from '@/ui/components';

/** Secções das Definições, pela ordem da navegação; cada uma tem o seu URL (`/settings/<chave>`). */
export const SETTINGS_SECTIONS = [
  'account',
  'preferences',
  'data',
  'integrations',
  'help',
  'about',
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const SECTION_ICONS: Record<SettingsSection, IconName> = {
  account: 'person-circle-outline',
  preferences: 'options-outline',
  data: 'cloud-done-outline',
  integrations: 'git-network-outline',
  help: 'help-buoy-outline',
  about: 'information-circle-outline',
};

/** Restringe um parâmetro de rota (texto qualquer) a uma secção conhecida. */
export function isSettingsSection(value: unknown): value is SettingsSection {
  return typeof value === 'string' && (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

/** Endereço de uma secção. */
export function settingsHref(section: SettingsSection): Href {
  return `/settings/${section}` as Href;
}
