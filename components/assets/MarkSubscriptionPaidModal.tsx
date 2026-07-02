import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  PaymentMethodPickerField,
  type PaymentMethodSelection,
} from '@/components/accounts/PaymentMethodPickerField';
import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, DatePickerField, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import { useMarkSubscriptionPaid } from '@/hooks/queries/useMarkSubscriptionPaid';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { getApiErrorMessage } from '@/lib/api/errors';
import { isCardCredit } from '@/lib/credit/credit-type.utils';
import type { Subscription } from '@/lib/domain/assets.types';
import {
  advanceSubscriptionRenewalDate,
  getSubscriptionPaymentUiState,
} from '@/lib/domain/financial/subscription-payments';
import { formatGoalAmount, parseGoalAmount } from '@/lib/domain/goal-form.utils';
import { spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort, todayInputDate } from '@/lib/utils/format';

type MarkSubscriptionPaidModalProps = {
  visible: boolean;
  subscription: Subscription | null;
  onClose: () => void;
};

export function MarkSubscriptionPaidModal({
  visible,
  subscription,
  onClose,
}: MarkSubscriptionPaidModalProps) {
  const { showToast } = useToast();
  const markPaid = useMarkSubscriptionPaid();
  const { data: transactions = [] } = useTransactions('all');
  const { data: accounts = [] } = useAccountsWithBalances();
  const { data: liabilities } = useLiabilities();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodSelection>();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayInputDate());
  const [note, setNote] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const cards = useMemo(
    () => (liabilities?.credits ?? []).filter((c) => isCardCredit(c.creditType)),
    [liabilities?.credits],
  );
  const hasPaymentOptions = accounts.some((a) => a.isActive) || cards.length > 0;

  useEffect(() => {
    if (!visible || !subscription) return;
    setAmount(formatGoalAmount(subscription.amount));
    setDate(todayInputDate());
    setNote('');
    setPaymentMethod(undefined);
    setApiError(null);
  }, [visible, subscription?.id]);

  const parsedAmount = useMemo(() => {
    if (!amount.trim()) return Number.NaN;
    return parseGoalAmount(amount);
  }, [amount]);

  const uiState = subscription
    ? getSubscriptionPaymentUiState(subscription, transactions)
    : null;

  const nextRenewal = subscription
    ? advanceSubscriptionRenewalDate(subscription, date || todayInputDate())
    : null;

  async function handleConfirm() {
    if (!subscription || !paymentMethod) return;
    setApiError(null);

    if (uiState?.paidThisCycle) {
      setApiError('Já registaste o pagamento deste ciclo.');
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setApiError('Indica um valor válido.');
      return;
    }

    try {
      await markPaid.mutateAsync({
        subscription,
        amount: parsedAmount,
        date,
        paymentMethod,
        note: note.trim() || undefined,
      });
      showToast(`${subscription.name} marcada como paga.`, 'success');
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o pagamento'));
      showToast('Não foi possível registar o pagamento.', 'error');
    }
  }

  if (!subscription) return null;

  return (
    <DraggableBottomSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h2">Marcar como pago</Text>
        <Text variant="caption" color="textSecondary">
          Cria um movimento real e avança a próxima renovação.
        </Text>

        <Card variant="outlined" style={styles.summary}>
          <Text variant="bodyMedium">{subscription.name}</Text>
          <Text variant="caption" color="textMuted">
            Valor habitual: {formatCurrency(subscription.amount)}
          </Text>
          {subscription.renewsAt ? (
            <Text variant="caption" color="textMuted">
              Renovação actual: {formatDateShort(subscription.renewsAt)}
            </Text>
          ) : null}
        </Card>

        {!hasPaymentOptions ? (
          <Text variant="caption" color="textSecondary">
            Adiciona uma conta ou cartão em Ativos para registar o pagamento.
          </Text>
        ) : (
          <>
            <TextField
              label="Valor (€)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <PaymentMethodPickerField value={paymentMethod} onChange={setPaymentMethod} />
            <DatePickerField label="Data" value={date} onChange={setDate} />
            <TextField
              label="Nota (opcional)"
              value={note}
              onChangeText={setNote}
              placeholder={subscription.name}
            />
            {nextRenewal ? (
              <Text variant="caption" color="textMuted">
                Próxima renovação: {formatDateShort(nextRenewal)}
              </Text>
            ) : null}
          </>
        )}

        {apiError ? (
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        ) : null}

        <Button
          label="Confirmar pagamento"
          onPress={() => void handleConfirm()}
          loading={markPaid.isPending}
          disabled={!hasPaymentOptions || uiState?.disabled}
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
