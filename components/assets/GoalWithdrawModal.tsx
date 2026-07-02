import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AccountPickerField } from '@/components/accounts/AccountPickerField';
import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, DatePickerField, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useCreateGoalWithdrawal } from '@/hooks/queries/useGoalContributions';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Goal } from '@/lib/domain/assets.types';
import { parseGoalAmount } from '@/lib/domain/goal-form.utils';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, todayInputDate } from '@/lib/utils/format';

type GoalWithdrawModalProps = {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
};

export function GoalWithdrawModal({ visible, goal, onClose }: GoalWithdrawModalProps) {
  const { showToast } = useToast();
  const withdraw = useCreateGoalWithdrawal();
  const { data: accounts = [] } = useAccountsWithBalances();

  const [accountId, setAccountId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayInputDate());
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setNote('');
    setDate(todayInputDate());
    setAccountId(undefined);
    setApiError(null);
  }, [visible, goal?.id]);

  const parsedAmount = useMemo(() => {
    if (!amount.trim()) return Number.NaN;
    return parseGoalAmount(amount);
  }, [amount]);

  const destAccount = accounts.find((a) => a.id === accountId);

  async function handleSave() {
    if (!goal) return;
    setApiError(null);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setApiError('Indica um valor válido.');
      return;
    }
    if (!accountId) {
      setApiError('Escolhe a conta de destino.');
      return;
    }
    if (parsedAmount > goal.current) {
      setApiError('Valor superior ao guardado no objetivo.');
      return;
    }

    try {
      await withdraw.mutateAsync({
        goalId: goal.id,
        accountId,
        amount: parsedAmount,
        note: note.trim() || undefined,
      });
      showToast(`${formatCurrency(parsedAmount)} transferidos para a conta.`, 'success');
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o levantamento'));
      showToast('Não foi possível retirar do objetivo.', 'error');
    }
  }

  if (!goal) return null;

  return (
    <DraggableBottomSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h2">Retirar do objetivo</Text>
        <Text variant="caption" color="textSecondary">
          O dinheiro volta para a conta escolhida. Não conta como receita nem altera o património
          líquido.
        </Text>

        <Card variant="outlined" style={styles.summary}>
          <Text variant="bodyMedium">{goal.name}</Text>
          <Text variant="caption" color="textMuted">
            Guardado: {formatCurrency(goal.current)}
          </Text>
        </Card>

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
          transactionType="income"
        />

        <TextField
          label="Nota (opcional)"
          value={note}
          onChangeText={setNote}
          placeholder="Ex: Emergência imprevista"
        />

        <DatePickerField label="Data" value={date} onChange={setDate} />

        {destAccount && !Number.isNaN(parsedAmount) && parsedAmount > 0 ? (
          <Text variant="caption" color="textMuted">
            {destAccount.name} passará a{' '}
            {formatCurrency((destAccount.balance ?? destAccount.initialBalance) + parsedAmount)}
          </Text>
        ) : null}

        {apiError ? (
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        ) : null}

        <Button
          label="Confirmar levantamento"
          onPress={() => void handleSave()}
          loading={withdraw.isPending}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  summary: {
    gap: spacing.xs,
  },
});
