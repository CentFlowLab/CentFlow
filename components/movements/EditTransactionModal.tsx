import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useUpdateTransaction } from '@/hooks/queries/useTransactions';
import {
  formValuesToUpdateInput,
  parseTransactionAmount,
  transactionToFormValues,
  type TransactionFormValues,
} from '@/lib/domain/transaction-form';
import { updateTransactionSchema } from '@/lib/domain/transaction.schema';
import type { Transaction } from '@/lib/domain/transaction.types';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formFieldsDiffer } from '@/lib/forms';
import { openReceiptForTransaction } from '@/lib/receipt/open-receipt';
import { colors, spacing } from '@/lib/theme';

import { TransactionForm } from './TransactionForm';
import { ReceiptItemsSummary } from './ReceiptItemsSummary';

type EditTransactionModalProps = {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
};

export function EditTransactionModal({
  visible,
  transaction,
  onClose,
}: EditTransactionModalProps) {
  const updateMutation = useUpdateTransaction();
  const { showToast } = useToast();
  const [values, setValues] = useState<TransactionFormValues>(() =>
    transaction ? transactionToFormValues(transaction) : {
      type: 'expense',
      amount: '',
      category: '',
      merchant: '',
      description: '',
      date: '',
    },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [openingReceipt, setOpeningReceipt] = useState(false);

  const baselineRef = useRef<TransactionFormValues>({
    type: 'expense',
    amount: '',
    category: '',
    merchant: '',
    description: '',
    date: '',
  });

  useEffect(() => {
    if (!visible || !transaction) return;
    const next = transactionToFormValues(transaction);
    setValues(next);
    baselineRef.current = next;
    setErrors({});
    setApiError(null);
    updateMutation.reset();
  }, [visible, transaction?.id]);

  const isDirty = useMemo(() => {
    if (!visible || !transaction) return false;
    return formFieldsDiffer(
      {
        amount: values.amount,
        category: values.category,
        merchant: values.merchant,
        description: values.description,
        date: values.date,
      },
      {
        amount: baselineRef.current.amount,
        category: baselineRef.current.category,
        merchant: baselineRef.current.merchant,
        description: baselineRef.current.description,
        date: baselineRef.current.date,
      },
    ) || values.type !== baselineRef.current.type;
  }, [visible, transaction, values]);

  if (!transaction) return null;

  async function handleSave() {
    setApiError(null);
    const parsedAmount = parseTransactionAmount(values.amount);
    const result = updateTransactionSchema.safeParse({
      ...formValuesToUpdateInput(values),
      amount: parsedAmount,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (typeof key === 'string') fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    try {
      await updateMutation.mutateAsync({
        transactionId: transaction!.id,
        input: result.data,
      });
      showToast('Movimento atualizado.', 'success');
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'a atualização do movimento'));
    }
  }

  const hasReceipt = Boolean(
    transaction.receiptId || transaction.receiptImage || transaction.receiptUrl,
  );

  async function handleViewReceipt() {
    if (!transaction) return;
    setOpeningReceipt(true);
    try {
      const opened = await openReceiptForTransaction(transaction);
      if (!opened) {
        showToast('Não foi possível abrir a fatura.', 'error');
      }
    } catch {
      showToast('Não foi possível abrir a fatura.', 'error');
    } finally {
      setOpeningReceipt(false);
    }
  }

  const title =
    transaction.description?.trim() || transaction.categoryLabel || 'Movimento';

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      maxHeight="92%"
      scrollContentStyle={styles.content}
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h2">Editar movimento</Text>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {title}
            </Text>
          </View>
          <Pressable onPress={requestClose} hitSlop={12} accessibilityLabel="Fechar">
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={28}
            />
          </Pressable>
        </View>
      )}>
      {hasReceipt ? (
        <Card variant="outlined" style={styles.receiptNote}>
          <SymbolView
            name={{ ios: 'doc.text.fill', android: 'receipt', web: 'receipt' }}
            tintColor={colors.textMuted}
            size={16}
          />
          <Text variant="caption" color="textSecondary" style={styles.receiptNoteText}>
            O talão/fatura mantém-se ligado a este movimento.
          </Text>
          <Button
            label={openingReceipt ? 'A abrir...' : 'Ver fatura'}
            variant="secondary"
            size="sm"
            onPress={handleViewReceipt}
            loading={openingReceipt}
            disabled={openingReceipt}
          />
        </Card>
      ) : null}

      {transaction.receiptItems && transaction.receiptItems.length > 0 ? (
        <ReceiptItemsSummary items={transaction.receiptItems} compact />
      ) : null}

      <TransactionForm values={values} onChange={setValues} errors={errors} />

      {apiError ? (
        <Card variant="outlined" style={styles.errorCard}>
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        </Card>
      ) : null}

      <Button
        label={updateMutation.isPending ? 'A guardar...' : 'Guardar alterações'}
        onPress={handleSave}
        loading={updateMutation.isPending}
        fullWidth
        size="lg"
      />
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  receiptNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderColor: colors.border,
  },
  receiptNoteText: {
    flex: 1,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
