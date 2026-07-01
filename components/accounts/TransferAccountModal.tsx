import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Text, TextField } from '@/components/ui';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useCreateTransaction } from '@/hooks/queries/useTransactions';
import { getApiErrorMessage } from '@/lib/api/errors';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, formatInputDate } from '@/lib/utils/format';

type TransferAccountModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function TransferAccountModal({ visible, onClose }: TransferAccountModalProps) {
  const createTransaction = useCreateTransaction();
  const { data: accounts = [] } = useAccountsWithBalances();

  const activeAccounts = accounts.filter((a) => a.isActive);
  const [fromAccountId, setFromAccountId] = useState<string | undefined>();
  const [toAccountId, setToAccountId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setApiError(null);
    setFromAccountId(activeAccounts[0]?.id);
    setToAccountId(activeAccounts[1]?.id ?? activeAccounts[0]?.id);
    createTransaction.reset();
  }, [visible, activeAccounts.length]);

  const preview = useMemo(() => {
    const value = Number.parseFloat(amount.replace(',', '.'));
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return null;
    if (!Number.isFinite(value) || value <= 0) return null;
    const from = accounts.find((a) => a.id === fromAccountId);
    const to = accounts.find((a) => a.id === toAccountId);
    if (!from || !to) return null;
    return {
      fromName: from.name,
      toName: to.name,
      fromAfter: (from.balance ?? from.initialBalance) - value,
      toAfter: (to.balance ?? to.initialBalance) + value,
      value,
    };
  }, [fromAccountId, toAccountId, amount, accounts]);

  async function handleSave() {
    const value = Number.parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setApiError('Indica um valor válido.');
      return;
    }
    if (!fromAccountId || !toAccountId) {
      setApiError('Escolhe as duas contas.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setApiError('Origem e destino têm de ser contas diferentes.');
      return;
    }

    try {
      await createTransaction.mutateAsync({
        type: 'transfer',
        amount: value,
        category: 'other',
        description: 'Transferência entre contas',
        date: formatInputDate(new Date()),
        accountId: fromAccountId,
        destinationAccountId: toAccountId,
      });
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'a transferência'));
    }
  }

  return (
    <DraggableBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text variant="h2">Transferir entre contas</Text>
        <Text variant="caption" color="textMuted">
          Move saldo entre contas sem contar como receita ou despesa.
        </Text>

        <Text variant="label" color="textSecondary">
          De
        </Text>
        <View style={styles.row}>
          {activeAccounts.map((account) => (
            <Button
              key={`from-${account.id}`}
              label={account.name}
              variant={fromAccountId === account.id ? 'primary' : 'secondary'}
              onPress={() => setFromAccountId(account.id)}
            />
          ))}
        </View>

        <Text variant="label" color="textSecondary">
          Para
        </Text>
        <View style={styles.row}>
          {activeAccounts.map((account) => (
            <Button
              key={`to-${account.id}`}
              label={account.name}
              variant={toAccountId === account.id ? 'primary' : 'secondary'}
              onPress={() => setToAccountId(account.id)}
            />
          ))}
        </View>

        <TextField
          label="Valor"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />

        {preview ? (
          <View style={styles.preview}>
            <Text variant="bodyMedium">
              {formatCurrency(preview.value)} de {preview.fromName} → {preview.toName}
            </Text>
            <Text variant="caption" color="textSecondary">
              {preview.fromName}: {formatCurrency(preview.fromAfter)} · {preview.toName}:{' '}
              {formatCurrency(preview.toAfter)}
            </Text>
          </View>
        ) : null}

        {apiError ? (
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        ) : null}

        <Button
          label={createTransaction.isPending ? 'A transferir...' : 'Confirmar transferência'}
          onPress={handleSave}
          disabled={createTransaction.isPending || activeAccounts.length < 2}
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
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  preview: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
  },
});
