import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import {
  ACCOUNT_TYPE_LABELS,
  type AccountWithBalance,
} from '@/lib/domain/account.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type AccountListItemProps = {
  account: AccountWithBalance;
  onPress?: () => void;
};

function formatMonthDelta(delta: number): { label: string; color: string } {
  if (delta > 0) return { label: `↑ +${formatCurrency(delta)} este mês`, color: colors.success };
  if (delta < 0) return { label: `↓ ${formatCurrency(delta)} este mês`, color: colors.danger };
  return { label: '→ sem movimento', color: colors.textMuted };
}

export function AccountListItem({ account, onPress }: AccountListItemProps) {
  const delta = formatMonthDelta(account.monthDelta);

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: `${account.color ?? colors.primary}22` }]}>
            <Text style={styles.emoji}>{account.icon ?? '🏦'}</Text>
          </View>
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text variant="bodyMedium">{account.name}</Text>
              <Text variant="caption" color="textMuted">
                {ACCOUNT_TYPE_LABELS[account.type]}
              </Text>
            </View>
            {account.bank ? (
              <Text variant="caption" color="textMuted">
                {account.bank}
              </Text>
            ) : null}
            <Text variant="h3" style={styles.balance}>
              {formatCurrency(account.balance)}
            </Text>
            <Text variant="caption" style={{ color: delta.color }}>
              {delta.label}
            </Text>
          </View>
          {onPress ? (
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={colors.textMuted}
              size={18}
            />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  balance: {
    marginTop: spacing.xs,
  },
});
