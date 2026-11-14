import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  hasErrors,
  parseQuantityMilli,
  quantityToInputString,
  validateVehicleExternalCost,
  VEHICLE_EXTERNAL_COST_TYPES,
  ValidationError,
  type Vehicle,
  type VehicleExternalCost,
  type VehicleExternalCostField,
  type VehicleExternalCostInput,
  type VehicleExternalCostType,
  type ValidationErrors,
} from '@/core/finance';
import {
  amountToInputString,
  DEFAULT_CURRENCY,
  decimalSeparatorFor,
  parseAmountInput,
} from '@/core/money';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Button,
  Chip,
  ChipGroup,
  Dialog,
  EmptyState,
  FormScreen,
  Text,
  TextField,
} from '@/ui/components';
import { spacing } from '@/ui/theme';

import { DateField } from '../finance/DateField';
import { closeModal } from '../finance/navigation';
import { validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';
import { energyUnit } from './presentation';

/** Novo custo pago por terceiros: `/vehicles/external/new?vehicleId=…` (ADR-081). */
export function NewExternalCostScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  return <ExternalCostLoader vehicleId={vehicleId ?? null} costId={null} />;
}

/** Editar um custo pago por terceiros: `/vehicles/external/[id]`. */
export function EditExternalCostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExternalCostLoader vehicleId={null} costId={id} />;
}

function ExternalCostLoader({
  vehicleId,
  costId,
}: {
  vehicleId: string | null;
  costId: string | null;
}) {
  const { t } = useTranslation();
  const query = useDataQuery(
    useCallback(
      async (repositories: Repositories) => {
        const cost = costId ? await repositories.vehicleExternalCosts.get(costId) : null;
        const id = cost?.vehicleId ?? vehicleId;
        const vehicle = id ? await repositories.vehicles.get(id) : null;
        return { cost, vehicle };
      },
      [vehicleId, costId],
    ),
  );
  const title = t(costId ? 'vehicleCosts.form.editTitle' : 'vehicleCosts.form.newTitle');
  const close = () => closeModal('/vehicles');
  if (!query.data) {
    return (
      <FormScreen title={title} closeLabel={t('common.close')} onClose={close}>
        <ActivityIndicator accessibilityLabel={t('common.loading')} />
      </FormScreen>
    );
  }
  const { cost, vehicle } = query.data;
  // Um custo de uma viatura já apagada continua editável (fica guardado); um novo precisa dela.
  if ((costId && !cost) || (!costId && !vehicle)) {
    return (
      <FormScreen title={title} closeLabel={t('common.close')} onClose={close}>
        <EmptyState icon="search-outline" title={t('vehicles.notFoundTitle')} />
      </FormScreen>
    );
  }
  return (
    <ExternalCostForm
      vehicleId={(cost?.vehicleId ?? vehicleId)!}
      vehicle={vehicle}
      cost={cost}
      title={title}
    />
  );
}

type Errors = ValidationErrors<VehicleExternalCostField>;

