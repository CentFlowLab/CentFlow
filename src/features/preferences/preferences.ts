import { isSupportedLanguage, type SupportedLanguage } from '@/i18n/languages';
import type { KeyValueStore } from '@/lib/storage/key-value-store';
import type { ThemePreference } from '@/ui/theme';

export type { ThemePreference };
export type LanguagePreference = 'system' | SupportedLanguage;

export type Preferences = Readonly<{
  theme: ThemePreference;
  language: LanguagePreference;
}>;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  language: 'system',
};

const STORAGE_KEY = 'preferences.v1';
const THEME_VALUES: readonly ThemePreference[] = ['system', 'light', 'dark'];

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_VALUES as readonly string[]).includes(value);
}

function isLanguagePreference(value: unknown): value is LanguagePreference {
  return value === 'system' || isSupportedLanguage(value);
}

/** Valida dados persistidos; qualquer campo inválido volta ao valor por omissão. */
export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return DEFAULT_PREFERENCES;
    const record = data as Record<string, unknown>;
    return {
      theme: isThemePreference(record.theme) ? record.theme : DEFAULT_PREFERENCES.theme,
      language: isLanguagePreference(record.language)
        ? record.language
        : DEFAULT_PREFERENCES.language,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function createPreferencesRepository(store: KeyValueStore) {
  return {
    async load(): Promise<Preferences> {
      try {
        return parsePreferences(await store.getItem(STORAGE_KEY));
      } catch {
        return DEFAULT_PREFERENCES;
      }
    },
    async save(preferences: Preferences): Promise<void> {
      await store.setItem(STORAGE_KEY, JSON.stringify(preferences));
    },
  };
}

export type PreferencesRepository = ReturnType<typeof createPreferencesRepository>;
