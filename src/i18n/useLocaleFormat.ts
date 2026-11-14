import { useLocales } from 'expo-localization';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  formatDate,
  formatDateTime,
  formatInteger,
  formatMonthYear,
  formatNumber as formatDecimalNumber,
  formatPercent,
  type DateStyle,
} from '@/core/format';
import {
  formatMoney,
  formatUnitPrice,
  maskMoneyText,
  type FormatMoneyOptions,
  type Money,
} from '@/core/money';

import { useFormatSettings } from './formatSettings';
import { DEFAULT_LANGUAGE, isSupportedLanguage, resolveFormatLocale } from './languages';

/**
 * Formatadores ligados ao idioma ativo e à região do dispositivo, ou ao formato regional
 * escolhido. No modo discreto, os valores monetários aparecem como "•••• €" (só apresentação).
 */
export function useLocaleFormat() {
  const { i18n } = useTranslation();
  const deviceLocales = useLocales();
  const language = isSupportedLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;
  const deviceTags = deviceLocales.map((locale) => locale.languageTag).join(',');
  const { formatRegion, discreetAmounts } = useFormatSettings();

  return useMemo(() => {
    const locale =
      formatRegion !== 'auto' ? formatRegion : resolveFormatLocale(language, deviceTags.split(','));
    const hide = (text: string) => (discreetAmounts ? maskMoneyText(text) : text);
    return {
      locale,
      /** Modo discreto ligado: os valores estão escondidos no ecrã. */
      discreet: discreetAmounts,
      formatMoney: (value: Money, options?: FormatMoneyOptions) =>
        hide(formatMoney(value, locale, options)),
      formatDate: (date: Date, style?: DateStyle) => formatDate(date, locale, style),
      formatDateTime: (date: Date) => formatDateTime(date, locale),
      formatMonthYear: (date: Date) => formatMonthYear(date, locale),
      formatNumber: (value: number) => formatInteger(value, locale),
      /** Número com decimais (ex.: litros); até `maximumFractionDigits` casas. */
      formatDecimal: (value: number, maximumFractionDigits = 2) =>
        formatDecimalNumber(value, locale, maximumFractionDigits),
      /** Preço por unidade com uma casa a mais do que a moeda (ex.: "1,726 €" por litro). */
      formatUnitPrice: (minorPerUnit: number, currency: string) =>
        hide(formatUnitPrice(minorPerUnit, currency, locale)),
      formatPercent: (ratio: number, maximumFractionDigits?: number) =>
        formatPercent(ratio, locale, maximumFractionDigits),
    };
  }, [language, deviceTags, formatRegion, discreetAmounts]);
}
