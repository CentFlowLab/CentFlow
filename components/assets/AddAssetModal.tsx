import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ASSETS_SECTION_META } from '@/components/assets/assets.config';
import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useCreateInventoryItem } from '@/hooks/queries/useAssets';
import { createInventoryItemSchema } from '@/lib/domain/assets.schema';
import { getApiErrorMessage } from '@/lib/api/errors';
import { colors, spacing } from '@/lib/theme';

type AddAssetModalProps = {
  visible: boolean;
  onClose: () => void;
};

function parseAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

export function AddAssetModal({ visible, onClose }: AddAssetModalProps) {
  const createInventory = useCreateInventoryItem();
  const meta = ASSETS_SECTION_META.inventario;

  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setValue('');
    setCategory('');
    setErrors({});
    setApiError(null);
    createInventory.reset();
  }, [visible, createInventory]);

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
      await createInventory.mutateAsync(result.data);
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o registo'));
    }
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      scrollContentStyle={styles.content}
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h2">{meta.addLabel}</Text>
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
        label="Valor estimado (€)"
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

      {apiError ? (
        <Card variant="outlined" style={styles.errorCard}>
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        </Card>
      ) : null}

      <Button
        label={createInventory.isPending ? 'A guardar...' : 'Guardar'}
        onPress={handleSave}
        loading={createInventory.isPending}
        fullWidth
        size="lg"
      />
    </DraggableBottomSheet>
  );
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
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
