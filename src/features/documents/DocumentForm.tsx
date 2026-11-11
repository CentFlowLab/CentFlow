import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  DOCUMENT_CATEGORIES,
  hasErrors,
  validateDocumentInput,
  ValidationError,
  type DocumentCategory,
  type DocumentInput,
  type DocumentRecord,
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
import { Button, Chip, ChipGroup, Dialog, FormScreen, TextField } from '@/ui/components';
import { spacing } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { OptionalDateField } from '../finance/OptionalDateField';
import { validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';
import {
  addAttachment,
  AttachmentError,
  deleteDocumentWithFiles,
  removeAttachment,
  type PickedFile,
} from './attachments';
import { AttachmentsSection } from './AttachmentsSection';

async function loadChoices(repositories: Repositories) {
  const [vehicles, accounts] = [
    await repositories.vehicles.list(),
    await repositories.accounts.list(),
  ];
  return { vehicles, currency: accounts[0]?.currency ?? DEFAULT_CURRENCY };
}

type FieldErrors = ValidationErrors<keyof DocumentInput>;

export function DocumentForm({ record }: { record?: DocumentRecord }) {
  const { t } = useTranslation();
  const repositories = useRepositories();
  const today = useToday();
  const editing = record !== undefined;

  const [title, setTitle] = useState(record?.title ?? '');
  const [category, setCategory] = useState<DocumentCategory>(record?.category ?? 'identity');
  const [expiresOn, setExpiresOn] = useState(record?.expiresOn ?? null);
  const [notes, setNotes] = useState(record?.notes ?? '');
  const { locale } = useLocaleFormat();
  const choices = useDataQuery(useCallback((repos: Repositories) => loadChoices(repos), []));
  const [vehicleId, setVehicleId] = useState<string | null>(record?.vehicleId ?? null);
  const [acquiredOn, setAcquiredOn] = useState(record?.acquiredOn ?? null);
  const [amountText, setAmountText] = useState(
    record?.amount != null
      ? amountToInputString(
          record.amount,
          record.currency ?? DEFAULT_CURRENCY,
          decimalSeparatorFor(locale),
        )
      : '',
  );
  const [amountError, setAmountError] = useState<string>();
  // Num documento novo, os ficheiros esperam que ele seja gravado.
  const [pendingFiles, setPendingFiles] = useState<PickedFile[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const close = () => closeModal('/documents');

  async function save() {
    const currency = record?.currency ?? choices.data?.currency ?? DEFAULT_CURRENCY;
    let amount: number | null = null;
    if (amountText.trim() !== '') {
      const parsed = parseAmountInput(amountText, currency);
      if (!parsed.ok) {
        setAmountError(t('validation.amountInvalid'));
        return;
      }
      amount = parsed.amountMinor;
    }
    const input: DocumentInput = {
      title,
      category,
      expiresOn,
      notes: notes.trim() === '' ? null : notes,
      vehicleId,
      acquiredOn,
      amount,
      currency: amount === null ? null : currency,
    };
    const fieldErrors = validateDocumentInput(input);
    if (hasErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    try {
      if (record) {
        await repositories.documents.update(record.id, input);
      } else {
        const created = await repositories.documents.create(input);
        for (const file of pendingFiles) {
          const latest = await repositories.documents.get(created.id);
          if (latest) await addAttachment(repositories, latest, file);
        }
      }
      close();
    } catch (error) {
      setSaving(false);
      if (error instanceof ValidationError) setErrors(error.errors);
      if (error instanceof AttachmentError) setAmountError(undefined);
    }
  }

  async function pickFile(file: PickedFile) {
    if (!record) {
      setPendingFiles((current) => [...current, file]);
      return;
    }
    await addAttachment(repositories, record, file);
  }

  return (
    <FormScreen
      title={t(editing ? 'documents.form.editTitle' : 'documents.form.createTitle')}
      closeLabel={t('common.close')}
      onClose={close}
      footer={
        <View style={styles.footer}>
          <Button
            label={t('documents.form.save')}
            fullWidth
            loading={saving}
            disabled={saving}
            onPress={() => void save()}
          />
          {editing ? (
            <Button
              label={t('documents.delete')}
              variant="ghost"
              fullWidth
              onPress={() => setConfirmingDelete(true)}
            />
          ) : null}
        </View>
      }>
      <View style={styles.form}>
        <ChipGroup label={t('documents.form.category')}>
          {DOCUMENT_CATEGORIES.map((code) => (
            <Chip
              key={code}
              label={t(`documents.categories.${code}`)}
              selected={code === category}
              onPress={() => setCategory(code)}
            />
          ))}
        </ChipGroup>
        <TextField
          label={t('documents.form.title')}
          value={title}
          onChangeText={setTitle}
          errorText={validationMessage(t, errors.title)}
        />
        <OptionalDateField
          label={t('documents.form.expires')}
          value={expiresOn}
          today={today}
          onChange={setExpiresOn}
          errorText={validationMessage(t, errors.expiresOn)}
        />
        {(choices.data?.vehicles.length ?? 0) > 0 ? (
          <ChipGroup label={t('documents.form.vehicle')}>
            <Chip
              label={t('documents.form.noVehicle')}
              selected={vehicleId === null}
              onPress={() => setVehicleId(null)}
            />
            {choices.data!.vehicles.map((vehicle) => (
              <Chip
                key={vehicle.id}
                label={vehicle.plate ? `${vehicle.name} · ${vehicle.plate}` : vehicle.name}
                selected={vehicle.id === vehicleId}
                onPress={() => setVehicleId(vehicle.id)}
              />
            ))}
          </ChipGroup>
        ) : null}
        <OptionalDateField
          label={t('documents.form.acquiredOn')}
          value={acquiredOn}
          today={today}
          onChange={setAcquiredOn}
          errorText={validationMessage(t, errors.acquiredOn)}
        />
        <TextField
          label={t('documents.form.amount')}
          value={amountText}
          onChangeText={(text) => {
            setAmountText(text);
            setAmountError(undefined);
          }}
          placeholder={t('entryForm.amountPlaceholder')}
          keyboardType="decimal-pad"
          inputMode="decimal"
          helperText={record?.currency ?? choices.data?.currency ?? DEFAULT_CURRENCY}
          errorText={amountError ?? validationMessage(t, errors.amount)}
        />
        <TextField
          label={t('documents.form.notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
          errorText={validationMessage(t, errors.notes)}
        />
        <AttachmentsSection
          document={record ?? null}
          pending={pendingFiles}
          onPick={pickFile}
          onRemovePending={(index) =>
            setPendingFiles((current) => current.filter((_, position) => position !== index))
          }
          onRemove={(attachment) =>
            record ? removeAttachment(repositories, record, attachment) : Promise.resolve()
          }
        />
      </View>
      <Dialog
        visible={confirmingDelete}
        title={t('documents.deleteTitle')}
        message={t('documents.deleteMessage')}
        onDismiss={() => setConfirmingDelete(false)}
        actions={[
          {
            label: t('documents.delete'),
            variant: 'destructive',
            onPress: () => {
              setConfirmingDelete(false);
              if (!record) return;
              void deleteDocumentWithFiles(repositories, record).then(close, () => router.back());
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
