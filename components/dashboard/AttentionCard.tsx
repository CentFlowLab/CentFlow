import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { AttentionItem, AttentionType } from '@/lib/domain';
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
  goal: {
    icon: { ios: 'target', android: 'flag', web: 'flag' },
    color: colors.primary,
  },
};

const PRIORITY_BORDER: Record<AttentionItem['priority'], string> = {
  high: colors.danger,
  medium: colors.warning,
  low: colors.borderStrong,
};

function getAttentionRoute(type: AttentionType): string | null {
  if (type === 'credit') return '/(tabs)/precos';
  if (type === 'subscription') return '/(tabs)/movimentos?view=subscricoes';
  if (type === 'warranty') return '/(tabs)/ativos?tab=garantias';
  if (type === 'goal') return '/(tabs)/ativos?tab=objetivos';
  return null;
}

type AttentionCardProps = {
  item: AttentionItem;
};

export function AttentionCard({ item }: AttentionCardProps) {
  const config = TYPE_CONFIG[item.type];
  const days = item.dueDate ? daysUntil(item.dueDate) : null;
  const route = getAttentionRoute(item.type);
  const accentColor = PRIORITY_BORDER[item.priority];

  const content = (
    <View style={styles.row}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.inner}>
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
      </View>
    </View>
  );

  if (!route) {
    return (
      <Card variant="outlined" padding={0} style={styles.cardShell}>
        {content}
      </Card>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(route as never)}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${item.title}`}>
      <Card variant="outlined" padding={0} style={styles.cardShell}>
        {content}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardShell: {
    marginBottom: spacing.md,
    overflow: 'visible',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
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
