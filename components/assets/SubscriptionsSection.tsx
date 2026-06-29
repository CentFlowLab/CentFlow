import { Pressable, StyleSheet, View } from 'react-native';

import { MOVEMENTS_EMPTY_CONFIG } from '@/components/movements/movements.config';
import { AssetsEmptyState } from '@/components/assets/AssetsEmptyState';
import { SwipeableAssetRow } from '@/components/assets/SwipeableAssetRow';
import { Card, Text } from '@/components/ui';
import type { Subscription } from '@/lib/domain/assets.types';
import { subscriptionToMonthlyAmount } from '@/lib/subscriptions/subscription-utils';
import { getRenewalStatus } from '@/lib/subscriptions/renewal.utils';
import { colors, radius, spacing } from '@/lib/theme';
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
        <View style={styles.summaryRow}>
          <View>
            <Text variant="caption" color="textMuted">
              Total mensal em subscrições
            </Text>
            <Text variant="h2" color="primary">
              {formatCurrency(monthlyTotal)}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text variant="caption" color="textSecondary">
              {subscriptions.length} ativa{subscriptions.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.list}>
        {subscriptions.map((subscription) => {
          const status = getRenewalStatus(subscription.renewsAt);
          const statusColor =
            status.tone === 'danger'
              ? colors.danger
              : status.tone === 'warning'
                ? colors.warning
                : colors.success;

          return (
            <SwipeableAssetRow
              key={subscription.id}
              label={subscription.name}
              onDelete={() => onDelete?.(subscription)}>
              <Pressable onPress={() => onEdit?.(subscription)} disabled={!onEdit}>
                <Card variant="elevated" style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text variant="bodyMedium" style={styles.itemName}>
                      {subscription.name}
                    </Text>
                    <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                      <Text variant="caption" style={{ color: statusColor, fontWeight: '600' }}>
                        {status.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.priceRow}>
                    <Text variant="h3">{formatCurrency(subscription.amount)}</Text>
                    <Text variant="caption" color="textMuted">
                      /{intervalLabel(subscription.billingInterval)}
                    </Text>
                  </View>
                  {subscription.renewsAt ? (
                    <Text variant="caption" color="textSecondary">
                      Renova {formatDateShort(subscription.renewsAt)}
                    </Text>
                  ) : (
                    <Text variant="caption" color="textMuted">
                      Sem data de renovação definida
                    </Text>
                  )}
                </Card>
              </Pressable>
            </SwipeableAssetRow>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  summaryCard: {
    borderColor: colors.border,
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: {
    gap: spacing.sm,
  },
  itemCard: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemName: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.backgroundElevated,
  },
});
