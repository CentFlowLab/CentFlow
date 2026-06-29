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
  const [commissionRate, setCommissionRate] = useState('0,5');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !credit) return;
    const suggested = credit.nextPaymentAmount ?? credit.monthlyPayment;
    setAmount(suggested ? String(suggested) : '');
    const storedRate = credit.earlyRepaymentCommissionRate;
    setCommissionRate(
      storedRate != null ? String(Number((storedRate * 100).toFixed(3))).replace('.', ',') : '0,5',
    );
    setApiError(null);
    saveCredit.reset();
  }, [visible, credit?.id]);

  const parsedAmount = useMemo(() => {
    if (!amount.trim()) return Number.NaN;
    return parseGoalAmount(amount);
  }, [amount]);

  const parsedRatePercent = useMemo(() => {
    const normalized = commissionRate.replace(/\s/g, '').replace(',', '.');
    if (!normalized) return 0;
    const value = Number(normalized);
    return Number.isFinite(value) && value >= 0 ? value : Number.NaN;
  }, [commissionRate]);

  const commissionAmount = useMemo(() => {
    if (Number.isNaN(parsedAmount) || Number.isNaN(parsedRatePercent)) return null;
    return (parsedAmount * parsedRatePercent) / 100;
  }, [parsedAmount, parsedRatePercent]);

  const totalCost = useMemo(() => {
    if (Number.isNaN(parsedAmount) || commissionAmount === null) return null;
    return parsedAmount + commissionAmount;
  }, [parsedAmount, commissionAmount]);

  const newBalance = useMemo(() => {
    if (!credit || Number.isNaN(parsedAmount)) return null;
    return Math.max(0, credit.outstandingBalance - parsedAmount);
  }, [credit, parsedAmount]);

  /** Poupança aproximada de juros sobre o capital amortizado ao longo do prazo restante. */
  const estimatedInterestSaved = useMemo(() => {
    if (!credit || Number.isNaN(parsedAmount) || parsedAmount <= 0) return null;
    const annualRate = credit.interestRateAnnual;
    if (!annualRate || annualRate <= 0) return null;

    const remainingMonths =
      credit.termMonths ??
      (credit.monthlyPayment && credit.monthlyPayment > 0
        ? Math.ceil(credit.outstandingBalance / credit.monthlyPayment)
        : 0);
    if (remainingMonths <= 0) return null;

    // Aproximação: juro médio poupado ≈ capital × taxa × (anos restantes) / 2.
    const years = remainingMonths / 12;
    return (parsedAmount * (annualRate / 100) * years) / 2;
  }, [credit, parsedAmount]);

  async function handleConfirm() {
    if (!credit) return;
    setApiError(null);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setApiError('Indica um valor de pagamento válido.');
      return;
    }

    if (Number.isNaN(parsedRatePercent)) {
      setApiError('Indica uma taxa de comissão válida.');
      return;
    }

    const balance = Math.max(0, credit.outstandingBalance - parsedAmount);

    try {
      await saveCredit.mutateAsync({
        ...credit,
        outstandingBalance: balance,
        earlyRepaymentCommissionRate: parsedRatePercent / 100,
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
            Saldo atual
          </Text>
          <Text variant="h3" color="danger">
            {formatCurrency(credit.outstandingBalance)}
          </Text>
        </Card>

        <TextField
          label="Valor a amortizar"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0,00"
          autoFocus
        />

        <View style={styles.rateField}>
          <TextField
            label="Taxa de comissão de amortização (%)"
            value={commissionRate}
            onChangeText={setCommissionRate}
            keyboardType="decimal-pad"
            placeholder="0,5"
          />
          <Text variant="caption" color="textMuted">
            Crédito a taxa fixa: 0,5% · taxa variável: 0,25% (editável por crédito).
          </Text>
        </View>

        {newBalance !== null ? (
          <Card variant="outlined" style={styles.previewCard}>
            <PreviewRow label="Amortização" value={formatCurrency(parsedAmount)} />
            {commissionAmount !== null ? (
              <PreviewRow
                label={`Comissão (${commissionRate || '0'}%)`}
                value={formatCurrency(commissionAmount)}
              />
            ) : null}
            {totalCost !== null ? (
              <PreviewRow label="Custo total hoje" value={formatCurrency(totalCost)} emphasis />
            ) : null}
            <View style={styles.previewDivider} />
            <PreviewRow
              label="Novo saldo"
              value={formatCurrency(newBalance)}
              tone={newBalance === 0 ? 'success' : 'default'}
              emphasis
            />
            {estimatedInterestSaved !== null && estimatedInterestSaved > 0 ? (
              <PreviewRow
                label="Poupança estimada em juros"
                value={`~${formatCurrency(estimatedInterestSaved)}`}
                tone="success"
              />
            ) : null}
            {newBalance === 0 ? (
              <Text variant="caption" color="success" style={styles.liquidated}>
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

function PreviewRow({
  label,
  value,
  tone = 'default',
  emphasis = false,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success';
  emphasis?: boolean;
}) {
  return (
    <View style={styles.previewRow}>
      <Text variant={emphasis ? 'bodyMedium' : 'caption'} color="textSecondary">
        {label}
      </Text>
      <Text
        variant={emphasis ? 'h3' : 'bodyMedium'}
        color={tone === 'success' ? 'success' : 'text'}>
        {value}
      </Text>
    </View>
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
    gap: spacing.sm,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  previewDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  rateField: {
    gap: spacing.xs,
  },
  liquidated: {
    marginTop: spacing.xs,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
