import { Pressable, StyleSheet, View } from 'react-native';

import { MOVEMENTS_EMPTY_CONFIG } from '@/components/movements/movements.config';
import { AssetsEmptyState } from '@/components/assets/AssetsEmptyState';
import { SwipeableAssetRow } from '@/components/assets/SwipeableAssetRow';
import { Card, Text } from '@/components/ui';
import type { Subscription } from '@/lib/domain/assets.types';
import { subscriptionToMonthlyAmount } from '@/lib/subscriptions/subscription-utils';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type SubscriptionsSectionProps = {
  subscriptions: Subscription[];
  onCreate?: () => void;
  onEdit?: (subscription: Subscription) => void;
  onLearnMore?: () => void;
  onDelete?: (subscription: Subscription) => void;
};

export function SubscriptionsSection({
  subscriptions,
  onCreate,
  onEdit,
  onLearnMore,
  onDelete,
}: SubscriptionsSectionProps) {
  if (subscriptions.length === 0) {
    return (
      <View style={styles.container}>
        <AssetsEmptyState
          config={MOVEMENTS_EMPTY_CONFIG.subscricoes}
          onPrimaryAction={onCreate}
          onSecondaryAction={onLearnMore}
        />
      </View>
    );
  }

  const monthlyTotal = subscriptions.reduce(
    (sum, item) =>
      sum + subscriptionToMonthlyAmount(item.amount, item.billingInterval ?? 'monthly'),
    0,
  );

  const intervalLabel = (interval?: Subscription['billingInterval']) => {
    if (interval === 'quarterly') return 'trimestre';
    if (interval === 'annual') return 'ano';
    return 'mês';
  };

  return (
    <View style={styles.container}>
      <Card variant="outlined" style={styles.summaryCard}>
        <Text variant="caption" color="textMuted">
          Total mensal estimado
        </Text>
        <Text variant="h3" color="primary">
          {formatCurrency(monthlyTotal)}
        </Text>
      </Card>

      <View style={styles.list}>
        {subscriptions.map((subscription) => (
          <SwipeableAssetRow
            key={subscription.id}
            label={subscription.name}
            onDelete={() => onDelete?.(subscription)}>
            <Pressable onPress={() => onEdit?.(subscription)} disabled={!onEdit}>
              <Card variant="elevated" style={styles.itemCard}>
                <Text variant="bodyMedium">{subscription.name}</Text>
                <Text variant="caption" color="textMuted">
                  {formatCurrency(subscription.amount)}/{intervalLabel(subscription.billingInterval)}
                </Text>
                {subscription.renewsAt ? (
                  <Text variant="caption" color="textSecondary">
                    Renova {formatDateShort(subscription.renewsAt)}
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
