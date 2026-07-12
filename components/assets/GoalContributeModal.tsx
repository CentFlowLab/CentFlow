import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useCreateGoalContribution } from '@/hooks/queries/useGoalContributions';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Goal } from '@/lib/domain/assets.types';
import { traceGoalContribution } from '@/lib/doctor/goal-contribution-trace';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type GoalContributeModalProps = {
  visible: boolean;
  onClose: () => void;
  goal: Goal | null;
};

function parseAmount(value: string): number {
  return Number.parseFloat(value.replace(',', '.'));
}

export function GoalContributeModal({ visible, onClose, goal }: GoalContributeModalProps) {
  const contribute = useCreateGoalContribution();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    traceGoalContribution('modal_open', { goalId: goal?.id });
    setAmount('');
    setNote('');
    setApiError(null);
    contribute.reset();
  }, [visible, goal?.id]);

  const parsedAmount = useMemo(() => parseAmount(amount), [amount]);

  const preview = useMemo(() => {
    if (!goal) return null;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;
    return {
      goalAfter: goal.current + parsedAmount,
      amount: parsedAmount,
    };
  }, [goal, parsedAmount]);

  async function handleSave() {
    if (!goal) return;

    traceGoalContribution('save_click', { goalId: goal.id });

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setApiError('Indica um valor válido.');
      return;
    }

    try {
      await contribute.mutateAsync({
        goalId: goal.id,
        amount: parsedAmount,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'a contribuição'));
    }
  }

  const sheetVisible = visible && Boolean(goal);

  return (
    <DraggableBottomSheet visible={sheetVisible} onClose={onClose} maxHeight="88%">
      {goal ? (
        <View style={styles.container}>
          <Text variant="h2">Adicionar dinheiro ao objetivo</Text>
          <Text variant="body" color="textSecondary">
            {goal.name}
          </Text>

          <TextField
            label="Valor"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0,00"
          />

          <TextField
            label="Nota (opcional)"
            value={note}
            onChangeText={setNote}
            placeholder="Ex.: transferência mensal"
          />

          {preview ? (
            <Card variant="outlined" padding="md" style={styles.preview}>
              <Text variant="bodyMedium">
                {goal.name} passa a {formatCurrency(preview.goalAfter)}.
              </Text>
            </Card>
          ) : null}

          {apiError ? (
            <Text variant="caption" color="danger">
              {apiError}
            </Text>
          ) : null}

          <Button
            label={contribute.isPending ? 'A guardar...' : 'Adicionar ao objetivo'}
            onPress={handleSave}
            loading={contribute.isPending}
            disabled={contribute.isPending}
            fullWidth
            size="lg"
          />
        </View>
      ) : null}
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  preview: {
    gap: spacing.xs,
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
});
