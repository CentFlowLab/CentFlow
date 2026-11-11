import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View, type TextInputInstance } from 'react-native';

import {
  calendarDateToLocalDate,
  hasErrors,
  isLiabilityType,
  LOAN_KINDS,
  type LoanKind,
  validateWealthItemInput,
  ValidationError,
  WEALTH_ASSET_TYPES,
  WEALTH_LIABILITY_TYPES,
  type ValidationErrors,
  type WealthItem,
  type WealthItemInput,
  type WealthType,
} from '@/core/finance';
import {
  amountToInputString,
  decimalSeparatorFor,
  DEFAULT_CURRENCY,
  parseAmountInput,
} from '@/core/money';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Button,
  CalendarPicker,
  Card,
  Chip,
  ChipGroup,
  Dialog,
  FormScreen,
  Text,
  TextField,
} from '@/ui/components';
import { spacing } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';
import { LoanSummary } from './LoanSummary';

type FieldErrors = ValidationErrors<keyof WealthItemInput>;

async function loadCurrencies(repositories: Repositories) {
  const accounts = await repositories.accounts.list();
  return [...new Set(accounts.map((account) => account.currency))];
}

type Props = { item?: WealthItem };

export function WealthForm({ item }: Props) {
  const { t } = useTranslation();
  const valueRef = useRef<TextInputInstance>(null);
  const repositories = useRepositories();
  const { formatDate, locale } = useLocaleFormat();
  const today = useToday();
  const query = useDataQuery(useCallback((repos: Repositories) => loadCurrencies(repos), []));
  const editing = item !== undefined;

  const [name, setName] = useState(item?.name ?? '');
  const [type, setType] = useState<WealthType>(item?.type ?? 'property');
  const [currency, setCurrency] = useState(item?.currency ?? '');
  const [valuedOn, setValuedOn] = useState(item?.valuedOn ?? today);
  const [amountText, setAmountText] = useState(
    item ? amountToInputString(item.amount, item.currency, decimalSeparatorFor(locale)) : '',
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [amountError, setAmountError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingMove, setConfirmingMove] = useState(false);
  // Valor inicial de uma dívida: a primeira avaliação do histórico (ADR-052).
  const firstPoint = item?.valueHistory[0];
  const [originText, setOriginText] = useState(
    item && firstPoint
      ? amountToInputString(firstPoint.amount, item.currency, decimalSeparatorFor(locale))
      : '',
  );
  const [originDate, setOriginDate] = useState<string | null>(firstPoint?.valuedOn ?? null);
  const [originError, setOriginError] = useState<string>();
  const [pickingOriginDate, setPickingOriginDate] = useState(false);
  // Empréstimo (ADR-057).
  const [loanKind, setLoanKind] = useState<LoanKind | null>(item?.loanKind ?? null);
  const [institution, setInstitution] = useState(item?.institution ?? '');
  const [rateText, setRateText] = useState(
    item?.interestRateBp != null
      ? String(item.interestRateBp / 100).replace('.', decimalSeparatorFor(locale))
      : '',
  );
  const [installmentText, setInstallmentText] = useState(
    item?.installmentAmount != null
      ? amountToInputString(item.installmentAmount, item.currency, decimalSeparatorFor(locale))
      : '',
  );
  const [dueDayText, setDueDayText] = useState(item?.dueDay != null ? String(item.dueDay) : '');

  const tracksOrigin = isLiabilityType(type) && type !== 'credit';
  const currencies = query.data ?? [];
  const resolvedCurrency = currency || currencies[0] || DEFAULT_CURRENCY;
  const close = () => closeModal('/wealth');

  async function save() {
    const parsed = parseAmountInput(amountText, resolvedCurrency);
    if (!parsed.ok) {
      setAmountError(
        t(
          parsed.error === 'empty'
            ? 'validation.amountEmpty'
            : parsed.error === 'tooLarge'
              ? 'validation.amountTooLarge'
              : 'validation.amountInvalid',
        ),
      );
      return;
    }
    let origin: WealthItemInput['origin'];
    if (tracksOrigin && originText.trim()) {
      const parsedOrigin = parseAmountInput(originText, resolvedCurrency);
      if (!parsedOrigin.ok) {
        setOriginError(t('validation.amountInvalid'));
        return;
      }
      origin = { amount: parsedOrigin.amountMinor, valuedOn: originDate ?? valuedOn };
    }
    let interestRateBp: number | null = null;
    if (tracksOrigin && rateText.trim() !== '') {
      // Percentagem com até 2 casas, em pontos-base, sem vírgula flutuante (6,5 → 650).
      const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(rateText.trim());
      if (!match) {
        setErrors({ interestRateBp: 'invalid' });
        return;
      }
      interestRateBp = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
    }
    let installmentAmount: number | null = null;
    if (tracksOrigin && installmentText.trim() !== '') {
      const parsedInstallment = parseAmountInput(installmentText, resolvedCurrency);
      if (!parsedInstallment.ok) {
        setErrors({ installmentAmount: 'invalid' });
        return;
      }
      installmentAmount = parsedInstallment.amountMinor;
    }
    const loan = tracksOrigin
      ? {
          loanKind,
          institution: institution.trim() === '' ? null : institution,
          interestRateBp,
          installmentAmount,
          dueDay: dueDayText.trim() === '' ? null : Number(dueDayText.replace(/\D/g, '')),
          // O valor inicial do formulário é o capital emprestado (e a data, o início).
          ...(origin ? { principalAmount: origin.amount, startedOn: origin.valuedOn } : {}),
        }
      : {};
    const input: WealthItemInput = {
      name,
      type,
      amount: parsed.amountMinor,
      currency: resolvedCurrency,
      valuedOn,
      ...(origin ? { origin } : {}),
      ...loan,
    };
    const fieldErrors = validateWealthItemInput(input);
    if (hasErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    try {
      if (item) await repositories.wealth.update(item.id, input);
      else await repositories.wealth.create(input);
      close();
    } catch (error) {
      setSaving(false);
      if (error instanceof ValidationError) setErrors(error.errors);
    }
  }

  return (
    <FormScreen
      title={t(editing ? 'wealth.form.editTitle' : 'wealth.form.createTitle')}
      closeLabel={t('common.close')}
      onClose={close}
      footer={
        <View style={styles.footer}>
          <Button
            label={t('wealth.form.save')}
            fullWidth
            loading={saving}
            disabled={saving}
            onPress={() => void save()}
          />
          {editing && item?.closedOn ? (
            <Button
              label={t('wealth.reopen')}
              variant="secondary"
              fullWidth
              onPress={() => {
                void repositories.wealth.reopen(item.id).then(close, () => undefined);
              }}
            />
          ) : null}
          {editing ? (
            <Button
              label={item?.closedOn ? t('wealth.delete') : t('wealth.remove')}
              variant="ghost"
              fullWidth
              onPress={() => setConfirmingDelete(true)}
            />
          ) : null}
        </View>
      }>
      {!query.data ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.form}>
          {item && tracksOrigin ? <LoanSummary item={item} /> : null}
          <ChipGroup label={t('wealth.assets')}>
            {WEALTH_ASSET_TYPES.map((code) => (
              <Chip
                key={code}
                label={t(`wealth.types.${code}`)}
                selected={code === type}
                onPress={() => setType(code)}
              />
            ))}
          </ChipGroup>
          <ChipGroup label={t('wealth.liabilities')}>
            {WEALTH_LIABILITY_TYPES.filter(
              // Cartões novos vão para Contas (ADR-057); aqui só aparecem os antigos.
              (code) => code !== 'credit' || item?.type === 'credit',
            ).map((code) => (
              <Chip
                key={code}
                label={t(`wealth.types.${code}`)}
                selected={code === type}
                onPress={() => setType(code)}
              />
            ))}
          </ChipGroup>
          <TextField
            label={t('wealth.form.name')}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => valueRef.current?.focus()}
            value={name}
            onChangeText={setName}
            errorText={validationMessage(t, errors.name)}
          />
          <TextField
            ref={valueRef}
            label={t(isLiabilityType(type) ? 'wealth.form.owed' : 'wealth.form.value')}
            value={amountText}
            onChangeText={(text) => {
              setAmountText(text);
              setAmountError(undefined);
            }}
            placeholder={t('entryForm.amountPlaceholder')}
            keyboardType="decimal-pad"
            inputMode="decimal"
            helperText={resolvedCurrency}
            errorText={amountError ?? validationMessage(t, errors.amount)}
          />
          {currencies.length > 1 ? (
            <ChipGroup label={t('wealth.form.currency')}>
              {currencies.map((code) => (
                <Chip
                  key={code}
                  label={code}
                  selected={code === resolvedCurrency}
                  onPress={() => setCurrency(code)}
                />
              ))}
            </ChipGroup>
          ) : null}
          <View style={styles.field}>
            <Text variant="footnote" tone="secondary">
              {t('wealth.form.valuedOn')}
            </Text>
            <Text variant="label">{formatDate(calendarDateToLocalDate(valuedOn), 'medium')}</Text>
            <CalendarPicker
              value={valuedOn}
              today={today}
              locale={locale}
              labels={{
                previousMonth: t('calendar.previousMonth'),
                nextMonth: t('calendar.nextMonth'),
              }}
              onChange={setValuedOn}
            />
            {errors.valuedOn ? (
              <Text variant="footnote" tone="negative">
                {validationMessage(t, errors.valuedOn)}
              </Text>
            ) : null}
          </View>
          {tracksOrigin ? (
            <View style={styles.field}>
              <TextField
                label={t('wealth.form.origin')}
                value={originText}
                onChangeText={(text) => {
                  setOriginText(text);
                  setOriginError(undefined);
                }}
                placeholder={t('entryForm.amountPlaceholder')}
                keyboardType="decimal-pad"
                inputMode="decimal"
                helperText={t('wealth.form.originHelper')}
                errorText={originError ?? validationMessage(t, errors.origin)}
              />
              <ChipGroup label={t('wealth.form.originDate')}>
                <Chip
                  label={
                    originDate
                      ? formatDate(calendarDateToLocalDate(originDate), 'medium')
                      : t('wealth.form.pickOriginDate')
                  }
                  icon="calendar-outline"
                  selected={originDate !== null}
                  onPress={() => setPickingOriginDate(true)}
                />
              </ChipGroup>
            </View>
          ) : null}
          {tracksOrigin ? (
            <View style={styles.field}>
              <ChipGroup label={t('wealth.loan.kind')}>
                {LOAN_KINDS.map((code) => (
                  <Chip
                    key={code}
                    label={t(`wealth.loan.kinds.${code}`)}
                    selected={code === loanKind}
                    onPress={() => setLoanKind(code === loanKind ? null : code)}
                  />
                ))}
              </ChipGroup>
              <TextField
                label={t('wealth.loan.institution')}
                value={institution}
                onChangeText={setInstitution}
                maxLength={60}
                errorText={validationMessage(t, errors.institution)}
              />
              <TextField
                label={t('wealth.loan.rateInput')}
                value={rateText}
                onChangeText={setRateText}
                keyboardType="decimal-pad"
                inputMode="decimal"
                errorText={validationMessage(t, errors.interestRateBp)}
              />
              <TextField
                label={t('wealth.loan.installmentInput')}
                value={installmentText}
                onChangeText={setInstallmentText}
                placeholder={t('entryForm.amountPlaceholder')}
                keyboardType="decimal-pad"
                inputMode="decimal"
                errorText={validationMessage(t, errors.installmentAmount)}
              />
              <TextField
                label={t('wealth.loan.dueDay')}
                value={dueDayText}
                onChangeText={setDueDayText}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={2}
                errorText={validationMessage(t, errors.dueDay)}
              />
            </View>
          ) : null}
          {type === 'credit' && !item?.closedOn ? (
            <Card padding="md" style={styles.notice}>
              <Text variant="callout">{t('wealth.cardHint')}</Text>
              <Button
                label={t(editing ? 'wealth.cardMove' : 'wealth.cardCreate')}
                icon="card-outline"
                variant="secondary"
                onPress={() => (editing ? setConfirmingMove(true) : router.replace('/account/new'))}
              />
            </Card>
          ) : null}
          <Text variant="caption" tone="tertiary">
            {t('wealth.doesNotChangeBalances')}
          </Text>
        </View>
      )}
      <Dialog
        visible={pickingOriginDate}
        title={t('wealth.form.pickOriginDate')}
        onDismiss={() => setPickingOriginDate(false)}
        actions={[
          {
            label: t('common.close'),
            variant: 'secondary',
            onPress: () => setPickingOriginDate(false),
          },
        ]}>
        <CalendarPicker
          value={originDate ?? valuedOn}
          today={today}
          locale={locale}
          labels={{
            previousMonth: t('calendar.previousMonth'),
            nextMonth: t('calendar.nextMonth'),
          }}
          onChange={(value) => {
            setOriginDate(value);
            setPickingOriginDate(false);
          }}
        />
      </Dialog>
      <Dialog
        visible={confirmingMove}
        title={t('wealth.cardMoveTitle')}
        message={t('wealth.cardMoveMessage')}
        onDismiss={() => setConfirmingMove(false)}
        actions={[
          {
            label: t('wealth.cardMove'),
            onPress: () => {
              setConfirmingMove(false);
              if (!item) return;
              void repositories.wealth.moveCardToAccounts(item.id, today).then(
                () => router.replace('/accounts'),
                () => undefined,
              );
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setConfirmingMove(false),
          },
        ]}
      />
      <Dialog
        visible={confirmingDelete}
        title={item?.closedOn ? t('wealth.deleteTitle') : t('wealth.removeTitle')}
        message={item?.closedOn ? t('wealth.deleteMessage') : t('wealth.removeMessage')}
        onDismiss={() => setConfirmingDelete(false)}
        actions={[
          ...(item && !item.closedOn
            ? [
                {
                  label: t(isLiabilityType(item.type) ? 'wealth.closePaid' : 'wealth.closeSold'),
                  onPress: () => {
                    setConfirmingDelete(false);
                    void repositories.wealth.close(item.id, today).then(close, () => undefined);
                  },
                },
              ]
            : []),
          {
            label: item?.closedOn ? t('wealth.delete') : t('wealth.deleteMistake'),
            variant: 'destructive',
            onPress: () => {
              setConfirmingDelete(false);
              if (!item) return;
              void repositories.wealth.delete(item.id).then(close, () => router.back());
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setConfirmingDelete(false),
          },
        ]}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  field: { gap: spacing.sm },
  footer: { gap: spacing.sm },
  notice: { gap: spacing.md },
});
