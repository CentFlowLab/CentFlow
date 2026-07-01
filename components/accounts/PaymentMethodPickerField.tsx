import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/config/product-features';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

export type PaymentMethodKind = 'account' | 'card';

export type PaymentMethodSelection =
  | { kind: 'account'; id: string }
  | { kind: 'card'; id: string }
  | undefined;

type PaymentMethodPickerFieldProps = {
  value?: PaymentMethodSelection;
  onChange: (selection: PaymentMethodSelection) => void;
  onCreateAccount?: () => void;
};

export function paymentSelectionToFields(selection: PaymentMethodSelection): {
  accountId: string | null;
  creditId: string | null;
} {
  if (!selection) return { accountId: null, creditId: null };
  if (selection.kind === 'account') return { accountId: selection.id, creditId: null };
  return { accountId: null, creditId: selection.id };
}

export function PaymentMethodPickerField({
  value,
  onChange,
  onCreateAccount,
}: PaymentMethodPickerFieldProps) {
  const { data: accounts = [] } = useAccountsWithBalances();
  const { data: liabilities } = useLiabilities();
  const activeAccounts = accounts.filter((account) => account.isActive);
  const cards = useMemo(
    () => (liabilities?.credits ?? []).filter((credit) => isCardCredit(credit.creditType)),
    [liabilities?.credits],
  );

  const [mode, setMode] = useState<PaymentMethodKind>(
    value?.kind ?? (activeAccounts.length > 0 ? 'account' : cards.length > 0 ? 'card' : 'account'),
  );

  const soleAccountId = activeAccounts.length === 1 ? activeAccounts[0]?.id : undefined;

  useEffect(() => {
    if (value) {
      setMode(value.kind);
      return;
    }
    if (mode === 'account' && soleAccountId) {
      onChange({ kind: 'account', id: soleAccountId });
    }
  }, [value, mode, soleAccountId, onChange]);

  if (!ACCOUNTS_FEATURE_ENABLED && cards.length === 0) {
    return null;
  }

  const selectedAccount = value?.kind === 'account' ? value.id : undefined;
  const selectedCard = value?.kind === 'card' ? value.id : undefined;

  const accountName = activeAccounts.find((a) => a.id === selectedAccount)?.name;
  const cardName = cards.find((c) => c.id === selectedCard)?.name;

  const hint =
    value?.kind === 'card' && cardName
      ? `Vai aumentar a dívida do cartão ${cardName}`
      : value?.kind === 'account' && accountName
        ? `Vai sair de ${accountName}`
        : 'Compras no cartão contam como despesa agora. O pagamento do cartão apenas liquida a dívida.';

  return (
    <View style={styles.container}>
      <Text variant="label">Método de pagamento</Text>
      <Text variant="caption" color="textMuted">
        {hint}
      </Text>

      {(activeAccounts.length > 0 || cards.length > 0) && (
        <View style={styles.modeRow}>
          {activeAccounts.length > 0 ? (
            <Pressable
              onPress={() => {
                setMode('account');
                onChange(soleAccountId ? { kind: 'account', id: soleAccountId } : undefined);
              }}
              style={[styles.modeChip, mode === 'account' && styles.modeChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'account' }}>
              <Text variant="caption" style={mode === 'account' ? styles.modeTextActive : undefined}>
                Contas
              </Text>
            </Pressable>
          ) : null}
          {cards.length > 0 ? (
            <Pressable
              onPress={() => {
                setMode('card');
                onChange(undefined);
              }}
              style={[styles.modeChip, mode === 'card' && styles.modeChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === 'card' }}>
              <Text variant="caption" style={mode === 'card' ? styles.modeTextActive : undefined}>
                Cartões de crédito
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {mode === 'account' ? (
        activeAccounts.length === 0 ? (
          <Text variant="caption" color="textMuted">
            Cria uma conta em Ativos para associar movimentos.
            {onCreateAccount ? (
              <>
                {' '}
                <Text variant="caption" color="primary" onPress={onCreateAccount}>
                  Criar conta →
                </Text>
              </>
            ) : null}
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled">
            {activeAccounts.map((account) => {
              const selected = selectedAccount === account.id;
              return (
                <Pressable
                  key={account.id}
                  onPress={() => onChange({ kind: 'account', id: account.id })}
                  style={[styles.chip, selected && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}>
                  <Text variant="caption" style={selected ? styles.chipTextActive : undefined}>
                    {account.name}
                  </Text>
                  <Text variant="caption" color={selected ? 'primary' : 'textMuted'}>
                    {formatCurrency(account.balance ?? account.initialBalance)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )
      ) : cards.length === 0 ? (
        <Text variant="caption" color="textMuted">
          Adiciona um cartão em Créditos para registar compras no cartão.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled">
          {cards.map((card) => {
            const selected = selectedCard === card.id;
            return (
              <Pressable
                key={card.id}
                onPress={() => onChange({ kind: 'card', id: card.id })}
                style={[styles.chip, selected && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected }}>
                <Text variant="caption" style={selected ? styles.chipTextActive : undefined}>
                  {card.name}
                </Text>
                <Text variant="caption" color={selected ? 'primary' : 'textMuted'}>
                  Dívida: {formatCurrency(card.outstandingBalance)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  modeTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  chips: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
