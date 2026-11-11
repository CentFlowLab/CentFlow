import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import {
  addDays,
  calendarDateToLocalDate,
  hasErrors,
  normalizeEntryInput,
  validateEntryInput,
  ValidationError,
  type Account,
  type Entry,
  type EntryField,
  type EntryInput,
  type EntryType,
  parseQuantityMilli,
  quantityToInputString,
  type ValidationErrors,
  VEHICLE_COST_TYPES,
  type VehicleCostType,
} from '@/core/finance';
import { amountToInputString, decimalSeparatorFor, parseAmountInput } from '@/core/money';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Badge,
  Button,
  CalendarPicker,
  Chip,
  ChipGroup,
  Dialog,
  FormScreen,
  type IconName,
  SegmentedControl,
  Text,
  TextField,
} from '@/ui/components';
import { categorySwatch, spacing, useTheme } from '@/ui/theme';

import { vehicleIcon } from '../vehicles/presentation';
import { AiSuggestion } from './AiSuggestion';
import { closeModal } from '../finance/navigation';
import { validationMessage } from '../finance/presentation';
import type { FinanceLookups } from '../finance/useFinanceLookups';

type Props = {
  lookups: FinanceLookups;
  today: string;
  /** Movimento a editar; ausente para um novo registo. */
  entry?: Entry;
  /** Registo a partir da ficha de um veículo: já vem escolhido. */
  initialVehicleId?: string;
};

type FieldErrors = Partial<Record<EntryField, string>>;

const ENTRY_TYPES: readonly EntryType[] = ['expense', 'income', 'transfer'];

/** Conta escolhida no último registo (durante a sessão), para acelerar registos seguidos. */
let lastAccountId: string | null = null;

/** Fora do componente: lembrar a conta não é um efeito do render. */
function rememberAccount(id: string): void {
  lastAccountId = id;
}

