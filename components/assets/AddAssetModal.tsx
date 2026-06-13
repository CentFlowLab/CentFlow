import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ASSETS_SECTION_META } from '@/components/assets/assets.config';
import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import {
  useCreateGoal,
  useCreateInventoryItem,
  useCreateWarranty,
} from '@/hooks/queries/useAssets';
import {
  createGoalSchema,
  createInventoryItemSchema,
  createWarrantySchema,
} from '@/lib/domain/assets.schema';
import type { AssetsTab } from '@/lib/domain/assets.types';
import { getApiErrorMessage } from '@/lib/api/errors';
import { colors, spacing } from '@/lib/theme';
import { toIsoDateString } from '@/lib/utils/format';

type AddAssetModalProps = {
  visible: boolean;
  tab: AssetsTab;
  onClose: () => void;
};

function parseAmount(value: string): number {
  const normalized = value.replace(/\s/g, '').replace(',', '.');
  return Number(normalized);
}

export function AddAssetModal({ visible, tab, onClose }: AddAssetModalProps) {
  const createGoal = useCreateGoal();
  const createWarranty = useCreateWarranty();
  const createInventory = useCreateInventoryItem();

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [value, setValue] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [store, setStore] = useState('');
  const [category, setCategory] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const meta = ASSETS_SECTION_META[tab];
  const isSaving =
    createGoal.isPending || createWarranty.isPending || createInventory.isPending;

  useEffect(() => {
    if (!visible) return;
    setName('');
    setTarget('');
    setCurrent('');
    setValue('');
    setExpiresAt(toIsoDateString(new Date(Date.now() + 365 * 86400000)));
    setStore('');
    setCategory('');
    setDeadline('');
    setErrors({});
    setApiError(null);
    createGoal.reset();
    createWarranty.reset();
    createInventory.reset();
  }, [visible, tab]);

  async function handleSave() {
    setApiError(null);
    setErrors({});

    try {
      if (tab === 'objetivos') {
        const result = createGoalSchema.safeParse({
          name,
          target: parseAmount(target),
          current: current ? parseAmount(current) : 0,
          deadline: deadline || undefined,
        });
        if (!result.success) {
          mapErrors(result.error);
          return;
        }
        await createGoal.mutateAsync(result.data);
      } else if (tab === 'garantias') {
        const result = createWarrantySchema.safeParse({
          product: name,
          expiresAt,
          store: store || undefined,
        });
        if (!result.success) {
          mapErrors(result.error);
          return;
        }
        await createWarranty.mutateAsync(result.data);
      } else {
        const result = createInventoryItemSchema.safeParse({
          name,
          value: parseAmount(value),
          category: category || undefined,
        });
        if (!result.success) {
          mapErrors(result.error);
          return;
        }
        await createInventory.mutateAsync(result.data);
      }
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o registo'));
    }
  }

  function mapErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
    const fieldErrors: Record<string, string> = {};
    error.issues.forEach((issue) => {
      const key = issue.path[0];
      if (typeof key === 'string') fieldErrors[key] = issue.message;
    });
    setErrors(fieldErrors);
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
      {tab === 'objetivos' ? (
        <>
          <TextField
            label="Nome do objetivo"
            value={name}
            onChangeText={setName}
            placeholder="Ex: Fundo de emergência"
            error={errors.name}
          />
          <TextField
            label="Valor alvo (€)"
            value={target}
            onChangeText={setTarget}
            keyboardType="decimal-pad"
            placeholder="5000"
            error={errors.target}
          />
          <TextField
            label="Já poupado (€)"
            value={current}
            onChangeText={setCurrent}
            keyboardType="decimal-pad"
            placeholder="0"
            error={errors.current}
          />
          <TextField
            label="Prazo (opcional)"
            value={deadline}
            onChangeText={setDeadline}
            placeholder="AAAA-MM-DD"
            error={errors.deadline}
          />
        </>
      ) : null}

      {tab === 'garantias' ? (
        <>
          <TextField
            label="Produto"
            value={name}
            onChangeText={setName}
            placeholder="Ex: MacBook Pro 14&quot;"
            error={errors.product}
          />
          <TextField
            label="Data de expiração"
            value={expiresAt}
            onChangeText={setExpiresAt}
            placeholder="AAAA-MM-DD"
            error={errors.expiresAt}
          />
          <TextField
            label="Loja (opcional)"
            value={store}
            onChangeText={setStore}
            placeholder="Ex: Worten"
          />
        </>
      ) : null}

      {tab === 'inventario' ? (
        <>
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
        </>
      ) : null}

      {apiError ? (
        <Card variant="outlined" style={styles.errorCard}>
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        </Card>
      ) : null}

      <Button
        label={isSaving ? 'A guardar...' : 'Guardar'}
        onPress={handleSave}
        loading={isSaving}
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
