import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PaymentMethodPickerField,
  paymentSelectionToFields,
  type PaymentMethodSelection,
} from '@/components/accounts';
import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, DatePickerField, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useCreateTransaction } from '@/hooks/queries/useTransactions';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { getApiErrorMessage } from '@/lib/api/errors';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
import { getCategoriesForType } from '@/lib/data/transaction-categories';
import { createTransactionSchema } from '@/lib/domain/transaction.schema';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, todayInputDate } from '@/lib/utils/format';

import { CategoryField } from './CategoryField';

type RefundDestination = 'account' | 'card';

type RefundTransactionModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Movimentos recentes para associar reembolso à compra original. */
  transactions?: Transaction[];
};

function parseAmount(value: string): number {
  return Number(value.replace(/\s/g, '').replace(',', '.'));
}

export function RefundTransactionModal({
  visible,
  onClose,
  transactions = [],
}: RefundTransactionModalProps) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const createTransaction = useCreateTransaction();
  const { data: liabilities } = useLiabilities();

  const [destination, setDestination] = useState<RefundDestination>('card');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('refund');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayInputDate());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodSelection>();
  const [relatedTransactionId, setRelatedTransactionId] = useState<string | undefined>();
  const [apiError, setApiError] = useState<string | null>(null);

  const cards = useMemo(
    () => (liabilities?.credits ?? []).filter((c) => isCardCredit(c.creditType)),
    [liabilities?.credits],
  );

  const linkablePurchases = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          tx.type === 'credit_card_purchase' ||
          (tx.type === 'expense' && Boolean(tx.creditId)),
      ),
    [transactions],
  );

  useEffect(() => {
    if (!visible) return;
    setAmount('');
    setDescription('');
    setDate(todayInputDate());
    setCategory('refund');
    setDestination(cards.length > 0 ? 'card' : 'account');
    setPaymentMethod(undefined);
    setRelatedTransactionId(undefined);
    setApiError(null);
  }, [visible, cards.length]);

  async function handleSave() {
    setApiError(null);
    const parsedAmount = parseAmount(amount);
    const paymentFields =
      destination === 'card'
        ? paymentSelectionToFields(paymentMethod)
        : { accountId: null, creditId: null };

    const submitType =
      destination === 'card' ? ('credit_card_refund' as const) : ('income' as const);

    const result = createTransactionSchema.safeParse({
      type: submitType,
      amount: parsedAmount,
      category: destination === 'card' ? category || 'refund' : 'refund',
      description: description.trim() || undefined,
      date,
      accountId: paymentFields.accountId,
      creditId: paymentFields.creditId,
      relatedTransactionId: relatedTransactionId ?? null,
    });

    if (!result.success) {
      setApiError(result.error.issues[0]?.message ?? 'Verifica os campos.');
      return;
    }

    try {
      await createTransaction.mutateAsync({
        ...result.data,
        relatedTransactionId: relatedTransactionId ?? null,
      });
      showToast('Reembolso registado.', 'success');
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o reembolso'));
      showToast('Não foi possível guardar o reembolso.', 'error');
    }
  }

  return (
    <DraggableBottomSheet visible={visible} onClose={onClose}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Text variant="h2">Reembolso</Text>
        <Text variant="caption" color="textSecondary" style={styles.hint}>
          Reembolsos no cartão reduzem a dívida e a despesa líquida — não contam como receita
          normal.
        </Text>

        {cards.length > 0 ? (
          <View style={styles.destinationRow}>
            <Button
              label="Cartão de crédito"
              variant={destination === 'card' ? 'primary' : 'secondary'}
              size="sm"
              onPress={() => setDestination('card')}
            />
            <Button
              label="Receita"
              variant={destination === 'account' ? 'primary' : 'secondary'}
              size="sm"
              onPress={() => setDestination('account')}
            />
          </View>
        ) : null}

        <TextField
          label="Valor"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />

        {destination === 'card' ? (
          <PaymentMethodPickerField
            value={paymentMethod}
            onChange={setPaymentMethod}
            restrictTo="card"
          />
        ) : (
          <Text variant="caption" color="textMuted">
            O reembolso entra como receita no saldo global.
          </Text>
        )}

        <CategoryField
          type={destination === 'card' ? 'expense' : 'income'}
          value={category}
          onChange={setCategory}
        />

        <TextField
          label="Descrição (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: Devolução supermercado"
        />

        <DatePickerField label="Data" value={date} onChange={setDate} />

        {linkablePurchases.length > 0 ? (
          <Card variant="outlined" style={styles.linkCard}>
            <Text variant="bodyMedium">Movimento original (opcional)</Text>
            {linkablePurchases.slice(0, 5).map((tx) => (
              <Button
                key={tx.id}
                label={`${tx.categoryLabel} · ${formatCurrency(tx.amount)}`}
                variant={relatedTransactionId === tx.id ? 'primary' : 'secondary'}
                size="sm"
                onPress={() =>
                  setRelatedTransactionId((current) => (current === tx.id ? undefined : tx.id))
                }
                style={styles.linkButton}
              />
            ))}
          </Card>
        ) : null}

        {apiError ? (
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        ) : null}

        <Button
          label="Guardar reembolso"
          onPress={() => void handleSave()}
          loading={createTransaction.isPending}
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
  hint: {
    marginBottom: spacing.xs,
  },
  destinationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  linkCard: {
    gap: spacing.sm,
  },
  linkButton: {
    alignSelf: 'stretch',
  },
});
