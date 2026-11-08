import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, resolveLanguage, SUPPORTED_LANGUAGES } from './languages';
import en from './locales/en';
import es from './locales/es';
import ptPT from './locales/pt-PT';

export function getDeviceLanguageTags(): string[] {
  return getLocales().map((locale) => locale.languageTag);
}

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    'pt-PT': { translation: ptPT },
    en: { translation: en },
    es: { translation: es },
  },
  lng: resolveLanguage(getDeviceLanguageTags()),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  load: 'currentOnly',
  initAsync: false,
  interpolation: { escapeValue: false },
});

export { i18n };
export * from './languages';
export { useLocaleFormat } from './useLocaleFormat';
