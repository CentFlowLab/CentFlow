import { Pressable, StyleSheet, View } from 'react-native';

import { ASSETS_EMPTY_CONFIG } from '@/components/assets/assets.config';
import { AssetsEmptyState } from '@/components/assets/AssetsEmptyState';
import { SwipeableAssetRow } from '@/components/assets/SwipeableAssetRow';
import { Card, Text } from '@/components/ui';
import type { Subscription } from '@/lib/domain/assets.types';
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
          config={ASSETS_EMPTY_CONFIG.subscricoes}
          onPrimaryAction={onCreate}
          onSecondaryAction={onLearnMore}
        />
      </View>
    );
  }

  const monthlyTotal = subscriptions.reduce((sum, item) => sum + item.amount, 0);

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
                  {formatCurrency(subscription.amount)}/mês
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
