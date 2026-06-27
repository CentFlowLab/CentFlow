import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, DatePickerField, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useDeleteCredit, useSaveCredit } from '@/hooks/queries/useLiabilities';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formFieldsDiffer, formHasAnyText } from '@/lib/forms';
import { analyzeCredit } from '@/lib/credit/credit-analysis';
import {
  CREDIT_TYPE_OPTIONS,
  inferCreditTypeFromName,
  isCardCredit,
  resolveCreditName,
} from '@/lib/credit/credit-type.utils';
import {
  firstDayOfNextMonthIso,
  nextOccurrenceOfDayIso,
} from '@/lib/credit/credit-dates';
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
  /** Tipo inicial ao criar um novo crédito (ex.: 'card' a partir da aba Cartões). */
  initialCreditType?: CreditType;
};

// Os chips do formulário de crédito normal excluem o cartão — os cartões têm
// formulário próprio e são criados a partir da aba "Cartões de Crédito".
const CREDIT_TYPES = CREDIT_TYPE_OPTIONS.filter((option) => option.key !== 'card');

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

export function CreditFormModal({
  visible,
  onClose,
  credit = null,
  initialCreditType = 'personal',
}: CreditFormModalProps) {
  const isEditing = Boolean(credit);
  const saveCredit = useSaveCredit();
  const deleteCredit = useDeleteCredit();
  const { showToast } = useToast();

  const [customName, setCustomName] = useState('');
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
  // Cartão de crédito: dia de vencimento (1–31). O dia de fecho do extrato é
  // guardado em `termMonths` e a TAN mensal em `interestRateAnnual` (reutilização
  // de colunas existentes — sem necessidade de migração).
  const [dueDay, setDueDay] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isCard = isCardCredit(creditType);

  const isSaving = saveCredit.isPending;
  const isDeleting = deleteCredit.isPending;

  const baselineRef = useRef<Record<string, string | CreditType>>({
    creditType: 'personal',
    customName: '',
    lender: '',
    originalAmount: '',
    balance: '',
    interestRateAnnual: '',
    indexRate: '',
    spread: '',
    termMonths: '',
    monthlyPayment: '',
    insuranceMonthly: '',
    monthlyIncome: '',
    earlyAmortization: '',
    nextAmount: '',
    nextDate: '',
    startDate: '',
    notes: '',
    dueDay: '',
  });

  useEffect(() => {
    if (!visible) return;

    const applySnapshot = (snapshot: Record<string, string | CreditType>) => {
      setCreditType(snapshot.creditType as CreditType);
      setCustomName(String(snapshot.customName ?? ''));
      setLender(String(snapshot.lender ?? ''));
      setOriginalAmount(String(snapshot.originalAmount ?? ''));
      setBalance(String(snapshot.balance ?? ''));
      setInterestRateAnnual(String(snapshot.interestRateAnnual ?? ''));
      setIndexRate(String(snapshot.indexRate ?? ''));
      setSpread(String(snapshot.spread ?? ''));
      setTermMonths(String(snapshot.termMonths ?? ''));
      setMonthlyPayment(String(snapshot.monthlyPayment ?? ''));
      setInsuranceMonthly(String(snapshot.insuranceMonthly ?? ''));
      setMonthlyIncome(String(snapshot.monthlyIncome ?? ''));
      setEarlyAmortization(String(snapshot.earlyAmortization ?? ''));
      setNextAmount(String(snapshot.nextAmount ?? ''));
      setNextDate(String(snapshot.nextDate ?? ''));
      setStartDate(String(snapshot.startDate ?? ''));
      setNotes(String(snapshot.notes ?? ''));
      setDueDay(String(snapshot.dueDay ?? ''));
      baselineRef.current = snapshot;
    };

    if (credit) {
      const type = credit.creditType ?? inferCreditTypeFromName(credit.name);
      const usesCustomName = type === 'other' || type === 'card';
      const dueDayValue =
        type === 'card' && credit.nextPaymentDate
          ? String(new Date(credit.nextPaymentDate).getDate())
          : '';
      applySnapshot({
        creditType: type,
        customName: usesCustomName ? credit.name : '',
        lender: credit.lender ?? '',
        originalAmount: credit.originalAmount ? String(credit.originalAmount) : '',
        balance: String(credit.outstandingBalance),
        interestRateAnnual:
          credit.interestRateAnnual !== undefined ? String(credit.interestRateAnnual) : '',
        indexRate: credit.indexRate !== undefined ? String(credit.indexRate) : '',
        spread: credit.spread !== undefined ? String(credit.spread) : '',
        termMonths: credit.termMonths ? String(credit.termMonths) : '',
        monthlyPayment: credit.monthlyPayment ? String(credit.monthlyPayment) : '',
        insuranceMonthly: credit.insuranceMonthly ? String(credit.insuranceMonthly) : '',
        monthlyIncome: credit.monthlyIncome ? String(credit.monthlyIncome) : '',
        earlyAmortization: '',
        nextAmount: credit.nextPaymentAmount ? String(credit.nextPaymentAmount) : '',
        nextDate: formatInputDate(credit.nextPaymentDate),
        startDate: formatInputDate(credit.startDate),
        notes: credit.notes ?? '',
        dueDay: dueDayValue,
      });
    } else {
      applySnapshot({
        creditType: initialCreditType,
        customName: '',
        lender: '',
        originalAmount: '',
        balance: '',
        interestRateAnnual: '',
        indexRate: '',
        spread: '',
        termMonths: '',
        monthlyPayment: '',
        insuranceMonthly: '',
        monthlyIncome: '',
        earlyAmortization: '',
        nextAmount: '',
        nextDate: '',
        startDate: '',
        notes: '',
        dueDay: '',
      });
    }

    setApiError(null);
    // Expande automaticamente se o crédito já tem dados avançados preenchidos.
    setShowAdvanced(
      Boolean(
        credit &&
          (credit.lender ||
            credit.indexRate !== undefined ||
            credit.spread !== undefined ||
            credit.monthlyPayment ||
            credit.insuranceMonthly ||
            credit.monthlyIncome ||
            credit.nextPaymentAmount ||
            credit.nextPaymentDate ||
            credit.startDate ||
            credit.notes),
      ),
    );
    saveCredit.reset();
    deleteCredit.reset();
  }, [visible, credit?.id, initialCreditType]);

  const isDirty = useMemo(() => {
    if (!visible) return false;

    const current = {
      customName,
      lender,
      originalAmount,
      balance,
      interestRateAnnual,
      indexRate,
      spread,
      termMonths,
      monthlyPayment,
      insuranceMonthly,
      monthlyIncome,
      earlyAmortization,
      nextAmount,
      nextDate,
      startDate,
      notes,
      dueDay,
    };
    const baseline = baselineRef.current;

    if (credit) {
      const { creditType: _ignored, ...baselineFields } = baseline;
      return formFieldsDiffer(current, baselineFields) || creditType !== baseline.creditType;
    }

    return formHasAnyText(
      customName,
      lender,
      originalAmount,
      balance,
      interestRateAnnual,
      indexRate,
      spread,
      termMonths,
      monthlyPayment,
      insuranceMonthly,
      monthlyIncome,
      earlyAmortization,
      nextAmount,
      nextDate,
      startDate,
      notes,
      dueDay,
    );
  }, [
    visible,
    credit,
    creditType,
    customName,
    lender,
    originalAmount,
    balance,
    interestRateAnnual,
    indexRate,
    spread,
    termMonths,
    monthlyPayment,
    insuranceMonthly,
    monthlyIncome,
    earlyAmortization,
    nextAmount,
    nextDate,
    startDate,
    notes,
    dueDay,
  ]);

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

  async function handleSaveCard() {
    setApiError(null);

    const resolvedName = resolveCreditName('card', customName);
    const limit = parseOptionalAmount(originalAmount);
    const cardBalance = balance.trim() ? parseGoalAmount(balance) : 0;
    const statementDay = parseOptionalInt(termMonths);
    const dueDayNum = parseOptionalInt(dueDay);
    const monthlyRate = parseOptionalRate(interestRateAnnual);

    if (!limit || limit <= 0) {
      setApiError('Indica o limite de crédito do cartão.');
      return;
    }
    if (Number.isNaN(cardBalance) || cardBalance < 0) {
      setApiError('Saldo em dívida inválido.');
      return;
    }
    if (statementDay !== undefined && (statementDay < 1 || statementDay > 31)) {
      setApiError('Dia de fecho do extrato deve estar entre 1 e 31.');
      return;
    }
    if (dueDayNum !== undefined && (dueDayNum < 1 || dueDayNum > 31)) {
      setApiError('Dia de vencimento deve estar entre 1 e 31.');
      return;
    }

    const nextPaymentDate = dueDayNum ? nextOccurrenceOfDayIso(dueDayNum) : undefined;

    try {
      await saveCredit.mutateAsync({
        id: credit?.id,
        name: resolvedName,
        outstandingBalance: cardBalance,
        creditType: 'card',
        lender: lender.trim() || undefined,
        originalAmount: limit,
        interestRateAnnual: monthlyRate,
        termMonths: statementDay,
        nextPaymentDate,
        notes: notes.trim() || undefined,
      });
      showToast(isEditing ? 'Cartão actualizado.' : 'Cartão adicionado.', 'success');
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o cartão'));
      showToast('Não conseguimos guardar este cartão. Tenta novamente.', 'error');
    }
  }

  async function handleSave() {
    if (isCard) {
      await handleSaveCard();
      return;
    }

    setApiError(null);

    const outstandingBalance = parseGoalAmount(balance);
    const resolvedName = resolveCreditName(creditType, customName);

    if (creditType === 'other' && !resolvedName) {
      setApiError('Indica o tipo de crédito personalizado.');
      return;
    }
    if (Number.isNaN(outstandingBalance) || outstandingBalance < 0) {
      setApiError('Saldo em dívida inválido.');
      return;
    }

    // T6: se a data do próximo pagamento ficar vazia, assume o dia 1 do mês seguinte.
    let parsedNextDate = nextDate.trim() ? inputDateToIso(nextDate.trim()) : undefined;
    if (nextDate.trim() && !parsedNextDate) {
      setApiError('Data do próximo pagamento inválida.');
      return;
    }
    if (!parsedNextDate) {
      parsedNextDate = firstDayOfNextMonthIso();
    }

    const parsedStartDate = startDate.trim() ? inputDateToIso(startDate.trim()) : undefined;
    if (startDate.trim() && !parsedStartDate) {
      setApiError('Data de início inválida.');
      return;
    }

    // Amortização antecipada: subtrai ao saldo real (não é só simulação).
    const earlyAmortizationAmount = parseOptionalAmount(earlyAmortization);
    const appliesAmortization = Boolean(earlyAmortizationAmount && earlyAmortizationAmount > 0);
    const effectiveBalance = appliesAmortization
      ? Math.max(0, outstandingBalance - earlyAmortizationAmount!)
      : outstandingBalance;

    try {
      await saveCredit.mutateAsync({
        id: credit?.id,
        name: resolvedName,
        outstandingBalance: effectiveBalance,
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
        earlyRepaymentCommissionRate: credit?.earlyRepaymentCommissionRate,
        notes: notes.trim() || undefined,
      });
      showToast(
        appliesAmortization
          ? `Amortização aplicada — novo saldo ${formatCurrency(effectiveBalance)}.`
          : isEditing
            ? 'Crédito actualizado.'
            : 'Crédito adicionado.',
        'success',
      );
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o crédito'));
      showToast('Não conseguimos guardar este crédito. Tenta novamente.', 'error');
    }
  }

  function confirmDelete() {
    if (!credit) return;

    Alert.alert(isCard ? 'Eliminar cartão' : 'Eliminar crédito', `Queres remover «${credit.name}»?`, [
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
      isDirty={isDirty}
      maxHeight="94%"
      scrollContentStyle={styles.form}
      header={(requestClose) => (
        <View style={styles.header}>
          <View>
            <Text variant="h2">
              {isCard
                ? isEditing
                  ? 'Editar cartão'
                  : 'Novo cartão de crédito'
                : isEditing
                  ? 'Editar crédito'
                  : 'Simulador de crédito'}
            </Text>
            <Text variant="caption" color="textMuted">
              {isCard
                ? 'Limite, saldo e datas do extrato'
                : 'Dados completos para análise de critérios'}
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
        {isCard ? (
          <>
            <TextField
              label="Nome do cartão *"
              value={customName}
              onChangeText={setCustomName}
              placeholder="Ex.: Cartão Visa CGD"
            />
            <TextField
              label="Banco / Emissor"
              value={lender}
              onChangeText={setLender}
              placeholder="Ex.: CGD, Millennium, Santander"
            />
            <TextField
              label="Limite de crédito *"
              value={originalAmount}
              onChangeText={setOriginalAmount}
              keyboardType="decimal-pad"
              placeholder="0,00"
            />
            <TextField
              label="Saldo em dívida atual"
              value={balance}
              onChangeText={setBalance}
              keyboardType="decimal-pad"
              placeholder="0,00"
            />
            <TextField
              label="Dia de fecho do extrato (1–31, opcional)"
              value={termMonths}
              onChangeText={setTermMonths}
              keyboardType="number-pad"
              placeholder="Ex.: 20"
            />
            <TextField
              label="Dia de vencimento (1–31, opcional)"
              value={dueDay}
              onChangeText={setDueDay}
              keyboardType="number-pad"
              placeholder="Ex.: 25"
            />
            <Text variant="caption" color="textMuted">
              Até este dia pagas sem juros. Usamos esta data para te lembrar do pagamento.
            </Text>
            <TextField
              label="TAN mensal % (opcional)"
              value={interestRateAnnual}
              onChangeText={setInterestRateAnnual}
              keyboardType="decimal-pad"
              placeholder="Para estimar juros se não pagares tudo"
            />
            <TextField
              label="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Condições, benefícios, plafond..."
              multiline
            />
          </>
        ) : (
          <>
          <Text variant="label" color="textMuted">
            Tipo de crédito
          </Text>
          <View style={styles.typeRow}>
            {CREDIT_TYPES.map((type) => (
              <Pressable
                key={type.key}
                onPress={() => {
                  setCreditType(type.key);
                  if (type.key !== 'other') setCustomName('');
                }}
                style={[styles.typeChip, creditType === type.key && styles.typeChipActive]}>
                <Text
                  variant="caption"
                  color={creditType === type.key ? 'primary' : 'textMuted'}>
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {creditType === 'other' ? (
            <TextField
              label="Tipo de crédito personalizado"
              value={customName}
              onChangeText={setCustomName}
              placeholder="Ex.: Crédito consolidado"
            />
          ) : null}

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
            label="TAEG anual %"
            value={interestRateAnnual}
            onChangeText={setInterestRateAnnual}
            keyboardType="decimal-pad"
            placeholder="Ex.: 5,2"
          />
          <TextField
            label="Prazo total (meses)"
            value={termMonths}
            onChangeText={setTermMonths}
            keyboardType="number-pad"
            placeholder="Ex.: 360"
          />

          <Pressable
            onPress={() => setShowAdvanced((open) => !open)}
            style={styles.advancedToggle}
            accessibilityRole="button"
            accessibilityLabel={showAdvanced ? 'Ocultar dados avançados' : 'Mostrar dados avançados'}>
            <Text variant="bodyMedium" color="primary">
              {showAdvanced ? 'Ocultar dados avançados' : 'Mostrar dados avançados'}
            </Text>
            <SymbolView
              name={{
                ios: showAdvanced ? 'chevron.up' : 'chevron.down',
                android: showAdvanced ? 'expand_less' : 'expand_more',
                web: showAdvanced ? 'expand_less' : 'expand_more',
              }}
              tintColor={colors.primary}
              size={16}
            />
          </Pressable>

          {showAdvanced ? (
            <>
              <TextField
                label="Instituição (opcional)"
                value={lender}
                onChangeText={setLender}
                placeholder="Ex.: Banco X"
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
              <Text variant="caption" color="textMuted">
                Se não preencheres, assumimos o dia 1 do próximo mês.
              </Text>
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
            </>
          ) : null}
          </>
        )}

          {!isCard && analysis ? (
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
            label={
              isSaving
                ? 'A guardar...'
                : isCard
                  ? isEditing
                    ? 'Guardar alterações'
                    : 'Adicionar cartão'
                  : earlyAmortization.trim()
                    ? 'Aplicar amortização'
                    : isEditing
                      ? 'Guardar alterações'
                      : 'Adicionar crédito'
            }
            onPress={handleSave}
            loading={isSaving}
            disabled={isSaving || isDeleting}
            fullWidth
          />

          {isEditing ? (
            <Button
              label={isDeleting ? 'A eliminar...' : isCard ? 'Eliminar cartão' : 'Eliminar crédito'}
              variant="ghost"
              onPress={confirmDelete}
              loading={isDeleting}
              disabled={isSaving || isDeleting}
              fullWidth
            />
          ) : null}
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
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
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