function ExternalCostForm({
  vehicleId,
  vehicle,
  cost,
  title,
}: {
  vehicleId: string;
  vehicle: Vehicle | null;
  cost: VehicleExternalCost | null;
  title: string;
}) {
  const { t } = useTranslation();
  const { locale } = useLocaleFormat();
  const repositories = useRepositories();
  const today = useToday();
  const separator = decimalSeparatorFor(locale);
  const initialCurrency = cost?.currency ?? vehicle?.currency ?? DEFAULT_CURRENCY;
  const [currency, setCurrency] = useState(initialCurrency);
  const [amountText, setAmountText] = useState(
    cost ? amountToInputString(cost.amount, cost.currency, separator) : '',
  );
  const [date, setDate] = useState(cost?.date ?? today);
  const [costType, setCostType] = useState<VehicleExternalCostType>(cost?.costType ?? 'fuel');
  const [quantityText, setQuantityText] = useState(
    cost?.quantityMilli != null ? quantityToInputString(cost.quantityMilli, separator) : '',
  );
  const [odometerText, setOdometerText] = useState(
    cost?.odometerKm != null ? String(cost.odometerKm) : '',
  );
  const [description, setDescription] = useState(cost?.description ?? '');
  const [payer, setPayer] = useState(cost?.payer ?? vehicle?.costsPaidBy ?? '');
  const [notes, setNotes] = useState(cost?.notes ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const unit = energyUnit(vehicle);
  const close = () => closeModal(`/vehicles/${vehicleId}`);
  const typeLabel = (type: VehicleExternalCostType) =>
    type === 'fuel' && unit === 'kwh'
      ? t('entryVehicle.chargeCostType')
      : t(`vehicles.costTypes.${type}`);

  async function save() {
    const code = currency.trim().toUpperCase();
    const amount = parseAmountInput(amountText, code.length === 3 ? code : DEFAULT_CURRENCY);
    const quantity =
      costType === 'fuel' && quantityText.trim() !== '' ? parseQuantityMilli(quantityText) : null;
    const odometer = odometerText.trim() === '' ? null : Number(odometerText.replace(/\s/g, ''));
    const input: VehicleExternalCostInput = {
      vehicleId,
      date,
      amount: amount.ok ? amount.amountMinor : 0,
      currency: code,
      costType,
      quantityMilli: quantity,
      odometerKm:
        odometer !== null && Number.isFinite(odometer) ? odometer : odometer === null ? null : -1,
      description,
      payer: payer.trim() === '' ? null : payer,
      notes: notes.trim() === '' ? null : notes,
    };
    const found = validateVehicleExternalCost(input);
    if (costType === 'fuel' && quantityText.trim() !== '' && quantity === null) {
      found.quantityMilli = 'invalid';
    }
    if (hasErrors(found)) {
      setErrors(found);
      return;
    }
    setSaving(true);
    try {
      if (cost) await repositories.vehicleExternalCosts.update(cost.id, input);
      else await repositories.vehicleExternalCosts.create(input);
      close();
    } catch (error) {
      setSaving(false);
      if (error instanceof ValidationError) setErrors(error.errors as Errors);
    }
  }

  return (
    <FormScreen
      title={title}
      closeLabel={t('common.close')}
      onClose={close}
      keyboardAction={{
        label: t('vehicleCosts.form.save'),
        onPress: () => void save(),
        loading: saving,
        disabled: saving,
      }}
      footer={
        <View style={styles.footer}>
          {cost ? (
            <Button
              label={t('vehicleCosts.form.delete')}
              variant="ghost"
              onPress={() => setConfirmDelete(true)}
            />
          ) : null}
          <Button
            label={t('vehicleCosts.form.save')}
            icon="checkmark"
            fullWidth
            loading={saving}
            disabled={saving}
            onPress={() => void save()}
          />
        </View>
      }>
      <Text variant="footnote" tone="secondary">
        {t('vehicleCosts.form.hint')}
      </Text>
      <View style={styles.row}>
        <View style={styles.amount}>
          <TextField
            label={t('vehicleCosts.form.amount')}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            inputMode="decimal"
            errorText={validationMessage(t, errors.amount)}
          />
        </View>
        <View style={styles.currency}>
          <TextField
            label={t('vehicleCosts.form.currency')}
            value={currency}
            onChangeText={(text) => setCurrency(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={3}
            errorText={validationMessage(t, errors.currency)}
          />
        </View>
      </View>
      <DateField
        label={t('vehicleCosts.form.date')}
        value={date}
        today={today}
        onChange={setDate}
        errorText={validationMessage(t, errors.date)}
      />
      <ChipGroup
        label={t('vehicleCosts.form.costType')}
        errorText={validationMessage(t, errors.costType)}>
        {VEHICLE_EXTERNAL_COST_TYPES.map((type) => (
          <Chip
            key={type}
            label={typeLabel(type)}
            selected={costType === type}
            onPress={() => setCostType(type)}
          />
        ))}
      </ChipGroup>
      {costType === 'fuel' ? (
        <TextField
          label={t(unit === 'kwh' ? 'vehicleCosts.form.quantityKwh' : 'vehicleCosts.form.quantity')}
          value={quantityText}
          onChangeText={setQuantityText}
          keyboardType="decimal-pad"
          inputMode="decimal"
          errorText={validationMessage(t, errors.quantityMilli)}
        />
      ) : null}
      <TextField
        label={t('vehicleCosts.form.odometer')}
        value={odometerText}
        onChangeText={setOdometerText}
        keyboardType="number-pad"
        inputMode="numeric"
        errorText={validationMessage(t, errors.odometerKm)}
      />
      <TextField
        label={t('vehicleCosts.form.description')}
        value={description}
        onChangeText={setDescription}
        maxLength={120}
        errorText={validationMessage(t, errors.description)}
      />
      <TextField
        label={t('vehicleCosts.form.payer')}
        value={payer}
        onChangeText={setPayer}
        maxLength={80}
        errorText={validationMessage(t, errors.payer)}
      />
      <TextField
        label={t('vehicleCosts.form.notes')}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={500}
        errorText={validationMessage(t, errors.notes)}
      />
      <Dialog
        visible={confirmDelete}
        title={t('vehicleCosts.form.deleteTitle')}
        message={t('vehicleCosts.form.deleteMessage')}
        onDismiss={() => setConfirmDelete(false)}
        actions={[
          {
            label: t('vehicleCosts.form.delete'),
            variant: 'destructive',
            onPress: () => {
              setConfirmDelete(false);
              if (!cost) return;
              void repositories.vehicleExternalCosts.delete(cost.id).then(close, close);
            },
          },
          { label: t('common.cancel'), onPress: () => setConfirmDelete(false) },
        ]}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  amount: { flex: 2 },
  currency: { flex: 1 },
});