export function EntryForm({ lookups, today, entry, initialVehicleId }: Props) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const { locale, formatDate, formatUnitPrice } = useLocaleFormat();
  const repositories = useRepositories();
  const amountRef = useRef<TextInputInstance>(null);
  const isEditing = entry !== undefined;

  const selectableAccounts = useMemo(
    () =>
      lookups.accountList.filter(
        (account) =>
          !account.archivedAt ||
          account.id === entry?.accountId ||
          account.id === entry?.destinationAccountId,
      ),
    [lookups.accountList, entry],
  );

  const initialAccountId =
    entry?.accountId ??
    selectableAccounts.find((account) => account.id === lastAccountId)?.id ??
    selectableAccounts[0]?.id ??
    '';

  const [type, setType] = useState<EntryType>(entry?.type ?? 'expense');
  const [amountText, setAmountText] = useState(() => {
    if (!entry) return '';
    const currency = lookups.accounts.get(entry.accountId)?.currency ?? 'EUR';
    return amountToInputString(entry.amount, currency, decimalSeparatorFor(locale));
  });
  const [categoryId, setCategoryId] = useState<string | null>(entry?.categoryId ?? null);
  const [accountId, setAccountId] = useState(initialAccountId);
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(
    entry?.destinationAccountId ?? null,
  );
  const [date, setDate] = useState(entry?.date ?? today);
  const [description, setDescription] = useState(entry?.description ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');
  const [showDetails, setShowDetails] = useState(Boolean(entry?.description || entry?.notes));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Veículo (ADR-054): a mesma despesa passa também a contar na ficha do veículo.
  const vehicles = useDataQuery(useCallback((repos: Repositories) => repos.vehicles.list(), []));
  // Cartões de crédito ainda no Património: não recebem compras até passarem a contas (ADR-052).
  const cardsInWealth = useDataQuery(
    useCallback(
      async (repos: Repositories) =>
        (await repos.wealth.list()).filter((item) => item.type === 'credit' && !item.closedOn),
      [],
    ),
  );
  const [vehicleId, setVehicleId] = useState<string | null>(
    entry ? entry.vehicleId : (initialVehicleId ?? null),
  );
  const [costType, setCostType] = useState<VehicleCostType | null>(
    entry?.vehicleCostType ?? (initialVehicleId ? 'fuel' : null),
  );
  const [litresText, setLitresText] = useState(
    entry?.quantityMilli
      ? quantityToInputString(entry.quantityMilli, decimalSeparatorFor(locale))
      : '',
  );
  const [odometerText, setOdometerText] = useState(
    entry?.odometerKm == null ? '' : String(entry.odometerKm),
  );

  const sourceAccount: Account | undefined = lookups.accounts.get(accountId);
  const currency = sourceAccount?.currency ?? 'EUR';
  const categories = lookups.categoryList.filter((category) => category.type === type);
  const destinationChoices = selectableAccounts.filter(
    (account) => account.id !== accountId && account.currency === currency,
  );
  const transferUnavailable = type === 'transfer' && !isEditing && destinationChoices.length === 0;

  const changeType = (next: EntryType) => {
    setType(next);
    setErrors({});
    if (next === 'transfer') setCategoryId(null);
    else if (categoryId && lookups.categories.get(categoryId)?.type !== next) setCategoryId(null);
  };

  const changeAccount = (id: string) => {
    setAccountId(id);
    if (destinationAccountId === id) setDestinationAccountId(null);
  };

  const buildInput = (): { input: EntryInput | null; fieldErrors: FieldErrors } => {
    const parsed = parseAmountInput(amountText, currency);
    const fieldErrors: FieldErrors = {};
    if (!parsed.ok) {
      fieldErrors.amount = t(
        parsed.error === 'empty'
          ? 'validation.amountEmpty'
          : parsed.error === 'tooLarge'
            ? 'validation.amountTooLarge'
            : 'validation.amountInvalid',
      );
    }
    const litres = litresText.trim() === '' ? null : parseQuantityMilli(litresText);
    if (vehicleId && costType === 'fuel' && litresText.trim() !== '' && litres === null) {
      fieldErrors.quantityMilli = t('validation.invalid');
    }
    const km = odometerText.replace(/\D/g, '');
    const input = normalizeEntryInput({
      type,
      amount: parsed.ok ? parsed.amountMinor : 0,
      description,
      categoryId: type === 'transfer' ? null : categoryId,
      accountId,
      destinationAccountId: type === 'transfer' ? destinationAccountId : null,
      date,
      notes,
      vehicleId: type === 'transfer' ? null : vehicleId,
      vehicleCostType: vehicleId ? costType : null,
      quantityMilli: vehicleId && costType === 'fuel' ? litres : null,
      odometerKm: vehicleId && km !== '' ? Number(km) : null,
    });
    const domainErrors: ValidationErrors<EntryField> = validateEntryInput(input, {
      accounts: lookups.accounts,
      categories: lookups.categories,
      ...(vehicles.data ? { vehicles: new Set(vehicles.data.map((vehicle) => vehicle.id)) } : {}),
      previous: entry,
    });
    for (const [field, code] of Object.entries(domainErrors) as [
      EntryField,
      (typeof domainErrors)[EntryField],
    ][]) {
      if (!fieldErrors[field]) fieldErrors[field] = validationMessage(t, code);
    }
    return { input: hasErrors(fieldErrors) ? null : input, fieldErrors };
  };

  const save = async (addAnother: boolean) => {
    setFormError(null);
    setSavedMessage(null);
    const { input, fieldErrors } = buildInput();
    setErrors(fieldErrors);
    if (!input) return;

    setSaving(true);
    try {
      if (entry) await repositories.entries.update(entry.id, input);
      else await repositories.entries.create(input);
      rememberAccount(input.accountId);
      if (addAnother) {
        setAmountText('');
        setDescription('');
        setNotes('');
        setLitresText('');
        setOdometerText('');
        setSavedMessage(t('entryForm.saved'));
        amountRef.current?.focus();
      } else {
        closeModal('/transactions');
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        const mapped: FieldErrors = {};
        for (const [field, code] of Object.entries(error.errors)) {
          mapped[field as EntryField] = validationMessage(t, code);
        }
        setErrors(mapped);
      } else {
        setFormError(t('errors.saveFailed'));
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!entry) return;
    setDeleting(true);
    try {
      await repositories.entries.delete(entry.id);
      setConfirmDelete(false);
      closeModal('/transactions');
    } catch {
      setConfirmDelete(false);
      setFormError(t('errors.saveFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const pricePerLitre = (() => {
    if (!vehicleId || costType !== 'fuel') return null;
    const litres = parseQuantityMilli(litresText);
    const amount = parseAmountInput(amountText, currency);
    if (!litres || !amount.ok || amount.amountMinor <= 0) return null;
    return t('entryVehicle.pricePerLitre', {
      price: formatUnitPrice((amount.amountMinor * 1000) / litres, currency),
    });
  })();

  const yesterday = addDays(today, -1);
  const isCustomDate = date !== today && date !== yesterday;

  return (
    <FormScreen
      title={t(isEditing ? 'entryForm.editTitle' : 'entryForm.newTitle')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/transactions')}
      footer={
        <>
          {formError ? (
            <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
              {formError}
            </Text>
          ) : null}
          {savedMessage ? (
            <Text variant="footnote" tone="positive" accessibilityLiveRegion="polite">
              {savedMessage}
            </Text>
          ) : null}
          <View style={styles.footerRow}>
            {isEditing ? (
              <Button
                label={t('common.delete')}
                variant="destructive"
                icon="trash-outline"
                onPress={() => setConfirmDelete(true)}
              />
            ) : (
              <Button
                label={t('entryForm.saveAndAddAnother')}
                variant="secondary"
                disabled={saving || transferUnavailable}
                onPress={() => void save(true)}
              />
            )}
            <View style={styles.flex}>
              <Button
                label={t('entryForm.save')}
                icon="checkmark"
                fullWidth
                loading={saving}
                disabled={transferUnavailable}
                onPress={() => void save(false)}
              />
            </View>
          </View>
        </>
      }>
      {isEditing ? null : (
        <AiSuggestion
          today={today}
          categories={lookups.categoryList}
          onApply={(suggestion) => {
            changeType(suggestion.type);
            setDate(suggestion.date);
            if (suggestion.description) {
              setDescription(suggestion.description);
              setShowDetails(true);
            }
            const category = lookups.categoryList.find(
              (item) => item.name === suggestion.categoryName && item.type === suggestion.type,
            );
            if (category) setCategoryId(category.id);
            if (suggestion.amount) {
              const parsed = parseAmountInput(
                suggestion.amount.replace('.', decimalSeparatorFor(locale)),
                currency,
              );
              if (parsed.ok) {
                setAmountText(
                  amountToInputString(parsed.amountMinor, currency, decimalSeparatorFor(locale)),
                );
              }
            }
          }}
        />
      )}
      <SegmentedControl
        accessibilityLabel={t('entryForm.type')}
        value={type}
        onChange={changeType}
        options={ENTRY_TYPES.map((value) => ({ value, label: t(`entryTypes.${value}`) }))}
      />

      <TextField
        ref={amountRef}
        label={t('entryForm.amount')}
        value={amountText}
        onChangeText={(text) => {
          setAmountText(text);
          if (errors.amount) setErrors((current) => ({ ...current, amount: undefined }));
        }}
        placeholder={t('entryForm.amountPlaceholder')}
        keyboardType="decimal-pad"
        inputMode="decimal"
        autoFocus={!isEditing}
        returnKeyType="done"
        onSubmitEditing={() => void save(false)}
        errorText={errors.amount}
        helperText={currency}
        inputStyle={styles.amountInput}
      />

      {type !== 'transfer' ? (
        <ChipGroup label={t('entryForm.category')} errorText={errors.categoryId}>
          {categories.length === 0 ? (
            <Text variant="footnote" tone="secondary">
              {t('entryForm.noCategories')}
            </Text>
          ) : (
            categories.map((category) => (
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
            ))
          )}
        </ChipGroup>
      ) : null}

      <ChipGroup
        label={t(type === 'transfer' ? 'entryForm.fromAccount' : 'entryForm.account')}
        errorText={errors.accountId}>
        {selectableAccounts.map((account) => (
          <Chip
            key={account.id}
            label={account.name}
            icon={account.type === 'card' ? 'card-outline' : undefined}
            selected={account.id === accountId}
            onPress={() => changeAccount(account.id)}
          />
        ))}
      </ChipGroup>
      {(cardsInWealth.data?.length ?? 0) > 0 ? (
        <View style={styles.cardHint}>
          <Text variant="footnote" tone="secondary">
            {t('entryForm.cardsInWealth', { count: cardsInWealth.data!.length })}
          </Text>
          <Button
            label={t('entryForm.moveCards')}
            icon="card-outline"
            variant="secondary"
            size="sm"
            onPress={() =>
              cardsInWealth.data!.length === 1
                ? router.push({
                    pathname: '/wealth/[id]',
                    params: { id: cardsInWealth.data![0]!.id },
                  })
                : router.push('/wealth')
            }
          />
        </View>
      ) : null}

      {type === 'transfer' ? (
        <ChipGroup label={t('entryForm.toAccount')} errorText={errors.destinationAccountId}>
          {destinationChoices.length === 0 ? (
            <Text variant="footnote" tone="secondary">
              {t('entryForm.needTwoAccounts')}
            </Text>
          ) : (
            destinationChoices.map((account) => (
              <Chip
                key={account.id}
                label={account.name}
                icon={account.type === 'card' ? 'card-outline' : undefined}
                selected={account.id === destinationAccountId}
                onPress={() => {
                  setDestinationAccountId(account.id);
                  setErrors((current) => ({ ...current, destinationAccountId: undefined }));
                }}
              />
            ))
          )}
        </ChipGroup>
      ) : null}
      {type === 'transfer' &&
      destinationAccountId &&
      lookups.accounts.get(destinationAccountId)?.type === 'card' ? (
        <Text variant="footnote" tone="secondary">
          {t('entryForm.cardPayment')}
        </Text>
      ) : null}

      {type !== 'transfer' && (vehicles.data?.length ?? 0) > 0 ? (
        <View style={styles.details}>
          <ChipGroup label={t('entryVehicle.vehicle')} errorText={errors.vehicleId}>
            <Chip
              label={t('entryVehicle.none')}
              selected={vehicleId === null}
              onPress={() => setVehicleId(null)}
            />
            {vehicles.data!.map((vehicle) => (
              <Chip
                key={vehicle.id}
                label={vehicle.plate ? `${vehicle.name} · ${vehicle.plate}` : vehicle.name}
                icon={vehicleIcon(vehicle)}
                selected={vehicle.id === vehicleId}
                onPress={() => {
                  setVehicleId(vehicle.id);
                  setErrors((current) => ({ ...current, vehicleId: undefined }));
                }}
              />
            ))}
          </ChipGroup>
          {vehicleId ? (
            <>
              <ChipGroup label={t('entryVehicle.costType')} errorText={errors.vehicleCostType}>
                {VEHICLE_COST_TYPES.map((code) => (
                  <Chip
                    key={code}
                    label={t(`vehicles.costTypes.${code}`)}
                    selected={code === costType}
                    onPress={() => {
                      setCostType(code);
                      setErrors((current) => ({ ...current, vehicleCostType: undefined }));
                    }}
                  />
                ))}
              </ChipGroup>
              {costType === 'fuel' ? (
                <TextField
                  label={t('entryVehicle.litres')}
                  value={litresText}
                  onChangeText={(text) => {
                    setLitresText(text);
                    setErrors((current) => ({ ...current, quantityMilli: undefined }));
                  }}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  helperText={pricePerLitre ?? undefined}
                  errorText={errors.quantityMilli}
                />
              ) : null}
              <TextField
                label={t('entryVehicle.odometer')}
                value={odometerText}
                onChangeText={(text) => {
                  setOdometerText(text);
                  setErrors((current) => ({ ...current, odometerKm: undefined }));
                }}
                keyboardType="number-pad"
                inputMode="numeric"
                errorText={errors.odometerKm}
              />
            </>
          ) : null}
        </View>
      ) : null}

      <ChipGroup label={t('entryForm.date')} errorText={errors.date}>
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

      {showDetails ? (
        <View style={styles.details}>
          <TextField
            label={`${t('entryForm.description')} (${t('common.optional').toLocaleLowerCase(locale)})`}
            value={description}
            onChangeText={setDescription}
            placeholder={t('entryForm.descriptionPlaceholder')}
            maxLength={140}
            errorText={errors.description}
          />
          <TextField
            label={`${t('entryForm.notes')} (${t('common.optional').toLocaleLowerCase(locale)})`}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('entryForm.notesPlaceholder')}
            multiline
            maxLength={1000}
            errorText={errors.notes}
            inputStyle={styles.notes}
          />
        </View>
      ) : (
        <Button
          label={t('entryForm.moreDetails')}
          variant="ghost"
          icon="create-outline"
          onPress={() => setShowDetails(true)}
        />
      )}

      {sourceAccount?.archivedAt ? <Badge label={t('accounts.archived')} tone="warning" /> : null}

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

      <Dialog
        visible={confirmDelete}
        title={t('entryForm.deleteTitle')}
        message={t('entryForm.deleteMessage')}
        onDismiss={() => setConfirmDelete(false)}
        actions={[
          {
            label: t('entryForm.delete'),
            variant: 'destructive',
            loading: deleting,
            onPress: () => void remove(),
          },
          {
            label: t('common.cancel'),
            variant: 'secondary',
            onPress: () => setConfirmDelete(false),
          },
        ]}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  amountInput: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 80,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  cardHint: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  details: {
    gap: spacing.lg,
  },
  notes: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
