import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import {
  ACCOUNT_TYPES,
  hasErrors,
  validateAccountInput,
  ValidationError,
  type AccountField,
  type AccountInput,
  type AccountType,
} from '@/core/finance';
import {
  amountToInputString,
  decimalSeparatorFor,
  DEFAULT_CURRENCY,
  parseAmountInput,
} from '@/core/money';
import {
  AccountInUseError,
  useDataQuery,
  useRepositories,
  type AccountWithBalance,
  type Repositories,
} from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  Dialog,
  FormScreen,
  Section,
  Text,
  TextField,
} from '@/ui/components';
import { spacing } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { ACCOUNT_TYPE_ICONS, validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';
import { CardSummary } from './CardSummary';
import { newAccountCurrencyFor, usePreferences } from '../preferences';

type FieldErrors = Partial<Record<AccountField, string>>;

type DialogState =
  | { kind: 'none' }
  | { kind: 'confirmDelete' }
  | { kind: 'inUse'; count: number }
  | { kind: 'confirmDeleteWithEntries'; count: number };

export function AccountForm({ account }: { account?: AccountWithBalance }) {
  const { t } = useTranslation();
  const balanceRef = useRef<TextInputInstance>(null);
  const { locale, formatMoney } = useLocaleFormat();
  const repositories = useRepositories();
  const isEditing = account !== undefined;
  const currencyLocked = (account?.entryCount ?? 0) > 0;

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank');
  const { preferences } = usePreferences();
  // Conta nova: a moeda das preferências. Uma conta existente mantém a sua (e o bloqueio).
  const [currency, setCurrency] = useState(account?.currency ?? newAccountCurrencyFor(preferences));
  const [initialBalanceText, setInitialBalanceText] = useState(() =>
    account
      ? amountToInputString(account.initialBalance, account.currency, decimalSeparatorFor(locale))
      : '',
  );
  // Cartão (ADR-057): o valor já usado é positivo e fica como saldo de abertura negativo.
  const [usedText, setUsedText] = useState(() =>
    account && account.type === 'card' && account.initialBalance < 0
      ? amountToInputString(-account.initialBalance, account.currency, decimalSeparatorFor(locale))
      : '',
  );
  const [creditLimitText, setCreditLimitText] = useState(() =>
    account?.creditLimit != null
      ? amountToInputString(account.creditLimit, account.currency, decimalSeparatorFor(locale))
      : '',
  );
  const [institution, setInstitution] = useState(account?.institution ?? '');
  const [statementDayText, setStatementDayText] = useState(
    account?.statementDay != null ? String(account.statementDay) : '',
  );
  const [dueDayText, setDueDayText] = useState(
    account?.dueDay != null ? String(account.dueDay) : '',
  );
  const [paymentAccountId, setPaymentAccountId] = useState<string | null>(
    account?.paymentAccountId ?? null,
  );
  const otherAccounts = useDataQuery(
    useCallback((repos: Repositories) => repos.accounts.list(), []),
  );
  const today = useToday();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });

  const close = () => closeModal('/accounts');

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setFormError(null);
    try {
      await operation();
    } catch (error) {
      if (error instanceof ValidationError) {
        const mapped: FieldErrors = {};
        for (const [field, code] of Object.entries(error.errors)) {
          mapped[field as AccountField] = validationMessage(t, code);
        }
        setErrors(mapped);
      } else if (error instanceof AccountInUseError) {
        setDialog({ kind: 'inUse', count: error.entryCount });
      } else {
        setFormError(t('errors.saveFailed'));
      }
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const normalizedCurrency = currency.trim().toUpperCase();
    const fieldErrors: FieldErrors = {};
    const moneyCurrency = normalizedCurrency.length === 3 ? normalizedCurrency : DEFAULT_CURRENCY;
    const isCard = type === 'card';
    const day = (text: string) => (text.trim() === '' ? null : Number(text.replace(/\D/g, '')));
    let creditLimit: number | null = null;
    if (isCard && creditLimitText.trim() !== '') {
      const parsed = parseAmountInput(creditLimitText, moneyCurrency);
      if (parsed.ok) creditLimit = parsed.amountMinor;
      else fieldErrors.creditLimit = t('validation.amountInvalid');
    }
    let initialBalance = 0;
    if (isCard) {
      if (usedText.trim() !== '') {
        const parsed = parseAmountInput(usedText, moneyCurrency);
        if (parsed.ok) initialBalance = -parsed.amountMinor;
        else fieldErrors.initialBalance = t('validation.amountInvalid');
      }
    } else if (initialBalanceText.trim() !== '') {
      const parsed = parseAmountInput(
        initialBalanceText,
        normalizedCurrency.length === 3 ? normalizedCurrency : DEFAULT_CURRENCY,
        {
          allowNegative: true,
        },
      );
      if (parsed.ok) initialBalance = parsed.amountMinor;
      else
        fieldErrors.initialBalance = t(
          parsed.error === 'tooLarge' ? 'validation.amountTooLarge' : 'validation.amountInvalid',
        );
    }
    const input: AccountInput = {
      name: name.trim(),
      type,
      currency: normalizedCurrency,
      initialBalance,
      creditLimit: isCard ? creditLimit : null,
      institution: institution.trim() === '' ? null : institution,
      statementDay: isCard ? day(statementDayText) : null,
      dueDay: isCard ? day(dueDayText) : null,
      paymentAccountId: isCard ? paymentAccountId : null,
    };
    for (const [field, code] of Object.entries(validateAccountInput(input))) {
      fieldErrors[field as AccountField] ??= validationMessage(t, code);
    }
    setErrors(fieldErrors);
    if (hasErrors(fieldErrors)) return;

    void run(async () => {
      if (account) await repositories.accounts.update(account.id, input);
      else await repositories.accounts.create(input);
      close();
    });
  };

  const toggleArchive = () =>
    void run(async () => {
      if (!account) return;
      await repositories.accounts.setArchived(account.id, !account.archivedAt);
      setDialog({ kind: 'none' });
      close();
    });

  const requestDelete = () => {
    if (!account) return;
    setDialog(
      account.entryCount > 0
        ? { kind: 'inUse', count: account.entryCount }
        : { kind: 'confirmDelete' },
    );
  };

  const dismiss = () => setDialog({ kind: 'none' });

  return (
    <FormScreen
      title={t(isEditing ? 'accountForm.editTitle' : 'accountForm.newTitle')}
      closeLabel={t('common.close')}
      onClose={close}
      keyboardAction={{ label: t('common.save'), onPress: save, loading: busy }}
      footer={
        <>
          {formError ? (
            <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
              {formError}
            </Text>
          ) : null}
          <Button
            label={t('common.save')}
            icon="checkmark"
            fullWidth
            loading={busy}
            onPress={save}
          />
        </>
      }>
      {account ? (
        <Card style={styles.balance}>
          <Text variant="footnote" tone="secondary">
            {t('accountForm.currentBalance')}
          </Text>
          <Text variant="amountHero" tabular numberOfLines={1}>
            {formatMoney({ amountMinor: account.balance, currency: account.currency })}
          </Text>
          <Text variant="footnote" tone="tertiary">
            {t('accounts.entryCount', { count: account.entryCount })}
          </Text>
        </Card>
      ) : null}

      {account && account.type === 'card' ? (
        <Card padding="md">
          <CardSummary account={account} balance={account.balance} today={today} />
        </Card>
      ) : null}

      <TextField
        label={t('accountForm.name')}
        value={name}
        onChangeText={setName}
        placeholder={t('accountForm.namePlaceholder')}
        maxLength={60}
        autoFocus={!isEditing}
        errorText={errors.name}
      />

      <ChipGroup label={t('accountForm.type')} errorText={errors.type}>
        {ACCOUNT_TYPES.map((value) => (
          <Chip
            key={value}
            label={t(`accounts.types.${value}`)}
            icon={ACCOUNT_TYPE_ICONS[value]}
            selected={type === value}
            onPress={() => setType(value)}
          />
        ))}
      </ChipGroup>

      <View style={styles.row}>
        <View style={styles.currency}>
          <TextField
            label={t('accountForm.currency')}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => balanceRef.current?.focus()}
            value={currency}
            onChangeText={(text) => setCurrency(text.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={3}
            editable={!currencyLocked}
            errorText={errors.currency}
            helperText={
              currencyLocked ? t('validation.currencyLocked') : t('accountForm.currencyHelper')
            }
          />
        </View>
        <View style={styles.flex}>
          {type === 'card' ? (
            <TextField
              ref={balanceRef}
              label={t('accountForm.cardUsed')}
              value={usedText}
              onChangeText={setUsedText}
              placeholder={t('entryForm.amountPlaceholder')}
              keyboardType="decimal-pad"
              inputMode="decimal"
              errorText={errors.initialBalance}
            />
          ) : (
            <TextField
              ref={balanceRef}
              label={t('accountForm.initialBalance')}
              value={initialBalanceText}
              onChangeText={setInitialBalanceText}
              placeholder={t('entryForm.amountPlaceholder')}
              keyboardType="numbers-and-punctuation"
              inputMode="decimal"
              errorText={errors.initialBalance}
              helperText={t('accountForm.initialBalanceHelper')}
            />
          )}
        </View>
      </View>

      {type === 'card' ? (
        <Section title={t('accountForm.cardSection')}>
          <View style={styles.cardFields}>
            <Text variant="footnote" tone="tertiary">
              {t('accountForm.cardUsedHelper')}
            </Text>
            <TextField
              label={t('accountForm.creditLimit')}
              value={creditLimitText}
              onChangeText={setCreditLimitText}
              placeholder={t('entryForm.amountPlaceholder')}
              keyboardType="decimal-pad"
              inputMode="decimal"
              errorText={errors.creditLimit}
            />
            <TextField
              label={t('accountForm.institution')}
              value={institution}
              onChangeText={setInstitution}
              maxLength={60}
              errorText={errors.institution}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField
                  label={t('accountForm.statementDay')}
                  value={statementDayText}
                  onChangeText={setStatementDayText}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={2}
                  helperText={t('accountForm.dayHelper')}
                  errorText={errors.statementDay}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label={t('accountForm.dueDay')}
                  value={dueDayText}
                  onChangeText={setDueDayText}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={2}
                  helperText={t('accountForm.dayHelper')}
                  errorText={errors.dueDay}
                />
              </View>
            </View>
            {(otherAccounts.data ?? []).some(
              (other) => other.type !== 'card' && other.id !== account?.id,
            ) ? (
              <ChipGroup
                label={t('accountForm.paymentAccount')}
                errorText={errors.paymentAccountId}>
                <Chip
                  label={t('accountForm.noPaymentAccount')}
                  selected={paymentAccountId === null}
                  onPress={() => setPaymentAccountId(null)}
                />
                {(otherAccounts.data ?? [])
                  .filter((other) => other.type !== 'card' && other.id !== account?.id)
                  .map((other) => (
                    <Chip
                      key={other.id}
                      label={other.name}
                      selected={other.id === paymentAccountId}
                      onPress={() => setPaymentAccountId(other.id)}
                    />
                  ))}
              </ChipGroup>
            ) : null}
          </View>
        </Section>
      ) : null}

      {account ? (
        <View style={styles.actions}>
          <Text variant="footnote" tone="tertiary">
            {t('accountForm.archiveHint')}
          </Text>
          <Button
            label={t(account.archivedAt ? 'accountForm.unarchive' : 'accountForm.archive')}
            variant="secondary"
            icon={account.archivedAt ? 'refresh-outline' : 'archive-outline'}
            onPress={toggleArchive}
            disabled={busy}
          />
          <Button
            label={t('accountForm.delete')}
            variant="destructive"
            icon="trash-outline"
            onPress={requestDelete}
            disabled={busy}
          />
        </View>
      ) : null}

      <Dialog
        visible={dialog.kind === 'confirmDelete'}
        title={t('accountForm.deleteTitle')}
        message={t('accountForm.deleteMessage')}
        onDismiss={dismiss}
        actions={[
          {
            label: t('accountForm.delete'),
            variant: 'destructive',
            loading: busy,
            onPress: () =>
              void run(async () => {
                if (!account) return;
                await repositories.accounts.delete(account.id);
                dismiss();
                close();
              }),
          },
          { label: t('common.cancel'), variant: 'secondary', onPress: dismiss },
        ]}
      />

      <Dialog
        visible={dialog.kind === 'inUse'}
        title={t('accountForm.inUseTitle')}
        message={
          dialog.kind === 'inUse'
            ? t('accountForm.inUseMessage', { count: dialog.count })
            : undefined
        }
        onDismiss={dismiss}
        actions={[
          ...(account?.archivedAt
            ? []
            : [
                {
                  label: t('accountForm.archiveInstead'),
                  variant: 'primary' as const,
                  onPress: toggleArchive,
                },
              ]),
          {
            label: t('accountForm.deleteWithEntries'),
            variant: 'destructive',
            onPress: () =>
              dialog.kind === 'inUse' &&
              setDialog({ kind: 'confirmDeleteWithEntries', count: dialog.count }),
          },
          { label: t('common.cancel'), variant: 'secondary', onPress: dismiss },
        ]}
      />

      <Dialog
        visible={dialog.kind === 'confirmDeleteWithEntries'}
        title={t('accountForm.deleteWithEntriesTitle')}
        message={
          dialog.kind === 'confirmDeleteWithEntries'
            ? t('accountForm.deleteWithEntriesMessage', { count: dialog.count })
            : undefined
        }
        onDismiss={dismiss}
        actions={[
          {
            label: t('accountForm.deleteWithEntries'),
            variant: 'destructive',
            loading: busy,
            onPress: () =>
              void run(async () => {
                if (!account) return;
                await repositories.accounts.deleteWithEntries(account.id);
                dismiss();
                close();
              }),
          },
          { label: t('common.cancel'), variant: 'secondary', onPress: dismiss },
        ]}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  cardFields: {
    gap: spacing.lg,
  },
  balance: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  currency: {
    width: 140,
  },
  flex: {
    flex: 1,
    minWidth: 200,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
