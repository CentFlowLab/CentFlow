import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  hasErrors,
  validateVehicleInput,
  ValidationError,
  VEHICLE_KINDS,
  type ValidationErrors,
  type Vehicle,
  type VehicleInput,
  type VehicleKind,
} from '@/core/finance';
import { useRepositories } from '@/data';
import { Button, Chip, ChipGroup, Dialog, FormScreen, TextField } from '@/ui/components';
import { spacing } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { OptionalDateField } from '../finance/OptionalDateField';
import { validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';

type FieldErrors = ValidationErrors<keyof VehicleInput>;

export function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const { t } = useTranslation();
  const repositories = useRepositories();
  const today = useToday();
  const editing = vehicle !== undefined;

  const [name, setName] = useState(vehicle?.name ?? '');
  const [kind, setKind] = useState<VehicleKind>(vehicle?.kind ?? 'car');
  const [plate, setPlate] = useState(vehicle?.plate ?? '');
  const [odometer, setOdometer] = useState(
    vehicle?.odometerKm === null || vehicle === undefined ? '' : String(vehicle.odometerKm),
  );
  const [inspectionDue, setInspectionDue] = useState(vehicle?.inspectionDue ?? null);
  const [insuranceDue, setInsuranceDue] = useState(vehicle?.insuranceDue ?? null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const close = () => closeModal('/vehicles');

  async function save() {
    const digits = odometer.replace(/\D/g, '');
    const input: VehicleInput = {
      name,
      kind,
      plate: plate.trim() === '' ? null : plate,
      odometerKm: digits === '' ? null : Number(digits),
      inspectionDue,
      insuranceDue,
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

  return (
    <FormScreen
      title={t(editing ? 'vehicles.form.editTitle' : 'vehicles.form.createTitle')}
      closeLabel={t('common.close')}
      onClose={close}
      footer={
        <View style={styles.footer}>
          <Button
            label={t('vehicles.form.save')}
            fullWidth
            loading={saving}
            disabled={saving}
            onPress={() => void save()}
          />
          {editing ? (
            <Button
              label={t('vehicles.delete')}
              variant="ghost"
              fullWidth
              onPress={() => setConfirmingDelete(true)}
            />
          ) : null}
        </View>
      }>
      <View style={styles.form}>
        <ChipGroup label={t('vehicles.form.kind')}>
          {VEHICLE_KINDS.map((code) => (
            <Chip
              key={code}
              label={t(`vehicles.kinds.${code}`)}
              selected={code === kind}
              onPress={() => setKind(code)}
            />
          ))}
        </ChipGroup>
        <TextField
          label={t('vehicles.form.name')}
          value={name}
          onChangeText={setName}
          errorText={validationMessage(t, errors.name)}
        />
        <TextField
          label={t('vehicles.form.plate')}
          value={plate}
          onChangeText={setPlate}
          autoCapitalize="characters"
          errorText={validationMessage(t, errors.plate)}
        />
        <TextField
          label={t('vehicles.form.odometer')}
          value={odometer}
          onChangeText={setOdometer}
          keyboardType="number-pad"
          inputMode="numeric"
          errorText={validationMessage(t, errors.odometerKm)}
        />
        <OptionalDateField
          label={t('vehicles.form.inspection')}
          value={inspectionDue}
          today={today}
          onChange={setInspectionDue}
          errorText={validationMessage(t, errors.inspectionDue)}
        />
        <OptionalDateField
          label={t('vehicles.form.insurance')}
          value={insuranceDue}
          today={today}
          onChange={setInsuranceDue}
          errorText={validationMessage(t, errors.insuranceDue)}
        />
      </View>
      <Dialog
        visible={confirmingDelete}
        title={t('vehicles.deleteTitle')}
        message={t('vehicles.deleteMessage')}
        onDismiss={() => setConfirmingDelete(false)}
        actions={[
          {
            label: t('vehicles.delete'),
            variant: 'destructive',
            onPress: () => {
              setConfirmingDelete(false);
              if (!vehicle) return;
              void repositories.vehicles.delete(vehicle.id).then(close, () => router.back());
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
  footer: { gap: spacing.sm },
});
