import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { calendarDateToLocalDate, type Entry } from '@/core/finance';
import { useLocaleFormat } from '@/i18n';
import { CategoryIcon, Text } from '@/ui/components';
import { layout, radius, spacing, useTheme } from '@/ui/theme';

import type { FinanceLookups } from './useFinanceLookups';

type Props = {
  entry: Entry;
  lookups: FinanceLookups;
  onPress: () => void;
};

export function EntryListItem({ entry, lookups, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatMoney, formatDate } = useLocaleFormat();
  const [hovered, setHovered] = useState(false);

  const account = lookups.accounts.get(entry.accountId);
  const destination = entry.destinationAccountId
    ? lookups.accounts.get(entry.destinationAccountId)
    : undefined;
  const category = entry.categoryId ? lookups.categories.get(entry.categoryId) : undefined;
  const currency = account?.currency ?? 'EUR';

  const isTransfer = entry.type === 'transfer';
  const title =
    entry.description ||
    (isTransfer ? t('entryTypes.transfer') : (category?.name ?? t(`entryTypes.${entry.type}`)));
  const where = isTransfer
    ? t('entries.transferBetween', { from: account?.name ?? '—', to: destination?.name ?? '—' })
    : (account?.name ?? '—');
  const subtitle = `${formatDate(calendarDateToLocalDate(entry.date), 'medium')} · ${where}`;

  const signed = entry.type === 'expense' ? -entry.amount : entry.amount;
  const amountText = formatMoney(
    { amountMinor: signed, currency },
    { signDisplay: isTransfer ? 'never' : 'exceptZero' },
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${amountText}, ${subtitle}`}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.row,
        (pressed || hovered) && { backgroundColor: colors.surfaceHover },
      ]}>
      {isTransfer ? (
        <CategoryIcon icon="swap-horizontal" color="slate" />
      ) : (
        <CategoryIcon icon={category?.icon ?? 'help-outline'} color={category?.color ?? 'slate'} />
      )}
      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="footnote" tone="secondary" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Text
        variant="bodyStrong"
        tabular
        numberOfLines={1}
        tone={entry.type === 'income' ? 'positive' : isTransfer ? 'secondary' : 'primary'}>
        {amountText}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouchTarget + spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  texts: {
    flex: 1,
    gap: spacing.xxs,
  },
});
