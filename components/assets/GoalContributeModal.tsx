import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccountPickerField } from '@/components/accounts';
import { DraggableBottomSheet } from '@/components/layout';
import { Button, Text, TextField } from '@/components/ui';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useCreateGoalContribution } from '@/hooks/queries/useGoalContributions';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Goal } from '@/lib/domain/assets.types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type GoalContributeModalProps = {
  visible: boolean;
  onClose: () => void;
  goal: Goal | null;
  onCreateAccount?: () => void;
};

export function GoalContributeModal({
  visible,
  onClose,
  goal,
  onCreateAccount,
}: GoalContributeModalProps) {
  const contribute = useCreateGoalContribution();
  const { data: accounts = [] } = useAccountsWithBalances();

  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setNote('');
    setApiError(null);
    contribute.reset();
    const active = accounts.filter((a) => a.isActive);
    setAccountId(active.length === 1 ? active[0]?.id : undefined);
  }, [visible, goal?.id, accounts.length]);

  const preview = useMemo(() => {
    if (!goal || !accountId) return null;
    const value = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return null;
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return null;
    const afterBalance = (account.balance ?? account.initialBalance) - value;
    return {
      accountName: account.name,
      afterBalance,
      amount: value,
    };
  }, [goal, accountId, amount, accounts]);

  async function handleSave() {
    if (!goal) return;
    const value = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setApiError('Indica um valor válido.');
      return;
    }
    if (!accountId) {
      setApiError('Escolhe a conta de origem.');
      return;
    }

    try {
      await contribute.mutateAsync({
        goalId: goal.id,
        accountId,
        amount: value,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'a contribuição'));
    }
  }

  if (!goal) return null;

  return (
    <DraggableBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text variant="h2">Adicionar ao objetivo</Text>
        <Text variant="body" color="textSecondary">
          {goal.name}
        </Text>

        <TextField
          label="Valor"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />

        <AccountPickerField
          value={accountId}
          onChange={setAccountId}
          transactionType="expense"
          onCreateAccount={onCreateAccount}
        />

        <TextField
          label="Nota (opcional)"
          value={note}
          onChangeText={setNote}
          placeholder="Ex.: transferência mensal"
        />

        {preview ? (
          <View style={styles.preview}>
            <Text variant="bodyMedium">
              Vais transferir {formatCurrency(preview.amount)} de {preview.accountName} para{' '}
              {goal.name}.
            </Text>
            <Text variant="caption" color="textSecondary">
              Depois disto, {preview.accountName} fica com {formatCurrency(preview.afterBalance)}.
            </Text>
          </View>
        ) : null}

        {apiError ? (
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        ) : null}

        <Button
          label={contribute.isPending ? 'A guardar...' : 'Confirmar transferência'}
          onPress={handleSave}
          disabled={contribute.isPending}
        />
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  preview: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
  },
});
