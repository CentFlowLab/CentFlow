import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  ValidationError,
  type ValidationErrors,
  type WealthItem,
  type WealthPaymentField,
} from '@/core/finance';
import { parseAmountInput } from '@/core/money';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Button, Chip, ChipGroup, EmptyState, FormScreen, Text, TextField } from '@/ui/components';
import { spacing } from '@/ui/theme';

import { CategoryPicker } from '../finance/CategoryPicker';
import { closeModal } from '../finance/navigation';
import { validationMessage } from '../finance/presentation';
import { useFinanceLookups, type FinanceLookups } from '../finance/useFinanceLookups';
import { useToday } from '../finance/useToday';
import { DateChips } from '../finance/DateField';

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
  const { formatMoney } = useLocaleFormat();
  const repositories = useRepositories();
  const today = useToday();
  const accounts = lookups.accountList.filter(
    (account) => !account.archivedAt && account.currency === item.currency,
  );
  const categories = lookups.categoryList.filter((category) => category.type === 'expense');

  const [amountText, setAmountText] = useState('');
  // Acompanha o valor pago até ser alterado à mão.
  const [principalText, setPrincipalText] = useState<string | null>(null);
  // Juros e encargos opcionais; o que sobrar do total fica "por discriminar" (ADR-057).
  const [interestText, setInterestText] = useState('');
  const [feesText, setFeesText] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(today < item.valuedOn ? item.valuedOn : today);
  const [errors, setErrors] = useState<ValidationErrors<WealthPaymentField | 'categoryId'>>({});
  const [amountError, setAmountError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  // Total − capital − juros − encargos indicados: o que fica como "juros e encargos por discriminar".
  const undistributed = (() => {
    const total = parseAmountInput(amountText, item.currency);
    const principal = parseAmountInput(principalText ?? amountText, item.currency);
    if (!total.ok || !principal.ok) return null;
    const known = [interestText, feesText].map((text) => {
      if (text.trim() === '') return 0;
      const parsed = parseAmountInput(text, item.currency);
      return parsed.ok ? parsed.amountMinor : 0;
    });
    return total.amountMinor - principal.amountMinor - known[0]! - known[1]!;
  })();

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
      const optional = (text: string) => {
        if (text.trim() === '') return undefined;
        const parsed = parseAmountInput(text, item.currency);
        return parsed.ok ? parsed.amountMinor : Number.NaN;
      };
      await repositories.wealth.recordPayment(item.id, {
        amount: amount.amountMinor,
        principal: principal.amountMinor,
        interest: optional(interestText),
        fees: optional(feesText),
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
      <View style={styles.split}>
        <View style={styles.splitField}>
          <TextField
            label={t('wealth.payment.interest')}
            value={interestText}
            onChangeText={setInterestText}
            placeholder={t('entryForm.amountPlaceholder')}
            keyboardType="decimal-pad"
            inputMode="decimal"
          />
        </View>
        <View style={styles.splitField}>
          <TextField
            label={t('wealth.payment.fees')}
            value={feesText}
            onChangeText={setFeesText}
            placeholder={t('entryForm.amountPlaceholder')}
            keyboardType="decimal-pad"
            inputMode="decimal"
          />
        </View>
      </View>
      {undistributed !== null && undistributed > 0 ? (
        <Text variant="footnote" tone="secondary">
          {t('wealth.payment.undistributed', {
            amount: formatMoney({ amountMinor: undistributed, currency: item.currency }),
          })}
        </Text>
      ) : null}
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
      <CategoryPicker
        label={t('wealth.payment.category')}
        categories={categories}
        value={categoryId}
        errorText={validationMessage(t, errors.categoryId)}
        onChange={(id) => {
          setCategoryId(id);
          setErrors((current) => ({ ...current, categoryId: undefined }));
        }}
      />
      <DateChips
        label={t('wealth.payment.date')}
        value={date}
        today={today}
        onChange={setDate}
        errorText={validationMessage(t, errors.date)}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row', gap: spacing.md },
  splitField: { flex: 1 },
  header: { gap: spacing.xs },
  footer: { gap: spacing.sm },
});
