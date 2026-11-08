import type { FormatMoneyOptions, Money } from '@/core/money';
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
  const { formatMoney } = useLocaleFormat();
  let tone: TextTone = 'primary';
  if (coloring === 'signed' && value.amountMinor > 0) tone = 'positive';
  if (coloring === 'signed' && value.amountMinor < 0) tone = 'negative';

  return (
    <Text variant={variant} tone={tone} tabular numberOfLines={1}>
      {formatMoney(value, {
        signDisplay: coloring === 'signed' ? 'exceptZero' : 'auto',
        ...formatOptions,
      })}
    </Text>
  );
}
