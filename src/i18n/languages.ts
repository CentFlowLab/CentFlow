export const SUPPORTED_LANGUAGES = ['pt-PT', 'en', 'es'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'pt-PT';

export const LANGUAGE_META: Record<
  SupportedLanguage,
  { nativeName: string; fallbackFormatLocale: string }
> = {
  'pt-PT': { nativeName: 'Português', fallbackFormatLocale: 'pt-PT' },
  en: { nativeName: 'English', fallbackFormatLocale: 'en-GB' },
  es: { nativeName: 'Español', fallbackFormatLocale: 'es-ES' },
};

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function baseLanguage(tag: string): string {
  return tag.toLowerCase().split(/[-_]/)[0] ?? '';
}

/** Escolhe o primeiro idioma suportado a partir das preferências do dispositivo. */
export function resolveLanguage(deviceLanguageTags: readonly string[]): SupportedLanguage {
  for (const tag of deviceLanguageTags) {
    const base = baseLanguage(tag);
    // Enquanto não existir pt-BR, qualquer variante de português usa pt-PT.
    if (base === 'pt') return 'pt-PT';
    const match = SUPPORTED_LANGUAGES.find((language) => baseLanguage(language) === base);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Locale usado para formatar números, datas e moedas.
 * Respeita a região do dispositivo quando coincide com o idioma escolhido
 * (ex.: inglês num dispositivo "en-US" formata como nos EUA).
 */
export function resolveFormatLocale(
  language: SupportedLanguage,
  deviceLanguageTags: readonly string[],
): string {
  const base = baseLanguage(language);
  const deviceMatch = deviceLanguageTags.find(
    (tag) => baseLanguage(tag) === base && tag.includes('-'),
  );
  return deviceMatch ?? LANGUAGE_META[language].fallbackFormatLocale;
}

/** Formatos regionais que a pessoa pode escolher (números, moedas e datas). */
export const FORMAT_REGIONS = [
  'pt-PT',
  'pt-BR',
  'en-GB',
  'en-US',
  'en-IE',
  'es-ES',
  'fr-FR',
  'fr-CH',
  'de-DE',
  'de-CH',
  'it-IT',
  'nl-NL',
] as const;

export type FormatRegion = (typeof FORMAT_REGIONS)[number];

export function isFormatRegion(value: unknown): value is FormatRegion {
  return typeof value === 'string' && (FORMAT_REGIONS as readonly string[]).includes(value);
}
