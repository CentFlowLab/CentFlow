import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, DatePickerField, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useCreateLoanPayment } from '@/hooks/queries/useLoanPayments';
import { getApiErrorMessage } from '@/lib/api/errors';
import { calculateDebtAmortizationImpact } from '@/lib/domain/financial/loan-payments';
import { traceLoanModalOpened } from '@/lib/doctor/recurring-payment-trace';
import { parseGoalAmount } from '@/lib/domain/goal-form.utils';
import type { Credit } from '@/lib/domain/types';
import { spacing } from '@/lib/theme';
import { formatCurrency, todayInputDate } from '@/lib/utils/format';

type RegisterLoanAmortizationModalProps = {
  visible: boolean;
  credit: Credit | null;
  initialAmount?: number;
  onClose: () => void;
};

export function RegisterLoanAmortizationModal({
  visible,
  credit,
  initialAmount,
  onClose,
}: RegisterLoanAmortizationModalProps) {
  const { showToast } = useToast();
  const createPayment = useCreateLoanPayment();

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayInputDate());
  const [note, setNote] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !credit) return;
    traceLoanModalOpened('loan_extra_payment_opened', { creditId: credit.id });
    setAmount(initialAmount ? String(initialAmount) : '');
    setDate(todayInputDate());
    setNote('');
    setApiError(null);
  }, [visible, credit?.id, initialAmount]);

  const parsedAmount = useMemo(() => parseGoalAmount(amount), [amount]);

  const impact = useMemo(() => {
    if (!credit || Number.isNaN(parsedAmount) || parsedAmount <= 0) return null;
    return calculateDebtAmortizationImpact({ credit, accountId: '', amount: parsedAmount });
  }, [credit, parsedAmount]);

  async function handleConfirm() {
    if (!credit) return;
    setApiError(null);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setApiError('Indica um valor válido.');
      return;
    }
    if (parsedAmount > credit.outstandingBalance) {
      setApiError('Valor superior à dívida.');
      return;
    }

    try {
      await createPayment.mutateAsync({
        credit,
        creditId: credit.id,
        type: 'extra_principal_payment',
        amount: parsedAmount,
        principalAmount: parsedAmount,
        paidAt: `${date}T12:00:00.000Z`,
        note: note.trim() || undefined,
      });
      showToast('Amortização registada.', 'success');
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'a amortização'));
    }
  }

  if (!credit) return null;

  return (
    <DraggableBottomSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h2">Amortizar crédito</Text>
        <Text variant="caption" color="textSecondary">
          Pagamento extra para reduzir a dívida. Não conta como despesa de consumo.
        </Text>

        <TextField label="Valor a amortizar (€)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <DatePickerField label="Data" value={date} onChange={setDate} />
        <TextField label="Nota (opcional)" value={note} onChangeText={setNote} />

        {impact ? (
          <Card variant="outlined" style={styles.preview}>
            <Text variant="caption" color="textMuted">
              Dívida baixa de {formatCurrency(credit.outstandingBalance)} para{' '}
              {formatCurrency(impact.newCreditBalance)}.
            </Text>
          </Card>
        ) : null}

        {apiError ? (
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        ) : null}

        <Button
          label="Registar amortização"
          onPress={() => void handleConfirm()}
          loading={createPayment.isPending}
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
  preview: {
    gap: spacing.xs,
  },
});
