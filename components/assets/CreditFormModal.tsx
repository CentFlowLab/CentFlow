import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, DatePickerField, Text, TextField } from '@/components/ui';
import { useDeleteCredit, useSaveCredit } from '@/hooks/queries/useLiabilities';
import { getApiErrorMessage } from '@/lib/api/errors';
import { analyzeCredit } from '@/lib/credit/credit-analysis';
import type { Credit, CreditType } from '@/lib/domain/types';
import { parseGoalAmount } from '@/lib/domain/goal-form.utils';
import { colors, spacing } from '@/lib/theme';
import {
  formatCurrency,
  formatInputDate,
  formatPercent,
  inputDateToIso,
} from '@/lib/utils/format';

type CreditFormModalProps = {
  visible: boolean;
  onClose: () => void;
  credit?: Credit | null;
};

const CREDIT_TYPES: Array<{ key: CreditType; label: string }> = [
  { key: 'personal', label: 'Pessoal' },
  { key: 'mortgage', label: 'Habitação' },
  { key: 'auto', label: 'Automóvel' },
  { key: 'student', label: 'Estudante' },
  { key: 'other', label: 'Outro' },
];

function parseOptionalAmount(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = parseGoalAmount(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOptionalInt(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseOptionalRate(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const normalized = value.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function CreditFormModal({ visible, onClose, credit = null }: CreditFormModalProps) {
  const isEditing = Boolean(credit);
  const saveCredit = useSaveCredit();
  const deleteCredit = useDeleteCredit();

  const [name, setName] = useState('');
  const [creditType, setCreditType] = useState<CreditType>('personal');
  const [lender, setLender] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [balance, setBalance] = useState('');
  const [interestRateAnnual, setInterestRateAnnual] = useState('');
  const [indexRate, setIndexRate] = useState('');
  const [spread, setSpread] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [insuranceMonthly, setInsuranceMonthly] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [earlyAmortization, setEarlyAmortization] = useState('');
  const [nextAmount, setNextAmount] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [notes, setNotes] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const isSaving = saveCredit.isPending;
  const isDeleting = deleteCredit.isPending;

  useEffect(() => {
    if (!visible) return;

    if (credit) {
      setName(credit.name);
      setCreditType(credit.creditType ?? 'personal');
      setLender(credit.lender ?? '');
      setOriginalAmount(credit.originalAmount ? String(credit.originalAmount) : '');
      setBalance(String(credit.outstandingBalance));
      setInterestRateAnnual(
        credit.interestRateAnnual !== undefined ? String(credit.interestRateAnnual) : '',
      );
      setIndexRate(credit.indexRate !== undefined ? String(credit.indexRate) : '');
      setSpread(credit.spread !== undefined ? String(credit.spread) : '');
      setTermMonths(credit.termMonths ? String(credit.termMonths) : '');
      setMonthlyPayment(credit.monthlyPayment ? String(credit.monthlyPayment) : '');
      setInsuranceMonthly(credit.insuranceMonthly ? String(credit.insuranceMonthly) : '');
      setMonthlyIncome(credit.monthlyIncome ? String(credit.monthlyIncome) : '');
      setNextAmount(credit.nextPaymentAmount ? String(credit.nextPaymentAmount) : '');
      setNextDate(formatInputDate(credit.nextPaymentDate));
      setStartDate(formatInputDate(credit.startDate));
      setNotes(credit.notes ?? '');
    } else {
      setName('');
      setCreditType('personal');
      setLender('');
      setOriginalAmount('');
      setBalance('');
      setInterestRateAnnual('');
      setIndexRate('');
      setSpread('');
      setTermMonths('');
      setMonthlyPayment('');
      setInsuranceMonthly('');
      setMonthlyIncome('');
      setEarlyAmortization('');
      setNextAmount('');
      setNextDate('');
      setStartDate('');
      setNotes('');
    }

    setApiError(null);
    saveCredit.reset();
    deleteCredit.reset();
  }, [visible, credit?.id]);

  const analysis = useMemo(() => {
    const outstandingBalance = parseGoalAmount(balance);
    if (Number.isNaN(outstandingBalance) || outstandingBalance < 0) return null;

    return analyzeCredit({
      outstandingBalance,
      originalAmount: parseOptionalAmount(originalAmount),
      interestRateAnnual: parseOptionalRate(interestRateAnnual),
      indexRate: parseOptionalRate(indexRate),
      spread: parseOptionalRate(spread),
      termMonths: parseOptionalInt(termMonths),
      monthlyPayment: parseOptionalAmount(monthlyPayment),
      insuranceMonthly: parseOptionalAmount(insuranceMonthly),
      nextPaymentAmount: parseOptionalAmount(nextAmount),
      monthlyIncome: parseOptionalAmount(monthlyIncome),
      earlyAmortizationAmount: parseOptionalAmount(earlyAmortization),
    });
  }, [
    balance,
    originalAmount,
    interestRateAnnual,
    indexRate,
    spread,
    termMonths,
    monthlyPayment,
    insuranceMonthly,
    nextAmount,
    monthlyIncome,
    earlyAmortization,
  ]);

  async function handleSave() {
    setApiError(null);

    const outstandingBalance = parseGoalAmount(balance);
    if (!name.trim()) {
      setApiError('Indica o nome do crédito.');
      return;
    }
    if (Number.isNaN(outstandingBalance) || outstandingBalance < 0) {
      setApiError('Saldo em dívida inválido.');
      return;
    }

    const parsedNextDate = nextDate.trim() ? inputDateToIso(nextDate.trim()) : undefined;
    if (nextDate.trim() && !parsedNextDate) {
      setApiError('Data do próximo pagamento inválida.');
      return;
    }

    const parsedStartDate = startDate.trim() ? inputDateToIso(startDate.trim()) : undefined;
    if (startDate.trim() && !parsedStartDate) {
      setApiError('Data de início inválida.');
      return;
    }

    try {
      await saveCredit.mutateAsync({
        id: credit?.id,
        name: name.trim(),
        outstandingBalance,
        creditType,
        lender: lender.trim() || undefined,
        originalAmount: parseOptionalAmount(originalAmount),
        interestRateAnnual: parseOptionalRate(interestRateAnnual),
        indexRate: parseOptionalRate(indexRate),
        spread: parseOptionalRate(spread),
        termMonths: parseOptionalInt(termMonths),
        monthlyPayment: parseOptionalAmount(monthlyPayment),
        insuranceMonthly: parseOptionalAmount(insuranceMonthly),
        monthlyIncome: parseOptionalAmount(monthlyIncome),
        nextPaymentAmount: parseOptionalAmount(nextAmount),
        nextPaymentDate: parsedNextDate,
        startDate: parsedStartDate,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o crédito'));
    }
  }

  function confirmDelete() {
    if (!credit) return;

    Alert.alert('Eliminar crédito', `Queres remover «${credit.name}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCredit.mutateAsync(credit.id);
            onClose();
          } catch (error) {
            setApiError(getApiErrorMessage(error, 'o crédito'));
          }
        },
      },
    ]);
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="94%"
      header={(requestClose) => (
        <View style={styles.header}>
          <View>
            <Text variant="h2">{isEditing ? 'Editar crédito' : 'Simulador de crédito'}</Text>
            <Text variant="caption" color="textMuted">
              Dados completos para análise de critérios
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
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text variant="label" color="textMuted">
            Tipo de crédito
          </Text>
          <View style={styles.typeRow}>
            {CREDIT_TYPES.map((type) => (
              <Pressable
                key={type.key}
                onPress={() => setCreditType(type.key)}
                style={[styles.typeChip, creditType === type.key && styles.typeChipActive]}>
                <Text
                  variant="caption"
                  color={creditType === type.key ? 'primary' : 'textMuted'}>
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Crédito habitação" />
          <TextField
            label="Instituição (opcional)"
            value={lender}
            onChangeText={setLender}
            placeholder="Ex.: Banco X"
          />
          <TextField
            label="Montante original (opcional)"
            value={originalAmount}
            onChangeText={setOriginalAmount}
            keyboardType="decimal-pad"
            placeholder="0,00"
          />
          <TextField
            label="Saldo em dívida"
            value={balance}
            onChangeText={setBalance}
            keyboardType="decimal-pad"
            placeholder="0,00"
          />
          <TextField
            label="TAEG anual % (opcional)"
            value={interestRateAnnual}
            onChangeText={setInterestRateAnnual}
            keyboardType="decimal-pad"
            placeholder="Ex.: 5,2"
          />
          <TextField
            label="Euribor / indexante % (opcional)"
            value={indexRate}
            onChangeText={setIndexRate}
            keyboardType="decimal-pad"
            placeholder="Ex.: 3,2"
          />
          <TextField
            label="Spread % (opcional)"
            value={spread}
            onChangeText={setSpread}
            keyboardType="decimal-pad"
            placeholder="Ex.: 1,1"
          />
          <TextField
            label="Prazo total (meses)"
            value={termMonths}
            onChangeText={setTermMonths}
            keyboardType="number-pad"
            placeholder="Ex.: 360"
          />
          <TextField
            label="Prestação mensal (opcional)"
            value={monthlyPayment}
            onChangeText={setMonthlyPayment}
            keyboardType="decimal-pad"
            placeholder="Calculada automaticamente se vazia"
          />
          <TextField
            label="Seguro mensal (opcional)"
            value={insuranceMonthly}
            onChangeText={setInsuranceMonthly}
            keyboardType="decimal-pad"
            placeholder="0,00"
          />
          <TextField
            label="Rendimento mensal líquido (opcional)"
            value={monthlyIncome}
            onChangeText={setMonthlyIncome}
            keyboardType="decimal-pad"
            placeholder="Para taxa de esforço"
          />
          <TextField
            label="Próximo pagamento (opcional)"
            value={nextAmount}
            onChangeText={setNextAmount}
            keyboardType="decimal-pad"
            placeholder="0,00"
          />
          <DatePickerField
            label="Data do próximo pagamento (opcional)"
            value={nextDate}
            onChange={setNextDate}
          />
          <DatePickerField
            label="Data de início (opcional)"
            value={startDate}
            onChange={setStartDate}
          />
          <TextField
            label="Simular amortização antecipada (opcional)"
            value={earlyAmortization}
            onChangeText={setEarlyAmortization}
            keyboardType="decimal-pad"
            placeholder="Montante extra a amortizar"
          />
          <TextField
            label="Notas (opcional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Condições especiais, indexante..."
            multiline
          />

          {analysis ? (
            <Card variant="outlined" style={styles.analysisCard}>
              <Text variant="label" color="textMuted">
                Análise estimada
              </Text>
              <Text variant="bodyMedium">
                Prestação: {formatCurrency(analysis.monthlyPayment)}
                {parseOptionalAmount(insuranceMonthly)
                  ? ` + ${formatCurrency(parseOptionalAmount(insuranceMonthly)!)} seguro`
                  : ''}
              </Text>
              {analysis.debtToIncomeRatio !== null ? (
                <Text variant="caption" color="textSecondary">
                  Taxa de esforço: {formatPercent(analysis.debtToIncomeRatio)}
                </Text>
              ) : null}
              {analysis.remainingMonths !== null ? (
                <Text variant="caption" color="textSecondary">
                  Prazo estimado restante: {analysis.remainingMonths} meses
                </Text>
              ) : null}
              {analysis.effectiveAnnualRate > 0 ? (
                <Text variant="caption" color="textSecondary">
                  Taxa efectiva anual: {formatPercent(analysis.effectiveAnnualRate)}
                </Text>
              ) : null}
              {analysis.totalInterest > 0 ? (
                <Text variant="caption" color="textSecondary">
                  Juros totais estimados: {formatCurrency(analysis.totalInterest)}
                </Text>
              ) : null}
              {analysis.earlyAmortization ? (
                <Text variant="caption" color="textSecondary">
                  Após amortização: saldo {formatCurrency(analysis.earlyAmortization.newBalance)},{' '}
                  poupa {analysis.earlyAmortization.monthsSaved} meses e{' '}
                  {formatCurrency(analysis.earlyAmortization.interestSaved)} em juros
                </Text>
              ) : null}
              {analysis.warnings.map((warning) => (
                <Text key={warning} variant="caption" color="danger">
                  • {warning}
                </Text>
              ))}
              {analysis.insights.map((insight) => (
                <Text key={insight} variant="caption" color="success">
                  • {insight}
                </Text>
              ))}
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
            label={isSaving ? 'A guardar...' : isEditing ? 'Guardar alterações' : 'Adicionar crédito'}
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving || isDeleting}
            fullWidth
          />

          {isEditing ? (
            <Button
              label={isDeleting ? 'A eliminar...' : 'Eliminar crédito'}
              variant="ghost"
              onPress={confirmDelete}
              loading={isDeleting}
              disabled={isSaving || isDeleting}
              fullWidth
            />
          ) : null}
        </View>
      </ScrollView>
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
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  analysisCard: {
    gap: spacing.sm,
    borderColor: colors.border,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
