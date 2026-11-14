import type { FormatMoneyOptions, Money } from '@/core/money';
import { useTranslation } from 'react-i18next';

import { useLocaleFormat } from '@/i18n/useLocaleFormat';

import type { TypographyVariant } from '../theme';
import { Text, type TextTone } from './Text';

type Props = {
  value: Money;
  variant?: Extract<TypographyVariant, 'amountHero' | 'amount' | 'body' | 'bodyStrong' | 'label'>;
  /**
   * "signed": verde para positivos, vermelho para negativos (movimentos).
   * "neutral": cor de texto normal (saldos, totais).
   */
  coloring?: 'signed' | 'neutral';
  formatOptions?: FormatMoneyOptions;
};

export function Amount({ value, variant = 'amount', coloring = 'neutral', formatOptions }: Props) {
  const { t } = useTranslation();
  const { formatMoney, discreet } = useLocaleFormat();
  let tone: TextTone = 'primary';
  if (coloring === 'signed' && value.amountMinor > 0) tone = 'positive';
  if (coloring === 'signed' && value.amountMinor < 0) tone = 'negative';

  return (
    <Text
      variant={variant}
      tone={tone}
      tabular
      numberOfLines={1}
      // Modo discreto: o leitor de ecrã diz "Valor oculto", não os pontos.
      accessibilityLabel={discreet ? t('privacy.hiddenValue') : undefined}>
      {formatMoney(value, {
        signDisplay: coloring === 'signed' ? 'exceptZero' : 'auto',
        ...formatOptions,
      })}
    </Text>
  );
}
