import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  addDays,
  calendarDateToLocalDate,
  ValidationError,
  type ValidationErrors,
  type WealthItem,
  type WealthPaymentField,
} from '@/core/finance';
import { parseAmountInput } from '@/core/money';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Button,
  CalendarPicker,
  Chip,
  ChipGroup,
  Dialog,
  EmptyState,
  FormScreen,
  type IconName,
  Text,
  TextField,
} from '@/ui/components';
import { categorySwatch, spacing, useTheme } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { validationMessage } from '../finance/presentation';
import { useFinanceLookups, type FinanceLookups } from '../finance/useFinanceLookups';
import { useToday } from '../finance/useToday';

/** Registar o pagamento de uma dívida: `/wealth/payment/[id]` (ADR-052). */
export function WealthPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const lookups = useFinanceLookups();
  const item = useDataQuery(
    useCallback((repositories: Repositories) => repositories.wealth.get(id), [id]),
  );

  if (item.status === 'success' && (item.data === null || item.data.closedOn)) {
    return (
      <FormScreen
        title={t('wealth.payment.title')}
        closeLabel={t('common.close')}
        onClose={() => closeModal('/wealth')}>
        <EmptyState icon="search-outline" title={t('wealth.notFoundTitle')} />
      </FormScreen>
    );
  }
  if (!item.data || !lookups.data) {
    return (
      <FormScreen
        title={t('wealth.payment.title')}
        closeLabel={t('common.close')}
        onClose={() => closeModal('/wealth')}>
        <ActivityIndicator />
      </FormScreen>
    );
  }
  return <PaymentForm key={item.data.id} item={item.data} lookups={lookups.data} />;
}

function PaymentForm({ item, lookups }: { item: WealthItem; lookups: FinanceLookups }) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const { formatDate, formatMoney, locale } = useLocaleFormat();
  const repositories = useRepositories();
  const today = useToday();
  const accounts = lookups.accountList.filter(
    (account) => !account.archivedAt && account.currency === item.currency,
  );
  const categories = lookups.categoryList.filter((category) => category.type === 'expense');

  const [amountText, setAmountText] = useState('');
  // Acompanha o valor pago até ser alterado à mão.
  const [principalText, setPrincipalText] = useState<string | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(today < item.valuedOn ? item.valuedOn : today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors<WealthPaymentField | 'categoryId'>>({});
  const [amountError, setAmountError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const yesterday = addDays(today, -1);
  const isCustomDate = date !== today && date !== yesterday;
  const close = () => closeModal('/wealth');

  if (accounts.length === 0) {
    return (
      <FormScreen title={t('wealth.payment.title')} closeLabel={t('common.close')} onClose={close}>
        <EmptyState
          icon="wallet-outline"
          title={t('wealth.payment.noAccountsTitle')}
          description={t('wealth.payment.noAccountsDescription')}
        />
      </FormScreen>
    );
  }

  async function save() {
    const amount = parseAmountInput(amountText, item.currency);
    const principal = parseAmountInput(principalText ?? amountText, item.currency);
    if (!amount.ok) {
      setAmountError(
        t(amount.error === 'empty' ? 'validation.amountEmpty' : 'validation.amountInvalid'),
      );
      return;
    }
    if (!principal.ok) {
      setErrors({ principal: 'invalid' });
      return;
    }
    if (!categoryId) {
      setErrors({ categoryId: 'categoryRequired' });
      return;
    }
    setSaving(true);
    setFailed(false);
    try {
      await repositories.wealth.recordPayment(item.id, {
        amount: amount.amountMinor,
        principal: principal.amountMinor,
        accountId,
        categoryId,
        date,
        description: item.name,
      });
      close();
    } catch (error) {
      setSaving(false);
      if (error instanceof ValidationError) setErrors(error.errors);
      else setFailed(true);
    }
  }

  return (
    <FormScreen
      title={t('wealth.payment.title')}
      closeLabel={t('common.close')}
      onClose={close}
      footer={
        <View style={styles.footer}>
          {failed ? (
            <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
              {t('errors.saveFailed')}
            </Text>
          ) : null}
          <Button
            label={t('wealth.payment.save')}
            icon="checkmark"
            fullWidth
            loading={saving}
            onPress={() => void save()}
          />
        </View>
      }>
      <View style={styles.header}>
        <Text variant="title3">{item.name}</Text>
        <Text variant="callout" tone="secondary">
          {t('wealth.payment.owed', {
            amount: formatMoney({ amountMinor: item.amount, currency: item.currency }),
          })}
        </Text>
      </View>
      <TextField
        label={t('wealth.payment.amount')}
        value={amountText}
        onChangeText={(text) => {
          setAmountText(text);
          setAmountError(undefined);
          setErrors((current) => ({ ...current, amount: undefined }));
        }}
        placeholder={t('entryForm.amountPlaceholder')}
        keyboardType="decimal-pad"
        inputMode="decimal"
        autoFocus
        helperText={item.currency}
        errorText={amountError ?? validationMessage(t, errors.amount)}
      />
      <TextField
        label={t('wealth.payment.principal')}
        value={principalText ?? amountText}
        onChangeText={(text) => {
          setPrincipalText(text);
          setErrors((current) => ({ ...current, principal: undefined }));
        }}
        placeholder={t('entryForm.amountPlaceholder')}
        keyboardType="decimal-pad"
        inputMode="decimal"
        helperText={t('wealth.payment.principalHelper')}
        errorText={validationMessage(t, errors.principal)}
      />
      <ChipGroup
        label={t('wealth.payment.account')}
        errorText={validationMessage(t, errors.accountId)}>
        {accounts.map((account) => (
          <Chip
            key={account.id}
            label={account.name}
            selected={account.id === accountId}
            onPress={() => setAccountId(account.id)}
          />
        ))}
      </ChipGroup>
      <ChipGroup
        label={t('wealth.payment.category')}
        errorText={validationMessage(t, errors.categoryId)}>
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            icon={category.icon as IconName}
            iconColorValue={categorySwatch(category.color, scheme).foreground}
            selected={category.id === categoryId}
            onPress={() => {
              setCategoryId(category.id);
              setErrors((current) => ({ ...current, categoryId: undefined }));
            }}
          />
        ))}
      </ChipGroup>
      <ChipGroup label={t('wealth.payment.date')} errorText={validationMessage(t, errors.date)}>
        <Chip label={t('common.today')} selected={date === today} onPress={() => setDate(today)} />
        <Chip
          label={t('common.yesterday')}
          selected={date === yesterday}
          onPress={() => setDate(yesterday)}
        />
        <Chip
          label={
            isCustomDate
              ? formatDate(calendarDateToLocalDate(date), 'medium')
              : t('entryForm.pickDate')
          }
          icon="calendar-outline"
          selected={isCustomDate}
          onPress={() => setCalendarOpen(true)}
        />
      </ChipGroup>
      <Dialog
        visible={calendarOpen}
        title={t('entryForm.pickDate')}
        onDismiss={() => setCalendarOpen(false)}
        actions={[
          { label: t('common.close'), variant: 'secondary', onPress: () => setCalendarOpen(false) },
        ]}>
        <CalendarPicker
          value={date}
          today={today}
          locale={locale}
          labels={{
            previousMonth: t('calendar.previousMonth'),
            nextMonth: t('calendar.nextMonth'),
          }}
          onChange={(value) => {
            setDate(value);
            setCalendarOpen(false);
          }}
        />
      </Dialog>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  footer: { gap: spacing.sm },
});
