import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { MOVEMENTS_EMPTY_CONFIG } from '@/components/movements/movements.config';
import { AssetsEmptyState } from '@/components/assets/AssetsEmptyState';
import { SwipeableAssetRow } from '@/components/assets/SwipeableAssetRow';
import { Button, Card, Text } from '@/components/ui';
import { useTransactions } from '@/hooks/queries/useTransactions';
import type { Subscription } from '@/lib/domain/assets.types';
import {
  getSubscriptionPaymentUiState,
} from '@/lib/domain/financial/subscription-payments';
import { daysSinceSubscriptionReview } from '@/lib/domain/financial/subscription-review';
import { subscriptionToMonthlyAmount } from '@/lib/subscriptions/subscription-utils';
import { resolveSubscriptionCancelUrl } from '@/lib/subscriptions/cancel-url-map';
import { getRenewalStatus } from '@/lib/subscriptions/renewal.utils';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type SubscriptionsSectionProps = {
  subscriptions: Subscription[];
  onCreate?: () => void;
  onEdit?: (subscription: Subscription) => void;
  onLearnMore?: () => void;
  onDelete?: (subscription: Subscription) => void;
  onMarkPaid?: (subscription: Subscription) => void;
  onMarkReviewed?: (subscription: Subscription) => void;
};

export function SubscriptionsSection({
  subscriptions,
  onCreate,
  onEdit,
  onLearnMore,
  onDelete,
  onMarkPaid,
  onMarkReviewed,
}: SubscriptionsSectionProps) {
  const { data: transactions = [] } = useTransactions('all');

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
              Total mensal em despesas recorrentes
            </Text>
            <Text variant="h2" color="primary">
              {formatCurrency(monthlyTotal)}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text variant="caption" color="textSecondary">
              {subscriptions.length} activa{subscriptions.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.list}>
        {subscriptions.map((subscription) => {
          const renewalStatus = getRenewalStatus(subscription.renewsAt);
          const paymentUi = getSubscriptionPaymentUiState(subscription, transactions);
          const cancelUrl = resolveSubscriptionCancelUrl(subscription.name);
          const daysSinceReview = daysSinceSubscriptionReview(subscription);
          const statusColor =
            paymentUi.status === 'paid'
              ? colors.success
              : renewalStatus.tone === 'danger'
                ? colors.danger
                : renewalStatus.tone === 'warning'
                  ? colors.warning
                  : colors.textSecondary;

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
                        {paymentUi.status === 'paid' ? 'Pago' : renewalStatus.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.priceRow}>
                    <Text variant="h3">{formatCurrency(subscription.amount)}</Text>
                    <Text variant="caption" color="textMuted">
                      /{intervalLabel(subscription.billingInterval)}
                    </Text>
                  </View>
                  {paymentUi.paidThisCycle && subscription.renewsAt ? (
                    <Text variant="caption" color="textSecondary">
                      Próxima renovação: {formatDateShort(subscription.renewsAt)}
                    </Text>
                  ) : subscription.renewsAt ? (
                    <Text variant="caption" color="textSecondary">
                      Renova {formatDateShort(subscription.renewsAt)}
                    </Text>
                  ) : (
                    <Text variant="caption" color="textMuted">
                      Sem data de renovação definida
                    </Text>
                  )}
                  {subscription.lastReviewedAt ? (
                    <Text variant="caption" color="textMuted">
                      Revista {formatDateShort(subscription.lastReviewedAt)}
                    </Text>
                  ) : daysSinceReview === null ? (
                    <Text variant="caption" color="warning">
                      Ainda não revista
                    </Text>
                  ) : null}
                  {onMarkPaid ? (
                    <Button
                      label={paymentUi.actionLabel}
                      variant={paymentUi.status === 'overdue' ? 'primary' : 'secondary'}
                      size="md"
                      fullWidth
                      disabled={paymentUi.disabled}
                      onPress={() => onMarkPaid(subscription)}
                      style={styles.payButton}
                    />
                  ) : null}
                  <View style={styles.secondaryActions}>
                    {onMarkReviewed ? (
                      <Button
                        label="Marcar como revista"
                        variant="ghost"
                        size="md"
                        onPress={() => onMarkReviewed(subscription)}
                        style={styles.secondaryButton}
                      />
                    ) : null}
                    {cancelUrl ? (
                      <Button
                        label="Cancelar serviço"
                        variant="ghost"
                        size="md"
                        onPress={() => void Linking.openURL(cancelUrl)}
                        style={styles.secondaryButton}
                      />
                    ) : null}
                  </View>
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
    gap: spacing.sm,
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
  payButton: {
    marginTop: spacing.xs,
  },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  secondaryButton: {
    flexGrow: 1,
  },
});
