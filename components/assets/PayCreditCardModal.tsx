import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, DatePickerField, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useCreateTransaction } from '@/hooks/queries/useTransactions';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { getApiErrorMessage } from '@/lib/api/errors';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
import {
  calculateCreditCardBalance,
  recordCreditCardPayment,
} from '@/lib/domain/financial/credit-cards';
import { parseGoalAmount } from '@/lib/domain/goal-form.utils';
import type { Credit } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, todayInputDate } from '@/lib/utils/format';

type PayCreditCardModalProps = {
  visible: boolean;
  credit: Credit | null;
  initialAmount?: number;
  onClose: () => void;
};

export function PayCreditCardModal({
  visible,
  credit,
  initialAmount,
  onClose,
}: PayCreditCardModalProps) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const createTransaction = useCreateTransaction();
  const { data: liabilities } = useLiabilities();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayInputDate());
  const [note, setNote] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const cards = useMemo(
    () => (liabilities?.credits ?? []).filter((c) => isCardCredit(c.creditType)),
    [liabilities?.credits],
  );
  const activeCredit = credit ?? cards[0] ?? null;

  useEffect(() => {
    if (!visible) return;
    const suggested =
      initialAmount ??
      activeCredit?.nextPaymentAmount ??
      activeCredit?.outstandingBalance;
    setAmount(suggested ? String(suggested) : '');
    setDate(todayInputDate());
    setNote('');
    setApiError(null);
  }, [visible, activeCredit?.id, initialAmount]);

  const parsedAmount = useMemo(() => {
    if (!amount.trim()) return Number.NaN;
    return parseGoalAmount(amount);
  }, [amount]);

  const impact = useMemo(() => {
    if (!activeCredit || Number.isNaN(parsedAmount) || parsedAmount <= 0) return null;
    return recordCreditCardPayment({
      credit: activeCredit,
      amount: parsedAmount,
      fromAccountBalance: 0,
    });
  }, [activeCredit, parsedAmount]);

  async function handleConfirm() {
    if (!activeCredit) return;
    setApiError(null);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setApiError('Indica um valor válido.');
      return;
    }
    if (parsedAmount > activeCredit.outstandingBalance) {
      setApiError('O valor excede a dívida do cartão.');
      return;
    }

    try {
      await createTransaction.mutateAsync({
        type: 'credit_card_payment',
        amount: parsedAmount,
        category: 'credit',
        description: note.trim() || `Pagamento ${activeCredit.name}`,
        date,
        creditId: activeCredit.id,
      });
      showToast(`Pagamento de ${formatCurrency(parsedAmount)} registado.`, 'success');
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o pagamento'));
      showToast('Não foi possível registar o pagamento.', 'error');
    }
  }

  if (!activeCredit) return null;

  const canConfirm =
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= activeCredit.outstandingBalance;

  return (
    <DraggableBottomSheet visible={visible} onClose={onClose}>
      <Text variant="h3" style={styles.sheetTitle}>
        Pagar cartão
      </Text>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 80 }]}>
        <Text variant="caption" color="textMuted">
          Pagamentos de cartão não contam como nova despesa. A despesa já contou quando compraste.
        </Text>

        <Card variant="outlined" style={styles.summaryCard}>
          <Text variant="label">{activeCredit.name}</Text>
          <Text variant="caption" color="textSecondary">
            Dívida atual: {formatCurrency(calculateCreditCardBalance(activeCredit))}
          </Text>
        </Card>

        <TextField
          label="Valor"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />

        <DatePickerField label="Data" value={date} onChange={setDate} />

        <TextField
          label="Nota (opcional)"
          value={note}
          onChangeText={setNote}
          placeholder="Ex.: pagamento mensal"
        />

        {impact ? (
          <Card variant="outlined" style={styles.impactCard}>
            <Text variant="caption" color="textMuted">
              Impacto
            </Text>
            <Text variant="body">
              {activeCredit.name}: {formatCurrency(activeCredit.outstandingBalance)} →{' '}
              {formatCurrency(impact.newCreditBalance)}
            </Text>
          </Card>
        ) : null}

        {apiError ? (
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Button
            label={createTransaction.isPending ? 'A guardar...' : 'Confirmar pagamento'}
            onPress={handleConfirm}
            disabled={!canConfirm || createTransaction.isPending}
          />
        </View>
      </ScrollView>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  summaryCard: {
    gap: spacing.xs,
  },
  impactCard: {
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  footer: {
    marginTop: spacing.lg,
  },
});
