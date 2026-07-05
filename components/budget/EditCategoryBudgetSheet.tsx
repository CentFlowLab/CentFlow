import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useUpsertCategoryBudget } from '@/hooks/queries/useCategoryBudgets';
import type { CategoryBudgetStatus } from '@/lib/domain/category-budget.types';
import { getApiErrorMessage } from '@/lib/api/errors';
import { spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type EditCategoryBudgetSheetProps = {
  visible: boolean;
  status: CategoryBudgetStatus | null;
  onClose: () => void;
};

function parseAmount(value: string): number {
  return Number.parseFloat(value.replace(',', '.'));
}

export function EditCategoryBudgetSheet({
  visible,
  status,
  onClose,
}: EditCategoryBudgetSheetProps) {
  const upsert = useUpsertCategoryBudget();
  const { showToast } = useToast();
  const [limitInput, setLimitInput] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !status) return;
    setLimitInput(String(status.monthlyLimit).replace('.', ','));
    setApiError(null);
    upsert.reset();
  }, [visible, status?.category, status?.monthlyLimit]);

  const parsedLimit = useMemo(() => parseAmount(limitInput), [limitInput]);

  async function handleSave() {
    if (!status) return;
    if (!Number.isFinite(parsedLimit) || parsedLimit < 0) {
      setApiError('Indica um limite válido.');
      return;
    }

    try {
      await upsert.mutateAsync({
        category: status.category,
        monthlyLimit: parsedLimit,
        source: 'manual',
      });
      showToast(`Limite de ${status.label} actualizado.`, 'success');
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o orçamento'));
    }
  }

  if (!status) return null;

  return (
    <DraggableBottomSheet visible={visible} onClose={onClose} maxHeight="70%">
      <View style={styles.container}>
        <Text variant="h2">Limite mensal</Text>
        <Text variant="body" color="textSecondary">
          {status.label}
        </Text>

        <Card variant="outlined" padding="md" style={styles.summary}>
          <Text variant="caption" color="textMuted">
            Gasto este mês
          </Text>
          <Text variant="bodyMedium">
            {formatCurrency(status.spent)} de {formatCurrency(status.monthlyLimit)}
          </Text>
        </Card>

        <TextField
          label="Limite mensal (€)"
          value={limitInput}
          onChangeText={setLimitInput}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />

        {apiError ? (
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        ) : null}

        <Button
          label="Guardar limite"
          onPress={handleSave}
          loading={upsert.isPending}
          fullWidth
        />
        <Button label="Cancelar" variant="ghost" onPress={onClose} fullWidth />
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  summary: {
    gap: spacing.xs,
  },
});
