import { router } from 'expo-router';
import { useState } from 'react';
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
import { useRepositories } from '@/data';
import { Button, Chip, ChipGroup, Dialog, FormScreen, TextField } from '@/ui/components';
import { spacing } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { OptionalDateField } from '../finance/OptionalDateField';
import { validationMessage } from '../finance/presentation';
import { useToday } from '../finance/useToday';

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
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const close = () => closeModal('/documents');

  async function save() {
    const input: DocumentInput = {
      title,
      category,
      expiresOn,
      notes: notes.trim() === '' ? null : notes,
    };
    const fieldErrors = validateDocumentInput(input);
    if (hasErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    try {
      if (record) await repositories.documents.update(record.id, input);
      else await repositories.documents.create(input);
      close();
    } catch (error) {
      setSaving(false);
      if (error instanceof ValidationError) setErrors(error.errors);
    }
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
        <TextField
          label={t('documents.form.notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
          errorText={validationMessage(t, errors.notes)}
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
              void repositories.documents.delete(record.id).then(close, () => router.back());
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
