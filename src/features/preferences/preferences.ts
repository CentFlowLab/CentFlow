import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from '@/core/money';
import {
  isFormatRegion,
  isSupportedLanguage,
  type FormatRegion,
  type SupportedLanguage,
} from '@/i18n/languages';
import type { KeyValueStore } from '@/lib/storage/key-value-store';
import type { ThemePreference } from '@/ui/theme';

export type { ThemePreference };
export type LanguagePreference = 'system' | SupportedLanguage;

export type Preferences = Readonly<{
  theme: ThemePreference;
  language: LanguagePreference;
  /** Estatísticas de utilização anónimas. Desligadas até o utilizador as ligar. */
  analytics: boolean;
  /** Vibração subtil em algumas ações (iPhone e Android). Ligada por omissão. */
  haptics: boolean;
  /** Moeda mostrada e somada primeiro ('auto' = a mais usada). Nunca converte (ADR-016). */
  primaryCurrency: 'auto' | CurrencyCode;
  /** Moeda proposta numa conta nova ('auto' = a moeda principal). */
  newAccountCurrency: 'auto' | CurrencyCode;
  /** Formato de números, moedas e datas ('auto' = idioma e região do aparelho). */
  formatRegion: 'auto' | FormatRegion;
  /** Esconde os valores no ecrã (só apresentação). */
  discreetAmounts: boolean;
  /** Conta proposta num movimento novo ('last' = a última usada). */
  defaultAccountId: 'last' | string;
  /** Dia (1–31) em que começa o mês financeiro (ADR-077); 1 = mês civil. */
  financialMonthStartDay: number;
}>;

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  language: 'system',
  analytics: false,
  haptics: true,
  primaryCurrency: 'auto',
  newAccountCurrency: 'auto',
  formatRegion: 'auto',
  discreetAmounts: false,
  defaultAccountId: 'last',
  financialMonthStartDay: 1,
};

function currencyPreference(value: unknown): 'auto' | CurrencyCode {
  return typeof value === 'string' && isCurrencyCode(value) ? value : 'auto';
}

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
      analytics: record.analytics === true,
      // Instalações antigas (sem o campo) ficam com a vibração ligada.
      haptics: record.haptics !== false,
      primaryCurrency: currencyPreference(record.primaryCurrency),
      newAccountCurrency: currencyPreference(record.newAccountCurrency),
      formatRegion: isFormatRegion(record.formatRegion) ? record.formatRegion : 'auto',
      discreetAmounts: record.discreetAmounts === true,
      defaultAccountId:
        typeof record.defaultAccountId === 'string' && record.defaultAccountId.trim() !== ''
          ? record.defaultAccountId
          : 'last',
      financialMonthStartDay:
        typeof record.financialMonthStartDay === 'number' &&
        Number.isInteger(record.financialMonthStartDay) &&
        record.financialMonthStartDay >= 1 &&
        record.financialMonthStartDay <= 31
          ? record.financialMonthStartDay
          : 1,
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

/**
 * Moeda proposta numa conta nova: a escolhida para contas novas; sem ela, a moeda principal
 * escolhida; sem nenhuma, a omissão da app. Não mexe em contas existentes.
 */
export function newAccountCurrencyFor(preferences: Preferences): CurrencyCode {
  if (preferences.newAccountCurrency !== 'auto') return preferences.newAccountCurrency;
  if (preferences.primaryCurrency !== 'auto') return preferences.primaryCurrency;
  return DEFAULT_CURRENCY;
}
