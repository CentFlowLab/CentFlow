import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Text, TextField } from '@/components/ui';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useCreateTransaction } from '@/hooks/queries/useTransactions';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  calculateTransferImpact,
  isTransferValid,
  validationMessage,
} from '@/lib/domain/financial/transfers';
import { traceTransferError, traceTransferStep } from '@/lib/doctor/transfer-flow-trace';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, toIsoDateString } from '@/lib/utils/format';

type TransferAccountModalProps = {
  visible: boolean;
  onClose: () => void;
};

function parseAmount(raw: string): number {
  return Number.parseFloat(raw.replace(',', '.'));
}

export function TransferAccountModal({ visible, onClose }: TransferAccountModalProps) {
  const insets = useSafeAreaInsets();
  const createTransaction = useCreateTransaction();
  const { data: accounts = [] } = useAccountsWithBalances();

  const activeAccounts = accounts.filter((a) => a.isActive);
  const [fromAccountId, setFromAccountId] = useState<string | undefined>();
  const [toAccountId, setToAccountId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setNote('');
    setApiError(null);
    setFromAccountId(activeAccounts[0]?.id);
    setToAccountId(activeAccounts.find((a) => a.id !== activeAccounts[0]?.id)?.id);
    createTransaction.reset();
  }, [visible, activeAccounts.length]);

  useEffect(() => {
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
    if (toAccountId === fromAccountId) {
      setToAccountId(activeAccounts.find((a) => a.id !== fromAccountId)?.id);
    }
  }, [fromAccountId, activeAccounts, toAccountId]);

  const fromAccount = activeAccounts.find((a) => a.id === fromAccountId);
  const toAccount = activeAccounts.find((a) => a.id === toAccountId);
  const parsedAmount = parseAmount(amount);

  const validation = useMemo(() => {
    if (activeAccounts.length < 2) {
      return isTransferValid({
        fromAccountId,
        toAccountId,
        amount: parsedAmount,
        fromBalance: fromAccount?.balance ?? fromAccount?.initialBalance ?? 0,
        accountCount: activeAccounts.length,
      });
    }
    return isTransferValid({
      fromAccountId,
      toAccountId,
      amount: parsedAmount,
      fromBalance: fromAccount?.balance ?? fromAccount?.initialBalance ?? 0,
      accountCount: activeAccounts.length,
    });
  }, [fromAccountId, toAccountId, parsedAmount, fromAccount, activeAccounts.length]);

  const impact = useMemo(() => {
    if (!fromAccount || !toAccount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;
    if (fromAccountId === toAccountId) return null;
    return calculateTransferImpact({
      fromAccount,
      toAccount,
      amount: parsedAmount,
    });
  }, [fromAccount, toAccount, parsedAmount, fromAccountId, toAccountId]);

  const canSubmit =
    validation.valid && !createTransaction.isPending && activeAccounts.length >= 2;

  const destinationAccounts = activeAccounts.filter((a) => a.id !== fromAccountId);

  async function handleSave() {
    traceTransferStep('validation_start');
    if (!validation.valid) {
      const message = validationMessage(validation) ?? 'Transferência inválida.';
      traceTransferStep('validation_fail', { message }, 'warn');
      setApiError(message);
      return;
    }

    traceTransferStep('balance_check', {
      fromAccountId,
      toAccountId,
      amount: parsedAmount,
    });

    try {
      traceTransferStep('mutation_start');
      await createTransaction.mutateAsync({
        type: 'transfer',
        amount: parsedAmount,
        category: 'other',
        description: note.trim() || 'Transferência entre contas',
        date: toIsoDateString(new Date()),
        accountId: fromAccountId,
        destinationAccountId: toAccountId,
      });
      traceTransferStep('mutation_success');
      traceTransferStep('ui_refresh');
      traceTransferStep('mutation_settled');
      onClose();
    } catch (error) {
      traceTransferError('mutation_error', error, {
        fromAccountId,
        toAccountId,
        amount: parsedAmount,
      });
      setApiError(getApiErrorMessage(error, 'a transferência'));
    }
  }

  function handleSelectFrom(accountId: string) {
    setFromAccountId(accountId);
    if (toAccountId === accountId) {
      setToAccountId(activeAccounts.find((a) => a.id !== accountId)?.id);
    }
  }

  return (
    <DraggableBottomSheet visible={visible} onClose={onClose}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl }]}>
        <Text variant="h2">Transferir entre contas</Text>
        <Text variant="caption" color="textMuted">
          Move dinheiro entre contas sem contar como receita ou despesa.
        </Text>

        {activeAccounts.length < 2 ? (
          <View style={styles.emptyBox}>
            <Text variant="body" color="textSecondary">
              {activeAccounts.length === 0
                ? 'Cria uma conta para começares a acompanhar o dinheiro.'
                : 'Adiciona uma segunda conta para poderes transferir dinheiro.'}
            </Text>
          </View>
        ) : (
          <>
            <Text variant="label" color="textSecondary">
              Conta de origem
            </Text>
            <View style={styles.row}>
              {activeAccounts.map((account) => (
                <Button
                  key={`from-${account.id}`}
                  label={account.name}
                  variant={fromAccountId === account.id ? 'primary' : 'secondary'}
                  onPress={() => handleSelectFrom(account.id)}
                />
              ))}
            </View>

            <Text variant="label" color="textSecondary">
              Conta de destino
            </Text>
            <View style={styles.row}>
              {destinationAccounts.length === 0 ? (
                <Text variant="caption" color="textMuted">
                  Seleciona uma conta de origem diferente.
                </Text>
              ) : (
                destinationAccounts.map((account) => (
                  <Button
                    key={`to-${account.id}`}
                    label={account.name}
                    variant={toAccountId === account.id ? 'primary' : 'secondary'}
                    onPress={() => setToAccountId(account.id)}
                  />
                ))
              )}
            </View>

            <TextField
              label="Valor"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0,00"
            />

            <TextField
              label="Nota (opcional)"
              value={note}
              onChangeText={setNote}
              placeholder="Ex.: poupança mensal"
            />

            {impact ? (
              <View style={styles.preview}>
                <Text variant="bodyMedium">Transferir {formatCurrency(parsedAmount)}</Text>
                <Text variant="caption" color="textSecondary">
                  De: {fromAccount?.name} — {formatCurrency(impact.fromBefore)} →{' '}
                  {formatCurrency(impact.fromAfter)}
                </Text>
                <Text variant="caption" color="textSecondary">
                  Para: {toAccount?.name} — {formatCurrency(impact.toBefore)} →{' '}
                  {formatCurrency(impact.toAfter)}
                </Text>
              </View>
            ) : null}

            {!validation.valid && amount.trim().length > 0 ? (
              <Text variant="caption" color="warning">
                {validationMessage(validation)}
              </Text>
            ) : null}
          </>
        )}

        {apiError ? (
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        ) : null}

        <View style={styles.footerGap} />

        <Button
          label={createTransaction.isPending ? 'A transferir...' : 'Confirmar transferência'}
          onPress={() => void handleSave()}
          disabled={!canSubmit}
        />
      </ScrollView>
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
  emptyBox: {
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
  },
  footerGap: {
    minHeight: spacing.lg,
  },
});
