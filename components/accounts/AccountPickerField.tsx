import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/config/product-features';
import type { TransactionType } from '@/lib/domain/transaction.types';
import { colors, radius, spacing } from '@/lib/theme';

type AccountPickerFieldProps = {
  value?: string;
  onChange: (accountId: string | undefined) => void;
  transactionType?: TransactionType;
  onCreateAccount?: () => void;
};

function labelsForType(type: TransactionType | undefined) {
  if (type === 'income') {
    return {
      label: 'Conta de destino',
      placeholder: 'Escolhe onde entrou o dinheiro',
      hint: 'Associar movimentos a contas torna os saldos e análises mais precisos.',
    };
  }
  if (type === 'expense') {
    return {
      label: 'Conta de origem',
      placeholder: 'Escolhe de onde saiu o dinheiro',
      hint: 'Associar movimentos a contas torna os saldos e análises mais precisos.',
    };
  }
  return {
    label: 'Conta',
    placeholder: 'Escolhe uma conta',
    hint: 'Associar movimentos a contas torna os saldos e análises mais precisos.',
  };
}

export function AccountPickerField({
  value,
  onChange,
  transactionType,
  onCreateAccount,
}: AccountPickerFieldProps) {
  const { data: accounts = [] } = useAccountsWithBalances();
  const activeAccounts = accounts.filter((account) => account.isActive);
  const copy = labelsForType(transactionType);

  if (!ACCOUNTS_FEATURE_ENABLED) {
    return null;
  }

  if (activeAccounts.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="label" color="textSecondary">
          {copy.label}
        </Text>
        <Text variant="caption" color="textMuted">
          {copy.hint}
        </Text>
        {onCreateAccount ? (
          <Pressable onPress={onCreateAccount} accessibilityRole="button">
            <Text variant="caption" color="primary" style={styles.createLink}>
              Criar primeira conta →
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const effectiveValue =
    value ?? (activeAccounts.length === 1 ? activeAccounts[0]?.id : undefined);

  return (
    <View style={styles.container}>
      <Text variant="label" color="textSecondary">
        {copy.label}
      </Text>
      <Text variant="caption" color="textMuted">
        {copy.placeholder}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        {activeAccounts.map((account) => {
          const selected = effectiveValue === account.id;
          return (
            <Pressable
              key={account.id}
              onPress={() => onChange(account.id)}
              style={[styles.chip, selected && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected }}>
              <Text variant="caption" style={selected ? styles.chipTextActive : undefined}>
                {account.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  createLink: {
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
