import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AccountPickerField } from '@/components/accounts/AccountPickerField';
import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, DatePickerField, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useCreateLoanPayment } from '@/hooks/queries/useLoanPayments';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  calculateLoanPaymentBreakdown,
  calculateMonthlyLoanPaymentImpact,
} from '@/lib/domain/financial/loan-payments';
import { parseGoalAmount } from '@/lib/domain/goal-form.utils';
import type { Credit } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency, todayInputDate } from '@/lib/utils/format';

type RegisterLoanMonthlyPaymentModalProps = {
  visible: boolean;
  credit: Credit | null;
  onClose: () => void;
};

export function RegisterLoanMonthlyPaymentModal({
  visible,
  credit,
  onClose,
}: RegisterLoanMonthlyPaymentModalProps) {
  const { showToast } = useToast();
  const createPayment = useCreateLoanPayment();
  const { data: accounts = [] } = useAccountsWithBalances();

  const [accountId, setAccountId] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interest, setInterest] = useState('');
  const [date, setDate] = useState(todayInputDate());
  const [note, setNote] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !credit) return;
    const suggested = credit.nextPaymentAmount ?? credit.monthlyPayment;
    setAmount(suggested ? String(suggested) : '');
    setPrincipal('');
    setInterest('');
    setDate(todayInputDate());
    setNote('');
    setAccountId(undefined);
    setApiError(null);
  }, [visible, credit?.id]);

  const parsedAmount = useMemo(() => parseGoalAmount(amount), [amount]);
  const parsedPrincipal = useMemo(() => (principal.trim() ? parseGoalAmount(principal) : Number.NaN), [principal]);
  const parsedInterest = useMemo(() => (interest.trim() ? parseGoalAmount(interest) : Number.NaN), [interest]);

  const fromAccount = accounts.find((a) => a.id === accountId);
  const fromBalance = fromAccount?.balance ?? fromAccount?.initialBalance ?? 0;

  const impact = useMemo(() => {
    if (!credit || Number.isNaN(parsedAmount) || parsedAmount <= 0) return null;
    return calculateMonthlyLoanPaymentImpact({
      credit,
      accountId: accountId ?? '',
      amount: parsedAmount,
      principalAmount: Number.isNaN(parsedPrincipal) ? undefined : parsedPrincipal,
      interestAmount: Number.isNaN(parsedInterest) ? undefined : parsedInterest,
    });
  }, [credit, parsedAmount, parsedPrincipal, parsedInterest, accountId]);

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

    const breakdown = calculateLoanPaymentBreakdown({
      amount: parsedAmount,
      principalAmount: Number.isNaN(parsedPrincipal) ? undefined : parsedPrincipal,
      interestAmount: Number.isNaN(parsedInterest) ? undefined : parsedInterest,
    });

    try {
      await createPayment.mutateAsync({
        credit,
        creditId: credit.id,
        accountId,
        type: 'monthly_payment',
        amount: parsedAmount,
        principalAmount: breakdown.principal,
        interestAmount: breakdown.interest,
        paidAt: `${date}T12:00:00.000Z`,
        note: note.trim() || undefined,
      });
      showToast('Mensalidade registada.', 'success');
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'a mensalidade'));
    }
  }

  if (!credit) return null;

  return (
    <DraggableBottomSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h2">Registar mensalidade</Text>
        <Text variant="caption" color="textSecondary">
          Pagamento normal deste mês. Juros contam como despesa financeira; capital reduz a dívida.
        </Text>

        <TextField label="Valor pago (€)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        <TextField
          label="Capital (opcional)"
          value={principal}
          onChangeText={setPrincipal}
          keyboardType="decimal-pad"
          placeholder="Parte que reduz dívida"
        />
        <TextField
          label="Juros/encargos (opcional)"
          value={interest}
          onChangeText={setInterest}
          keyboardType="decimal-pad"
        />
        <AccountPickerField value={accountId} onChange={setAccountId} transactionType="expense" />
        <DatePickerField label="Data" value={date} onChange={setDate} />
        <TextField label="Nota (opcional)" value={note} onChangeText={setNote} />

        {impact ? (
          <Card variant="outlined" style={styles.preview}>
            <Text variant="caption" color="textMuted">
              Dívida: {formatCurrency(credit.outstandingBalance)} →{' '}
              {formatCurrency(impact.newCreditBalance)}
            </Text>
            <Text variant="caption" color="textMuted">
              Encargos financeiros: {formatCurrency(impact.financialExpenseDelta)}
            </Text>
          </Card>
        ) : null}

        {apiError ? (
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        ) : null}

        <Button
          label="Registar mensalidade"
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
