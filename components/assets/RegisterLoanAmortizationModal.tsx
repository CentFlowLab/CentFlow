import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AccountPickerField } from '@/components/accounts/AccountPickerField';
import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, DatePickerField, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useCreateLoanPayment } from '@/hooks/queries/useLoanPayments';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
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
  onClose: () => void;
};

export function RegisterLoanAmortizationModal({
  visible,
  credit,
  onClose,
}: RegisterLoanAmortizationModalProps) {
  const { showToast } = useToast();
  const createPayment = useCreateLoanPayment();
  const { data: accounts = [] } = useAccountsWithBalances();

  const [accountId, setAccountId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayInputDate());
  const [note, setNote] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !credit) return;
    traceLoanModalOpened('loan_extra_payment_opened', { creditId: credit.id });
    setAmount('');
    setDate(todayInputDate());
    setNote('');
    setAccountId(undefined);
    setApiError(null);
  }, [visible, credit?.id]);

  const parsedAmount = useMemo(() => parseGoalAmount(amount), [amount]);
  const fromAccount = accounts.find((a) => a.id === accountId);
  const fromBalance = fromAccount?.balance ?? fromAccount?.initialBalance ?? 0;

  const impact = useMemo(() => {
    if (!credit || Number.isNaN(parsedAmount) || parsedAmount <= 0) return null;
    return calculateDebtAmortizationImpact({ credit, accountId: accountId ?? '', amount: parsedAmount });
  }, [credit, parsedAmount, accountId]);

  async function handleConfirm() {
    if (!credit || !accountId) return;
    setApiError(null);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setApiError('Indica um valor válido.');
      return;
    }
    if (parsedAmount > fromBalance) {
      setApiError('Saldo insuficiente na conta.');
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
        accountId,
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
        <AccountPickerField value={accountId} onChange={setAccountId} transactionType="expense" />
        <DatePickerField label="Data" value={date} onChange={setDate} />
        <TextField label="Nota (opcional)" value={note} onChangeText={setNote} />

        {impact && fromAccount ? (
          <Card variant="outlined" style={styles.preview}>
            <Text variant="caption" color="textMuted">
              Dívida baixa de {formatCurrency(credit.outstandingBalance)} para{' '}
              {formatCurrency(impact.newCreditBalance)}.
            </Text>
            <Text variant="caption" color="textMuted">
              {fromAccount.name} baixa de {formatCurrency(fromBalance)} para{' '}
              {formatCurrency(fromBalance + impact.accountDelta)}.
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
