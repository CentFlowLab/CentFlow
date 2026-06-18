import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ASSETS_SECTION_META } from '@/components/assets/assets.config';
import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import {
  useCreateInventoryItem,
  useDeleteInventoryItem,
  useUpdateInventoryItem,
} from '@/hooks/queries/useAssets';
import { AnalyticsEvents, track, useAnalytics } from '@/lib/analytics';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formFieldsDiffer, formHasAnyText } from '@/lib/forms';
import { createInventoryItemSchema } from '@/lib/domain/assets.schema';
import type { InventoryItem } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type InventoryFormModalProps = {
  visible: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
};

function parseAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

export function InventoryFormModal({
  visible,
  onClose,
  item = null,
}: InventoryFormModalProps) {
  const isEditing = Boolean(item);
  const createInventory = useCreateInventoryItem();
  const updateInventory = useUpdateInventoryItem();
  const deleteInventory = useDeleteInventoryItem();
  const meta = ASSETS_SECTION_META.inventario;

  useAnalytics();

  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const isSaving = createInventory.isPending || updateInventory.isPending;
  const isDeleting = deleteInventory.isPending;

  const baselineRef = useRef({ name: '', value: '', category: '' });

  useEffect(() => {
    if (!visible) return;

    if (item) {
      const next = {
        name: item.name,
        value: String(item.value),
        category: item.category ?? '',
      };
      setName(next.name);
      setValue(next.value);
      setCategory(next.category);
      baselineRef.current = next;
    } else {
      const empty = { name: '', value: '', category: '' };
      setName(empty.name);
      setValue(empty.value);
      setCategory(empty.category);
      baselineRef.current = empty;
    }

    setErrors({});
    setApiError(null);
    createInventory.reset();
    updateInventory.reset();
    deleteInventory.reset();
  }, [visible, item?.id]);

  const isDirty = useMemo(() => {
    if (!visible) return false;
    if (item) {
      return formFieldsDiffer({ name, value, category }, baselineRef.current);
    }
    return formHasAnyText(name, value, category);
  }, [visible, item, name, value, category]);

  async function handleSave() {
    setApiError(null);
    setErrors({});

    const result = createInventoryItemSchema.safeParse({
      name,
      value: parseAmount(value),
      category: category || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (typeof key === 'string') fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      if (isEditing && item) {
        await updateInventory.mutateAsync({ id: item.id, input: result.data });
      } else {
        await createInventory.mutateAsync(result.data);
        track(AnalyticsEvents.ASSET_CREATED, {
          category: result.data.category ?? undefined,
        });
      }
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o item'));
    }
  }

  function confirmDelete() {
    if (!item) return;
    const message = `Eliminar "${item.name}"?`;

    if (Platform.OS === 'web') {
      if (typeof globalThis.confirm === 'function' && globalThis.confirm(message)) {
        void executeDelete();
      }
      return;
    }

    Alert.alert('Eliminar item', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void executeDelete() },
    ]);
  }

  async function executeDelete() {
    if (!item) return;
    try {
      await deleteInventory.mutateAsync(item.id);
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o item'));
    }
  }

  const parsedValue = parseAmount(value);
  const previewValue =
    value && !Number.isNaN(parsedValue) ? formatCurrency(parsedValue) : null;

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      maxHeight="88%"
      scrollContentStyle={styles.content}
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h2">{isEditing ? 'Editar item' : meta.addLabel}</Text>
            <Text variant="caption" color="textMuted">
              {meta.subtitle}
            </Text>
          </View>
          <Pressable onPress={requestClose} hitSlop={12} accessibilityLabel="Fechar">
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={28}
            />
          </Pressable>
        </View>
      )}>
      <TextField
        label="Nome do item"
        value={name}
        onChangeText={setName}
        placeholder="Ex: iPhone 15"
        error={errors.name}
      />
      <TextField
        label="Valor estimado"
        value={value}
        onChangeText={setValue}
        keyboardType="decimal-pad"
        placeholder="950"
        error={errors.value}
      />
      <TextField
        label="Categoria (opcional)"
        value={category}
        onChangeText={setCategory}
        placeholder="Ex: eletrónica"
      />

      {previewValue ? (
        <Card variant="outlined" padding="md" style={styles.previewCard}>
          <Text variant="caption" color="textMuted">
            Valor estimado
          </Text>
          <Text variant="h3" color="primary">
            {previewValue}
          </Text>
        </Card>
      ) : null}

      {apiError ? (
        <Card variant="outlined" style={styles.errorCard}>
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        </Card>
      ) : null}

      <Button
        label={isSaving ? 'A guardar...' : isEditing ? 'Guardar alterações' : 'Guardar'}
        onPress={handleSave}
        loading={isSaving}
        fullWidth
        size="lg"
      />

      {isEditing ? (
        <Button
          label="Eliminar item"
          variant="ghost"
          onPress={confirmDelete}
          loading={isDeleting}
          fullWidth
        />
      ) : null}
    </DraggableBottomSheet>
  );
}

/** @deprecated Use InventoryFormModal */
export function AddAssetModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return <InventoryFormModal visible={visible} onClose={onClose} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  previewCard: {
    backgroundColor: colors.backgroundElevated,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
