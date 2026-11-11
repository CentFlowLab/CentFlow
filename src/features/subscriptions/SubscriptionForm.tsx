import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View, type TextInputInstance } from 'react-native';

import {
  calendarDateToLocalDate,
  SUBSCRIPTION_PERIODS,
  SUBSCRIPTION_STATUSES,
  validateSubscriptionInput,
  ValidationError,
  hasErrors,
  type Subscription,
  type SubscriptionInput,
  type SubscriptionPeriod,
  type SubscriptionStatus,
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
  SegmentedControl,
  Text,
  TextField,
} from '@/ui/components';
import { spacing } from '@/ui/theme';

import { CategoryPicker } from '../finance/CategoryPicker';
import { closeModal } from '../finance/navigation';
import { validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';

type FieldErrors = ValidationErrors<keyof SubscriptionInput>;

async function loadForm(repositories: Repositories) {
  const [categories, accounts] = await Promise.all([
    repositories.categories.list('expense'),
    repositories.accounts.list(),
  ]);
  return { categories, accounts };
}

type Props = {
  subscription?: Subscription;
  onClose?: () => void;
  onSaved?: () => void;
};

export function SubscriptionForm({ subscription, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const amountRef = useRef<TextInputInstance>(null);
  const repositories = useRepositories();
  const { formatDate, locale } = useLocaleFormat();
  const today = useToday();
  const query = useDataQuery(useCallback((repos: Repositories) => loadForm(repos), []));
  const editing = subscription !== undefined;

  const [name, setName] = useState(subscription?.name ?? '');
  const [period, setPeriod] = useState<SubscriptionPeriod>(subscription?.period ?? 'monthly');
  const [status, setStatus] = useState<SubscriptionStatus>(subscription?.status ?? 'active');
  const [startsOn, setStartsOn] = useState(subscription?.startsOn ?? today);
  const [nextOn, setNextOn] = useState(subscription?.nextOn ?? today);
  const [categoryId, setCategoryId] = useState(subscription?.categoryId ?? '');
  const [currency, setCurrency] = useState(subscription?.currency ?? '');
  const [amountText, setAmountText] = useState(
    subscription
      ? amountToInputString(subscription.amount, subscription.currency, decimalSeparatorFor(locale))
      : '',
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [amountError, setAmountError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const currencies = [...new Set((query.data?.accounts ?? []).map((account) => account.currency))];
  const resolvedCurrency = currency || currencies[0] || DEFAULT_CURRENCY;

  const close = onClose ?? (() => closeModal('/subscriptions'));

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
    const input: SubscriptionInput = {
      name,
      amount: parsed.amountMinor,
      currency: resolvedCurrency,
      period,
      status,
      startsOn,
      nextOn: nextOn < startsOn ? startsOn : nextOn,
      categoryId: categoryId === '' ? null : categoryId,
    };
    const fieldErrors = validateSubscriptionInput(input);
    if (hasErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    try {
      if (subscription) await repositories.subscriptions.update(subscription.id, input);
      else await repositories.subscriptions.create(input);
      (onSaved ?? close)();
    } catch (error) {
      setSaving(false);
      if (error instanceof ValidationError) setErrors(error.errors);
    }
  }

  return (
    <FormScreen
      title={t(editing ? 'subscriptions.form.editTitle' : 'subscriptions.form.createTitle')}
      closeLabel={t('common.close')}
      onClose={close}
      footer={
        <Button
          label={t('subscriptions.form.save')}
          fullWidth
          loading={saving}
          disabled={saving}
          onPress={() => void save()}
        />
      }>
      {!query.data ? (
        query.status === 'error' ? (
          <Text variant="callout" tone="secondary">
            {t('errors.loadFailed')}
          </Text>
        ) : (
          <ActivityIndicator />
        )
      ) : (
        <View style={styles.form}>
          <TextField
            label={t('subscriptions.form.name')}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => amountRef.current?.focus()}
            value={name}
            onChangeText={setName}
            errorText={validationMessage(t, errors.name)}
          />
          <TextField
            ref={amountRef}
            label={t('subscriptions.form.amount')}
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
            <ChipGroup label={t('budgets.form.currency')}>
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
              {t('subscriptions.form.period')}
            </Text>
            <SegmentedControl
              accessibilityLabel={t('subscriptions.form.period')}
              value={period}
              onChange={setPeriod}
              options={SUBSCRIPTION_PERIODS.map((value) => ({
                value,
                label: t(`budgets.period.${value}`),
              }))}
            />
          </View>
          <View style={styles.field}>
            <Text variant="footnote" tone="secondary">
              {t('subscriptions.form.status')}
            </Text>
            <SegmentedControl
              accessibilityLabel={t('subscriptions.form.status')}
              value={status}
              onChange={setStatus}
              options={SUBSCRIPTION_STATUSES.map((value) => ({
                value,
                label: t(`subscriptions.status.${value}`),
              }))}
            />
          </View>
          <View style={styles.field}>
            <Text variant="footnote" tone="secondary">
              {t('subscriptions.form.startsOn')}
            </Text>
            <Text variant="label">{formatDate(calendarDateToLocalDate(startsOn), 'medium')}</Text>
            <CalendarPicker
              value={startsOn}
              today={today}
              locale={locale}
              labels={{
                previousMonth: t('calendar.previousMonth'),
                nextMonth: t('calendar.nextMonth'),
              }}
              onChange={(value) => {
                setStartsOn(value);
                if (nextOn < value) setNextOn(value);
              }}
            />
          </View>
          <View style={styles.field}>
            <Text variant="footnote" tone="secondary">
              {t('subscriptions.form.nextOn')}
            </Text>
            <Text variant="label">{formatDate(calendarDateToLocalDate(nextOn), 'medium')}</Text>
            <CalendarPicker
              value={nextOn}
              today={today}
              locale={locale}
              labels={{
                previousMonth: t('calendar.previousMonth'),
                nextMonth: t('calendar.nextMonth'),
              }}
              onChange={setNextOn}
            />
            {errors.nextOn ? (
              <Text variant="footnote" tone="negative">
                {validationMessage(t, errors.nextOn)}
              </Text>
            ) : null}
          </View>
          <CategoryPicker
            label={t('subscriptions.form.category')}
            categories={query.data.categories}
            value={categoryId === '' ? null : categoryId}
            noneLabel={t('subscriptions.noneCategory')}
            errorText={validationMessage(t, errors.categoryId)}
            onChange={(id) => setCategoryId(id ?? '')}
          />
          <Text variant="caption" tone="tertiary">
            {t('subscriptions.doesNotChangeBalances')}
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
