import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View, type TextInputInstance } from 'react-native';

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

import { IconColorPicker } from '../finance/IconColorPicker';
import { closeModal } from '../finance/navigation';
import { validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';
import { DEFAULT_GOAL_COLOR, DEFAULT_GOAL_ICON, GoalIcon } from './GoalIcon';

type FieldErrors = ValidationErrors<keyof SavingsGoalInput>;

async function loadAccounts(repositories: Repositories) {
  const accounts = await repositories.accounts.list();
  return {
    currencies: [...new Set(accounts.map((account) => account.currency))],
    // Contas onde se guarda dinheiro (os cartões de crédito não contam).
    accounts: accounts.filter((account) => account.type !== 'card' && account.archivedAt === null),
  };
}

type Props = {
  goal?: SavingsGoal;
  onClose?: () => void;
  onSaved?: () => void;
};

export function GoalForm({ goal, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const targetRef = useRef<TextInputInstance>(null);
  const repositories = useRepositories();
  const { formatDate, locale } = useLocaleFormat();
  const today = useToday();
  const query = useDataQuery(useCallback((repos: Repositories) => loadAccounts(repos), []));
  const editing = goal !== undefined;

  const [name, setName] = useState(goal?.name ?? '');
  const [targetOn, setTargetOn] = useState(goal?.targetOn ?? null);
  const [currency, setCurrency] = useState(goal?.currency ?? '');
  const [amountText, setAmountText] = useState(
    goal ? amountToInputString(goal.targetAmount, goal.currency, decimalSeparatorFor(locale)) : '',
  );
  const [icon, setIcon] = useState(goal?.icon ?? DEFAULT_GOAL_ICON);
  const [color, setColor] = useState(goal?.color ?? DEFAULT_GOAL_COLOR);
  const [description, setDescription] = useState(goal?.description ?? '');
  const [accountId, setAccountId] = useState<string | null>(goal?.accountId ?? null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [amountError, setAmountError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const currencies = query.data?.currencies ?? [];
  const resolvedCurrency = currency || currencies[0] || DEFAULT_CURRENCY;
  const accountChoices = (query.data?.accounts ?? []).filter(
    (account) => account.currency === resolvedCurrency,
  );
  // Mudar de moeda larga uma conta de outra moeda.
  const resolvedAccountId = accountChoices.some((account) => account.id === accountId)
    ? accountId
    : null;
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
      icon,
      color,
      description,
      accountId: resolvedAccountId,
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
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => targetRef.current?.focus()}
            value={name}
            onChangeText={setName}
            errorText={validationMessage(t, errors.name)}
          />
          <TextField
            label={t('goals.form.description')}
            value={description}
            onChangeText={setDescription}
            maxLength={280}
            multiline
            errorText={validationMessage(t, errors.description)}
          />
          <TextField
            ref={targetRef}
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
          {accountChoices.length > 0 ? (
            <ChipGroup
              label={t('goals.form.account')}
              errorText={validationMessage(t, errors.accountId)}>
              <Chip
                label={t('goals.form.noAccount')}
                selected={resolvedAccountId === null}
                onPress={() => setAccountId(null)}
              />
              {accountChoices.map((account) => (
                <Chip
                  key={account.id}
                  label={account.name}
                  selected={account.id === resolvedAccountId}
                  onPress={() => setAccountId(account.id)}
                />
              ))}
            </ChipGroup>
          ) : null}
          <Text variant="label" tone="secondary" accessibilityRole="header">
            {t('goals.form.appearance')}
          </Text>
          <View style={styles.preview}>
            <GoalIcon icon={icon} color={color} size={56} />
          </View>
          <IconColorPicker
            icon={icon}
            color={color}
            onIconChange={setIcon}
            onColorChange={setColor}
          />
          <Text variant="caption" tone="tertiary">
            {t('goals.howItWorks')}
          </Text>
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  field: { gap: spacing.sm },
  preview: { alignItems: 'center' },
});
