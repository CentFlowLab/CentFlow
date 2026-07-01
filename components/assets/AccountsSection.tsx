import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { AccountListItem } from '@/components/accounts/AccountListItem';
import { ASSETS_EMPTY_CONFIG } from '@/components/assets/assets.config';
import { AssetsEmptyState } from '@/components/assets/AssetsEmptyState';
import { Card, Text } from '@/components/ui';
import type { BankAccount } from '@/lib/domain/account.types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type AccountsSectionProps = {
  accounts: BankAccount[];
  totalBalance: number;
  onCreate?: () => void;
  onEdit?: (account: BankAccount) => void;
  onLearnMore?: () => void;
};

export function AccountsSection({
  accounts,
  totalBalance,
  onCreate,
  onEdit,
  onLearnMore,
}: AccountsSectionProps) {
  if (accounts.length === 0) {
    return (
      <AssetsEmptyState
        config={ASSETS_EMPTY_CONFIG.contas}
        onPrimaryAction={onCreate}
        onSecondaryAction={onLearnMore}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Card variant="outlined" style={styles.summaryCard}>
        <Text variant="caption" color="textMuted">
          Total em contas
        </Text>
        <Text variant="h3" color="primary">
          {formatCurrency(totalBalance)}
        </Text>
      </Card>

      <View style={styles.list}>
        {accounts.map((account) => (
          <AccountListItem key={account.id} account={account} onPress={onEdit} />
        ))}
      </View>

      {onCreate ? (
        <Pressable onPress={onCreate} style={styles.addHint} accessibilityRole="button">
          <SymbolView
            name={{ ios: 'plus.circle', android: 'add_circle', web: 'add_circle' }}
            tintColor={colors.primary}
            size={18}
          />
          <Text variant="caption" color="primary">
            Adicionar conta
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 280,
    gap: spacing.md,
  },
  summaryCard: {
    gap: spacing.xs,
    backgroundColor: colors.backgroundElevated,
  },
  list: {
    gap: spacing.sm,
  },
  addHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
});
