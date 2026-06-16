import { Pressable, StyleSheet, View } from 'react-native';

import { MOVEMENTS_EMPTY_CONFIG } from '@/components/movements/movements.config';
import { AssetsEmptyState } from '@/components/assets/AssetsEmptyState';
import { SwipeableAssetRow } from '@/components/assets/SwipeableAssetRow';
import { Card, Text } from '@/components/ui';
import type { Credit } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type CreditsSectionProps = {
  credits: Credit[];
  onCreate?: () => void;
  onEdit?: (credit: Credit) => void;
  onLearnMore?: () => void;
  onDelete?: (credit: Credit) => void;
};

export function CreditsSection({
  credits,
  onCreate,
  onEdit,
  onLearnMore,
  onDelete,
}: CreditsSectionProps) {
  if (credits.length === 0) {
    return (
      <View style={styles.container}>
        <AssetsEmptyState
          config={MOVEMENTS_EMPTY_CONFIG.creditos}
          onPrimaryAction={onCreate}
          onSecondaryAction={onLearnMore}
        />
      </View>
    );
  }

  const totalDebt = credits.reduce((sum, credit) => sum + credit.outstandingBalance, 0);

  return (
    <View style={styles.container}>
      <Card variant="outlined" style={styles.summaryCard}>
        <Text variant="caption" color="textMuted">
          Total em dívida
        </Text>
        <Text variant="h3" color="danger">
          {formatCurrency(totalDebt)}
        </Text>
      </Card>

      <View style={styles.list}>
        {credits.map((credit) => (
          <SwipeableAssetRow
            key={credit.id}
            label={credit.name}
            onDelete={() => onDelete?.(credit)}>
            <Pressable onPress={() => onEdit?.(credit)} disabled={!onEdit}>
              <Card variant="elevated" style={styles.itemCard}>
                <Text variant="bodyMedium">{credit.name}</Text>
                <Text variant="caption" color="textMuted">
                  Saldo: {formatCurrency(credit.outstandingBalance)}
                </Text>
        {credit.interestRateAnnual !== undefined ? (
                  <Text variant="caption" color="textSecondary">
                    TAEG: {credit.interestRateAnnual.toFixed(2)}%
                  </Text>
                ) : null}
                {credit.nextPaymentDate || credit.nextPaymentAmount ? (
                  <Text variant="caption" color="textSecondary">
                    Próximo:{' '}
                    {credit.nextPaymentAmount ? formatCurrency(credit.nextPaymentAmount) : '—'}
                    {credit.nextPaymentDate ? ` · ${formatDateShort(credit.nextPaymentDate)}` : ''}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          </SwipeableAssetRow>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  summaryCard: {
    gap: spacing.xs,
    borderColor: colors.border,
  },
  list: {
    gap: spacing.sm,
  },
  itemCard: {
    gap: spacing.xs,
  },
});
