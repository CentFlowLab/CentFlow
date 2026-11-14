import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  BUDGET_PERIODS,
  resolvePrimaryCurrency,
  validateBudgetInput,
  ValidationError,
  hasErrors,
  type Budget,
  type BudgetInput,
  type BudgetPeriod,
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
  Chip,
  ChipGroup,
  FormScreen,
  SegmentedControl,
  Text,
  TextField,
} from '@/ui/components';
import { spacing } from '@/ui/theme';

import { CategoryPicker } from '../finance/CategoryPicker';
import { closeModal } from '../finance/navigation';
import { validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';
import { DateField } from '../finance/DateField';
import { usePreferences } from '../preferences';

type FieldErrors = ValidationErrors<keyof BudgetInput>;

async function loadForm(repositories: Repositories) {
  const [categories, budgets, accounts] = await Promise.all([
    repositories.categories.list('expense'),
    repositories.budgets.list(),
    repositories.accounts.list(),
  ]);
  return { categories, budgets, accounts };
}

type Props = {
  budget?: Budget;
  onClose?: () => void;
  onSaved?: () => void;
};

export function BudgetForm({ budget, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const { preferences } = usePreferences();
  const repositories = useRepositories();
  const { locale } = useLocaleFormat();
  const today = useToday();
  const query = useDataQuery(
    useCallback((repositories: Repositories) => loadForm(repositories), []),
  );
  const editing = budget !== undefined;

  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? '');
  const [period, setPeriod] = useState<BudgetPeriod>(budget?.period ?? 'monthly');
  const [startsOn, setStartsOn] = useState(budget?.startsOn ?? today);
  const [currency, setCurrency] = useState(budget?.currency ?? '');
  const [amountText, setAmountText] = useState(
    budget ? amountToInputString(budget.amount, budget.currency, decimalSeparatorFor(locale)) : '',
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [amountError, setAmountError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const close = onClose ?? (() => closeModal('/budgets'));
  const data = query.data;

  const currencies = data ? [...new Set(data.accounts.map((account) => account.currency))] : [];
  const resolvedCurrency =
    currency ||
    (data
      ? resolvePrimaryCurrency(
          preferences.primaryCurrency,
          currencies.length > 0 ? currencies : [DEFAULT_CURRENCY],
        )
      : DEFAULT_CURRENCY);

  const taken = new Set(
    (data?.budgets ?? []).filter((item) => item.id !== budget?.id).map((item) => item.categoryId),
  );
  const choices = (data?.categories ?? []).filter((category) => !taken.has(category.id));
  const selectedCategory = categoryId || choices[0]?.id || '';

  async function save() {
    if (!data || saving) return;
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
    const input: BudgetInput = {
      categoryId: selectedCategory,
      amount: parsed.amountMinor,
      currency: resolvedCurrency,
      period,
      startsOn,
    };
    const fieldErrors = validateBudgetInput(input);
    if (hasErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    try {
      if (budget) await repositories.budgets.update(budget.id, input);
      else await repositories.budgets.create(input);
      (onSaved ?? close)();
    } catch (error) {
      setSaving(false);
      if (error instanceof ValidationError) setErrors(error.errors);
    }
  }

  return (
    <FormScreen
      title={t(editing ? 'budgets.form.editTitle' : 'budgets.form.createTitle')}
      closeLabel={t('common.close')}
      onClose={close}
      keyboardAction={{
        label: t('budgets.form.save'),
        onPress: () => void save(),
        loading: saving,
        disabled: choices.length === 0 || saving,
      }}
      footer={
        data ? (
          <Button
            label={t('budgets.form.save')}
            fullWidth
            loading={saving}
            disabled={choices.length === 0 || saving}
            onPress={() => void save()}
          />
        ) : undefined
      }>
      {!data ? (
        query.status === 'error' ? (
          <Text variant="callout" tone="secondary">
            {t('errors.loadFailed')}
          </Text>
        ) : (
          <ActivityIndicator />
        )
      ) : (
        <View style={styles.form}>
          <CategoryPicker
            label={t('budgets.form.category')}
            categories={choices}
            value={selectedCategory}
            emptyText={
              data.categories.length === 0
                ? t('budgets.form.noCategory')
                : t('budgets.form.allUsed')
            }
            errorText={validationMessage(t, errors.categoryId)}
            onChange={(id) => {
              setCategoryId(id ?? '');
              setErrors((current) => ({ ...current, categoryId: undefined }));
            }}
          />

          <TextField
            label={t('budgets.form.amount')}
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
            <ChipGroup
              label={t('budgets.form.currency')}
              errorText={validationMessage(t, errors.currency)}>
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
              {t('budgets.form.period')}
            </Text>
            <SegmentedControl
              accessibilityLabel={t('budgets.form.period')}
              value={period}
              onChange={setPeriod}
              options={BUDGET_PERIODS.map((value) => ({
                value,
                label: t(`budgets.period.${value}`),
              }))}
            />
          </View>

          <DateField
            label={t('budgets.form.startsOn')}
            value={startsOn}
            today={today}
            onChange={setStartsOn}
          />

          <Text variant="caption" tone="tertiary">
            {t('budgets.countsExpenses')}
          </Text>
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.xl,
  },
  field: {
    gap: spacing.sm,
  },
});
