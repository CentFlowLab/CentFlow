import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { AccountListItem } from '@/components/accounts/AccountListItem';
import { ASSETS_EMPTY_CONFIG } from '@/components/assets/assets.config';
import { AssetsEmptyState } from '@/components/assets/AssetsEmptyState';
import { Card, Text } from '@/components/ui';
import type { BankAccount } from '@/lib/domain/account.types';
import {
  partitionAccountsByBudget,
  sumBudgetAccountBalances,
} from '@/lib/domain/financial/budget-accounts';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type AccountsSectionProps = {
  accounts: BankAccount[];
  totalBalance: number;
  onCreate?: () => void;
  onEdit?: (account: BankAccount) => void;
  onLearnMore?: () => void;
  onTransfer?: () => void;
};

export function AccountsSection({
  accounts,
  totalBalance,
  onCreate,
  onEdit,
  onLearnMore,
  onTransfer,
}: AccountsSectionProps) {
  const activeAccounts = accounts.filter((account) => account.isActive);
  const { outOfBudget } = partitionAccountsByBudget(activeAccounts);
  const budgetTotal = sumBudgetAccountBalances(activeAccounts);
  const outOfBudgetTotal = outOfBudget.reduce(
    (sum, account) => sum + (account.balance ?? account.initialBalance),
    0,
  );

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
        <View style={styles.budgetSplit}>
          <View style={styles.budgetRow}>
            <Text variant="caption" color="textSecondary">
              No orçamento mensal
            </Text>
            <Text variant="bodyMedium">{formatCurrency(budgetTotal)}</Text>
          </View>
          <View style={styles.budgetRow}>
            <Text variant="caption" color="textSecondary">
              Fora do orçamento
            </Text>
            <Text variant="bodyMedium" color="textMuted">
              {formatCurrency(outOfBudgetTotal)}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.list}>
        {accounts.map((account) => (
          <AccountListItem key={account.id} account={account} onPress={onEdit} />
        ))}
      </View>

      {onTransfer && accounts.length >= 2 ? (
        <Pressable onPress={onTransfer} style={styles.addHint} accessibilityRole="button">
          <SymbolView
            name={{ ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }}
            tintColor={colors.primary}
            size={18}
          />
          <Text variant="caption" color="primary">
            Transferir entre contas
          </Text>
        </Pressable>
      ) : null}

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
  budgetSplit: {
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
