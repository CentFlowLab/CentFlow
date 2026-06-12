import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { AttentionItem } from '@/lib/domain';
import { daysUntil, formatCurrency, formatRelativeDays } from '@/lib/utils/format';
import { colors, radius, spacing } from '@/lib/theme';

const TYPE_CONFIG: Record<
  AttentionItem['type'],
  { icon: SymbolViewProps['name']; color: string }
> = {
  warranty: {
    icon: { ios: 'shield.fill', android: 'verified_user', web: 'verified_user' },
    color: colors.warning,
  },
  credit: {
    icon: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
    color: colors.danger,
  },
  subscription: {
    icon: { ios: 'arrow.clockwise', android: 'autorenew', web: 'autorenew' },
    color: colors.accent,
  },
};

const PRIORITY_BORDER: Record<AttentionItem['priority'], string> = {
  high: colors.danger,
  medium: colors.warning,
  low: colors.borderStrong,
};

type AttentionCardProps = {
  item: AttentionItem;
};

export function AttentionCard({ item }: AttentionCardProps) {
  const config = TYPE_CONFIG[item.type];
  const days = item.dueDate ? daysUntil(item.dueDate) : null;

  return (
    <Card
      variant="outlined"
      style={[styles.card, { borderLeftColor: PRIORITY_BORDER[item.priority] }]}>
      <View style={[styles.iconBox, { backgroundColor: `${config.color}18` }]}>
        <SymbolView name={config.icon} tintColor={config.color} size={20} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text variant="bodyMedium" style={styles.title}>
            {item.title}
          </Text>
          {days !== null && (
            <View style={[styles.badge, item.priority === 'high' && styles.badgeHigh]}>
              <Text variant="caption" color={item.priority === 'high' ? 'danger' : 'textMuted'}>
                {formatRelativeDays(days)}
              </Text>
            </View>
          )}
        </View>
        <Text variant="caption" color="textSecondary">
          {item.description}
        </Text>
        {item.amount !== undefined && (
          <Text variant="caption" color="textMuted" style={styles.amount}>
            {formatCurrency(item.amount)}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderLeftWidth: 3,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeHigh: {
    backgroundColor: colors.dangerMuted,
  },
  amount: {
    marginTop: spacing.xs,
  },
});
