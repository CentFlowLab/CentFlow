import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { BankAccount } from '@/lib/domain/account.types';
import { getAccountTypeLabel } from '@/lib/domain/account.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type AccountListItemProps = {
  account: BankAccount;
  onPress?: (account: BankAccount) => void;
};

export function AccountListItem({ account, onPress }: AccountListItemProps) {
  const balance = account.balance ?? account.initialBalance;

  return (
    <Pressable onPress={() => onPress?.(account)} accessibilityRole="button">
      <Card variant="outlined" style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: account.color ?? colors.primaryMuted }]}>
            <SymbolView
              name={{
                ios: 'building.columns.fill',
                android: 'account_balance',
                web: 'account_balance',
              }}
              tintColor={account.color ?? colors.primary}
              size={18}
            />
          </View>
          <View style={styles.content}>
            <Text variant="bodyMedium">{account.name}</Text>
            <Text variant="caption" color="textMuted">
              {getAccountTypeLabel(account.type)}
              {account.institution ? ` · ${account.institution}` : ''}
            </Text>
          </View>
          <View style={styles.amount}>
            <Text variant="bodyMedium" color={balance >= 0 ? 'text' : 'danger'}>
              {formatCurrency(balance)}
            </Text>
            {!account.isActive ? (
              <Text variant="caption" color="textMuted">
                Inactiva
              </Text>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  amount: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
