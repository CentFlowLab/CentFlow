import { router } from 'expo-router';
import { Children, useCallback, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type TextInputInstance } from 'react-native';

import {
  hasErrors,
  validateVehicleInput,
  ValidationError,
  VEHICLE_FUEL_TYPES,
  type ValidationErrors,
  type Vehicle,
  type VehicleFuelType,
  type VehicleInput,
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
  Dialog,
  FormScreen,
  Icon,
  type IconName,
  Text,
  TextField,
} from '@/ui/components';
import { useBreakpoint } from '@/ui/layout/useBreakpoint';
import { radius, spacing, useTheme } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { OptionalDateField } from '../finance/OptionalDateField';
import { validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';
import {
  deriveVehicleKind,
  energyUnit,
  VEHICLE_ICON_CHOICES,
  vehicleIcon,
  vehicleKindLabel,
} from './presentation';

type FieldErrors = ValidationErrors<keyof VehicleInput>;

const digitsOnly = (text: string) => text.replace(/\D/g, '');
const toNumber = (text: string) => (digitsOnly(text) === '' ? null : Number(digitsOnly(text)));

async function loadChoices(repositories: Repositories) {
  const [accounts, vehicles] = [
    await repositories.accounts.list(),
    await repositories.vehicles.list(),
  ];
  return {
    currencies: [...new Set(accounts.map((account) => account.currency))],
    labels: [...new Set(vehicles.map((vehicle) => vehicle.kindLabel).filter(Boolean))] as string[],
  };
}

/**
 * Criar e editar um veículo, por grupos: identificação, motorização, aquisição, documentos e
 * prazos, notas. Duas colunas a partir do tablet. Cada data abre o seu calendário só quando se
 * toca nela (um de cada vez). Os campos guardados são os mesmos de sempre (ADR-054).
 */
export function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const { t } = useTranslation();
  const { locale } = useLocaleFormat();
  const plateRef = useRef<TextInputInstance>(null);
  const odometerRef = useRef<TextInputInstance>(null);
  const repositories = useRepositories();
  const today = useToday();
  const editing = vehicle !== undefined;
  const { colors } = useTheme();
  // Duas colunas a partir do tablet; no telemóvel, uma.
  const wide = useBreakpoint() !== 'compact';
  const choices = useDataQuery(useCallback((repos: Repositories) => loadChoices(repos), []));

  const [name, setName] = useState(vehicle?.name ?? '');
  // Tipo escrito pela pessoa (com sugestões) e ícone: os tipos são personalizáveis.
  const [kindLabel, setKindLabel] = useState(
    vehicle ? vehicleKindLabel(t, vehicle) : t('vehicles.kinds.car'),
  );
  const [icon, setIcon] = useState<IconName>(vehicle ? vehicleIcon(vehicle) : 'car-outline');
  const [plate, setPlate] = useState(vehicle?.plate ?? '');
  const [odometer, setOdometer] = useState(
    vehicle?.odometerKm == null ? '' : String(vehicle.odometerKm),
  );
  const [inspectionDue, setInspectionDue] = useState(vehicle?.inspectionDue ?? null);
  const [insuranceDue, setInsuranceDue] = useState(vehicle?.insuranceDue ?? null);
  const [make, setMake] = useState(vehicle?.make ?? '');
  const [model, setModel] = useState(vehicle?.model ?? '');
  const [year, setYear] = useState(vehicle?.year == null ? '' : String(vehicle.year));
  const [fuelType, setFuelType] = useState<VehicleFuelType | null>(vehicle?.fuelType ?? null);
  const [acquiredOn, setAcquiredOn] = useState(vehicle?.acquiredOn ?? null);
  const [currency, setCurrency] = useState(vehicle?.currency ?? '');
  const [purchase, setPurchase] = useState(
    vehicle?.purchaseAmount != null
      ? amountToInputString(
          vehicle.purchaseAmount,
          vehicle.currency ?? DEFAULT_CURRENCY,
          decimalSeparatorFor(locale),
        )
      : '',
  );
  const [roadTaxDue, setRoadTaxDue] = useState(vehicle?.roadTaxDue ?? null);
  const [serviceDueOn, setServiceDueOn] = useState(vehicle?.serviceDueOn ?? null);
  const [serviceDueKm, setServiceDueKm] = useState(
    vehicle?.serviceDueKm == null ? '' : String(vehicle.serviceDueKm),
  );
  const [notes, setNotes] = useState(vehicle?.notes ?? '');
  // Quem paga as despesas (ADR-081): eu (omissão) ou empresa/terceiros com nome.
  const [paidByOther, setPaidByOther] = useState(vehicle?.costsPaidBy != null);
  const [payerName, setPayerName] = useState(vehicle?.costsPaidBy ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [purchaseError, setPurchaseError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<{
    entries: number;
    externalCosts: number;
  } | null>(null);
  const close = () => closeModal(vehicle ? `/vehicles/${vehicle.id}` : '/vehicles');

  const currencyChoices = choices.data?.currencies ?? [];
  // Sugestões: as de base e as que a pessoa já usou.
  const known = {
    [t('vehicles.kinds.car').toLocaleLowerCase()]: 'car',
    [t('vehicles.kinds.motorcycle').toLocaleLowerCase()]: 'motorcycle',
    [t('vehicles.kinds.van').toLocaleLowerCase()]: 'van',
  } as const;
  const suggestions = [
    ...new Set([
      t('vehicles.kinds.car'),
      t('vehicles.kinds.motorcycle'),
      t('vehicles.kinds.van'),
      ...(choices.data?.labels ?? []),
    ]),
  ];
  const resolvedCurrency = currency || currencyChoices[0] || DEFAULT_CURRENCY;

  async function save() {
    let purchaseAmount: number | null = null;
    if (purchase.trim() !== '') {
      const parsed = parseAmountInput(purchase, resolvedCurrency);
      if (!parsed.ok) {
        setPurchaseError(t('validation.amountInvalid'));
        return;
      }
      purchaseAmount = parsed.amountMinor;
    }
    const input: VehicleInput = {
      name,
      kind: deriveVehicleKind(kindLabel, icon, known),
      kindLabel: kindLabel.trim() === '' ? null : kindLabel,
      icon,
      plate: plate.trim() === '' ? null : plate,
      odometerKm: toNumber(odometer),
      inspectionDue,
      insuranceDue,
      make: make.trim() === '' ? null : make,
      model: model.trim() === '' ? null : model,
      year: toNumber(year),
      fuelType,
      acquiredOn,
      purchaseAmount,
      currency: resolvedCurrency,
      roadTaxDue,
      serviceDueOn,
      serviceDueKm: toNumber(serviceDueKm),
      notes: notes.trim() === '' ? null : notes,
      costsPaidBy: paidByOther ? payerName : null,
    };
    const fieldErrors = validateVehicleInput(input);
    if (hasErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    try {
      if (vehicle) await repositories.vehicles.update(vehicle.id, input);
      else await repositories.vehicles.create(input);
      close();
    } catch (error) {
      setSaving(false);
      if (error instanceof ValidationError) setErrors(error.errors);
    }
  }

  async function askDelete() {
    if (!vehicle) return;
    const links = await repositories.vehicles.countLinks(vehicle.id);
    setConfirmingDelete({ entries: links.entries, externalCosts: links.externalCosts });
  }

  return (
    <FormScreen
      width="wide"
      title={t(editing ? 'vehicles.form.editTitle' : 'vehicles.form.createTitle')}
      closeLabel={t('common.close')}
      onClose={close}
      keyboardAction={{
        label: t('vehicles.form.save'),
        onPress: () => void save(),
        loading: saving,
        disabled: saving,
      }}
      footer={
        <View style={wide ? styles.footerWide : styles.footer}>
          {editing ? (
            <Button
              label={t('vehicles.delete')}
              variant="ghost"
              fullWidth={!wide}
              onPress={() => void askDelete()}
            />
          ) : null}
          <Button
            label={t('vehicles.form.save')}
            fullWidth={!wide}
            loading={saving}
            disabled={saving}
            onPress={() => void save()}
          />
        </View>
      }>
      <View style={styles.form}>
        <FormGroup
          title={t('vehicleForm.groups.identity')}
          hint={t('vehicleForm.groups.identityHint')}
          first>
          <Pair wide={wide}>
            <TextField
              label={t('vehicles.form.name')}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => plateRef.current?.focus()}
              value={name}
              onChangeText={setName}
              errorText={validationMessage(t, errors.name)}
            />
            <TextField
              ref={plateRef}
              label={t('vehicles.form.plate')}
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => odometerRef.current?.focus()}
              value={plate}
              onChangeText={setPlate}
              autoCapitalize="characters"
              errorText={validationMessage(t, errors.plate)}
            />
          </Pair>
          <Pair wide={wide}>
            <TextField
              label={t('vehicleForm.make')}
              value={make}
              onChangeText={setMake}
              errorText={validationMessage(t, errors.make)}
            />
            <TextField
              label={t('vehicleForm.model')}
              value={model}
              onChangeText={setModel}
              errorText={validationMessage(t, errors.model)}
            />
          </Pair>
          <Pair wide={wide}>
            <TextField
              label={t('vehicleForm.year')}
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={4}
              errorText={validationMessage(t, errors.year)}
            />
            <TextField
              ref={odometerRef}
              label={t('vehicleForm.odometerNow')}
              value={odometer}
              onChangeText={setOdometer}
              keyboardType="number-pad"
              inputMode="numeric"
              errorText={validationMessage(t, errors.odometerKm)}
            />
          </Pair>
          <TextField
            label={t('vehicleForm.kindLabel')}
            value={kindLabel}
            onChangeText={setKindLabel}
            placeholder={t('vehicleForm.kindPlaceholder')}
            maxLength={30}
            errorText={validationMessage(t, errors.kindLabel)}
          />
          <View style={styles.chips}>
            {suggestions.map((label) => (
              <Chip
                key={label}
                label={label}
                selected={label === kindLabel}
                onPress={() => setKindLabel(label)}
              />
            ))}
          </View>
          <View style={styles.field}>
            <Text variant="label" tone="secondary">
              {t('vehicleForm.icon')}
            </Text>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={t('vehicleForm.icon')}
              style={styles.chips}>
              {VEHICLE_ICON_CHOICES.map((choice) => {
                const selected = choice === icon;
                return (
                  <Pressable
                    key={choice}
                    accessibilityRole="radio"
                    accessibilityLabel={t('vehicleForm.iconOption', {
                      name: choice.replace(/-outline$/, ''),
                    })}
                    accessibilityState={{ checked: selected }}
                    aria-checked={selected}
                    onPress={() => setIcon(choice)}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: selected ? colors.primaryMuted : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}>
                    <Icon
                      name={choice}
                      size={22}
                      color={selected ? 'primaryText' : 'textSecondary'}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </FormGroup>

        <FormGroup
          title={t('vehicleForm.groups.powertrain')}
          hint={t('vehicleForm.groups.powertrainHint')}>
          <ChipGroup label={t('vehicleForm.fuelType')}>
            {VEHICLE_FUEL_TYPES.map((code) => (
              <Chip
                key={code}
                label={t(`vehicles.fuelTypes.${code}`)}
                selected={code === fuelType}
                onPress={() => setFuelType(code === fuelType ? null : code)}
              />
            ))}
          </ChipGroup>
          {/* A unidade dos abastecimentos segue a motorização (energyUnit): só informação. */}
          <View style={[styles.note, { backgroundColor: colors.surfaceMuted }]}>
            <Icon
              name={fuelType === 'electric' ? 'flash-outline' : 'water-outline'}
              size={16}
              color="textSecondary"
            />
            <Text variant="footnote" tone="secondary" style={styles.flex}>
              {fuelType === null
                ? t('vehicleForm.energyNote.none')
                : t(`vehicleForm.energyNote.${energyUnit({ fuelType })}`)}
            </Text>
          </View>
        </FormGroup>

        <FormGroup
          title={t('vehicleForm.groups.acquisition')}
          hint={t('vehicleForm.groups.acquisitionHint')}>
          <Pair wide={wide}>
            <OptionalDateField
              label={t('vehicleForm.acquiredOn')}
              value={acquiredOn}
              today={today}
              onChange={setAcquiredOn}
              errorText={validationMessage(t, errors.acquiredOn)}
            />
            <TextField
              label={t('vehicleForm.purchaseAmount')}
              value={purchase}
              onChangeText={(text) => {
                setPurchase(text);
                setPurchaseError(undefined);
              }}
              placeholder={t('entryForm.amountPlaceholder')}
              keyboardType="decimal-pad"
              inputMode="decimal"
              helperText={`${resolvedCurrency} · ${t('vehicleForm.purchaseHelper')}`}
              errorText={purchaseError ?? validationMessage(t, errors.purchaseAmount)}
            />
          </Pair>
          {currencyChoices.length > 1 ? (
            <ChipGroup label={t('wealth.form.currency')}>
              {currencyChoices.map((code) => (
                <Chip
                  key={code}
                  label={code}
                  selected={code === resolvedCurrency}
                  onPress={() => setCurrency(code)}
                />
              ))}
            </ChipGroup>
          ) : null}
        </FormGroup>

        <FormGroup
          title={t('vehicleForm.groups.documents')}
          hint={t('vehicleForm.groups.documentsHint')}>
          <Pair wide={wide}>
            <OptionalDateField
              label={t('vehicles.form.insurance')}
              value={insuranceDue}
              today={today}
              onChange={setInsuranceDue}
              errorText={validationMessage(t, errors.insuranceDue)}
            />
            <OptionalDateField
              label={t('vehicles.form.inspection')}
              value={inspectionDue}
              today={today}
              onChange={setInspectionDue}
              errorText={validationMessage(t, errors.inspectionDue)}
            />
          </Pair>
          <Pair wide={wide}>
            <OptionalDateField
              label={t('vehicleForm.roadTax')}
              value={roadTaxDue}
              today={today}
              onChange={setRoadTaxDue}
              errorText={validationMessage(t, errors.roadTaxDue)}
            />
            <OptionalDateField
              label={t('vehicleForm.serviceDate')}
              value={serviceDueOn}
              today={today}
              onChange={setServiceDueOn}
              errorText={validationMessage(t, errors.serviceDueOn)}
            />
          </Pair>
          <Pair wide={wide}>
            <TextField
              label={t('vehicleForm.serviceKm')}
              value={serviceDueKm}
              onChangeText={setServiceDueKm}
              keyboardType="number-pad"
              inputMode="numeric"
              errorText={validationMessage(t, errors.serviceDueKm)}
            />
            <View />
          </Pair>
        </FormGroup>

        <FormGroup title={t('vehicleCosts.payerGroup')} hint={t('vehicleCosts.payerHint')}>
          <ChipGroup label={t('vehicleCosts.payerGroup')}>
            <Chip
              label={t('vehicleCosts.payerSelf')}
              selected={!paidByOther}
              onPress={() => setPaidByOther(false)}
            />
            <Chip
              label={t('vehicleCosts.payerOther')}
              selected={paidByOther}
              onPress={() => setPaidByOther(true)}
            />
          </ChipGroup>
          {paidByOther ? (
            <TextField
              label={t('vehicleCosts.payerName')}
              value={payerName}
              onChangeText={setPayerName}
              maxLength={80}
              errorText={validationMessage(t, errors.costsPaidBy)}
            />
          ) : null}
        </FormGroup>

        <FormGroup title={t('vehicleForm.groups.notes')}>
          <TextField
            label={t('vehicleForm.notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={1000}
            errorText={validationMessage(t, errors.notes)}
          />
        </FormGroup>
      </View>
      <Dialog
        visible={confirmingDelete !== null}
        title={t('vehicles.deleteTitle')}
        message={[
          confirmingDelete?.entries
            ? t('vehicles.deleteMessage', { count: confirmingDelete.entries })
            : t('vehicles.deleteMessageNone'),
          confirmingDelete?.externalCosts
            ? t('vehicleCosts.deleteKeeps', { count: confirmingDelete.externalCosts })
            : null,
        ]
          .filter(Boolean)
          .join(' ')}
        onDismiss={() => setConfirmingDelete(null)}
        actions={[
          {
            label: t('vehicles.delete'),
            variant: 'destructive',
            onPress: () => {
              setConfirmingDelete(null);
              if (!vehicle) return;
              void repositories.vehicles.delete(vehicle.id).then(
                () => router.replace('/vehicles'),
                () => router.back(),
              );
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setConfirmingDelete(null),
          },
        ]}
      />
    </FormScreen>
  );
}

/** Grupo do formulário: título, uma frase sobre o grupo e os campos. */
function FormGroup({
  title,
  hint,
  first = false,
  children,
}: {
  title: string;
  hint?: string;
  first?: boolean;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.group, !first && styles.groupDivided, { borderTopColor: colors.border }]}>
      <View style={styles.groupHead}>
        <Text variant="title3" accessibilityRole="header">
          {title}
        </Text>
        {hint ? (
          <Text variant="footnote" tone="secondary">
            {hint}
          </Text>
        ) : null}
      </View>
      <View style={styles.form}>{children}</View>
    </View>
  );
}

/** Dois campos lado a lado a partir do tablet; um por baixo do outro no telemóvel. */
function Pair({ wide, children }: { wide: boolean; children: ReactNode }) {
  if (!wide) return <View style={styles.form}>{children}</View>;
  return (
    <View style={styles.pair}>
      {Children.map(children, (child) => (
        <View style={styles.cell}>{child}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  group: { gap: spacing.lg },
  groupDivided: { paddingTop: spacing.xl, borderTopWidth: StyleSheet.hairlineWidth },
  groupHead: { gap: spacing.xxs },
  pair: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  cell: { flex: 1, minWidth: 0 },
  field: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  flex: { flex: 1 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { gap: spacing.sm },
  footerWide: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
