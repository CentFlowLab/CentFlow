import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View, type TextInputInstance } from 'react-native';

import {
  calendarDateToLocalDate,
  hasErrors,
  isLiabilityType,
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
    const input: WealthItemInput = {
      name,
      type,
      amount: parsed.amountMinor,
      currency: resolvedCurrency,
      valuedOn,
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
            {WEALTH_LIABILITY_TYPES.map((code) => (
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
          <Text variant="caption" tone="tertiary">
            {t('wealth.doesNotChangeBalances')}
          </Text>
        </View>
      )}
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
});
