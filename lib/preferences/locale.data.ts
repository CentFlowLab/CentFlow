export type LocaleOption = {
  id: string;
  label: string;
  searchText: string;
};

const FALLBACK_CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'BRL',
  'CHF',
  'JPY',
  'CAD',
  'AUD',
  'CNY',
  'INR',
  'MXN',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'RON',
  'TRY',
  'ZAR',
  'AED',
  'SAR',
  'KRW',
  'SGD',
  'HKD',
  'NZD',
  'THB',
  'IDR',
  'PHP',
  'VND',
  'ARS',
  'CLP',
  'COP',
  'PEN',
];

const FALLBACK_COUNTRY_CODES = [
  'PT',
  'BR',
  'ES',
  'FR',
  'DE',
  'IT',
  'GB',
  'US',
  'CA',
  'AU',
  'CH',
  'NL',
  'BE',
  'LU',
  'IE',
  'AT',
  'SE',
  'NO',
  'DK',
  'FI',
  'PL',
  'CZ',
  'HU',
  'RO',
  'GR',
  'TR',
  'MX',
  'AR',
  'CL',
  'CO',
  'PE',
  'ZA',
  'AE',
  'SA',
  'IN',
  'CN',
  'JP',
  'KR',
  'SG',
  'HK',
  'NZ',
  'TH',
  'ID',
  'PH',
  'VN',
  'AO',
  'MZ',
  'CV',
  'GW',
  'ST',
  'TL',
];

const LEGACY_REGION_MAP: Record<string, string> = {
  portugal: 'PT',
  brasil: 'BR',
  espanha: 'ES',
  outro: 'US',
};

const COUNTRY_LOCALE_MAP: Record<string, string> = {
  PT: 'pt-PT',
  BR: 'pt-BR',
  ES: 'es-ES',
  FR: 'fr-FR',
  DE: 'de-DE',
  IT: 'it-IT',
  GB: 'en-GB',
  US: 'en-US',
  CA: 'en-CA',
  AU: 'en-AU',
  CH: 'de-CH',
  MX: 'es-MX',
  AR: 'es-AR',
  AO: 'pt-AO',
  MZ: 'pt-MZ',
};

function getDisplayNames(locale: string, type: 'region' | 'currency') {
  try {
    return new Intl.DisplayNames([locale], { type });
  } catch {
    return null;
  }
}

function getCurrencySymbol(code: string, locale = 'pt-PT'): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}

export function normalizeCountryCode(region: string): string {
  const trimmed = region.trim();
  if (!trimmed) return 'PT';
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return LEGACY_REGION_MAP[trimmed.toLowerCase()] ?? trimmed.toUpperCase();
}

export function getCurrencyOptions(locale = 'pt-PT'): LocaleOption[] {
  const codes =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('currency')
      : FALLBACK_CURRENCIES;

  const displayNames = getDisplayNames(locale, 'currency');

  return codes
    .map((code) => {
      const name = displayNames?.of(code) ?? code;
      const symbol = getCurrencySymbol(code, locale);
      const label = `${code} (${symbol}) — ${name}`;
      return {
        id: code,
        label,
        searchText: `${code} ${symbol} ${name}`.toLowerCase(),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function getCountryOptions(locale = 'pt-PT'): LocaleOption[] {
  const codes =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('region').filter((code) => /^[A-Z]{2}$/.test(code))
      : FALLBACK_COUNTRY_CODES;

  const displayNames = getDisplayNames(locale, 'region');

  return codes
    .map((code) => {
      const name = displayNames?.of(code) ?? code;
      return {
        id: code,
        label: `${name} (${code})`,
        searchText: `${code} ${name}`.toLowerCase(),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}

export function getLocaleForCountry(countryCode: string): string {
  const normalized = normalizeCountryCode(countryCode);
  if (COUNTRY_LOCALE_MAP[normalized]) {
    return COUNTRY_LOCALE_MAP[normalized];
  }

  try {
    const displayNames = new Intl.DisplayNames(['pt'], { type: 'language' });
    const language = displayNames.of(normalized);
    if (language) {
      return `${normalized.toLowerCase()}-${normalized}`;
    }
  } catch {
    // fallback abaixo
  }

  return 'en-US';
}

export function getCurrencyLabel(code: string, locale = 'pt-PT'): string {
  const option = getCurrencyOptions(locale).find((item) => item.id === code);
  return option?.label ?? code;
}

export function getCountryLabel(countryCode: string, locale = 'pt-PT'): string {
  const normalized = normalizeCountryCode(countryCode);
  const option = getCountryOptions(locale).find((item) => item.id === normalized);
  return option?.label ?? normalized;
}
