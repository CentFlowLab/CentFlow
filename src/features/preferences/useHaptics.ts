import { haptics, type HapticsApi } from '@/lib/haptics';

import { usePreferences } from './PreferencesProvider';

const SILENT: HapticsApi = {
  selection: () => undefined,
  impactLight: () => undefined,
  impactMedium: () => undefined,
  success: () => undefined,
  warning: () => undefined,
  error: () => undefined,
};

/** Vibração respeitando a preferência "Vibração" (Definições › Preferências). */
export function useHaptics(): HapticsApi {
  const { preferences } = usePreferences();
  return preferences.haptics ? haptics : SILENT;
}
