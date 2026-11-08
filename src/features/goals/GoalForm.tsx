import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  calendarDateToLocalDate,
  validateSavingsGoalInput,
  ValidationError,
  hasErrors,
  type SavingsGoal,
  type SavingsGoalInput,
  type ValidationErrors,
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
  Chip,
  ChipGroup,
  FormScreen,
  Text,
  TextField,
} from '@/ui/components';
import { spacing } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';

type FieldErrors = ValidationErrors<keyof SavingsGoalInput>;

async function loadCurrencies(repositories: Repositories) {
  const accounts = await repositories.accounts.list();
  return [...new Set(accounts.map((account) => account.currency))];
}

type Props = {
  goal?: SavingsGoal;
  onClose?: () => void;
  onSaved?: () => void;
};

export function GoalForm({ goal, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const repositories = useRepositories();
  const { formatDate, locale } = useLocaleFormat();
  const today = useToday();
  const query = useDataQuery(useCallback((repos: Repositories) => loadCurrencies(repos), []));
  const editing = goal !== undefined;

  const [name, setName] = useState(goal?.name ?? '');
  const [targetOn, setTargetOn] = useState(goal?.targetOn ?? null);
  const [currency, setCurrency] = useState(goal?.currency ?? '');
  const [amountText, setAmountText] = useState(
    goal ? amountToInputString(goal.targetAmount, goal.currency, decimalSeparatorFor(locale)) : '',
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [amountError, setAmountError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const currencies = query.data ?? [];
  const resolvedCurrency = currency || currencies[0] || DEFAULT_CURRENCY;
  const close = onClose ?? (() => closeModal('/goals'));

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
    const input: SavingsGoalInput = {
      name,
      targetAmount: parsed.amountMinor,
      currency: resolvedCurrency,
      targetOn,
    };
    const fieldErrors = validateSavingsGoalInput(input);
    if (hasErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    try {
      if (goal) await repositories.goals.update(goal.id, input);
      else await repositories.goals.create(input);
      (onSaved ?? close)();
    } catch (error) {
      setSaving(false);
      if (error instanceof ValidationError) setErrors(error.errors);
    }
  }

  const currencyError =
    errors.currency === 'currencyLocked'
      ? t('goals.currencyLocked')
      : validationMessage(t, errors.currency);

  return (
    <FormScreen
      title={t(editing ? 'goals.form.editTitle' : 'goals.form.createTitle')}
      closeLabel={t('common.close')}
      onClose={close}
      footer={
        <Button
          label={t('goals.form.save')}
          fullWidth
          loading={saving}
          disabled={saving}
          onPress={() => void save()}
        />
      }>
      {!query.data ? (
        <ActivityIndicator />
      ) : (
        <View style={styles.form}>
          <TextField
            label={t('goals.form.name')}
            value={name}
            onChangeText={setName}
            errorText={validationMessage(t, errors.name)}
          />
          <TextField
            label={t('goals.form.target')}
            value={amountText}
            onChangeText={(text) => {
              setAmountText(text);
              setAmountError(undefined);
            }}
            placeholder={t('entryForm.amountPlaceholder')}
            keyboardType="decimal-pad"
            inputMode="decimal"
            helperText={resolvedCurrency}
            errorText={amountError ?? validationMessage(t, errors.targetAmount)}
          />
          {currencies.length > 1 ? (
            <ChipGroup label={t('goals.form.currency')} errorText={currencyError}>
              {currencies.map((code) => (
                <Chip
                  key={code}
                  label={code}
                  selected={code === resolvedCurrency}
                  onPress={() => setCurrency(code)}
                />
              ))}
            </ChipGroup>
          ) : currencyError ? (
            <Text variant="footnote" tone="negative">
              {currencyError}
            </Text>
          ) : null}
          <View style={styles.field}>
            <Text variant="footnote" tone="secondary">
              {t('goals.form.targetOn')}
            </Text>
            <Text variant="label">
              {targetOn
                ? formatDate(calendarDateToLocalDate(targetOn), 'medium')
                : t('goals.noDate')}
            </Text>
            <Chip
              label={targetOn ? t('goals.clearDate') : t('goals.setDate')}
              selected={targetOn !== null}
              onPress={() => setTargetOn(targetOn ? null : today)}
            />
            {targetOn ? (
              <CalendarPicker
                value={targetOn}
                today={today}
                locale={locale}
                labels={{
                  previousMonth: t('calendar.previousMonth'),
                  nextMonth: t('calendar.nextMonth'),
                }}
                onChange={setTargetOn}
              />
            ) : null}
            {errors.targetOn ? (
              <Text variant="footnote" tone="negative">
                {validationMessage(t, errors.targetOn)}
              </Text>
            ) : null}
          </View>
          <Text variant="caption" tone="tertiary">
            {t('goals.doesNotChangeBalances')}
          </Text>
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  field: { gap: spacing.sm },
});
