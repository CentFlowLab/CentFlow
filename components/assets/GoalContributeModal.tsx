import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccountPickerField } from '@/components/accounts';
import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useCreateGoalContribution } from '@/hooks/queries/useGoalContributions';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Goal } from '@/lib/domain/assets.types';
import { traceGoalContribution } from '@/lib/doctor/goal-contribution-trace';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type GoalContributeModalProps = {
  visible: boolean;
  onClose: () => void;
  goal: Goal | null;
  onCreateAccount?: () => void;
};

function parseAmount(value: string): number {
  return Number.parseFloat(value.replace(',', '.'));
}

export function GoalContributeModal({
  visible,
  onClose,
  goal,
  onCreateAccount,
}: GoalContributeModalProps) {
  const contribute = useCreateGoalContribution();
  const { data: accounts = [], isLoading: accountsLoading } = useAccountsWithBalances();

  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const activeAccounts = useMemo(() => accounts.filter((account) => account.isActive), [accounts]);

  useEffect(() => {
    if (!visible) return;
    traceGoalContribution('modal_open', { goalId: goal?.id });
    setAmount('');
    setNote('');
    setApiError(null);
    contribute.reset();
    setAccountId(activeAccounts.length === 1 ? activeAccounts[0]?.id : undefined);
  }, [visible, goal?.id, activeAccounts.length]);

  useEffect(() => {
    if (!visible || accountsLoading) return;
    traceGoalContribution('accounts_loaded', { count: activeAccounts.length });
  }, [visible, accountsLoading, activeAccounts.length]);

  const selectedAccount = useMemo(
    () => activeAccounts.find((account) => account.id === accountId),
    [activeAccounts, accountId],
  );

  const parsedAmount = useMemo(() => parseAmount(amount), [amount]);

  const preview = useMemo(() => {
    if (!goal || !selectedAccount) return null;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;

    const accountBalance = selectedAccount.balance ?? selectedAccount.initialBalance;
    const goalAfter = goal.current + parsedAmount;

    return {
      accountName: selectedAccount.name,
      accountAfter: accountBalance - parsedAmount,
      goalAfter,
      amount: parsedAmount,
      insufficient: parsedAmount > accountBalance,
    };
  }, [goal, selectedAccount, parsedAmount]);

  async function handleSave() {
    if (!goal) return;

    traceGoalContribution('save_click', { goalId: goal.id, accountId });

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setApiError('Indica um valor válido.');
      traceGoalContribution('validation_fail', { reason: 'invalid_amount' }, 'warn');
      return;
    }

    if (!accountId || !selectedAccount) {
      setApiError('Escolhe a conta de origem.');
      traceGoalContribution('validation_fail', { reason: 'missing_account' }, 'warn');
      return;
    }

    const accountBalance = selectedAccount.balance ?? selectedAccount.initialBalance;
    if (parsedAmount > accountBalance) {
      setApiError(
        `Saldo insuficiente em ${selectedAccount.name}. Disponível: ${formatCurrency(accountBalance)}.`,
      );
      traceGoalContribution('validation_fail', { reason: 'insufficient_balance' }, 'warn');
      return;
    }

    try {
      traceGoalContribution('mutation_start', { goalId: goal.id });
      await contribute.mutateAsync({
        goalId: goal.id,
        accountId,
        amount: parsedAmount,
        note: note.trim() || undefined,
      });
      traceGoalContribution('mutation_success', { goalId: goal.id });
      onClose();
    } catch (error) {
      traceGoalContribution('mutation_error', { goalId: goal.id, message: getApiErrorMessage(error) }, 'error');
      setApiError(getApiErrorMessage(error, 'a contribuição'));
    }
  }

  const sheetVisible = visible && Boolean(goal);

  return (
    <DraggableBottomSheet visible={sheetVisible} onClose={onClose} maxHeight="88%">
      {goal ? (
        <View style={styles.container}>
          <Text variant="h2">Adicionar dinheiro ao objetivo</Text>
          <Text variant="body" color="textSecondary">
            {goal.name}
          </Text>

          {activeAccounts.length === 0 && !accountsLoading ? (
            <Card variant="outlined" padding="md" style={styles.emptyAccounts}>
              <Text variant="bodyMedium">Precisas de uma conta para transferir dinheiro.</Text>
              <Text variant="caption" color="textSecondary">
                Cria uma conta em Ativos → Contas e volta a adicionar dinheiro ao objetivo.
              </Text>
              {onCreateAccount ? (
                <Button label="Criar conta" variant="secondary" onPress={onCreateAccount} fullWidth />
              ) : null}
            </Card>
          ) : (
            <>
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
                <Card variant="outlined" padding="md" style={styles.preview}>
                  <Text variant="bodyMedium">
                    Vais transferir {formatCurrency(preview.amount)} de {preview.accountName} para{' '}
                    {goal.name}.
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    Depois desta transferência:
                  </Text>
                  <Text variant="bodyMedium">
                    {preview.accountName} fica com {formatCurrency(preview.accountAfter)}
                  </Text>
                  <Text variant="bodyMedium">
                    {goal.name} fica com {formatCurrency(preview.goalAfter)}
                  </Text>
                  {preview.insufficient ? (
                    <Text variant="caption" color="danger">
                      Saldo insuficiente na conta de origem.
                    </Text>
                  ) : null}
                </Card>
              ) : null}

              {apiError ? (
                <Text variant="caption" color="danger">
                  {apiError}
                </Text>
              ) : null}

              <Button
                label={contribute.isPending ? 'A guardar...' : 'Adicionar ao objetivo'}
                onPress={handleSave}
                loading={contribute.isPending}
                disabled={contribute.isPending || activeAccounts.length === 0}
                fullWidth
                size="lg"
              />
            </>
          )}
        </View>
      ) : null}
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
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  emptyAccounts: {
    gap: spacing.sm,
  },
});
