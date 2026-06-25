import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useSaveCredit } from '@/hooks/queries/useLiabilities';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Credit } from '@/lib/domain/types';
import { parseGoalAmount } from '@/lib/domain/goal-form.utils';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type RegisterCreditPaymentModalProps = {
  visible: boolean;
  credit: Credit | null;
  onClose: () => void;
};

export function RegisterCreditPaymentModal({
  visible,
  credit,
  onClose,
}: RegisterCreditPaymentModalProps) {
  const saveCredit = useSaveCredit();
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !credit) return;
    const suggested = credit.nextPaymentAmount ?? credit.monthlyPayment;
    setAmount(suggested ? String(suggested) : '');
    setApiError(null);
    saveCredit.reset();
  }, [visible, credit?.id]);

  const parsedAmount = useMemo(() => {
    if (!amount.trim()) return Number.NaN;
    return parseGoalAmount(amount);
  }, [amount]);

  const newBalance = useMemo(() => {
    if (!credit || Number.isNaN(parsedAmount)) return null;
    return Math.max(0, credit.outstandingBalance - parsedAmount);
  }, [credit, parsedAmount]);

  async function handleConfirm() {
    if (!credit) return;
    setApiError(null);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setApiError('Indica um valor de pagamento válido.');
      return;
    }

    const balance = Math.max(0, credit.outstandingBalance - parsedAmount);

    try {
      await saveCredit.mutateAsync({
        ...credit,
        outstandingBalance: balance,
      });
      showToast(`Pagamento registado — novo saldo ${formatCurrency(balance)}.`, 'success');
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o pagamento'));
      showToast('Não conseguimos registar o pagamento. Tenta novamente.', 'error');
    }
  }

  if (!credit) return null;

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      isDirty={amount.trim().length > 0}
      maxHeight="70%"
      scrollContentStyle={styles.form}
      header={(requestClose) => (
        <View style={styles.header}>
          <View>
            <Text variant="h2">Registar pagamento</Text>
            <Text variant="caption" color="textMuted">
              {credit.name}
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
      <View style={styles.form}>
        <Card variant="outlined" style={styles.balanceCard}>
          <Text variant="caption" color="textMuted">
            Saldo actual
          </Text>
          <Text variant="h3" color="danger">
            {formatCurrency(credit.outstandingBalance)}
          </Text>
        </Card>

        <TextField
          label="Valor pago"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0,00"
          autoFocus
        />

        {newBalance !== null ? (
          <Card variant="outlined" style={styles.previewCard}>
            <Text variant="caption" color="textSecondary">
              Novo saldo após pagamento
            </Text>
            <Text variant="h3" color={newBalance === 0 ? 'success' : 'text'}>
              {formatCurrency(newBalance)}
            </Text>
            {newBalance === 0 ? (
              <Text variant="caption" color="success">
                Crédito totalmente liquidado 🎉
              </Text>
            ) : null}
          </Card>
        ) : null}

        {apiError ? (
          <Card variant="outlined" style={styles.errorCard}>
            <Text variant="caption" color="danger">
              {apiError}
            </Text>
          </Card>
        ) : null}

        <Button
          label={saveCredit.isPending ? 'A registar...' : 'Registar pagamento'}
          onPress={handleConfirm}
          loading={saveCredit.isPending}
          disabled={saveCredit.isPending}
          fullWidth
        />
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  balanceCard: {
    gap: spacing.xs,
    borderColor: colors.border,
  },
  previewCard: {
    gap: spacing.xs,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
